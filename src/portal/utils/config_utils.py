import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def load_customer_config(customer_id: str) -> dict | None:
    """Load customer configuration from customer_config.json"""
    try:
        # Assuming customer_config.json is at the root of the project or in the config directory
        # Adjust path as necessary based on actual project structure
        config_path = Path(__file__).parent.parent.parent.parent / 'config' / 'customer_config.json'
        if config_path.exists():
            with open(config_path, 'r') as f:
                config = json.load(f)
                return config.get('customers', {}).get(customer_id)
    except Exception as e:
        logger.warning(f'Could not load customer config: {e}')
    return None

def load_customer_config_file() -> dict | None:
    """Load the complete customer configuration file (enhanced version preferred)"""
    try:
        # Try enhanced config first
        enhanced_path = Path(__file__).parent.parent.parent.parent / 'customer_config_enhanced.json'
        if enhanced_path.exists():
            with open(enhanced_path, 'r') as f:
                config = json.load(f)
                logger.info(f"Loaded enhanced customer config v{config.get('version', '1.0')}")
                return config

        # Fallback to basic config
        basic_path = Path(__file__).parent.parent.parent.parent / 'customer_config.json'
        if basic_path.exists():
            with open(basic_path, 'r') as f:
                config = json.load(f)
                logger.info("Loaded basic customer config")
                return config

    except Exception as e:
        logger.warning(f'Could not load customer config: {e}')
    return None
