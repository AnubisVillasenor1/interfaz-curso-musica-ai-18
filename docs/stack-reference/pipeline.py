"""Flujo de referencia del motor de audio de TAMV Play & Go.

Documento padre: docs/ESTRATEGIA-ABIERTA-PLAY-AND-GO.md (§3 reglas del monorepo,
§4 flujo MusicGen + Demucs). Este archivo es REFERENCIA EJECUTABLE, no está
montado en la app: nadie lo llama desde Next.js todavía.

Qué demuestra, en una sola pieza:

1. Un trabajo de audio es asíncrono y por fases (generar → separar → analizar),
   nunca una petición HTTP sincrona.
2. La cola vive en Postgres (`public.songs`) y se reclama con `FOR UPDATE SKIP
   LOCKED`. El cupo NO se descuenta dentro del reclamado: la RPC
   `consume_generation_quota` solo autoriza a quien es `auth.uid()`, así que el
   cobro tiene que quedarse en la petición de Next.js, con la sesión del usuario.
   Un worker que llamara a la RPC obtendría `allowed=false` y nada más. Lo mismo
   pasa al reintegrar (`refund_quota`), y por eso ese camino está escrito para
   avisar en vez de fingir. Ver `SCHEMA_GAPS`.
3. Los pesos no viven en el código: se resuelven por SHA-256 desde un directorio
   externo y cada motor declara su licencia. Un motor CC-BY-NC se niega a correr
   si el entorno dice que el producto es comercial. Eso es la "transparencia
   total" hecha código, no eslogan.
4. Cada artefacto devuelve su `provenance`: motor, versión de pesos, prompt,
   semillas y métricas. La interfaz la muestra; sin provenance no hay salida.

Requisitos reales (no instalados aquí): torch, audiocraft o ace-step, demucs,
librosa, psycopg[binary], ffmpeg en PATH. Todas las importaciones pesadas están
protegidas: `python pipeline.py --help` y `--selfcheck` corren con Python limpio.

Uso:
    python pipeline.py --selfcheck
    python pipeline.py --enqueue --prompt "cumbia electrónica de sierra" --user demo
    python pipeline.py --worker --once
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

# --------------------------------------------------------------------------
# 1. Registro de motores: licencia y hash son parte de la interfaz, no notas al
#    pie. Un motor sin licencia declarada no se registra.
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Engine:
    key: str
    family: str
    weights_file: str
    sha256: str  # "" = aún no verificado; el worker se niega a correr
    license: str
    commercial_ok: bool
    notes: str

    @property
    def verified(self) -> bool:
        return len(self.sha256) == 64


ENGINES: dict[str, Engine] = {
    # Opción por defecto para un producto comercial: pesos Apache-2.0.
    "ace-step": Engine(
        key="ace-step",
        family="diffusion-step",
        weights_file="ace-step-v1.safetensors",
        sha256="",
        license="Apache-2.0",
        commercial_ok=True,
        notes="Verificar el SHA-256 del release y fijarlo antes de producción.",
    ),
    "diffrhythm": Engine(
        key="diffrhythm",
        family="diff-rhythm",
        weights_file="diffrhythm-music_v2.pt",
        sha256="",
        license="Apache-2.0",
        commercial_ok=True,
        notes="Apache-2.0 declarado por el repo ASLP-lab/DiffRhythm (API de GitHub, "
        "6-nov-2026). La LICENCIA del checkpoint publicado en la model card NO está "
        "verificada: el hash y la licencia del peso hay que congelarlos antes de "
        "cobrar por una pista generada con él. Menos control por secciones que ACE-Step.",
    ),
    # MusicGen queda registrado para I+D local y docencia: sus pesos son NC.
    "musicgen-small": Engine(
        key="musicgen-small",
        family="audiocraft",
        weights_file="musicgen-small.pt",
        sha256="",
        license="CC-BY-NC-4.0 (pesos) / MIT (código)",
        commercial_ok=False,
        notes="Prohibido en producto comercial. Solo investigación y aula.",
    ),
}

# El separador NO es un motor de composición: no genera nota alguna, solo recorta
# audio que el usuario ya aportó o que generó un motor ya pasado por la puerta.
# Aun así pasa por `assert_usage_rights` en `separate()` para que el registro sea la
# única fuente de verdad y nadie añada un checkpoint nuevo sin declararlo.
SEPARATOR = Engine(
    key="htdemucs",
    family="demucs",
    weights_file="htdemucs.tar",
    sha256="",
    license="MIT (código) — checkpoint entrenado con MUSDB18-HQ (uso de investigación)",
    commercial_ok=True,
    notes="La restricción de MUSDB18-HQ recae sobre el modelo, no sobre el resultado: "
    "los stems de UN audio propio siguen siendo tuyos. Ver Open-Unmix (MIT, entrenado "
    "con MedleyDB) si se quiere un separador sin ese antecedente.",
)


def weights_dir() -> Path:
    return Path(os.environ.get("TAMV_WEIGHTS_DIR", "./.weights")).expanduser()


# Los valores admitidos, en claro. Antes esta función era `== "1"`, así que un
# `TAMV_COMMERCIAL=true` o `TAMV_COMMERCIAL=yes` —el typo más probable en un panel de
# Vercel— apagaba la puerta de licencia en silencio y dejaba correr un peso CC-BY-NC
# dentro del producto cobrado. Una puerta que se abre escribiendo mal su nombre no es
# una puerta.
_COMMERCIAL_TRUE = {"1", "true", "yes", "si", "sí"}
_COMMERCIAL_FALSE = {"0", "false", "no"}


def is_commercial() -> bool:
    raw = os.environ.get("TAMV_COMMERCIAL", "1").strip().lower()
    if raw in _COMMERCIAL_TRUE:
        return True
    if raw in _COMMERCIAL_FALSE:
        return False
    raise ValueError(
        f"TAMV_COMMERCIAL={raw!r} no es un valor reconocido; escribe uno de "
        f"{sorted(_COMMERCIAL_TRUE | _COMMERCIAL_FALSE)}. Fallo cerrado: sin "
        f"respuesta explícita se asume producto comercial."
    )


def resolve_weights(engine: Engine) -> Path:
    """Pesos fuera del repo, validados por hash. Nunca se descargan a ciegas."""
    target = weights_dir() / engine.weights_file
    if not target.exists():
        raise FileNotFoundError(
            f"Peso ausente: {target}. Descárgalo del release oficial, fija su "
            f"SHA-256 en ENGINES y vuelve a intentarlo."
        )
    if not engine.verified:
        raise ValueError(
            f"{engine.key} no tiene SHA-256 fijado. Un motor sin hash verificado "
            f"no entra en producción (regla §3.3)."
        )
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    if digest != engine.sha256:
        raise ValueError(f"{engine.key}: hash {digest[:12]}… no coincide con el declarado.")
    return target


def assert_usage_rights(engine: Engine) -> None:
    """La puerta de licencia: el código se niega, no la buena voluntad."""
    if is_commercial() and not engine.commercial_ok:
        raise PermissionError(
            f"{engine.key} licencia={engine.license}. No puede servir un producto "
            f"comercial (TAMV_COMMERCIAL resuelto a True). Elige un motor commercial_ok "
            f"o declara el entorno como no comercial."
        )


def resolve_engine(key: str) -> Engine:
    """Motor registrado o error legible.

    Un `KeyError` en un worker no le dice nada a nadie: el mensaje trae los valores
    permitidos, porque la única fuente de verdad del motor es el registro. Se valida
    en el alta (ver `enqueue`) y otra vez al ejecutar: el registro puede cambiar entre
    los dos momentos y un trabajo en cola nunca elige su propio motor.
    """
    engine = ENGINES.get(key)
    if engine is None:
        raise ValueError(
            f"motor {key!r} no registrado; permitidos: {', '.join(sorted(ENGINES))}"
        )
    return engine


# --------------------------------------------------------------------------
# 2. Contrato del trabajo. Es el único objeto que cruzan Python y TypeScript:
#    packages/shared-contract se genera a partir de estos campos.
# --------------------------------------------------------------------------


@dataclass
class AudioJob:
    id: str
    user_id: str
    prompt: str
    engine: str = "ace-step"  # motor de pesos: clave de ENGINES
    billing: str = "provider"  # songs.engine real: 'local' | 'provider'
    duration_s: int = 30
    seed: int = field(default_factory=lambda: int(time.time()) % 10_000)
    # Vocabulario de `public.songs.status`: queued|generating|ready|error.
    # `separating` y `analyzing` son fases INTERNAS del worker: la tabla no las
    # conoce y el usuario no debe ver una pista «error» mientras se separan stems.
    status: str = "queued"
    lesson_id: str = ""
    seed_from_column: bool = False
    stems: dict[str, str] = field(default_factory=dict)
    metrics: dict[str, Any] = field(default_factory=dict)
    provenance: dict[str, Any] = field(default_factory=dict)
    error: str = ""

    def to_json(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False, indent=2)


# Lo que la referencia necesita y el esquema de hoy no tiene. Cada una de estas
# filas es una migración, no una queja: sin #1 la promesa de regeneración por
# secciones (§5.3 de la estrategia) es falsa; sin #2 no hay reintegro desde un
# worker; sin #3 la procedencia no sobrevive a la petición.
SCHEMA_GAPS = [
    ("songs.seed", "integer not null: sin semilla persistida no hay 'rehaz solo el coro'"),
    ("songs.worker_engine", "text: qué motor de pesos generó la pista (hoy solo 'local'/'provider')"),
    ("songs.provenance", "jsonb: motor, licencia, hash de pesos, prompt exacto — la transparencia "
     "que vende el §2 no tiene dónde escribirse"),
    ("songs.stems / songs.metrics", "jsonb: hoy el análisis se calcula y se imprime, y se pierde"),
    ("songs.claimed_at + índice parcial", "para reclamar por edad una pista abandonada a mitad"),
    ("rpc refund_generation_quota_for_worker(p_owner, p_engine)", "SECURITY DEFINER con grant solo al "
     "rol de servicio: la RPC actual corta contra auth.uid() y desde un worker no hay sesión"),
]


# --------------------------------------------------------------------------
# 3. Cola en Postgres. Reclamar, y el cupo: ver SCHEMA_GAPS abajo, porque aquí es
#    donde la referencia deja de ser decorativa y encuentra un problema real.
# --------------------------------------------------------------------------

# Los identificadores de este apartado están tomados de las migraciones del repo,
# no de un esquema inventado (supabase/migrations/20261105190000_schema.sql:57 y
# 20261105190200_functions.sql:14 y :90). Cambiar una de estas cadenas sin cambiar
# la migración es exactamente el fallo que la versión anterior de este archivo
# tenía: llamaba a audio_job, consume_quota y refund_quota, que no existen.
SQL_CLAIM = """
WITH next AS (
  SELECT id FROM public.songs
   WHERE status = 'queued'
     AND engine = %(billing)s
   ORDER BY created_at
   FOR UPDATE SKIP LOCKED
   LIMIT 1
)
UPDATE public.songs s
   SET status = 'generating', updated_at = now()
  FROM next
 WHERE s.id = next.id
