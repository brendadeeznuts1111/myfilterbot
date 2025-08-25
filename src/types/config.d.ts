/**
 * Configuration module type declarations
 * @version 2.1.0
 */

declare module '@config/app_constants' {
  export interface TimeoutConfig {
    SESSION_TIMEOUT: number;
    REMEMBER_ME_TIMEOUT: number;
    API_REQUEST_TIMEOUT: number;
    WEBSOCKET_PING_TIMEOUT: number;
    DATABASE_QUERY_TIMEOUT: number;
    RATE_LIMIT_WINDOW: number;
    AGGRESSIVE_RATE_LIMIT_WINDOW: number;
    CIRCUIT_BREAKER_RESET_TIMEOUT: number;
    AGGRESSIVE_CIRCUIT_BREAKER_RESET_TIMEOUT: number;
  }

  export interface ThresholdConfig {
    LOW_BALANCE_THRESHOLD: number;
    LARGE_DEPOSIT_THRESHOLD: number;
    LARGE_WITHDRAWAL_THRESHOLD: number;
    INACTIVE_DAYS_THRESHOLD: number;
    MAX_LOGIN_ATTEMPTS: number;
    MAX_REQUESTS_PER_WINDOW: number;
    AGGRESSIVE_MAX_REQUESTS: number;
    ERROR_THRESHOLD: number;
    AGGRESSIVE_ERROR_THRESHOLD: number;
  }

  export interface NetworkConfig {
    DEFAULT_FLASK_PORT: number;
    DEFAULT_BUN_PORT: number;
    DEFAULT_WEBSOCKET_PORT: number;
    DEFAULT_REDIS_PORT: number;
    DEFAULT_PAYMENT_PORT: number;
    REDIS_HOST: string;
    REDIS_DB: number;
    TELEGRAM_API_BASE: string;
    CLOUDFLARE_API_BASE: string;
  }

  export interface MessageConfig {
    MAX_MESSAGE_LENGTH: number;
    MAX_INLINE_BUTTONS: number;
    MAX_CALLBACK_DATA_LENGTH: number;
    FORWARD_DELAY: number;
    TYPING_DELAY: number;
    NOTIFICATION_DELAY: number;
    MAX_RETRY_ATTEMPTS: number;
    RETRY_DELAY: number;
  }

  export interface PerformanceConfig {
    WORKER_POOL_SIZE: number;
    MAX_CONCURRENT_REQUESTS: number;
    MAX_CUSTOMERS: number;
    MAX_CONCURRENT_GROUPS: number;
    CACHE_TTL: number;
    REDIS_CACHE_TTL: number;
    QUEUE_BATCH_SIZE: number;
    DATABASE_BATCH_SIZE: number;
  }

  export interface SecurityConfig {
    SESSION_TOKEN_LENGTH: number;
    JWT_TOKEN_LENGTH: number;
    ENCRYPTION_KEY_LENGTH: number;
    MIN_PASSWORD_LENGTH: number;
    MAX_PASSWORD_LENGTH: number;
    LOGIN_RATE_LIMIT: number;
    REGISTRATION_RATE_LIMIT: number;
  }

  export interface BackupConfig {
    BACKUP_INTERVAL: number;
    BACKUP_RETENTION_DAYS: number;
    LOG_CLEANUP_DAYS: number;
    SESSION_CLEANUP_INTERVAL: number;
    TEMP_FILE_CLEANUP_HOURS: number;
  }

  export interface MonitoringConfig {
    LOG_MAX_SIZE_MB: number;
    LOG_BACKUP_COUNT: number;
    HEALTH_CHECK_INTERVAL: number;
    DATABASE_HEALTH_CHECK_INTERVAL: number;
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

  export class AppConstants implements AppConstantsInterface {
    readonly timeout: TimeoutConfig;
    readonly threshold: ThresholdConfig;
    readonly network: NetworkConfig;
    readonly message: MessageConfig;
    readonly performance: PerformanceConfig;
    readonly security: SecurityConfig;
    readonly backup: BackupConfig;
    readonly monitoring: MonitoringConfig;
    constructor();
    toJSON(): AppConstantsInterface;
  }

  export const constants: AppConstants;
  export const TIMEOUT_CONFIG: TimeoutConfig;
  export const THRESHOLD_CONFIG: ThresholdConfig;
  export const NETWORK_CONFIG: NetworkConfig;
  export const MESSAGE_CONFIG: MessageConfig;
  export const PERFORMANCE_CONFIG: PerformanceConfig;
  export const SECURITY_CONFIG: SecurityConfig;
  export const BACKUP_CONFIG: BackupConfig;
  export const MONITORING_CONFIG: MonitoringConfig;
}

declare module '@config/database' {
  export const DATABASE_CONFIG: {
    PATH: string;
    BACKUP_INTERVAL: number;
    [key: string]: any;
  };
}

declare module '@config/server' {
  export const SERVER_CONFIG: {
    PORT: number;
    HOST: string;
    CORS_ORIGIN: string;
    [key: string]: any;
  };
}

declare module 'config/app_constants' {
  export * from '@config/app_constants';
}

declare module '../config/app_constants' {
  export * from '@config/app_constants';
}

declare module '../../config/app_constants' {
  export * from '@config/app_constants';
}
