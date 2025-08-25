/**
 * Configuration Schemas and Types
 * Provides Zod validation and TypeScript interfaces for all configuration
 */

import { z } from 'zod';

// ============================================================================
// Server Configuration Schemas
// ============================================================================

const ServerConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().int().min(1).max(65535),
  workers: z.number().int().min(1).max(100).optional(),
  debug: z.boolean().optional(),
  devTools: z.boolean().optional(),
});

const RateLimitSchema = z.object({
  windowMs: z.number().int().min(0),
  maxRequests: z.number().int().min(1),
});

const ApiServerConfigSchema = ServerConfigSchema.extend({
  rateLimit: RateLimitSchema.optional(),
  cors: z
    .object({
      origins: z.array(z.string()).optional(),
      credentials: z.boolean().optional(),
    })
    .optional(),
});

const WebSocketConfigSchema = z.object({
  port: z.number().int().min(1).max(65535),
  host: z.string().optional(),
  compression: z.boolean().default(true),
  maxConnections: z.number().int().min(1).default(1000),
  debug: z.boolean().optional(),
});

const ServersConfigSchema = z.object({
  bot: ServerConfigSchema,
  admin: ServerConfigSchema,
  api: ApiServerConfigSchema,
  websocket: WebSocketConfigSchema,
});

// ============================================================================
// Database Configuration Schemas
// ============================================================================

const PoolConfigSchema = z.object({
  min: z.number().int().min(0),
  max: z.number().int().min(1),
  acquireTimeout: z.number().int().min(0).optional(),
  idleTimeout: z.number().int().min(0).optional(),
  connectionTimeout: z.number().int().min(0).optional(),
  evictionRunInterval: z.number().int().min(0).optional(),
});

const SSLConfigSchema = z.object({
  enabled: z.boolean().default(false),
  rejectUnauthorized: z.boolean().default(true),
  ca: z.string().optional(),
  cert: z.string().optional(),
  key: z.string().optional(),
});

const PostgresConfigSchema = z.object({
  type: z.literal('postgres'),
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  database: z.string(),
  username: z.string(),
  password: z.string().optional(),
  schema: z.string().default('public'),
  pool: PoolConfigSchema.optional(),
  ssl: SSLConfigSchema.optional(),
  logging: z.boolean().default(false),
  synchronize: z.boolean().default(false),
});

const RedisConfigSchema = z.object({
  type: z.literal('redis'),
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  password: z.string().optional(),
  db: z.number().int().min(0).max(15).default(0),
  keyPrefix: z.string().optional(),
  family: z.union([z.literal(4), z.literal(6)]).default(4),
  tls: z
    .object({
      enabled: z.boolean().default(false),
      cert: z.string().optional(),
      key: z.string().optional(),
      ca: z.string().optional(),
    })
    .optional(),
});

const ClickHouseConfigSchema = z.object({
  type: z.literal('clickhouse'),
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  database: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  protocol: z.enum(['http', 'https']).default('http'),
  requestTimeout: z.number().int().min(0).optional(),
  compression: z
    .object({
      request: z.boolean(),
      response: z.boolean(),
    })
    .optional(),
});

export const DatabaseConnectionSchema = z.union([
  PostgresConfigSchema,
  RedisConfigSchema,
  ClickHouseConfigSchema,
]);

const DatabaseConfigSchema = z.object({
  connections: z.object({
    postgres: PostgresConfigSchema.optional(),
    redis: RedisConfigSchema.optional(),
    clickhouse: ClickHouseConfigSchema.optional(),
  }),
  migrations: z
    .object({
      autoRun: z.boolean().default(false),
      directory: z.string(),
    })
    .optional(),
  backup: z
    .object({
      enabled: z.boolean().default(true),
      schedule: z.string().optional(),
      retention: z
        .object({
          days: z.number().int().min(1).optional(),
          count: z.number().int().min(1).optional(),
        })
        .optional(),
    })
    .optional(),
});

// ============================================================================
// Security Configuration Schemas
// ============================================================================

const JWTConfigSchema = z.object({
  secret: z.string().min(32),
  expiresIn: z.string().default('7d'),
  refreshExpiresIn: z.string().default('30d'),
});

const EncryptionConfigSchema = z.object({
  algorithm: z.string().default('aes-256-gcm'),
  key: z.string().min(32),
});

