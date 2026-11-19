import os
import pathlib
from functools import lru_cache
from typing import Optional
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
    # Default data dir sibling to c9-oracle (c9 Hackathon/stl-hackathon-2026-grid-starter)
    DEFAULT_DATA_DIR: pathlib.Path = (
        pathlib.Path(__file__).resolve().parent.parent.parent.parent
        / "stl-hackathon-2026-grid-starter"
    )

    STL_DATA_DIR: Optional[str] = None

    @property
    def DATA_DIR(self) -> pathlib.Path:
        raw = self.STL_DATA_DIR or os.environ.get("STL_DATA_DIR")
        if raw:
            p = pathlib.Path(raw)
            if p.is_absolute():
                return p
            p_from_root = (self.PROJECT_ROOT / p).resolve()
            if p_from_root.exists():
                return p_from_root
            p_from_cwd = (pathlib.Path.cwd() / p).resolve()
            if p_from_cwd.exists():
                return p_from_cwd
            return p_from_root
        return self.DEFAULT_DATA_DIR

    @property
    def VAL_DIR(self) -> pathlib.Path:
        return self.DATA_DIR / "val"

    @property
    def SUPPLEMENT_DIR(self) -> pathlib.Path:
        return self.DATA_DIR / "val-ability-supplements"

    @property
    def META_DIR(self) -> pathlib.Path:
        return self.DATA_DIR / "meta"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
