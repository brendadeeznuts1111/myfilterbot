/**
 * Environment Configuration Loader for FantDev Trading Platform
 * TypeScript/Bun implementation for loading environment variables
 */

// Bun automatically loads .env files in the following order:
// 1. .env
// 2. .env.production, .env.development, .env.test (based on NODE_ENV)
// 3. .env.local

interface ConfigSchema {
  // Bot Configuration
  BOT_TOKEN: string;
  ADMIN_CHAT_ID: string;
  
  // Database Configuration
  DATABASE_PATH: string;
  SQLITE_DB_PATH: string;
  CHAT_TRACKER_DB: string;
  
  // Server Configuration
  FLASK_PORT: number;
  BUN_PORT: number;
  WEBSOCKET_PORT: number;
  
  // API Keys
  PAYMENT_GATEWAY_API_KEY: string;
  ANALYTICS_API_KEY: string;
  
  // Security
  JWT_SECRET_KEY: string;
  SESSION_SECRET: string;
  ENCRYPTION_KEY: string;
  
  // Feature Flags
  ENABLE_DEBUG_MODE: boolean;
  ENABLE_WEBSOCKET: boolean;
  ENABLE_AUTO_REPORTER: boolean;
  ENABLE_WORKER_THREADS: boolean;
  
  // Rate Limiting
  RATE_LIMIT_REQUESTS: number;
  RATE_LIMIT_WINDOW: number;
  
  // Monitoring
  OTEL_EXPORTER_ENDPOINT: string;
  MONITORING_ENABLED: boolean;
  
  // Environment
  NODE_ENV: 'development' | 'production' | 'test';
  IS_PRODUCTION: boolean;
  IS_DEVELOPMENT: boolean;
  IS_TEST: boolean;
  
  // Logging
  LOG_LEVEL: string;
  LOG_FILE_PATH: string;
  
  // External Services
  NGROK_AUTH_TOKEN: string;
  CLOUDFLARE_API_TOKEN: string;
  
  // Telegram Dashboard
  TELEGRAM_API_ID: string;
  TELEGRAM_API_HASH: string;
  TELEGRAM_SESSION_NAME: string;
  
  // Performance Settings
  WORKER_POOL_SIZE: number;
  MAX_CONCURRENT_REQUESTS: number;
  CACHE_TTL: number;
  
  // Backup Configuration
  BACKUP_ENABLED: boolean;
  BACKUP_INTERVAL: number;
  BACKUP_RETENTION_DAYS: number;
}

class ConfigLoader {
  private static instance: ConfigLoader;
  private config: ConfigSchema;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  private loadConfig(): ConfigSchema {
    // Use Bun.env for optimal performance (native to Bun runtime)
    const env = Bun.env;
    const nodeEnv = (env.NODE_ENV || 'development') as ConfigSchema['NODE_ENV'];
    
    return {
      // Bot Configuration
      BOT_TOKEN: env.BOT_TOKEN || '',
      ADMIN_CHAT_ID: env.ADMIN_CHAT_ID || '-2714719687',
      
      // Database Configuration
      DATABASE_PATH: env.DATABASE_PATH || 'customer_database.json',
      SQLITE_DB_PATH: env.SQLITE_DB_PATH || 'group_monitor.db',
      CHAT_TRACKER_DB: env.CHAT_TRACKER_DB || 'chat_tracker.db',
      
      // Server Configuration
      FLASK_PORT: parseInt(env.FLASK_PORT || '5000', 10),
      BUN_PORT: parseInt(env.BUN_PORT || '3000', 10),
      WEBSOCKET_PORT: parseInt(env.WEBSOCKET_PORT || '8080', 10),
      
      // API Keys
      PAYMENT_GATEWAY_API_KEY: env.PAYMENT_GATEWAY_API_KEY || '',
      ANALYTICS_API_KEY: env.ANALYTICS_API_KEY || '',
      
      // Security
      JWT_SECRET_KEY: env.JWT_SECRET_KEY || 'dev-secret-key-change-in-production',
      SESSION_SECRET: env.SESSION_SECRET || 'dev-session-secret',
      ENCRYPTION_KEY: env.ENCRYPTION_KEY || '',
      
      // Feature Flags
      ENABLE_DEBUG_MODE: env.ENABLE_DEBUG_MODE?.toLowerCase() === 'true',
      ENABLE_WEBSOCKET: env.ENABLE_WEBSOCKET?.toLowerCase() !== 'false',
      ENABLE_AUTO_REPORTER: env.ENABLE_AUTO_REPORTER?.toLowerCase() !== 'false',
      ENABLE_WORKER_THREADS: env.ENABLE_WORKER_THREADS?.toLowerCase() !== 'false',
      
      // Rate Limiting
      RATE_LIMIT_REQUESTS: parseInt(env.RATE_LIMIT_REQUESTS || '100', 10),
      RATE_LIMIT_WINDOW: parseInt(env.RATE_LIMIT_WINDOW || '60', 10),
      
      // Monitoring
      OTEL_EXPORTER_ENDPOINT: env.OTEL_EXPORTER_ENDPOINT || 'http://localhost:4317',
      MONITORING_ENABLED: env.MONITORING_ENABLED?.toLowerCase() === 'true',
      
      // Environment
      NODE_ENV: nodeEnv,
      IS_PRODUCTION: nodeEnv === 'production',
      IS_DEVELOPMENT: nodeEnv === 'development',
      IS_TEST: nodeEnv === 'test',
      
      // Logging
      LOG_LEVEL: env.LOG_LEVEL?.toUpperCase() || 'INFO',
      LOG_FILE_PATH: env.LOG_FILE_PATH || 'logs/app.log',
      
      // External Services
      NGROK_AUTH_TOKEN: env.NGROK_AUTH_TOKEN || '',
      CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN || '',
      
      // Telegram Dashboard
      TELEGRAM_API_ID: env.TELEGRAM_API_ID || '',
      TELEGRAM_API_HASH: env.TELEGRAM_API_HASH || '',
      TELEGRAM_SESSION_NAME: env.TELEGRAM_SESSION_NAME || 'fantdev_session',
      
      // Performance Settings
      WORKER_POOL_SIZE: parseInt(env.WORKER_POOL_SIZE || '4', 10),
      MAX_CONCURRENT_REQUESTS: parseInt(env.MAX_CONCURRENT_REQUESTS || '50', 10),
      CACHE_TTL: parseInt(env.CACHE_TTL || '300', 10),
      
      // Backup Configuration
      BACKUP_ENABLED: env.BACKUP_ENABLED?.toLowerCase() !== 'false',
      BACKUP_INTERVAL: parseInt(env.BACKUP_INTERVAL || '3600', 10),
      BACKUP_RETENTION_DAYS: parseInt(env.BACKUP_RETENTION_DAYS || '30', 10),
    };
  }