const CORSConfigSchema = z.object({
  origins: z.array(z.string()),
  credentials: z.boolean().default(true),
  methods: z.array(z.string()).optional(),
});

const SecurityConfigSchema = z.object({
  jwt: JWTConfigSchema,
  encryption: EncryptionConfigSchema,
  cors: CORSConfigSchema,
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    window: z.number().int().min(0),
    max: z.number().int().min(1),
  }),
  headers: z
    .object({
      hsts: z.boolean().optional(),
      xssProtection: z.boolean().optional(),
      noSniff: z.boolean().optional(),
      frameOptions: z.enum(['DENY', 'SAMEORIGIN']).optional(),
    })
    .optional(),
});

// ============================================================================
// Feature Configuration Schemas
// ============================================================================

const FeatureConfigSchema = z.object({
  enabled: z.boolean(),
  rolloutPercentage: z.number().min(0).max(100).default(100),
  description: z.string().optional(),
  allowedUsers: z.array(z.string()).optional(),
  config: z.record(z.any()).optional(),
});

const ABTestVariantSchema = z.object({
  name: z.string(),
  weight: z.number().min(0).max(100),
  config: z.record(z.any()).optional(),
});

const ABTestSchema = z.object({
  enabled: z.boolean(),
  variants: z.array(ABTestVariantSchema),
});

const FeaturesConfigSchema = z.object({
  features: z.record(FeatureConfigSchema),
  dependencies: z
    .record(
      z.object({
        requires: z.array(z.string()),
      })
    )
    .optional(),
  abTests: z.record(ABTestSchema).optional(),
});

// ============================================================================
// Application Configuration Schema
// ============================================================================

const AppMetadataSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  environment: z.string().optional(),
});

const TelegramConfigSchema = z.object({
  botToken: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  apiId: z.string().optional(),
  apiHash: z.string().optional(),
  adminChatId: z.string().optional(),
});

const CloudflareConfigSchema = z.object({
  accountId: z.string().optional(),
  apiToken: z.string().optional(),
  workerName: z.string().optional(),
  kvNamespace: z.string().optional(),
});

const FirebaseConfigSchema = z.object({
  projectId: z.string().optional(),
  apiKey: z.string().optional(),
  authDomain: z.string().optional(),
  storageBucket: z.string().optional(),
  messagingSenderId: z.string().optional(),
  appId: z.string().optional(),
});

const MonitoringConfigSchema = z.object({
  sentry: z
    .object({
      dsn: z.string().optional(),
      environment: z.string().optional(),
      tracesSampleRate: z.number().min(0).max(1).optional(),
    })
    .optional(),
  prometheus: z
    .object({
      enabled: z.boolean().default(false),
      port: z.number().int().min(1).max(65535).optional(),
    })
    .optional(),
  logging: z
    .object({
      level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
      format: z.enum(['json', 'pretty']).default('json'),
      destination: z.string().default('stdout'),
    })
    .optional(),
});

const PathsConfigSchema = z.object({
  uploads: z.string().default('./uploads'),
  temp: z.string().default('./temp'),
  logs: z.string().default('./logs'),
  static: z.string().default('./public'),
});

const AppConfigSchema = z.object({
  app: AppMetadataSchema,
  server: ServersConfigSchema,
  database: DatabaseConfigSchema.optional(),
  security: SecurityConfigSchema,
  telegram: TelegramConfigSchema.optional(),
  cloudflare: CloudflareConfigSchema.optional(),
  firebase: FirebaseConfigSchema.optional(),
  monitoring: MonitoringConfigSchema.optional(),
  paths: PathsConfigSchema,
});

// ============================================================================
// TypeScript Types (exported from schemas)
// ============================================================================

export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type ApiServerConfig = z.infer<typeof ApiServerConfigSchema>;
export type WebSocketConfig = z.infer<typeof WebSocketConfigSchema>;
export type ServersConfig = z.infer<typeof ServersConfigSchema>;

export type PostgresConfig = z.infer<typeof PostgresConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type ClickHouseConfig = z.infer<typeof ClickHouseConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

export type JWTConfig = z.infer<typeof JWTConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

