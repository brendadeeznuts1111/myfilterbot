/**
 * Application Constants and Configuration
 * Centralized configuration for all hardcoded values
 */

export interface TimeoutConfig {
  // Session timeouts (seconds)
  SESSION_TIMEOUT: number;
  REMEMBER_ME_TIMEOUT: number;
  
  // API timeouts (seconds)
  API_REQUEST_TIMEOUT: number;
  WEBSOCKET_PING_TIMEOUT: number;
  DATABASE_QUERY_TIMEOUT: number;
  
  // Rate limiting windows (seconds)
  RATE_LIMIT_WINDOW: number;
  AGGRESSIVE_RATE_LIMIT_WINDOW: number;
  
  // Circuit breaker timeouts (seconds)
  CIRCUIT_BREAKER_RESET_TIMEOUT: number;
  AGGRESSIVE_CIRCUIT_BREAKER_RESET_TIMEOUT: number;
}

export interface ThresholdConfig {
  // Financial thresholds
  LOW_BALANCE_THRESHOLD: number;
  LARGE_DEPOSIT_THRESHOLD: number;
  LARGE_WITHDRAWAL_THRESHOLD: number;
  
  // Activity thresholds
  INACTIVE_DAYS_THRESHOLD: number;
  MAX_LOGIN_ATTEMPTS: number;
  
  // Rate limiting thresholds
  MAX_REQUESTS_PER_WINDOW: number;
  AGGRESSIVE_MAX_REQUESTS: number;
  
  // Circuit breaker thresholds
  ERROR_THRESHOLD: number;
  AGGRESSIVE_ERROR_THRESHOLD: number;
}

export interface NetworkConfig {
  // Default ports
  DEFAULT_FLASK_PORT: number;
  DEFAULT_BUN_PORT: number;
  DEFAULT_WEBSOCKET_PORT: number;
  DEFAULT_REDIS_PORT: number;
  DEFAULT_PAYMENT_PORT: number;
  
  // Connection settings
  REDIS_HOST: string;
  REDIS_DB: number;
  
  // API endpoints
  TELEGRAM_API_BASE: string;
  CLOUDFLARE_API_BASE: string;
}

export interface MessageConfig {
  // Message limits
  MAX_MESSAGE_LENGTH: number;
  MAX_INLINE_BUTTONS: number;
  MAX_CALLBACK_DATA_LENGTH: number;
  
  // Delays and intervals (seconds)
  FORWARD_DELAY: number;
  TYPING_DELAY: number;
  NOTIFICATION_DELAY: number;
  
  // Retry settings
  MAX_RETRY_ATTEMPTS: number;
  RETRY_DELAY: number;
}

export interface PerformanceConfig {
  // Worker and thread settings
  WORKER_POOL_SIZE: number;
  MAX_CONCURRENT_REQUESTS: number;
  MAX_CUSTOMERS: number;
  MAX_CONCURRENT_GROUPS: number;
  
  // Cache settings
  CACHE_TTL: number;
  REDIS_CACHE_TTL: number;
  
  // Batch processing
  QUEUE_BATCH_SIZE: number;
  DATABASE_BATCH_SIZE: number;
}

export interface SecurityConfig {
  // Token and key lengths
  SESSION_TOKEN_LENGTH: number;
  JWT_TOKEN_LENGTH: number;
  ENCRYPTION_KEY_LENGTH: number;
  
  // Password requirements
  MIN_PASSWORD_LENGTH: number;
  MAX_PASSWORD_LENGTH: number;
  
  // Rate limiting for security
  LOGIN_RATE_LIMIT: number;
  REGISTRATION_RATE_LIMIT: number;
}

export interface BackupConfig {
  // Backup intervals (seconds)
  BACKUP_INTERVAL: number;
  BACKUP_RETENTION_DAYS: number;
  
  // Cleanup intervals
  LOG_CLEANUP_DAYS: number;
  SESSION_CLEANUP_INTERVAL: number;
  TEMP_FILE_CLEANUP_HOURS: number;
}

export interface MonitoringConfig {
  // Log levels and rotation
  LOG_MAX_SIZE_MB: number;
  LOG_BACKUP_COUNT: number;
  
  // Health check intervals (seconds)
  HEALTH_CHECK_INTERVAL: number;
  DATABASE_HEALTH_CHECK_INTERVAL: number;
  
  // Metrics collection
  METRICS_COLLECTION_INTERVAL: number;
  PERFORMANCE_SAMPLE_RATE: number;
}

export interface AppConstantsInterface {
  timeout: TimeoutConfig;
  threshold: ThresholdConfig;
  network: NetworkConfig;
  message: MessageConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  backup: BackupConfig;
  monitoring: MonitoringConfig;
}

// Default configuration values
export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  SESSION_TIMEOUT: 86400, // 24 hours
  REMEMBER_ME_TIMEOUT: 2592000, // 30 days
  API_REQUEST_TIMEOUT: 30,
  WEBSOCKET_PING_TIMEOUT: 30,
  DATABASE_QUERY_TIMEOUT: 10,
  RATE_LIMIT_WINDOW: 60,
  AGGRESSIVE_RATE_LIMIT_WINDOW: 1,
  CIRCUIT_BREAKER_RESET_TIMEOUT: 30,
  AGGRESSIVE_CIRCUIT_BREAKER_RESET_TIMEOUT: 10,
};