  public getConfig(): ConfigSchema {
    return this.config;
  }

  public get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
    return this.config[key];
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (!this.config.BOT_TOKEN && this.config.IS_PRODUCTION) {
      errors.push('BOT_TOKEN is required in production');
    }
    
    if (!this.config.JWT_SECRET_KEY || 
        this.config.JWT_SECRET_KEY === 'dev-secret-key-change-in-production') {
      if (this.config.IS_PRODUCTION) {
        errors.push('JWT_SECRET_KEY must be set to a secure value in production');
      }
    }
    
    // Validate port ranges
    const ports = [this.config.FLASK_PORT, this.config.BUN_PORT, this.config.WEBSOCKET_PORT];
    for (const port of ports) {
      if (port < 1 || port > 65535) {
        errors.push(`Invalid port number: ${port}`);
      }
    }
    
    // Check for port conflicts
    const uniquePorts = new Set(ports);
    if (uniquePorts.size !== ports.length) {
      errors.push('Port conflict detected: servers are configured to use the same port');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public getDatabaseUrl(): string {
    if (this.config.IS_TEST) {
      return ':memory:'; // Use in-memory database for tests
    }
    return this.config.DATABASE_PATH;
  }

  public getSafeConfig(): Partial<ConfigSchema> {
    // Return config without sensitive data
    const { 
      BOT_TOKEN,
      JWT_SECRET_KEY,
      SESSION_SECRET,
      ENCRYPTION_KEY,
      PAYMENT_GATEWAY_API_KEY,
      ANALYTICS_API_KEY,
      NGROK_AUTH_TOKEN,
      CLOUDFLARE_API_TOKEN,
      TELEGRAM_API_HASH,
      ...safeConfig 
    } = this.config;
    
    return safeConfig;
  }

  public printConfig(): void {
    console.log('\n=== FantDev Trading Platform Configuration ===');
    console.log(`Environment: ${this.config.NODE_ENV}`);
    console.log(`Debug Mode: ${this.config.ENABLE_DEBUG_MODE}`);
    console.log(`WebSocket: ${this.config.ENABLE_WEBSOCKET}`);
    console.log(`Workers: ${this.config.ENABLE_WORKER_THREADS}`);
    console.log(`Flask Port: ${this.config.FLASK_PORT}`);
    console.log(`Bun Port: ${this.config.BUN_PORT}`);
    console.log(`Database: ${this.getDatabaseUrl()}`);
    console.log('=' + '='.repeat(49) + '\n');
  }
}

// Export singleton instance
export const Config = ConfigLoader.getInstance();

// Export type for use in other modules
export type { ConfigSchema };

// Validate on import in development (using Bun.env for better performance)
if (import.meta.main || Bun.env.NODE_ENV === 'development') {
  Config.printConfig();
  const validation = Config.validate();
  if (validation.isValid) {
    console.log('✅ Configuration is valid');
  } else {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
  }
}