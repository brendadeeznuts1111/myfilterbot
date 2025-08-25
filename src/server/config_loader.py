"""
Environment Configuration Loader for FantDev Trading Platform
Loads configuration from environment variables with fallback to defaults
"""

import os
from pathlib import Path
from typing import Any, Dict, Optional
from dotenv import load_dotenv

# Load environment variables from .env files
# Priority (highest to lowest): .env.local > .env.[NODE_ENV] > .env
env_mode = os.getenv('NODE_ENV', 'development')

# Load base .env file
load_dotenv('.env')

# Load environment-specific file
if env_mode:
    env_file = f'.env.{env_mode}'
    if Path(env_file).exists():
        load_dotenv(env_file, override=True)

# Load local overrides (highest priority)
if Path('.env.local').exists():
    load_dotenv('.env.local', override=True)


class Config:
    """Centralized configuration management"""
    
    # Bot Configuration
    BOT_TOKEN: str = os.getenv('BOT_TOKEN', '')
    ADMIN_CHAT_ID: str = os.getenv('ADMIN_CHAT_ID', '-2714719687')
    
    # Database Configuration
    DATABASE_PATH: str = os.getenv('DATABASE_PATH', 'customer_database.json')
    SQLITE_DB_PATH: str = os.getenv('SQLITE_DB_PATH', 'group_monitor.db')
    CHAT_TRACKER_DB: str = os.getenv('CHAT_TRACKER_DB', 'chat_tracker.db')
    
    # Server Configuration
    FLASK_PORT: int = int(os.getenv('FLASK_PORT', '5000'))
    BUN_PORT: int = int(os.getenv('BUN_PORT', '3000'))
    WEBSOCKET_PORT: int = int(os.getenv('WEBSOCKET_PORT', '8080'))
    
    # API Keys
    PAYMENT_GATEWAY_API_KEY: str = os.getenv('PAYMENT_GATEWAY_API_KEY', '')
    ANALYTICS_API_KEY: str = os.getenv('ANALYTICS_API_KEY', '')
    
    # Security
    JWT_SECRET_KEY: str = os.getenv('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
    SESSION_SECRET: str = os.getenv('SESSION_SECRET', 'dev-session-secret')
    ENCRYPTION_KEY: str = os.getenv('ENCRYPTION_KEY', '')
    
    # Feature Flags
    ENABLE_DEBUG_MODE: bool = os.getenv('ENABLE_DEBUG_MODE', 'false').lower() == 'true'
    ENABLE_WEBSOCKET: bool = os.getenv('ENABLE_WEBSOCKET', 'true').lower() == 'true'
    ENABLE_AUTO_REPORTER: bool = os.getenv('ENABLE_AUTO_REPORTER', 'true').lower() == 'true'
    ENABLE_WORKER_THREADS: bool = os.getenv('ENABLE_WORKER_THREADS', 'true').lower() == 'true'
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = int(os.getenv('RATE_LIMIT_REQUESTS', '100'))
    RATE_LIMIT_WINDOW: int = int(os.getenv('RATE_LIMIT_WINDOW', '60'))
    
    # Monitoring
    OTEL_EXPORTER_ENDPOINT: str = os.getenv('OTEL_EXPORTER_ENDPOINT', 'http://localhost:4317')
    MONITORING_ENABLED: bool = os.getenv('MONITORING_ENABLED', 'false').lower() == 'true'
    
    # Environment
    NODE_ENV: str = os.getenv('NODE_ENV', 'development')
    IS_PRODUCTION: bool = NODE_ENV == 'production'
    IS_DEVELOPMENT: bool = NODE_ENV == 'development'
    IS_TEST: bool = NODE_ENV == 'test'
    
    # Logging
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'info').upper()
    LOG_FILE_PATH: str = os.getenv('LOG_FILE_PATH', 'logs/app.log')
    
    # External Services
    NGROK_AUTH_TOKEN: str = os.getenv('NGROK_AUTH_TOKEN', '')
    CLOUDFLARE_API_TOKEN: str = os.getenv('CLOUDFLARE_API_TOKEN', '')
    
    # Telegram Dashboard
    TELEGRAM_API_ID: str = os.getenv('TELEGRAM_API_ID', '')
    TELEGRAM_API_HASH: str = os.getenv('TELEGRAM_API_HASH', '')
    TELEGRAM_SESSION_NAME: str = os.getenv('TELEGRAM_SESSION_NAME', 'fantdev_session')
    
    # Performance Settings
    WORKER_POOL_SIZE: int = int(os.getenv('WORKER_POOL_SIZE', '4'))
    MAX_CONCURRENT_REQUESTS: int = int(os.getenv('MAX_CONCURRENT_REQUESTS', '50'))
    CACHE_TTL: int = int(os.getenv('CACHE_TTL', '300'))
    
    # Backup Configuration
    BACKUP_ENABLED: bool = os.getenv('BACKUP_ENABLED', 'true').lower() == 'true'
    BACKUP_INTERVAL: int = int(os.getenv('BACKUP_INTERVAL', '3600'))
    BACKUP_RETENTION_DAYS: int = int(os.getenv('BACKUP_RETENTION_DAYS', '30'))
    
    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration"""
        errors = []
        
        # Check required fields
        if not cls.BOT_TOKEN and cls.IS_PRODUCTION:
            errors.append("BOT_TOKEN is required in production")
        
        if not cls.JWT_SECRET_KEY or cls.JWT_SECRET_KEY == 'dev-secret-key-change-in-production':
            if cls.IS_PRODUCTION:
                errors.append("JWT_SECRET_KEY must be set to a secure value in production")
        
        if errors:
            for error in errors:
                print(f"Configuration Error: {error}")
            return False
        
        return True
    
    @classmethod
    def get_database_url(cls) -> str:
        """Get database URL based on environment"""
        if cls.IS_TEST:
            return ':memory:'  # Use in-memory database for tests
        return cls.DATABASE_PATH
    
    @classmethod
    def to_dict(cls) -> Dict[str, Any]:
        """Export configuration as dictionary (excluding sensitive data)"""
        return {
            key: value for key, value in cls.__dict__.items()
            if not key.startswith('_') and not callable(value)
            and key not in ['BOT_TOKEN', 'JWT_SECRET_KEY', 'SESSION_SECRET', 
                          'ENCRYPTION_KEY', 'PAYMENT_GATEWAY_API_KEY', 
                          'ANALYTICS_API_KEY', 'NGROK_AUTH_TOKEN',
                          'CLOUDFLARE_API_TOKEN', 'TELEGRAM_API_HASH']
        }
    
    @classmethod
    def print_config(cls) -> None:
        """Print current configuration (for debugging)"""
        print("\n=== FantDev Trading Platform Configuration ===")
        print(f"Environment: {cls.NODE_ENV}")
        print(f"Debug Mode: {cls.ENABLE_DEBUG_MODE}")
        print(f"WebSocket: {cls.ENABLE_WEBSOCKET}")
        print(f"Workers: {cls.ENABLE_WORKER_THREADS}")
        print(f"Flask Port: {cls.FLASK_PORT}")
        print(f"Bun Port: {cls.BUN_PORT}")
        print(f"Database: {cls.get_database_url()}")
        print("=" * 50 + "\n")


# Validate configuration on import
if __name__ == "__main__":
    Config.print_config()
    if Config.validate():
        print("✅ Configuration is valid")
    else:
        print("❌ Configuration validation failed")