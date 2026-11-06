"""Flujo de referencia del motor de audio de TAMV Play & Go.

Documento padre: docs/ESTRATEGIA-ABIERTA-PLAY-AND-GO.md (§3 reglas del monorepo,
§4 flujo MusicGen + Demucs). Este archivo es REFERENCIA EJECUTABLE, no está
montado en la app: nadie lo llama desde Next.js todavía.

Qué demuestra, en una sola pieza:

1. Un trabajo de audio es asíncrono y por fases (generar → separar → analizar),
   nunca una petición HTTP sincrona.
2. La cola vive en Postgres y se reclama con `FOR UPDATE SKIP LOCKED`; el cupo
   del usuario se descuenta en la MISMA transacción del reclamado, así un crash
   no puede regalar generaciones.
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
        license="MIT",
        commercial_ok=True,
        notes="Alternativa ligera; menos control por secciones.",
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

SEPARATOR = Engine(
    key="htdemucs",
    family="demucs",
    weights_file="htdemucs.tar",
    sha256="",
    license="MIT (código) — cuidado: MUSDB18-HQ tiene uso no comercial",
    commercial_ok=True,
    notes="El checkpoint entrenado con MUSDB18-HQ arrastra la restricción del dataset.",
)


def weights_dir() -> Path:
    return Path(os.environ.get("TAMV_WEIGHTS_DIR", "./.weights")).expanduser()


def is_commercial() -> bool:
    return os.environ.get("TAMV_COMMERCIAL", "1") == "1"


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
            f"comercial (TAMV_COMMERCIAL=1). Elige un motor commercial_ok."
        )


# --------------------------------------------------------------------------
# 2. Contrato del trabajo. Es el único objeto que cruzan Python y TypeScript:
#    packages/shared-contract se genera a partir de estos campos.
# --------------------------------------------------------------------------


@dataclass
class AudioJob:
    id: str
    user_id: str
    prompt: str
    engine: str = "ace-step"
    duration_s: int = 30
    seed: int = field(default_factory=lambda: int(time.time()) % 10_000)
    status: str = "queued"  # queued|generating|separating|analyzing|ready|failed
    stems: dict[str, str] = field(default_factory=dict)
    metrics: dict[str, Any] = field(default_factory=dict)
    provenance: dict[str, Any] = field(default_factory=dict)
    error: str = ""

    def to_json(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False, indent=2)


# --------------------------------------------------------------------------
# 3. Cola en Postgres. Reclamar y descontar cupo, en la misma transacción.
# --------------------------------------------------------------------------

SQL_CLAIM = """
WITH next AS (
  SELECT id FROM audio_job
   WHERE status = 'queued'
   ORDER BY created_at
   FOR UPDATE SKIP LOCKED
   LIMIT 1
)
UPDATE audio_job j
   SET status = 'generating', claimed_at = now(), worker_id = %(worker)s
  FROM next
 WHERE j.id = next.id
