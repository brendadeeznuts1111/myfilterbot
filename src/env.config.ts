/**
 * Environment Configuration for Fantdev Trading Bot
 * Uses Bun.env for better performance and type safety
 */

// Define environment variable interface for type safety
interface EnvConfig {
  // Telegram Bot
  BOT_TOKEN: string;
  ADMIN_CHAT_ID: string;
  WEBHOOK_SECRET: string;
  
  // Database
  DATABASE_PATH: string;
  CHAT_TRACKER_DB: string;
  GROUP_MONITOR_DB: string;
  
  // API Configuration
  API_BASE_URL: string;
  PORTAL_SERVER_PORT: number;
  ADMIN_SERVER_PORT: number;
  WORKER_URL: string;
  
  // Cloudflare
  CLOUDFLARE_API_KEY?: string;
  CLOUDFLARE_WORKER_URL: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_ZONE_ID?: string;
  
  // Authentication
  JWT_SECRET: string;
  SESSION_SECRET: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  
  // Redis (Optional)
  REDIS_URL?: string;
  REDIS_PASSWORD?: string;
  REDIS_DB?: number;
  
  // WebSocket
  WS_PORT: number;
  WS_PING_INTERVAL: number;
  WS_MAX_CONNECTIONS: number;
  
  // Logging
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  LOG_FILE: string;
  ERROR_LOG_FILE: string;
  DEBUG_MODE: boolean;
  ENABLE_METRICS: boolean;
  
  // Rate Limiting
  RATE_LIMIT_ENABLED: boolean;
  RATE_LIMIT_MAX_REQUESTS: number;
  RATE_LIMIT_WINDOW_MS: number;
  
  // Environment
  NODE_ENV: 'development' | 'production' | 'test';
  TZ: string;
  
  // React App
  REACT_APP_API_URL: string;
  REACT_APP_WS_URL: string;
  REACT_APP_WORKER_URL: string;
  
  // External Services
  TELEGRAM_API_URL: string;
  OPENAI_API_KEY?: string;
  STRIPE_API_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  
  // Feature Flags
  ENABLE_WEBSOCKET: boolean;
  ENABLE_AUTO_REPORTER: boolean;
  ENABLE_ERROR_TRACKING: boolean;
  ENABLE_RATE_LIMIT_MONITOR: boolean;
  ENABLE_WORKER_THREADS: boolean;
  
  // Performance
  MAX_POOL_SIZE: number;
  CONNECTION_TIMEOUT: number;
  REQUEST_TIMEOUT: number;
  WORKER_THREADS: number;
}

/**
 * Get environment variable with type conversion and default value
 */
