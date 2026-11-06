import json
import sys

import yaml

ROOT = r"C:/Users/tamvo/Downloads/tamvonline-weboficial-com/interfaz-curso-musica-ai-18"

with open(ROOT + "/docs/api/openapi.yaml", encoding="utf-8") as handle:
    spec = yaml.safe_load(handle)

print("yaml OK  version:", spec["info"]["version"], " rutas:", len(spec["paths"]))

err = spec["components"]["schemas"]["ErrorResponse"]
codes = err["properties"]["code"]["enum"]
print("required error:", err["required"], " codigos:", len(codes))

# Los codigos declarados deben existir literalmente en el codigo fuente.
import pathlib
import re

src = {}
for path in pathlib.Path(ROOT + "/app/api").rglob("route.ts"):
    src[str(path)] = path.read_text(encoding="utf-8")
blob = "\n".join(src.values())

faltantes = [c for c in codes if "code: '" + c + "'" not in blob]
print("codigos declarados sin emision:", faltantes or "ninguno")

emitidos = set(re.findall(r"code: '([a-z_]+)'", blob))
sobrantes = sorted(emitidos - set(codes))
print("codigos emitidos sin documentar:", sobrantes or "ninguno")

with open(ROOT + "/docs/api/agent-readiness.json", encoding="utf-8") as handle:
    ar = json.load(handle)
print("agent-readiness fecha:", ar.get("fecha_evaluacion"), " puntuacion:", ar.get("puntuacion_final"))
