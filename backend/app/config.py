from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    evds_api_key: str
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cache_db_path: str = "./data/cache.db"
    search_db_path: str | None = None
    log_level: str = "INFO"

    @model_validator(mode="after")
    def _default_search_db(self) -> "Settings":
        if not self.search_db_path:
            self.search_db_path = str(Path(self.cache_db_path).with_name("search.db"))
        return self


settings = Settings()
