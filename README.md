# makroturkiye

> **Uyarı:** Bu proje TCMB ile resmi bir bağlantısı olmayan bağımsız bir girişimdir.
> Veriler [TCMB EVDS](https://evds3.tcmb.gov.tr)'den alınır ve önbelleklenir; gecikme olabilir.
> Güncel/resmi değerler için EVDS esastır. Gösterilen hiçbir içerik yatırım tavsiyesi değildir.

TCMB EVDS verisini genel kitle için erişilebilir kılan web uygulaması. Yayın domaini: `makroturkiye.com`.

Yol haritası ve mimari için bkz. [ROADMAP.md](./ROADMAP.md).

## İlham ve teşekkürler

- UI fikri: [Paradigm Predictions](https://predictions.paradigm.xyz/) — treemap tabanlı kompozisyon görselleştirmesi buradan ilham aldı.
- EVDS client: [fatihmete/evds](https://github.com/fatihmete/evds) — TCMB EVDS REST API'sine Python sarmalayıcısı; backend bu kütüphaneyi kullanıyor.

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
## Dizin

- `backend/` — FastAPI + EVDS client + SQLite cache
- `frontend/` — Vite + React + Tailwind
- `explore/` — keşif betikleri (üretimde kullanılmaz)
