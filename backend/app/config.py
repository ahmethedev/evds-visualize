from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    evds_api_key: str
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cache_db_path: str = "./data/cache.db"
    log_level: str = "INFO"


settings = Settings()
