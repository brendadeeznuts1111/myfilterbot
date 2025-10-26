"""
Application Constants and Configuration
Centralized configuration for all hardcoded values
"""

import os
from typing import Dict, Any
from dataclasses import dataclass

@dataclass
class TimeoutConfig:
    """Timeout configuration values"""
    # Session timeouts (seconds)
    SESSION_TIMEOUT: int = 86400  # 24 hours
    REMEMBER_ME_TIMEOUT: int = 2592000  # 30 days
    
    # API timeouts (seconds)
    API_REQUEST_TIMEOUT: int = 30
    WEBSOCKET_PING_TIMEOUT: int = 30
    DATABASE_QUERY_TIMEOUT: int = 10
    
    # Rate limiting windows (seconds)
    RATE_LIMIT_WINDOW: int = 60
    AGGRESSIVE_RATE_LIMIT_WINDOW: int = 1
    
    # Circuit breaker timeouts (seconds)
    CIRCUIT_BREAKER_RESET_TIMEOUT: int = 30
    AGGRESSIVE_CIRCUIT_BREAKER_RESET_TIMEOUT: int = 10

@dataclass
class ThresholdConfig:
    """Threshold configuration values"""
    # Financial thresholds
    LOW_BALANCE_THRESHOLD: float = float(os.getenv("LOW_BALANCE_THRESHOLD", "100"))
    LARGE_DEPOSIT_THRESHOLD: float = float(os.getenv("LARGE_DEPOSIT_THRESHOLD", "1000"))
    LARGE_WITHDRAWAL_THRESHOLD: float = float(os.getenv("LARGE_WITHDRAWAL_THRESHOLD", "500"))
    
    # Activity thresholds
    INACTIVE_DAYS_THRESHOLD: int = int(os.getenv("INACTIVE_DAYS_THRESHOLD", "3"))
    MAX_LOGIN_ATTEMPTS: int = 5
    
    # Rate limiting thresholds
    MAX_REQUESTS_PER_WINDOW: int = 100
    AGGRESSIVE_MAX_REQUESTS: int = 5
    
    # Circuit breaker thresholds
    ERROR_THRESHOLD: int = 10
    AGGRESSIVE_ERROR_THRESHOLD: int = 3

@dataclass
class NetworkConfig:
    """Network and connection configuration"""
    # Default ports
    DEFAULT_FLASK_PORT: int = 5000
    DEFAULT_BUN_PORT: int = 3000
    DEFAULT_WEBSOCKET_PORT: int = 8080
    DEFAULT_REDIS_PORT: int = 6379
    DEFAULT_PAYMENT_PORT: int = 5001
    
    # Connection settings
    REDIS_HOST: str = "localhost"
    REDIS_DB: int = 0
    
    # API endpoints
    TELEGRAM_API_BASE: str = "https://api.telegram.org"
    CLOUDFLARE_API_BASE: str = "https://api.cloudflare.com/client/v4"

@dataclass
class MessageConfig:
    """Message and communication configuration"""
    # Message limits
    MAX_MESSAGE_LENGTH: int = 4096
    MAX_INLINE_BUTTONS: int = 100
    MAX_CALLBACK_DATA_LENGTH: int = 64
    
    # Delays and intervals (seconds)
    FORWARD_DELAY: float = 0.5
    TYPING_DELAY: float = 1.0
    NOTIFICATION_DELAY: float = 2.0
    
    # Retry settings
    MAX_RETRY_ATTEMPTS: int = 3
    RETRY_DELAY: float = 1.0

@dataclass
class PerformanceConfig:
    """Performance and scaling configuration"""
    # Worker and thread settings
    WORKER_POOL_SIZE: int = int(os.getenv("WORKER_POOL_SIZE", "4"))
    MAX_CONCURRENT_REQUESTS: int = int(os.getenv("MAX_CONCURRENT_REQUESTS", "50"))
    MAX_CUSTOMERS: int = 250
    MAX_CONCURRENT_GROUPS: int = 50
    
    # Cache settings
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "300"))  # 5 minutes
    REDIS_CACHE_TTL: int = 3600  # 1 hour
    
    # Batch processing
    QUEUE_BATCH_SIZE: int = 100
    DATABASE_BATCH_SIZE: int = 50

@dataclass
class SecurityConfig:
    """Security configuration"""
    # Token and key lengths
    SESSION_TOKEN_LENGTH: int = 32
    JWT_TOKEN_LENGTH: int = 32
    ENCRYPTION_KEY_LENGTH: int = 32
    
    # Password requirements
    MIN_PASSWORD_LENGTH: int = 8
    MAX_PASSWORD_LENGTH: int = 128
    
    # Rate limiting for security
    LOGIN_RATE_LIMIT: int = 5  # attempts per minute
    REGISTRATION_RATE_LIMIT: int = 3  # attempts per hour

@dataclass
class BackupConfig:
    """Backup and maintenance configuration"""
    # Backup intervals (seconds)
    BACKUP_INTERVAL: int = int(os.getenv("BACKUP_INTERVAL", "3600"))  # 1 hour
    BACKUP_RETENTION_DAYS: int = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
    
    # Cleanup intervals
    LOG_CLEANUP_DAYS: int = 7
    SESSION_CLEANUP_INTERVAL: int = 3600  # 1 hour
    TEMP_FILE_CLEANUP_HOURS: int = 24