RETURNING j.*;
"""

# `consume_quota` es la RPC que ya existe en el repo (supabase/migrations):
# inserta el consumo y devuelve el cupo restante; si no hay, hace ROLLBACK entero.
SQL_CONSUME = "SELECT public.consume_quota(%(user)s, %(kind)s) AS remaining;"
SQL_REFUND = "SELECT public.refund_quota(%(user)s, %(job)s);"


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
        cur.execute(SQL_CLAIM, {"worker": worker_id})
        row = cur.fetchone()
        if row is None:
            conn.rollback()
            return None
        job = row_to_job(row, cur.description)
        # El cupo se descuenta aquí dentro: si el proceso muere antes del COMMIT,
        # el trabajo vuelve a 'queued' y el usuario conserva su crédito.
        cur.execute(SQL_CONSUME, {"user": job.user_id, "kind": job.engine})
        conn.commit()
    return job


def row_to_job(row, description) -> AudioJob:  # noqa: ANN001 - tipado del driver
    names = [d.name for d in description]
    data = dict(zip(names, row))
    return AudioJob(
        id=str(data.get("id", "")),
        user_id=str(data.get("user_id", "")),
        prompt=str(data.get("prompt", "")),
        engine=str(data.get("engine", "ace-step")),
        duration_s=int(data.get("duration_s", 30)),
        seed=int(data.get("seed", 0)),
        status=str(data.get("status", "generating")),
    )


def mark(job: AudioJob, status: str) -> None:
    """Persistencia del estado. En la referencia se imprime; en producción, UPDATE."""
    job.status = status
    print(f"[job {job.id[:8]}] {status}", flush=True)


# --------------------------------------------------------------------------
# 4. Fases. Cada una importa su pesada solo cuando toca ejecutarla.
# --------------------------------------------------------------------------


def generate(job: AudioJob, out_dir: Path) -> Path:
    """Motor de composición → wav a 48 kHz estéreo (el mix completo)."""
    engine = ENGINES[job.engine]
    assert_usage_rights(engine)
    resolve_weights(engine)
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
        engine=engine.key, license=engine.license, seed=job.seed, prompt=job.prompt
    )
    return wav


def separate(job: AudioJob, mix: Path, out_dir: Path) -> dict[str, Path]:
    """Demucs → stems. Se separan 4 pistas; el `drums` alimenta el Mapa Emocional."""
    from demucs.separate import main as demucs_main  # type: ignore

    stems_dir = out_dir / job.id
    demucs_main(["-n", "htdemucs", "--out", str(stems_dir), str(mix)])
    done = {name: stems_dir / "htdemucs" / mix.stem / f"{name}.wav" for name in ("drums", "bass", "other", "vocals")}
    job.stems = {k: str(v) for k, v in done.items()}
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
        "loudness_rms": round(rms, 4),
        "texture": round(zero_rate, 4),
        "beats": int(len(beats)),
        "duration_s": round(float(len(y) / sr), 2),
    }
    return job.metrics


# --------------------------------------------------------------------------
# 5. Orquestación: fases + reintegro del cupo si algo falla.
# --------------------------------------------------------------------------


def run_job(job: AudioJob, out_dir: Path) -> AudioJob:
    try:
        mix = generate(job, out_dir)
        mark(job, "separating")
        separate(job, mix, out_dir)
        mark(job, "analyzing")
        analyze(job, mix)
        job.provenance["pipeline_version"] = "0.1.0-reference"
        mark(job, "ready")
    except Exception as exc:  # noqa: BLE001 - el worker no puede morir en silencio
        job.error = f"{type(exc).__name__}: {exc}"
        mark(job, "failed")
        # Sin reintegro el usuario paga un fallo ajeno; con él, la promesa de
        # "no gastas cupo si no hay audio" es verificable.
        print(f"  refund_quota(user={job.user_id}, job={job.id}) — pendiente de conectar", flush=True)
        print(f"  motivo: {job.error}", flush=True)
    return job


def enqueue(job: AudioJob) -> None:
    """Alta en la cola. Next.js solo escribe aquí; jamás genera en la petición."""
    print(SQL_CLAIM.strip().splitlines()[0], "…(INSERT real en producción)")
    print(job.to_json())


def selfcheck() -> int:
    print(f"python            : {sys.version.split()[0]}")
    print(f"comercial         : {is_commercial()}")
    print(f"pesos             : {weights_dir()} ({'existe' if weights_dir().exists() else 'ausente'})")
    for engine in ENGINES.values():
        bloqueo = "BLOQUEADO en comercial" if is_commercial() and not engine.commercial_ok else "permitido"
        print(f"  {engine.key:<15}: {engine.license}  ->  {bloqueo}")
    faltan = [n for n in ("torch", "audiocraft", "demucs", "librosa", "psycopg") if _missing(n)]
    print(f"libs ausentes     : {', '.join(faltan) or 'ninguna'}")
    ffmpeg = os.environ.get("TAMV_FFMPEG", "ffmpeg")
    print(f"ffmpeg            : {'en PATH' if _which(ffmpeg) else 'ausente'}")
    print("contrato          : AudioJob -> " + ",".join(AudioJob("i", "u", "p").__dataclass_fields__))
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