function getEnvVar<T>(key: string, defaultValue?: T): T {
  const value = Bun.env[key] ?? process.env[key];
  
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not defined`);
  }
  
  // Type conversion based on default value type
  if (typeof defaultValue === 'number') {
    return parseInt(value as string, 10) as T;
  }
  
  if (typeof defaultValue === 'boolean') {
    return (value === 'true' || value === '1') as T;
  }
  
  return value as T;
}

/**
 * Load and validate environment configuration
 */
export function loadEnvConfig(): EnvConfig {
  return {
    // Telegram Bot
    BOT_TOKEN: getEnvVar('BOT_TOKEN', ''),
    ADMIN_CHAT_ID: getEnvVar('ADMIN_CHAT_ID', ''),
    WEBHOOK_SECRET: getEnvVar('WEBHOOK_SECRET', ''),
    
    // Database
    DATABASE_PATH: getEnvVar('DATABASE_PATH', 'customer_database.json'),
    CHAT_TRACKER_DB: getEnvVar('CHAT_TRACKER_DB', 'chat_tracker.db'),
    GROUP_MONITOR_DB: getEnvVar('GROUP_MONITOR_DB', 'group_monitor.db'),
    
    // API Configuration
    API_BASE_URL: getEnvVar('API_BASE_URL', 'http://localhost:3003/api'),
    PORTAL_SERVER_PORT: getEnvVar('PORTAL_SERVER_PORT', 5000),
    ADMIN_SERVER_PORT: getEnvVar('ADMIN_SERVER_PORT', 3003),
    WORKER_URL: getEnvVar('WORKER_URL', 'http://localhost:8787'),
    
    // Cloudflare
    CLOUDFLARE_API_KEY: getEnvVar('CLOUDFLARE_API_KEY', undefined),
    CLOUDFLARE_WORKER_URL: getEnvVar('CLOUDFLARE_WORKER_URL', 'https://telegram-bot-worker.workers.dev'),
    CLOUDFLARE_ACCOUNT_ID: getEnvVar('CLOUDFLARE_ACCOUNT_ID', undefined),
    CLOUDFLARE_ZONE_ID: getEnvVar('CLOUDFLARE_ZONE_ID', undefined),
    
    // Authentication
    JWT_SECRET: getEnvVar('JWT_SECRET', 'default_jwt_secret_change_in_production'),
    SESSION_SECRET: getEnvVar('SESSION_SECRET', 'default_session_secret_change_in_production'),
    ADMIN_USERNAME: getEnvVar('ADMIN_USERNAME', 'admin'),
    ADMIN_PASSWORD: getEnvVar('ADMIN_PASSWORD', 'admin123'),
    
    // Redis (Optional)
    REDIS_URL: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
    REDIS_PASSWORD: getEnvVar('REDIS_PASSWORD', undefined),
    REDIS_DB: getEnvVar('REDIS_DB', 0),
    
    // WebSocket
    WS_PORT: getEnvVar('WS_PORT', 3004),
    WS_PING_INTERVAL: getEnvVar('WS_PING_INTERVAL', 30000),
    WS_MAX_CONNECTIONS: getEnvVar('WS_MAX_CONNECTIONS', 1000),
    
    // Logging
    LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
    LOG_FILE: getEnvVar('LOG_FILE', 'logs/app.log'),
    ERROR_LOG_FILE: getEnvVar('ERROR_LOG_FILE', 'logs/error.log'),
    DEBUG_MODE: getEnvVar('DEBUG_MODE', false),
    ENABLE_METRICS: getEnvVar('ENABLE_METRICS', true),
    
    // Rate Limiting
    RATE_LIMIT_ENABLED: getEnvVar('RATE_LIMIT_ENABLED', true),
    RATE_LIMIT_MAX_REQUESTS: getEnvVar('RATE_LIMIT_MAX_REQUESTS', 100),
    RATE_LIMIT_WINDOW_MS: getEnvVar('RATE_LIMIT_WINDOW_MS', 60000),
    
    // Environment
    NODE_ENV: getEnvVar('NODE_ENV', 'development') as 'development' | 'production' | 'test',
    TZ: getEnvVar('TZ', 'UTC'),
    
    // React App
    REACT_APP_API_URL: getEnvVar('REACT_APP_API_URL', 'http://localhost:3003/api'),
    REACT_APP_WS_URL: getEnvVar('REACT_APP_WS_URL', 'ws://localhost:3004'),
    REACT_APP_WORKER_URL: getEnvVar('REACT_APP_WORKER_URL', 'http://localhost:8787'),
    
    // External Services
    TELEGRAM_API_URL: getEnvVar('TELEGRAM_API_URL', 'https://api.telegram.org'),
    OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY', undefined),
    STRIPE_API_KEY: getEnvVar('STRIPE_API_KEY', undefined),
    STRIPE_WEBHOOK_SECRET: getEnvVar('STRIPE_WEBHOOK_SECRET', undefined),
    
    // Feature Flags
    ENABLE_WEBSOCKET: getEnvVar('ENABLE_WEBSOCKET', true),
    ENABLE_AUTO_REPORTER: getEnvVar('ENABLE_AUTO_REPORTER', true),
    ENABLE_ERROR_TRACKING: getEnvVar('ENABLE_ERROR_TRACKING', true),
    ENABLE_RATE_LIMIT_MONITOR: getEnvVar('ENABLE_RATE_LIMIT_MONITOR', true),
    ENABLE_WORKER_THREADS: getEnvVar('ENABLE_WORKER_THREADS', true),
    
    // Performance
    MAX_POOL_SIZE: getEnvVar('MAX_POOL_SIZE', 10),
    CONNECTION_TIMEOUT: getEnvVar('CONNECTION_TIMEOUT', 5000),
    REQUEST_TIMEOUT: getEnvVar('REQUEST_TIMEOUT', 30000),
    WORKER_THREADS: getEnvVar('WORKER_THREADS', 4),
  };
}

/**
 * Validate required environment variables
 */
export function validateEnv(config: EnvConfig): void {
  const required = ['BOT_TOKEN', 'ADMIN_CHAT_ID'];
  const missing: string[] = [];
  
  for (const key of required) {
    if (!config[key as keyof EnvConfig]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate JWT secret length in production
  if (config.NODE_ENV === 'production' && config.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}

/**
 * Get single environment variable
 */
export function getEnv(key: keyof EnvConfig): any {
  const config = loadEnvConfig();
  return config[key];
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnv('NODE_ENV') === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnv('NODE_ENV') === 'development';
}

/**
 * Export the loaded configuration
 */
export const config = loadEnvConfig();

// Validate on startup
if (import.meta.main) {
  try {
    validateEnv(config);
    console.log('✅ Environment configuration loaded successfully');
    console.log(`Environment: ${config.NODE_ENV}`);
    console.log(`API URL: ${config.API_BASE_URL}`);
    console.log(`Bot Token: ${config.BOT_TOKEN.substring(0, 10)}...`);
  } catch (error) {
    console.error('❌ Environment configuration error:', error);
    process.exit(1);
  }
}

export default config;