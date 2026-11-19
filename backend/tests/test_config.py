import os
import pathlib
import pytest
from src.config import get_settings

def test_settings_resolves_data_dir():
    settings = get_settings()
    assert settings.DATA_DIR.exists(), f"DATA_DIR does not exist at {settings.DATA_DIR}"
    assert settings.VAL_DIR.exists(), f"VAL_DIR does not exist at {settings.VAL_DIR}"
    assert settings.SUPPLEMENT_DIR.exists(), f"SUPPLEMENT_DIR does not exist at {settings.SUPPLEMENT_DIR}"
    assert settings.META_DIR.exists(), f"META_DIR does not exist at {settings.META_DIR}"

def test_settings_custom_env_override(monkeypatch):
    custom_path = "c:/nonexistent_test_path"
    monkeypatch.setenv("STL_DATA_DIR", custom_path)
    from src.config import Settings
    s = Settings()
    assert str(s.DATA_DIR).replace("\\", "/") == custom_path
