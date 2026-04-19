from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from .routes import catalog, composition, dashboard, health, search, series
from .search import search_index


@asynccontextmanager
async def lifespan(_: FastAPI):
    search_index.ensure_built_async()
    yield


def _client_ip(request: Request) -> str:
    """Prefer Cloudflare's CF-Connecting-IP, then X-Forwarded-For, else peer."""
    cf = request.headers.get("cf-connecting-ip")
    if cf:
        return cf.strip()
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(
    key_func=_client_ip,
    default_limits=["120/minute", "2000/hour"],
    headers_enabled=True,
)

app = FastAPI(
    title="makroturkiye API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://makroturkiye.com",
        "https://www.makroturkiye.com",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(composition.router)
app.include_router(dashboard.router)
app.include_router(catalog.router)
app.include_router(series.router)
app.include_router(search.router)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "evds-backend", "health": "/healthz"}