export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  LOW_BALANCE_THRESHOLD: parseFloat(Bun.env.LOW_BALANCE_THRESHOLD || '100'),
  LARGE_DEPOSIT_THRESHOLD: parseFloat(Bun.env.LARGE_DEPOSIT_THRESHOLD || '1000'),
  LARGE_WITHDRAWAL_THRESHOLD: parseFloat(Bun.env.LARGE_WITHDRAWAL_THRESHOLD || '500'),
  INACTIVE_DAYS_THRESHOLD: parseInt(Bun.env.INACTIVE_DAYS_THRESHOLD || '3', 10),
  MAX_LOGIN_ATTEMPTS: 5,
  MAX_REQUESTS_PER_WINDOW: 100,
  AGGRESSIVE_MAX_REQUESTS: 5,
  ERROR_THRESHOLD: 10,
  AGGRESSIVE_ERROR_THRESHOLD: 3,
};

export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  DEFAULT_FLASK_PORT: 5000,
  DEFAULT_BUN_PORT: 3000,
  DEFAULT_WEBSOCKET_PORT: 8080,
  DEFAULT_REDIS_PORT: 6379,
  DEFAULT_PAYMENT_PORT: 5001,
  REDIS_HOST: 'localhost',
  REDIS_DB: 0,
  TELEGRAM_API_BASE: 'https://api.telegram.org',
  CLOUDFLARE_API_BASE: 'https://api.cloudflare.com/client/v4',
};

export const DEFAULT_MESSAGE_CONFIG: MessageConfig = {
  MAX_MESSAGE_LENGTH: 4096,
  MAX_INLINE_BUTTONS: 100,
  MAX_CALLBACK_DATA_LENGTH: 64,
  FORWARD_DELAY: 0.5,
  TYPING_DELAY: 1.0,
  NOTIFICATION_DELAY: 2.0,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1.0,
};

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  WORKER_POOL_SIZE: parseInt(Bun.env.WORKER_POOL_SIZE || '4', 10),
  MAX_CONCURRENT_REQUESTS: parseInt(Bun.env.MAX_CONCURRENT_REQUESTS || '50', 10),
  MAX_CUSTOMERS: 250,
  MAX_CONCURRENT_GROUPS: 50,
  CACHE_TTL: parseInt(Bun.env.CACHE_TTL || '300', 10),
  REDIS_CACHE_TTL: 3600,
  QUEUE_BATCH_SIZE: 100,
  DATABASE_BATCH_SIZE: 50,
};

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  SESSION_TOKEN_LENGTH: 32,
  JWT_TOKEN_LENGTH: 32,
  ENCRYPTION_KEY_LENGTH: 32,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  LOGIN_RATE_LIMIT: 5,
  REGISTRATION_RATE_LIMIT: 3,
};

export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  BACKUP_INTERVAL: parseInt(Bun.env.BACKUP_INTERVAL || '3600', 10),
  BACKUP_RETENTION_DAYS: parseInt(Bun.env.BACKUP_RETENTION_DAYS || '30', 10),
  LOG_CLEANUP_DAYS: 7,
  SESSION_CLEANUP_INTERVAL: 3600,
  TEMP_FILE_CLEANUP_HOURS: 24,
};

export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  LOG_MAX_SIZE_MB: 100,
  LOG_BACKUP_COUNT: 5,
  HEALTH_CHECK_INTERVAL: 60,
  DATABASE_HEALTH_CHECK_INTERVAL: 300,
  METRICS_COLLECTION_INTERVAL: 30,
  PERFORMANCE_SAMPLE_RATE: 0.1,
};

// Centralized application constants
export class AppConstants implements AppConstantsInterface {
  public readonly timeout: TimeoutConfig;
  public readonly threshold: ThresholdConfig;
  public readonly network: NetworkConfig;
  public readonly message: MessageConfig;
  public readonly performance: PerformanceConfig;
  public readonly security: SecurityConfig;
  public readonly backup: BackupConfig;
  public readonly monitoring: MonitoringConfig;

  constructor() {
    this.timeout = { ...DEFAULT_TIMEOUT_CONFIG };
    this.threshold = { ...DEFAULT_THRESHOLD_CONFIG };
    this.network = { ...DEFAULT_NETWORK_CONFIG };
    this.message = { ...DEFAULT_MESSAGE_CONFIG };
    this.performance = { ...DEFAULT_PERFORMANCE_CONFIG };
    this.security = { ...DEFAULT_SECURITY_CONFIG };
    this.backup = { ...DEFAULT_BACKUP_CONFIG };
    this.monitoring = { ...DEFAULT_MONITORING_CONFIG };
  }

  toJSON(): AppConstantsInterface {
    return {
      timeout: this.timeout,
      threshold: this.threshold,
      network: this.network,
      message: this.message,
      performance: this.performance,
      security: this.security,
      backup: this.backup,
      monitoring: this.monitoring,
    };
  }
}

// Global constants instance
export const constants = new AppConstants();

// Convenience exports for backward compatibility
export const TIMEOUT_CONFIG = constants.timeout;
export const THRESHOLD_CONFIG = constants.threshold;
export const NETWORK_CONFIG = constants.network;
export const MESSAGE_CONFIG = constants.message;
export const PERFORMANCE_CONFIG = constants.performance;
export const SECURITY_CONFIG = constants.security;
export const BACKUP_CONFIG = constants.backup;
export const MONITORING_CONFIG = constants.monitoring;