RETURNING s.id, s.user_id, s.prompt, s.engine, s.duration_seconds,
          s.lesson_id, s.status;
"""

SQL_MARK = """
UPDATE public.songs
   SET status = %(status)s, updated_at = now(),
       error = CASE WHEN %(status)s = 'error' THEN %(detail)s ELSE error END
 WHERE id = %(id)s
RETURNING status;
"""

# RPC real: `consume_generation_quota(p_owner uuid, p_engine text)` devuelve una
# fila (allowed, limit_total, limit_used, reason). El worker NO la llama: el cupo
# ya se cobró en la petición de Next.js, con la sesión del usuario, que es el único
# contexto donde la RPC autoriza. Llamarla desde un servicio devolvería
# allowed=false con reason 'no puedes consumir el cupo de otra cuenta'.
SQL_CONSUME = (
    "SELECT allowed, limit_total, limit_used, reason "
    "FROM public.consume_generation_quota(%(owner)s, %(engine)s);"
)

# `refund_generation_quota(p_owner uuid, p_engine text) returns void`: por eso el
# reintegro no devuelve un número de cupos, como prometía esta función antes.
SQL_REFUND = "SELECT public.refund_generation_quota(%(owner)s, %(engine)s);"
SQL_AM_I_AUTHENTICATED = "SELECT (select auth.uid())::text;"


def claim_next_job(worker_id: str) -> AudioJob | None:
    try:
        import psycopg  # type: ignore
    except ImportError:
        raise RuntimeError("psycopg no instalado: la cola no puede reclamarse.") from None

    dsn = os.environ.get("TAMV_DATABASE_URL", "")
    if not dsn:
        raise RuntimeError("TAMV_DATABASE_URL ausente.")

    with psycopg.connect(dsn, autocommit=False) as conn:
        cur = conn.cursor()
        cur.execute(SQL_CLAIM, {"billing": os.environ.get("TAMV_WORKER_BILLING", "provider")})
        row = cur.fetchone()
        if row is None:
            conn.rollback()
            return None
        job = row_to_job(row, cur.description)
        # El `UPDATE ... status='generating'` de SQL_CLAIM y el SELECT del trabajo
        # son la MISMA transacción gracias a la CTE con FOR UPDATE SKIP LOCKED: dos
        # workers no pueden reclamar la misma pista. El cupo, en cambio, ya estaba
        # descontado fuera de aquí (ver SQL_CONSUME), así que este COMMIT no toca
        # créditos: si el proceso muere, la pista queda en 'generating' y el
        # reclamo por edad (SCHEMA_GAPS #4) la devuelve a 'queued' sin regalar nada.
        print(f"[worker {worker_id}] reclamada {job.id[:8]} (billing={job.billing})", flush=True)
        conn.commit()
    return job


def row_to_job(row, description) -> AudioJob:  # noqa: ANN001 - tipado del driver
    names = [d.name for d in description]
    data = dict(zip(names, row))
    return AudioJob(
        id=str(data.get("id", "")),
        user_id=str(data.get("user_id", "")),
        prompt=str(data.get("prompt", "")),
        # `songs.engine` es el ORIGEN DE FACTURA ('local'|'provider'), no el motor
        # de pesos. El motor lo elige el worker por registro/TAMV_ENGINE porque la
        # tabla aún no tiene dónde guardarlo (SCHEMA_GAPS #1).
        engine=os.environ.get("TAMV_ENGINE", "ace-step"),
        billing=str(data.get("engine", "provider")),
        duration_s=int(data.get("duration_seconds") or 30),
        seed=int(data.get("seed", 0)) if data.get("seed") is not None else _seed_for(data),
        status=str(data.get("status", "generating")),
        lesson_id=str(data.get("lesson_id") or ""),
        seed_from_column=data.get("seed") is not None,
    )


def _seed_for(data: dict[str, Any]) -> int:
    """Semilla determinista mientras `songs` no tenga columna `seed`.

    Sin columna de semilla, «rehaz solo el estribillo con la misma base» es
    literalmente imposible: hay que volver a tirar la moneda. Se deriva el seed del
    id del trabajo para que al menos el reintento de la MISMA fila sea reproducible,
    y se declara en `provenance.seed_source` para no vender determinancia que no
    existe. El §5 de la estrategia pone esto como bloqueo del roadmap.
    """
    raw = str(data.get("id", "")).encode("utf-8")
    return int(hashlib.sha256(raw).hexdigest()[:8], 16) % 10_000


def mark(job: AudioJob, phase: str, *, db_status: str | None = None, detail: str = "") -> None:
    """Fase interna siempre se imprime; `public.songs` solo se escribe con su vocabulario.

    La referencia anterior escribía 'succeeded'. La CHECK de la migración
    (20261105190000_schema.sql:70) acepta queued|generating|ready|error y nada más,
    así que 'succeeded' habría reventado el UPDATE en producción — y un worker que
    revienta al final deja la pista colgada en 'generating' para siempre.
    """
    job.status = phase
    print(f"[job {job.id[:8]}] {phase}", flush=True)
    if db_status is None:
        return
    persist_status(job, db_status, detail)


def persist_status(job: AudioJob, status: str, detail: str = "") -> bool:
    try:
        import psycopg  # type: ignore
    except ImportError:
        print("  estado NO persistido: psycopg ausente", flush=True)
        return False
    dsn = os.environ.get("TAMV_DATABASE_URL", "")
    if not dsn:
        print("  estado NO persistido: TAMV_DATABASE_URL ausente", flush=True)
        return False
    with psycopg.connect(dsn) as conn:
        cur = conn.cursor()
        cur.execute(SQL_MARK, {"status": status, "detail": detail[:2000], "id": job.id})
        row = cur.fetchone()
        conn.commit()
    print(f"  songs.status -> {row[0] if row else '(fila ausente)'}", flush=True)
    return row is not None


# --------------------------------------------------------------------------
# 4. Fases. Cada una importa su pesada solo cuando toca ejecutarla.
# --------------------------------------------------------------------------


def generate(job: AudioJob, out_dir: Path) -> Path:
    """Motor de composición → wav a 48 kHz estéreo (el mix completo).

    Qué corre de verdad aquí y qué es un hueco declarado: la rama `audiocraft`
    está escrita pero sus pesos son CC-BY-NC, así que en un producto cobrado
    `assert_usage_rights` la corta antes de cargar nada. Las dos ramas que sí serían
    legales para comercial (ACE-Step, DiffRhythm) están sin adaptador: lanzan
    NotImplementedError. O sea, esta referencia demuestra el control (cola, licencia,
    hash, procedencia, reintegro) y NO demuestra audio. La estrategia lo dice en §4
    con esas mismas palabras; un archivo que fingiera el generador sería peor.
    """
    engine = resolve_engine(job.engine)
    assert_usage_rights(engine)
    weights = resolve_weights(engine)
    wav = out_dir / f"{job.id}.mix.wav"

    if engine.family == "audiocraft":
        import torch  # type: ignore
        from audiocraft.models import GenerationModel  # type: ignore

        torch.manual_seed(job.seed)
        model = GenerationModel.load_pretrained_model(str(weights_dir()))
        wav_file = model.generate(job.prompt, duration=job.duration_s)
        model.save_wav(wav_file, str(wav))
    else:
        # ACE-Step / DiffRhythm comparten la forma: prompt + duración + semilla →
        # audio. Aquí va el adaptador concreto del motor elegido.
        raise NotImplementedError(
            f"Adaptador {engine.family} pendiente: mismo contrato (prompt, "
            f"duration_s, seed) -> wav de {job.duration_s} s."
        )
    job.provenance.update(
        engine=engine.key,
        license=engine.license,
        weights_file=weights.name,
        weights_sha256=hashlib.sha256(weights.read_bytes()).hexdigest(),
        seed=job.seed,
        seed_source="songs.seed" if job.seed_from_column else "derivada del id (sin columna seed)",
        prompt=job.prompt,
        duration_s=job.duration_s,
    )
    return wav


def separate(job: AudioJob, mix: Path, out_dir: Path) -> dict[str, Path]:
    """Demucs → stems. Se separan 4 pistas; el `drums` alimenta el Mapa Emocional.

    El separador pasa por las mismas dos puertas que el motor de composición
    (licencia y hash). Era el agujero obvio de la versión anterior: `SEPARATOR`
    declaraba una nota sobre MUSDB18-HQ y ningún camino del código la consultaba,
    así que quien cambiara el checkpoint por otro con otra licencia no se enteraba.
    """
    assert_usage_rights(SEPARATOR)
    resolve_weights(SEPARATOR)

    from demucs.separate import main as demucs_main  # type: ignore

    stems_dir = out_dir / job.id
    demucs_main(["-n", "htdemucs", "--out", str(stems_dir), str(mix)])
    done = {name: stems_dir / "htdemucs" / mix.stem / f"{name}.wav" for name in ("drums", "bass", "other", "vocals")}
    job.stems = {k: str(v) for k, v in done.items()}
    job.provenance["separator"] = {"engine": SEPARATOR.key, "license": SEPARATOR.license}
    return done


def analyze(job: AudioJob, mix: Path) -> dict[str, Any]:
    """Capa de análisis determinista y libre: librosa (MIT), no Essentia (AGPL).

    Todo lo que la interfaz llama "Mapa Emocional" sale de aquí, medido sobre el
    audio real: si el dato no se puede calcular, no se muestra.
    """
    import librosa  # type: ignore
    import numpy as np  # type: ignore

    y, sr = librosa.load(str(mix), sr=44_100, mono=True)
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr).mean(axis=1)
    names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    spectral = float(np.mean(librosa.feature.spectral_contrast(y=y, sr=sr)))
    rms = float(np.sqrt(np.mean(y**2)))
    zero_rate = float(np.mean(librosa.feature.zero_crossing_rate(y)))
    job.metrics = {
        "tempo_bpm": float(tempo),
        "key": names[int(np.argmax(chroma))],
        "brightness": round(spectral, 3),
        # NO es LUFS. El §4 promete normalizar sonoridad y aquí solo hay RMS: RMS es
        # amplitud sin ventanales K-weighting ni gating, así que dos pistas con el
        # mismo RMS pueden sonar a distinta sonoridad percibida. Para LUFS BS.1770
        # hace falta pyloudnorm (MIT) o ffmpeg ebur128; mientras no esté, la interfaz
        # tiene que decir «RMS», no «LUFS», porque un alumno que mezcle contra este
        # número se confía a una métrica que no se midió.
        "loudness_rms": round(rms, 4),
        "loudness_unit": "rms_lineal (no LUFS)",
        "texture": round(zero_rate, 4),
        "beats": int(len(beats)),
        "duration_s": round(float(len(y) / sr), 2),
    }
    return job.metrics


# --------------------------------------------------------------------------
# 5. Orquestación: fases + reintegro del cupo si algo falla.
# --------------------------------------------------------------------------


def refund_quota(user_id: str, engine: str) -> bool:
    """Reintegro de verdad, o constancia escrita de que no lo fue.

    Dos cosas que la versión anterior de esta función no podía hacer:

    1. Llamaba a `public.refund_quota(usuario, trabajo)`. La RPC real es
       `public.refund_generation_quota(p_owner uuid, p_engine text)` y devuelve
       `void` (20261105190200_functions.sql:90): no devuelve cupos restantes, así que
       el `fetchone()[0]` que imprimía este archivo era inventado. La firma es
       (dueño, motor) y el `engine` decide QUÉ contador se suelta: 'local' descuenta
       `local_used_today`, cualquier otro descuenta `used_today`. Por eso aquí va el
       origen de factura (`job.billing`), no el motor de pesos.
    2. La RPC corta contra la sesión: `if p_owner is distinct from (select auth.uid())
       then return`. Un worker con la service role no tiene `auth.uid()`, así que la
       llamada entra, no hace NADA y devuelve éxito. Eso es lo peor que le puede pasar
       a un reintegro: el usuario pierde su crédito y el log dice que se lo devolvieron.
       Por eso este código comprueba primero si está autenticado, y si no, lo dice.
    """
    try:
        import psycopg  # type: ignore
    except ImportError:
        print("  refund NO ejecutado: psycopg ausente", flush=True)
        return False
    dsn = os.environ.get("TAMV_DATABASE_URL", "")
    if not dsn:
        print("  refund NO ejecutado: TAMV_DATABASE_URL ausente", flush=True)
        return False
    with psycopg.connect(dsn) as conn:
        cur = conn.cursor()
        cur.execute(SQL_AM_I_AUTHENTICATED)
        row = cur.fetchone()
        if not row or row[0] is None:
            print(
                "  refund NO ejecutado: auth.uid() esta vacio (conexion de servicio). "
                "refund_generation_quota es SECURITY DEFINER pero se auto-bloquea contra la "
                "sesion, asi que desde un worker reintegraria sin tocar entitlements. "
                "Hace falta la migracion de SCHEMA_GAPS: una RPC para el rol de servicio.",
                flush=True,
            )
            conn.rollback()
            return False
        cur.execute(SQL_REFUND, {"owner": user_id, "engine": engine})
        conn.commit()
    print(f"  refund_generation_quota(owner={user_id}, engine={engine}) ejecutado", flush=True)
    return True


def run_job(job: AudioJob, out_dir: Path) -> AudioJob:
    try:
        mix = generate(job, out_dir)
        mark(job, "separating")  # fase interna: la tabla no tiene este estado
        separate(job, mix, out_dir)
        mark(job, "analyzing")
        analyze(job, mix)
        job.provenance["pipeline_version"] = "0.1.0-reference"
        mark(job, "ready", db_status="ready")
    except Exception as exc:  # noqa: BLE001 - el worker no puede morir en silencio
        job.error = f"{type(exc).__name__}: {exc}"
        mark(job, "error", db_status="error", detail=job.error)
        # Sin reintegro el usuario paga un fallo ajeno; con él, la promesa de
        # "no gastas crédito si no hay audio" es verificable. Con la sesión de
        # servicio actual devuelve False y lo imprime: el fallo se ve, no se finge.
        refunded = refund_quota(job.user_id, job.billing)
        job.provenance["quota_refunded"] = refunded
        print(f"  motivo: {job.error}", flush=True)
    return job


def enqueue(job: AudioJob) -> None:
    """Alta en la cola. Next.js solo escribe aqui; jamas genera en la peticion.

    El motor se valida ANTES de encolar: un `INSERT` con un motor inexistente o con
    pesos CC-BY-NC en entorno comercial no debe llegar nunca a la base.
    """
    assert_usage_rights(resolve_engine(job.engine))
    columns = ("user_id", "title", "prompt", "engine", "status", "duration_seconds", "lesson_id")
    statement = (
        "INSERT INTO public.songs ("
        + ", ".join(columns)
        + ") VALUES ("
        + ", ".join(f"%({c})s" for c in columns)
        + ") RETURNING id;"
    )
    print(statement)
    print(
        {
            "user_id": job.user_id,
            "title": job.prompt[:60],
            "prompt": job.prompt,
            # 'provider' es el valor de FACTURA que corresponde a una pista que va a
            # cola; el motor de pesos no tiene columna todavia (SCHEMA_GAPS #2).
            "engine": job.billing,
            "status": "queued",
            "duration_seconds": job.duration_s,
            "lesson_id": job.lesson_id or None,
        }
    )


def selfcheck() -> int:
    print(f"python            : {sys.version.split()[0]}")
    print(f"comercial         : {is_commercial()}")
    print(f"pesos             : {weights_dir()} ({'existe' if weights_dir().exists() else 'ausente'})")
    print(f"motor del worker  : {os.environ.get('TAMV_ENGINE', 'ace-step')} "
          f"(billing reclamado: {os.environ.get('TAMV_WORKER_BILLING', 'provider')})")
    for engine in ENGINES.values():
        bloqueo = "BLOQUEADO en comercial" if is_commercial() and not engine.commercial_ok else "permitido"
        print(f"  {engine.key:<15}: {engine.license}  ->  {bloqueo}")
    sep_bloqueo = "BLOQUEADO en comercial" if is_commercial() and not SEPARATOR.commercial_ok else "permitido"
    print(f"  {SEPARATOR.key:<15}: {SEPARATOR.license}  ->  {sep_bloqueo}")
    print("  (ninguno con SHA-256 fijado: resolve_weights rechaza correr "
          f"{sum(1 for e in list(ENGINES.values()) + [SEPARATOR] if not e.verified)} de "
          f"{len(ENGINES) + 1} registros)")
    faltan = [n for n in ("torch", "audiocraft", "demucs", "librosa", "psycopg") if _missing(n)]
    print(f"libs ausentes     : {', '.join(faltan) or 'ninguna'}")
    ffmpeg = os.environ.get("TAMV_FFMPEG", "ffmpeg")
    print(f"ffmpeg            : {'en PATH' if _which(ffmpeg) else 'ausente'}")
    print("contrato          : AudioJob -> " + ",".join(AudioJob("i", "u", "p").__dataclass_fields__))
    print("huecos de esquema (cada uno es una migracion, no una opinion):")
    for name, why in SCHEMA_GAPS:
        print(f"  - {name}: {why}")
    return 0


def _missing(name: str) -> bool:
    import importlib.util

    return importlib.util.find_spec(name) is None


def _which(exe: str) -> bool:
    from shutil import which

    return which(exe) is not None


def main(argv: list[str] | None = None) -> int:
    # La consola de Windows arranca en cp1252 y revienta con una flecha o una E
    # acentuada (medido: UnicodeEncodeError en --help). Un servicio de audio que
    # imprime prompts en español necesita UTF-8 antes que cualquier print.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass

    parser = argparse.ArgumentParser(description="Pipeline de referencia TAMV (generar → separar → analizar).")
    parser.add_argument("--selfcheck", action="store_true", help="imprime licencias, pesos y dependencias")
    parser.add_argument("--enqueue", action="store_true", help="da de alta un trabajo de ejemplo")
    parser.add_argument("--worker", action="store_true", help="reclama y ejecuta trabajos")
    parser.add_argument("--once", action="store_true", help="con --worker: solo un trabajo")
    parser.add_argument("--prompt", default="balada andina con electrónica suave")
    parser.add_argument("--user", default="demo-user")
    parser.add_argument("--engine", default="ace-step", choices=sorted(ENGINES))
    parser.add_argument("--out", default="./.audio-out")
    args = parser.parse_args(argv)

    out_dir = Path(args.out).expanduser()
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.selfcheck:
        return selfcheck()
    if args.enqueue:
        enqueue(AudioJob(id="demo-0001", user_id=args.user, prompt=args.prompt, engine=args.engine))
        return 0
    if args.worker:
        while True:
            try:
                job = claim_next_job(f"worker-{os.getpid()}")
            except (RuntimeError, ImportError) as exc:
                # Sin base de datos ni driver el worker no traza un stack: dice
                # qué falta y sale con código 1, que es lo que lee un supervisor.
                print(f"worker detenido: {exc}", file=sys.stderr)
                return 1
            if job is None:
                print("cola vacía")
                return 0
            run_job(job, out_dir)
            print(job.to_json())
            if args.once:
                return 0
    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