export type FeatureConfig = z.infer<typeof FeatureConfigSchema>;
export type ABTestVariant = z.infer<typeof ABTestVariantSchema>;
export type ABTest = z.infer<typeof ABTestSchema>;
export type FeaturesConfig = z.infer<typeof FeaturesConfigSchema>;

export type AppMetadata = z.infer<typeof AppMetadataSchema>;
export type TelegramConfig = z.infer<typeof TelegramConfigSchema>;
export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;
export type PathsConfig = z.infer<typeof PathsConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

export function validateAppConfig(config: unknown): AppConfig {
  return AppConfigSchema.parse(config);
}

export function validateDatabaseConfig(config: unknown): DatabaseConfig {
  return DatabaseConfigSchema.parse(config);
}

export function validateFeaturesConfig(config: unknown): FeaturesConfig {
  return FeaturesConfigSchema.parse(config);
}

export function validateServerConfig(
  config: unknown,
  type: keyof ServersConfig
): ServerConfig {
  const schema =
    type === 'api'
      ? ApiServerConfigSchema
      : type === 'websocket'
        ? WebSocketConfigSchema
        : ServerConfigSchema;
  return schema.parse(config);
}

// ============================================================================
// Safe Parsing Functions (return success/error)
// ============================================================================

export function safeParseAppConfig(config: unknown) {
  return AppConfigSchema.safeParse(config);
}

export function safeParseDatabaseConfig(config: unknown) {
  return DatabaseConfigSchema.safeParse(config);
}

export function safeParseFeaturesConfig(config: unknown) {
  return FeaturesConfigSchema.safeParse(config);
}

// ============================================================================
// Environment-Specific Validation
// ============================================================================

export function validateProductionConfig(config: AppConfig): void {
  const errors: string[] = [];

  // JWT Secret validation
  if (config.security.jwt.secret === 'dev-secret-key-change-in-production') {
    errors.push('JWT secret must be changed in production');
  }

  // Database password validation
  if (
    config.database?.connections.postgres &&
    !config.database.connections.postgres.password
  ) {
    errors.push('PostgreSQL password is required in production');
  }

  // SSL/TLS validation
  if (config.database?.connections.postgres?.ssl?.enabled !== true) {
    errors.push('PostgreSQL SSL should be enabled in production');
  }

  // Telegram bot token validation
  if (!config.telegram?.botToken) {
    errors.push('Telegram bot token is required in production');
  }

  // Monitoring validation
  if (!config.monitoring?.sentry?.dsn) {
    errors.push('Sentry DSN should be configured in production');
  }

  if (errors.length > 0) {
    throw new Error(
      `Production configuration validation failed:\n${errors.join('\n')}`
    );
  }
}

export function validateDevelopmentConfig(config: AppConfig): void {
  const warnings: string[] = [];

  // Check for production values in development
  if (config.security.jwt.secret !== 'dev-secret-key-change-in-production') {
    warnings.push('Using production JWT secret in development');
  }

  // Check for debug settings
  if (!config.server.admin.debug) {
    warnings.push('Debug mode disabled in development');
  }

  if (warnings.length > 0) {
    console.warn(`Development configuration warnings:\n${warnings.join('\n')}`);
  }
}

// ============================================================================
// Default Configurations
// ============================================================================

export const defaultAppConfig: Partial<AppConfig> = {
  server: {
    bot: { host: 'localhost', port: 8080 },
    admin: { host: 'localhost', port: 3000, debug: false },
    api: {
      host: 'localhost',
      port: 3001,
      rateLimit: { windowMs: 60000, maxRequests: 100 },
    },
    websocket: { port: 3002, compression: true, maxConnections: 1000 },
  },
  paths: {
    uploads: './uploads',
    temp: './temp',
    logs: './logs',
    static: './public',
  },
};

export default {
  schemas: {
    AppConfigSchema,
    DatabaseConfigSchema,
    FeaturesConfigSchema,
    SecurityConfigSchema,
  },
  validate: {
    app: validateAppConfig,
    database: validateDatabaseConfig,
    features: validateFeaturesConfig,
    server: validateServerConfig,
  },
  safeParse: {
    app: safeParseAppConfig,
    database: safeParseDatabaseConfig,
    features: safeParseFeaturesConfig,
  },
  environment: {
    validateProduction: validateProductionConfig,
    validateDevelopment: validateDevelopmentConfig,
  },
  defaults: defaultAppConfig,
};
