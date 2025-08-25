import pytest
from src.portal.utils.config_utils import load_customer_config, load_customer_config_file
from unittest.mock import patch, mock_open
import json

# Mock data for customer_config.json
MOCK_BASIC_CONFIG = {
    "customers": {
        "CUSTOMER1": {
            "name": "Test Customer 1",
            "keywords": ["test", "mock"]
        },
        "CUSTOMER2": {
            "name": "Test Customer 2"
        }
    },
    "group_chats": {
        "chat1": {"name": "Chat One"}
    },
    "global_keywords": ["global"]
}

# Mock data for customer_config_enhanced.json
MOCK_ENHANCED_CONFIG = {
    "version": "2.0",
    "customers": {
        "CUSTOMER1": {
            "name": "Test Customer 1 Enhanced",
            "keywords": ["enhanced", "test"]
        }
    },
    "agents": {
        "AGENT1": {"agent_id": "AGENT1", "agent_name": "Agent One"}
    }
}

@pytest.fixture
def mock_config_files(monkeypatch):
    """Fixture to mock file system for config loading tests."""
    def mock_exists(path):
        if "customer_config_enhanced.json" in str(path):
            return True
        if "customer_config.json" in str(path):
            return True
        return False

    def mock_read_data(path):
        if "customer_config_enhanced.json" in str(path):
            return json.dumps(MOCK_ENHANCED_CONFIG)
        if "customer_config.json" in str(path):
            return json.dumps(MOCK_BASIC_CONFIG)
        return ""

    monkeypatch.setattr("pathlib.Path.exists", mock_exists)
    monkeypatch.setattr("builtins.open", lambda f, mode='r': mock_open(read_data=mock_read_data(f)).return_value)

def test_load_customer_config_found(mock_config_files):
    """Test loading a specific customer config when found."""
    config = load_customer_config("CUSTOMER1")
    assert config is not None
    assert config["name"] == "Test Customer 1"
    assert "keywords" in config

def test_load_customer_config_not_found(mock_config_files):
    """Test loading a specific customer config when not found."""
    config = load_customer_config("NONEXISTENT")
    assert config is None

def test_load_customer_config_file_enhanced(mock_config_files):
    """Test loading the enhanced config file when it exists."""
    config = load_customer_config_file()
    assert config is not None
    assert config["version"] == "2.0"
    assert "agents" in config

@patch('pathlib.Path.exists', side_effect=lambda p: "customer_config.json" in str(p))
@patch('builtins.open', new_callable=mock_open, read_data=json.dumps(MOCK_BASIC_CONFIG))
def test_load_customer_config_file_basic_fallback(mock_open_func, mock_exists_func):
    """Test loading the basic config file when enhanced does not exist."""
    config = load_customer_config_file()
    assert config is not None
    assert "customers" in config
    assert "version" not in config # Enhanced version should not be present

@patch('pathlib.Path.exists', return_value=False)
def test_load_customer_config_file_none(mock_exists_func):
    """Test loading config when no files exist."""
    config = load_customer_config_file()
    assert config is None
