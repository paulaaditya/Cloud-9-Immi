import pathlib
import pytest
from src.config import Settings, get_settings


def test_settings_default_values():
    settings = get_settings()
    assert settings.PROJECT_NAME == "C9 Oracle VALORANT Assistant Coach"
    assert settings.API_PORT == 8000
    assert settings.API_HOST == "127.0.0.1"
    assert settings.BASE_DIR.exists()
    assert settings.PROJECT_ROOT.exists()
    assert settings.VLR_API_BASE_URL == "https://vlrggapi.vercel.app"
    assert settings.VLR_CACHE_TTL == 300

    # The Scout engine still reads the GRID dataset, so its path settings stay.
    assert hasattr(settings, "VAL_DIR") and hasattr(settings, "META_DIR") and hasattr(settings, "SUPPLEMENT_DIR")


def test_settings_resolves_data_dir():
    settings = get_settings()
    if not settings.DATA_DIR.exists():
        pytest.skip("GRID dataset not available")
    assert settings.VAL_DIR.exists() and settings.SUPPLEMENT_DIR.exists() and settings.META_DIR.exists()


def test_settings_env_override(monkeypatch):
    monkeypatch.setenv("API_PORT", "9000")
    monkeypatch.setenv("VLR_API_BASE_URL", "https://custom-vlr-api.com")
    monkeypatch.setenv("VLR_CACHE_TTL", "600")

    s = Settings()
    assert s.API_PORT == 9000
    assert s.VLR_API_BASE_URL == "https://custom-vlr-api.com"
    assert s.VLR_CACHE_TTL == 600
