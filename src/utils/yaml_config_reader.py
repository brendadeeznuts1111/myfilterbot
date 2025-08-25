"""
YAML Configuration Reader for Python components
Provides compatibility with Bun's YAML configuration system
"""

import os
import yaml
import re
from pathlib import Path
from typing import Any, Dict, Optional, Union
import logging

logger = logging.getLogger(__name__)


class YamlConfigReader:
    """Read and interpolate YAML configuration files"""
    
    def __init__(self, config_dir: str = None):
        """Initialize YAML config reader
        
        Args:
            config_dir: Directory containing YAML config files
        """
        self.config_dir = Path(config_dir or os.path.join(os.getcwd(), 'config'))
        self.environment = os.getenv('NODE_ENV', 'development')
        self._cache = {}
        
    def _interpolate_env_vars(self, value: Any) -> Any:
        """Interpolate environment variables in configuration values
        
        Supports ${VAR_NAME} and ${VAR_NAME:-defaultValue} syntax
        """
        if isinstance(value, str):
            # Pattern to match ${VAR} or ${VAR:-default}
            pattern = r'\$\{([^:-]+)(?::([^}]+))?\}'
            
            def replacer(match):
                var_name = match.group(1)
                default_value = match.group(2) or ''
                return os.getenv(var_name, default_value)
            
            return re.sub(pattern, replacer, value)
        
        elif isinstance(value, dict):
            return {k: self._interpolate_env_vars(v) for k, v in value.items()}
        
        elif isinstance(value, list):
            return [self._interpolate_env_vars(item) for item in value]
        
        return value
    
    def _deep_merge(self, target: dict, source: dict) -> dict:
        """Deep merge two dictionaries"""
        if not source:
            return target
        if not target:
            return source
            
        result = target.copy()
        
        for key, value in source.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
                
        return result
    
    def load_config(self, filename: str, use_cache: bool = True) -> Dict[str, Any]:
        """Load a YAML configuration file
        
        Args:
            filename: Name of the YAML file (without path)
            use_cache: Whether to use cached config
            
        Returns:
            Parsed and interpolated configuration dictionary
        """
        cache_key = f"{filename}:{self.environment}"
        
        if use_cache and cache_key in self._cache:
            return self._cache[cache_key]
        
        try:
            # Load base configuration
            base_path = self.config_dir / filename
            config = {}
            
            if base_path.exists():
                with open(base_path, 'r') as f:
                    config = yaml.safe_load(f) or {}
            
            # Check for environment-specific configuration in the base file
            if 'environments' in config and self.environment in config['environments']:
                env_config = config['environments'][self.environment]
                config = self._deep_merge(config, env_config)
                del config['environments']
            
            # Try to load environment-specific file
            env_filename = filename.replace('.yaml', '')
            env_path = self.config_dir / 'environments' / f'{self.environment}.yaml'
            
            if env_path.exists():
                with open(env_path, 'r') as f:
                    env_config = yaml.safe_load(f) or {}
                    # Merge environment-specific config
                    if env_filename in env_config:
                        config = self._deep_merge(config, env_config[env_filename])
                    else:
                        config = self._deep_merge(config, env_config)
            
            # Interpolate environment variables
            config = self._interpolate_env_vars(config)
            
            # Cache the result
            self._cache[cache_key] = config
            
            return config
            
        except Exception as e:
            logger.error(f"Failed to load YAML config {filename}: {e}")
            return {}
    
    def get_app_config(self) -> Dict[str, Any]:
        """Get application configuration"""
        return self.load_config('app.yaml')
    
    def get_database_config(self, connection_name: str = 'postgres') -> Dict[str, Any]:
        """Get database configuration for specific connection"""
        config = self.load_config('database.yaml')
        
        # Check for environment-specific override
        env_config = config.get('environments', {}).get(self.environment, {})
        if connection_name in env_config:
            return env_config[connection_name]
        
        return config.get('connections', {}).get(connection_name, {})
    
    def get_features_config(self) -> Dict[str, Any]:
        """Get features configuration"""
        return self.load_config('features.yaml')
    
    def is_feature_enabled(self, feature_name: str, user_id: Optional[str] = None) -> bool:
        """Check if a feature is enabled for a user
        
        Args:
            feature_name: Name of the feature
            user_id: Optional user ID for rollout percentage
            
        Returns:
            True if feature is enabled
        """
        features = self.get_features_config()
        feature = features.get('features', {}).get(feature_name, {})
        
        if not feature.get('enabled', False):
            return False
        
        # Check rollout percentage
        rollout = feature.get('rolloutPercentage', 100)
        if rollout < 100 and user_id:
            # Simple hash-based rollout
            hash_value = sum(ord(c) for c in user_id)
            if (hash_value % 100) >= rollout:
                return False
        
        # Check allowed users
        allowed_users = feature.get('allowedUsers', [])
        if allowed_users and user_id:
            return user_id in allowed_users
        
        return True
    
    def get_value(self, path: str, default: Any = None) -> Any:
        """Get a value from app config by dot-notation path
        
        Args:
            path: Dot-notation path (e.g., 'server.api.port')
            default: Default value if path not found
            
        Returns:
            Configuration value or default
        """
        config = self.get_app_config()
        
        keys = path.split('.')
        value = config
        
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
                if value is None:
                    return default
            else:
                return default
        
        return value
    
    def reload(self):
        """Clear cache and reload configuration"""
        self._cache.clear()
        logger.info("YAML configuration cache cleared")


# Global instance
yaml_config = YamlConfigReader()


# Convenience functions
def get_config(filename: str) -> Dict[str, Any]:
    """Get configuration from YAML file"""
    return yaml_config.load_config(filename)


def get_app_config() -> Dict[str, Any]:
    """Get application configuration"""
    return yaml_config.get_app_config()


def get_database_config(connection_name: str = 'postgres') -> Dict[str, Any]:
    """Get database configuration"""
    return yaml_config.get_database_config(connection_name)


def is_feature_enabled(feature_name: str, user_id: Optional[str] = None) -> bool:
    """Check if feature is enabled"""
    return yaml_config.is_feature_enabled(feature_name, user_id)


def get_config_value(path: str, default: Any = None) -> Any:
    """Get configuration value by path"""
    return yaml_config.get_value(path, default)