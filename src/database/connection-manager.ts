/**
 * Database Connection Manager
 * Manages all database connections using YAML configuration
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import { ClickHouse } from 'clickhouse';
import { enhancedConfig } from '../config/enhanced-config-service';
import type {
  DatabaseConfig,
} from '../config/schemas';

// ============================================================================
// Connection Pool Management
// ============================================================================

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;

  private pgPool: Pool | null = null;
  private redisClient: Redis | null = null;
  private clickhouseClient: any | null = null;
  private config: DatabaseConfig | null = null;
  private isInitialized = false;
  private reconnectTimers = new Map<string, NodeJS.Timeout>();

  private constructor() {}

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  /**
   * Initialize all database connections
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Database connections already initialized');
      return;
    }

    try {
      console.log('🔌 Initializing database connections from YAML config...');

      // Load configuration
      this.config = await enhancedConfig.getDatabaseConfig();

      // Initialize connections
      await this.initializePostgres();
      await this.initializeRedis();
      await this.initializeClickHouse();

      this.isInitialized = true;
      console.log('✅ All database connections initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to initialize database connections:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        initialized: this.isInitialized,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Initialize PostgreSQL connection
   */
  private async initializePostgres(): Promise<void> {
    if (!this.config?.connections?.postgres) {
      console.log('PostgreSQL configuration not found, skipping');
      return;
    }

    const pgConfig = this.config.connections.postgres;

    try {
      // Create connection pool
      this.pgPool = new Pool({
        host: pgConfig.host,
        port: pgConfig.port,
        database: pgConfig.database,
        user: pgConfig.username,
        password: pgConfig.password,
        min: pgConfig.pool?.min || 2,
        max: pgConfig.pool?.max || 10,
        idleTimeoutMillis: pgConfig.pool?.idleTimeout || 30000,
        connectionTimeoutMillis: pgConfig.pool?.connectionTimeout || 30000,
        ssl: pgConfig.ssl?.enabled
          ? {
              rejectUnauthorized: pgConfig.ssl.rejectUnauthorized,
              ca: pgConfig.ssl.ca,
              cert: pgConfig.ssl.cert,
              key: pgConfig.ssl.key,
            }
          : undefined,
      });

      // Test connection
      await this.pgPool.query('SELECT NOW()');
      console.log('✅ PostgreSQL connected successfully');

      // Setup error handling
      this.pgPool.on('error', err => {
        console.error('PostgreSQL pool error:', err);
        this.handleConnectionError('postgres');
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to connect to PostgreSQL:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        config: {
          host: pgConfig.host,
          port: pgConfig.port,
          database: pgConfig.database
        }
      });
      this.scheduleReconnect('postgres');
      throw error;
    }
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    if (!this.config?.connections?.redis) {
      console.log('Redis configuration not found, skipping');
      return;
    }

    const redisConfig = this.config.connections.redis;

    try {
      // Create Redis client
      this.redisClient = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db || 0,
        keyPrefix: redisConfig.keyPrefix,
        family: redisConfig.family || 4,
        retryStrategy: times => {
          const delay = Math.min(times * 1000, 30000);
          console.log(`Redis reconnecting in ${delay}ms...`);
          return delay;
        },
        tls: redisConfig.tls?.enabled
          ? {
              cert: redisConfig.tls.cert,
              key: redisConfig.tls.key,
              ca: redisConfig.tls.ca,
            }
          : undefined,
      });

      // Test connection
      await this.redisClient.ping();
      console.log('✅ Redis connected successfully');

      // Setup event handlers
      this.redisClient.on('error', err => {
        console.error('Redis error:', err);
        this.handleConnectionError('redis');
      });

      this.redisClient.on('connect', () => {
        console.log('Redis reconnected');
        this.clearReconnectTimer('redis');
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to connect to Redis:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        config: {
          host: redisConfig.host,
          port: redisConfig.port,
          db: redisConfig.db
        }
      });
      this.scheduleReconnect('redis');
      throw error;
    }
  }

  /**
   * Initialize ClickHouse connection
   */
  private async initializeClickHouse(): Promise<void> {
    if (!this.config?.connections?.clickhouse) {
      console.log('ClickHouse configuration not found, skipping');
      return;
    }

    const chConfig = this.config.connections.clickhouse;

    try {
      // Create ClickHouse client
      this.clickhouseClient = new ClickHouse({
        url: `${chConfig.protocol}://${chConfig.host}`,
        port: chConfig.port,
        database: chConfig.database,
        username: chConfig.username,
        password: chConfig.password,
        requestTimeout: chConfig.requestTimeout || 30000,
      });

      // Test connection
      await this.clickhouseClient.query('SELECT 1').toPromise();
      console.log('✅ ClickHouse connected successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to connect to ClickHouse:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        config: {
          host: chConfig.host,
          port: chConfig.port,
          database: chConfig.database
        }
      });
      this.scheduleReconnect('clickhouse');
      // Don't throw as ClickHouse might be optional
    }
  }

  /**
   * Get PostgreSQL pool
   */
  getPostgres(): Pool {
    if (!this.pgPool) {
      throw new Error('PostgreSQL not initialized. Call initialize() first.');
    }
    return this.pgPool;
  }

  /**
   * Get Redis client
   */
  getRedis(): Redis {
    if (!this.redisClient) {
      throw new Error('Redis not initialized. Call initialize() first.');
    }
    return this.redisClient;
  }

  /**
   * Get ClickHouse client
   */
  getClickHouse(): any {
    if (!this.clickhouseClient) {
      throw new Error('ClickHouse not initialized. Call initialize() first.');
    }
    return this.clickhouseClient;
  }

  /**
   * Execute PostgreSQL query with error handling
   */
  async query(sql: string, params?: any[]): Promise<any> {
    const pool = this.getPostgres();

    try {
      const result = await pool.query(sql, params);
      return result.rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Database query error:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        paramsCount: params?.length || 0
      });
      throw error;
    }
  }

  /**
   * Execute PostgreSQL transaction
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const pool = this.getPostgres();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Database transaction error:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', {
          rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
        });
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get cache value from Redis
   */
  async getCached<T>(key: string): Promise<T | null> {
    const redis = this.getRedis();

    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Cache get error:', {
        key,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Set cache value in Redis
   */
  async setCached(key: string, value: any, ttl?: number): Promise<void> {
    const redis = this.getRedis();

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Cache set error:', {
        key,
        ttl,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Delete cache value from Redis
   */
  async deleteCached(key: string | string[]): Promise<void> {
    const redis = this.getRedis();

    try {
      if (Array.isArray(key)) {
        await redis.del(...key);
      } else {
        await redis.del(key);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Cache delete error:', {
        key: Array.isArray(key) ? `[${key.length} keys]` : key,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Clear all cache with pattern
   */
  async clearCache(pattern: string = '*'): Promise<void> {
    const redis = this.getRedis();

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      console.log(`Cleared ${keys.length} cache entries`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Cache clear error:', {
        pattern,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Health check for all connections
   */
  async healthCheck(): Promise<{
    postgres: boolean;
    redis: boolean;
    clickhouse: boolean;
  }> {
    const health = {
      postgres: false,
      redis: false,
      clickhouse: false,
    };

    // Check PostgreSQL
    try {
      if (this.pgPool) {
        await this.pgPool.query('SELECT 1');
        health.postgres = true;
      }
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
    }

    // Check Redis
    try {
      if (this.redisClient) {
        await this.redisClient.ping();
        health.redis = true;
      }
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    // Check ClickHouse
    try {
      if (this.clickhouseClient) {
        await this.clickhouseClient.query('SELECT 1').toPromise();
        health.clickhouse = true;
      }
    } catch (error) {
      console.error('ClickHouse health check failed:', error);
    }

    return health;
  }

  /**
   * Get connection statistics
   */
  async getStats(): Promise<any> {
    const stats: any = {
      postgres: null,
      redis: null,
      clickhouse: null,
    };

    // PostgreSQL stats
    if (this.pgPool) {
      stats.postgres = {
        totalCount: this.pgPool.totalCount,
        idleCount: this.pgPool.idleCount,
        waitingCount: this.pgPool.waitingCount,
      };
    }

    // Redis stats
    if (this.redisClient) {
      const info = await this.redisClient.info();
      stats.redis = {
        connected: this.redisClient.status === 'ready',
        usedMemory: info.match(/used_memory_human:(.+)/)?.[1],
        connectedClients: info.match(/connected_clients:(\d+)/)?.[1],
      };
    }

    return stats;
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(service: string): void {
    console.error(`Connection error for ${service}`);

    // Don't schedule reconnect if already scheduled
    if (!this.reconnectTimers.has(service)) {
      this.scheduleReconnect(service);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(service: string): void {
    // Clear existing timer if any
    this.clearReconnectTimer(service);

    const delay = 5000; // 5 seconds
    console.log(`Scheduling reconnect for ${service} in ${delay}ms`);

    const timer = setTimeout(async () => {
      console.log(`Attempting to reconnect ${service}...`);

      try {
        switch (service) {
          case 'postgres':
            await this.initializePostgres();
            break;
          case 'redis':
            await this.initializeRedis();
            break;
          case 'clickhouse':
            await this.initializeClickHouse();
            break;
        }

        console.log(`✅ ${service} reconnected successfully`);
        this.reconnectTimers.delete(service);
      } catch (error) {
        console.error(`Failed to reconnect ${service}:`, error);
        // Schedule another attempt
        this.scheduleReconnect(service);
      }
    }, delay);

    this.reconnectTimers.set(service, timer);
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(service: string): void {
    const timer = this.reconnectTimers.get(service);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(service);
    }
  }

  /**
   * Gracefully close all connections
   */
  async close(): Promise<void> {
    console.log('Closing database connections...');

    // Clear all reconnect timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    // Close PostgreSQL
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = null;
    }

    // Close Redis
    if (this.redisClient) {
      this.redisClient.disconnect();
      this.redisClient = null;
    }

    // Close ClickHouse
    this.clickhouseClient = null;

    this.isInitialized = false;
    console.log('All database connections closed');
  }
}

// Export singleton instance
export const dbManager = DatabaseConnectionManager.getInstance();

// Convenience exports
export const getDB = () => dbManager.getPostgres();
export const getRedis = () => dbManager.getRedis();
export const getClickHouse = () => dbManager.getClickHouse();
export const query = (sql: string, params?: any[]) =>
  dbManager.query(sql, params);
export const transaction = <T>(callback: (client: any) => Promise<T>) =>
  dbManager.transaction(callback);
export const getCached = <T>(key: string) => dbManager.getCached<T>(key);
export const setCached = (key: string, value: any, ttl?: number) =>
  dbManager.setCached(key, value, ttl);
export const clearCache = (pattern?: string) => dbManager.clearCache(pattern);

export default dbManager;
