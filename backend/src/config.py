import pathlib
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "C9 Oracle VALORANT Assistant Coach"
    API_PORT: int = 8000
    API_HOST: str = "127.0.0.1"

    # Base directory of backend (c9-oracle/backend)
    BASE_DIR: pathlib.Path = pathlib.Path(__file__).resolve().parent.parent
    # Project root (c9-oracle)
    PROJECT_ROOT: pathlib.Path = pathlib.Path(__file__).resolve().parent.parent.parent

    # VLR API Configuration
    VLR_API_BASE_URL: str = "https://vlrggapi.vercel.app"
    VLR_CACHE_TTL: int = 300


@lru_cache()
def get_settings() -> Settings:
    return Settings()