@dataclass
class MonitoringConfig:
    """Monitoring and logging configuration"""
    # Log levels and rotation
    LOG_MAX_SIZE_MB: int = 100
    LOG_BACKUP_COUNT: int = 5
    
    # Health check intervals (seconds)
    HEALTH_CHECK_INTERVAL: int = 60
    DATABASE_HEALTH_CHECK_INTERVAL: int = 300
    
    # Metrics collection
    METRICS_COLLECTION_INTERVAL: int = 30
    PERFORMANCE_SAMPLE_RATE: float = 0.1

class AppConstants:
    """Centralized application constants"""
    
    def __init__(self):
        """
        Initialize an AppConstants instance by creating and attaching all grouped configuration dataclass instances.
        
        Creates the following attributes:
        - timeout: TimeoutConfig — session, API, database, rate-limit and circuit-breaker timeouts.
        - threshold: ThresholdConfig — financial, activity, rate-limiting, and circuit-breaker thresholds.
        - network: NetworkConfig — network ports, hosts, and external API base URLs.
        - message: MessageConfig — message length limits, delays, and retry settings.
        - performance: PerformanceConfig — worker/pool sizes, concurrency limits, cache TTLs, and batch sizes.
        - security: SecurityConfig — token lengths, password constraints, and rate limits.
        - backup: BackupConfig — backup intervals, retention and cleanup timings.
        - monitoring: MonitoringConfig — logging, health-check, and metrics collection parameters.
        
        No parameters or return value. The created attributes provide centralized, hardcoded defaults; environment-based overrides (if used) are handled where individual dataclasses read os.getenv.
        """
        self.timeout = TimeoutConfig()
        self.threshold = ThresholdConfig()
        self.network = NetworkConfig()
        self.message = MessageConfig()
        self.performance = PerformanceConfig()
        self.security = SecurityConfig()
        self.backup = BackupConfig()
        self.monitoring = MonitoringConfig()
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Return a dictionary representation of all grouped configuration objects.
        
        Each top-level key is a category name ('timeout', 'threshold', 'network',
        'message', 'performance', 'security', 'backup', 'monitoring') and maps to a
        shallow dict of that category's dataclass attributes (obtained via each
        dataclass's __dict__).
        
        Returns:
            Dict[str, Any]: Mapping of configuration category names to their attribute
            dictionaries.
        """
        return {
            'timeout': self.timeout.__dict__,
            'threshold': self.threshold.__dict__,
            'network': self.network.__dict__,
            'message': self.message.__dict__,
            'performance': self.performance.__dict__,
            'security': self.security.__dict__,
            'backup': self.backup.__dict__,
            'monitoring': self.monitoring.__dict__,
        }
    
    def get_env_overrides(self) -> Dict[str, str]:
        """
        Return a flat mapping of environment-variable names to stringified current configuration values that can be used as external overrides.
        
        The mapping includes a curated subset of configurable items from the nested config objects: selected timeouts, financial thresholds, performance settings, and default network ports. Values are returned as strings (suitable for setting environment variables) and reflect the current state of this AppConstants instance.
        
        Returns:
            Dict[str, str]: Keys are environment variable-style names (e.g. 'SESSION_TIMEOUT', 'LOW_BALANCE_THRESHOLD', 'WORKER_POOL_SIZE', 'FLASK_PORT') and values are the corresponding configuration values converted to strings.
        """
        return {
            # Timeout overrides
            'SESSION_TIMEOUT': str(self.timeout.SESSION_TIMEOUT),
            'API_REQUEST_TIMEOUT': str(self.timeout.API_REQUEST_TIMEOUT),
            
            # Threshold overrides
            'LOW_BALANCE_THRESHOLD': str(self.threshold.LOW_BALANCE_THRESHOLD),
            'LARGE_DEPOSIT_THRESHOLD': str(self.threshold.LARGE_DEPOSIT_THRESHOLD),
            'LARGE_WITHDRAWAL_THRESHOLD': str(self.threshold.LARGE_WITHDRAWAL_THRESHOLD),
            
            # Performance overrides
            'WORKER_POOL_SIZE': str(self.performance.WORKER_POOL_SIZE),
            'MAX_CONCURRENT_REQUESTS': str(self.performance.MAX_CONCURRENT_REQUESTS),
            'CACHE_TTL': str(self.performance.CACHE_TTL),
            
            # Network overrides
            'FLASK_PORT': str(self.network.DEFAULT_FLASK_PORT),
            'BUN_PORT': str(self.network.DEFAULT_BUN_PORT),
            'WEBSOCKET_PORT': str(self.network.DEFAULT_WEBSOCKET_PORT),
        }

# Global constants instance
constants = AppConstants()

# Convenience exports for backward compatibility
TIMEOUT_CONFIG = constants.timeout
THRESHOLD_CONFIG = constants.threshold
NETWORK_CONFIG = constants.network
MESSAGE_CONFIG = constants.message
PERFORMANCE_CONFIG = constants.performance
SECURITY_CONFIG = constants.security
BACKUP_CONFIG = constants.backup
MONITORING_CONFIG = constants.monitoring

# Export for use in other modules
__all__ = [
    'AppConstants',
    'constants',
    'TIMEOUT_CONFIG',
    'THRESHOLD_CONFIG',
    'NETWORK_CONFIG',
    'MESSAGE_CONFIG',
    'PERFORMANCE_CONFIG',
    'SECURITY_CONFIG',
    'BACKUP_CONFIG',
    'MONITORING_CONFIG'
]
