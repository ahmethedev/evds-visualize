# EVDS Görselleştirme

TCMB EVDS verisini genel kitle için erişilebilir kılan web uygulaması.

Yol haritası ve mimari için bkz. [ROADMAP.md](./ROADMAP.md).

## Geliştirme

Gereksinimler: Docker + Docker Compose (v2).

```bash
cp .env.example .env
# .env içine EVDS_API_KEY'i yaz

docker compose -f docker-compose.dev.yml up
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:8000 (healthcheck: `/healthz`)

## Üretim (VPS)

```bash
docker compose up -d --build
```

nginx 80/443'e oturur, `/api/*` backend'e, kalanı frontend'e gider.

## Dizin

- `backend/` — FastAPI + EVDS client + SQLite cache
- `frontend/` — Vite + React + Tailwind
- `nginx/` — prod reverse proxy
- `explore/` — keşif betikleri (üretimde kullanılmaz)
