from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import catalog, composition, dashboard, health, series

app = FastAPI(title="makroturkiye API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(composition.router)
app.include_router(dashboard.router)
app.include_router(catalog.router)
app.include_router(series.router)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "evds-backend", "docs": "/docs", "health": "/healthz"}
