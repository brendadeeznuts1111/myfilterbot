import pytest
import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from config.settings import settings

def test_settings_load_defaults():
    """Test that settings load with default values correctly."""
    assert settings.PORTAL_SERVER_URL == "http://localhost:5000"
    assert settings.HOST == "0.0.0.0"
    assert settings.PORT == 5000
    assert settings.DEBUG == False

def test_settings_override_from_env(monkeypatch):
    """Test that settings can be overridden by environment variables."""
    monkeypatch.setenv("PORTAL_SERVER_URL", "http://test.example.com")
    monkeypatch.setenv("HOST", "127.0.0.1")
    monkeypatch.setenv("PORT", "8000")
    monkeypatch.setenv("DEBUG", "True")

    # Reload settings to pick up environment variables
    from importlib import reload
    import config.settings
    reload(config.settings)
    reloaded_settings = config.settings.settings

    assert reloaded_settings.PORTAL_SERVER_URL == "http://test.example.com"
    assert reloaded_settings.HOST == "127.0.0.1"
    assert reloaded_settings.PORT == 8000
    assert reloaded_settings.DEBUG == True

    # Clean up: reload original settings to avoid affecting other tests
    reload(config.settings)
