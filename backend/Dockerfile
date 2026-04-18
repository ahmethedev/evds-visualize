FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# uv — hızlı Python paket yöneticisi
COPY --from=ghcr.io/astral-sh/uv:0.5.4 /uv /usr/local/bin/uv

COPY pyproject.toml ./
RUN uv pip install --system --no-cache .

COPY app ./app

RUN mkdir -p /app/data

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz').read()"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
