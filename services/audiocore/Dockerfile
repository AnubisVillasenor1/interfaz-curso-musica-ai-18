# TAMV-AudioCore v2.0 — servicio de referencia (NumPy, sin extensión nativa).
#
# Construir desde la raíz del repositorio:
#   docker build -f services/audiocore/Dockerfile -t tamv-audiocore:2.0 .
#
# Ejecutar con token obligatorio fuera de loopback:
#   docker run --rm -p 8000:8000 -e TAMV_AUDIO_CORE_TOKEN=... tamv-audiocore:2.0
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TAMV_AUDIO_CORE_HOST=0.0.0.0 \
    TAMV_AUDIO_CORE_PORT=8000

WORKDIR /app

# Dependencias primero: la capa se reutiliza mientras no cambie requirements.txt.
COPY services/audiocore/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/audiocore/audiocore ./audiocore
COPY services/audiocore/service.py ./service.py
COPY services/audiocore/tests ./tests

RUN addgroup --system audiocore && adduser --system --ingroup audiocore audiocore \
    && chown -R audiocore:audiocore /app
USER audiocore

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import json, urllib.request; data=json.load(urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)); raise SystemExit(0 if data.get('status') == 'ok' else 1)"

CMD ["python", "service.py"]
