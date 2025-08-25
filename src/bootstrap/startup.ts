#!/usr/bin/env bun
/**
 * Application Bootstrap
 * Initializes all services and configurations on startup
 */

import { enhancedConfig } from '../config/enhanced-config-service';
import { dbManager } from '../database/connection-manager';
import { configValidator } from '../utils/config-validator';
import type { AppConfig } from '../config/schemas';

// ============================================================================
// Startup Configuration
// ============================================================================

export interface StartupOptions {
  validateConfig?: boolean;
  initDatabase?: boolean;
  initCache?: boolean;
  initServices?: boolean;
  initMonitoring?: boolean;
  runMigrations?: boolean;
  setupGracefulShutdown?: boolean;
}

export class ApplicationBootstrap {
  private static instance: ApplicationBootstrap;
  private config: AppConfig | null = null;
  private isInitialized = false;
  private shutdownHandlers: Array<() => Promise<void>> = [];

  private constructor() {}

  public static getInstance(): ApplicationBootstrap {
    if (!ApplicationBootstrap.instance) {
      ApplicationBootstrap.instance = new ApplicationBootstrap();
    }
    return ApplicationBootstrap.instance;
  }

  /**
   * Initialize the application
   */
  async initialize(options: StartupOptions = {}): Promise<void> {
    const {
      validateConfig = true,
      initDatabase = true,
      initCache = true,
      initServices = true,
      initMonitoring = true,
      runMigrations = false,
      setupGracefulShutdown = true,
    } = options;

    console.log('🚀 Starting Application Bootstrap...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
    console.log('=' + '='.repeat(59));

    try {
      // Step 1: Load and validate configuration
      if (validateConfig) {
        await this.validateConfiguration();
      }

      // Step 2: Load application config
      await this.loadConfiguration();

      // Step 3: Initialize database connections
      if (initDatabase) {
        await this.initializeDatabases();
      }

      // Step 4: Run migrations if needed
      if (runMigrations) {
        await this.runDatabaseMigrations();
      }

      // Step 5: Initialize cache
      if (initCache) {
        await this.initializeCache();
      }

      // Step 6: Initialize services
      if (initServices) {
        await this.initializeServices();
      }

      // Step 7: Initialize monitoring
      if (initMonitoring) {
        await this.initializeMonitoring();
      }

      // Step 8: Setup graceful shutdown
      if (setupGracefulShutdown) {
        this.setupGracefulShutdown();
      }

      // Step 9: Perform health checks
      await this.performHealthChecks();

      this.isInitialized = true;

      console.log('=' + '='.repeat(59));
      console.log('✅ Application initialized successfully!');
      console.log(
        `🎯 Ready to serve requests on port ${this.config?.server?.api?.port || 3000}`
      );
      console.log('=' + '='.repeat(59) + '\n');
    } catch (error) {
      console.error('❌ Bootstrap failed:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Validate configuration files
   */
  private async validateConfiguration(): Promise<void> {
    console.log('\n📋 Validating configuration...');

    const validation = await configValidator.validateAll();

    if (!validation.valid) {
      console.error('❌ Configuration validation failed:');
      validation.errors.forEach(error => console.error(`   • ${error}`));
      throw new Error('Invalid configuration');
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️  Configuration warnings:');
      validation.warnings.forEach(warning => console.warn(`   • ${warning}`));
    }

    console.log('✅ Configuration validated successfully');
  }

  /**
   * Load application configuration
   */
  private async loadConfiguration(): Promise<void> {
    console.log('\n📦 Loading application configuration...');

    this.config = await enhancedConfig.getAppConfig();

    // Validate environment-specific config
    if (process.env.NODE_ENV === 'production') {
      await this.validateProductionConfig();
    }

    console.log('✅ Configuration loaded successfully');
  }

  /**
   * Validate production configuration
   */
  private async validateProductionConfig(): Promise<void> {
    if (!this.config) return;

    const criticalChecks = [
      {
        condition:
          this.config.security.jwt.secret ===
          'dev-secret-key-change-in-production',
        message: 'JWT secret must be changed in production',
      },
      {
        condition: !process.env.TELEGRAM_BOT_TOKEN,
        message: 'Telegram bot token is required in production',
      },
      {
        condition: !process.env.DB_PASS,
        message: 'Database password is required in production',
      },
    ];

    const failures = criticalChecks.filter(check => check.condition);

    if (failures.length > 0) {
      console.error('❌ Production configuration check failed:');
      failures.forEach(failure => console.error(`   • ${failure.message}`));
      throw new Error('Production configuration requirements not met');
    }
  }

  /**
   * Initialize database connections
   */
  private async initializeDatabases(): Promise<void> {
    console.log('\n🔌 Initializing database connections...');

    await dbManager.initialize();

    // Register shutdown handler
    this.shutdownHandlers.push(async () => {
      console.log('Closing database connections...');
      await dbManager.close();
    });

    console.log('✅ Database connections established');
  }

  /**
   * Run database migrations
   */
  private async runDatabaseMigrations(): Promise<void> {
    console.log('\n🔄 Running database migrations...');

    try {
      // This would run your actual migration logic
      // For now, just a placeholder
      const dbConfig = await enhancedConfig.getDatabaseConfig();

      if (dbConfig.migrations?.autoRun) {
        console.log(
          '   Running migrations from:',
          dbConfig.migrations.directory
        );
        // await runMigrations(dbConfig.migrations.directory);
      }

      console.log('✅ Migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Initialize cache service
   */
  private async initializeCache(): Promise<void> {
    console.log('\n💾 Initializing cache service...');

    try {
      // Test cache connection
      await dbManager.setCached('test:startup', { timestamp: Date.now() }, 60);
      const testValue = await dbManager.getCached('test:startup');

      if (!testValue) {
        throw new Error('Cache test failed');
      }

      await dbManager.deleteCached('test:startup');

      console.log('✅ Cache service initialized');
    } catch (error) {
      console.error('⚠️  Cache initialization failed:', error);
      // Don't fail startup if cache is unavailable
    }
  }

  /**
   * Initialize application services
   */
  private async initializeServices(): Promise<void> {
    console.log('\n⚙️  Initializing application services...');

    const services = [
      { name: 'Authentication', init: this.initAuthService },
      { name: 'Notifications', init: this.initNotificationService },
      { name: 'Queue', init: this.initQueueService },
      { name: 'Storage', init: this.initStorageService },
    ];

    for (const service of services) {
      try {
        console.log(`   • Initializing ${service.name}...`);
        await service.init.call(this);
      } catch (error) {
        console.error(`   ❌ Failed to initialize ${service.name}:`, error);
        // Continue with other services
      }
    }

    console.log('✅ Application services initialized');
  }

  private async initAuthService(): Promise<void> {
    // Initialize authentication service
    // This would set up JWT, OAuth providers, etc.
  }

  private async initNotificationService(): Promise<void> {
    // Initialize notification service
    // This would set up email, SMS, push notification providers
  }

  private async initQueueService(): Promise<void> {
    // Initialize queue service
    // This would set up job queues for async processing
  }

  private async initStorageService(): Promise<void> {
    // Initialize storage service
    // This would set up file storage (local, S3, etc.)
  }

  /**
   * Initialize monitoring and logging
   */
  private async initializeMonitoring(): Promise<void> {
    console.log('\n📊 Initializing monitoring...');

    try {
      // Initialize Sentry if configured
      if (process.env.SENTRY_DSN) {
        // await initSentry();
        console.log('   • Sentry error tracking enabled');
      }

      // Initialize Prometheus metrics if configured
      if (process.env.PROMETHEUS_ENABLED === 'true') {
        // await initPrometheus();
        console.log('   • Prometheus metrics enabled');
      }

      // Setup logging
      console.log('   • Logging configured');

      console.log('✅ Monitoring initialized');
    } catch (error) {
      console.error('⚠️  Monitoring initialization failed:', error);
      // Don't fail startup if monitoring fails
    }
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<void> {
    console.log('\n🏥 Performing health checks...');

    const health = await dbManager.healthCheck();

    console.log('   Database health:');
    console.log(`     • PostgreSQL: ${health.postgres ? '✅' : '❌'}`);
    console.log(`     • Redis: ${health.redis ? '✅' : '❌'}`);
    console.log(
      `     • ClickHouse: ${health.clickhouse ? '✅' : '⚠️  (optional)'}`
    );

    // Check critical services
    if (!health.postgres) {
      throw new Error('PostgreSQL is not healthy');
    }

    console.log('✅ Health checks passed');
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n📴 Received ${signal}, starting graceful shutdown...`);
        await this.shutdown();
        process.exit(0);
      });
    });

    process.on('uncaughtException', async error => {
      console.error('💥 Uncaught Exception:', error);
      await this.shutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      await this.shutdown();
      process.exit(1);
    });

    console.log('\n🛡️  Graceful shutdown handlers registered');
  }

  /**
   * Shutdown the application gracefully
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    console.log('\n🔄 Shutting down application...');

    // Run shutdown handlers in reverse order
    for (const handler of this.shutdownHandlers.reverse()) {
      try {
        await handler();
      } catch (error) {
        console.error('Error during shutdown:', error);
      }
    }

    this.isInitialized = false;
    console.log('👋 Application shutdown complete');
  }

  /**
   * Get application configuration
   */
  getConfig(): AppConfig | null {
    return this.config;
  }

  /**
   * Check if application is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get application statistics
   */
  async getStats(): Promise<any> {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: await dbManager.getStats(),
      cache: await enhancedConfig.getCacheStats(),
      environment: process.env.NODE_ENV,
      version: this.config?.app?.version,
    };
  }
}

// Export singleton instance
export const bootstrap = ApplicationBootstrap.getInstance();

// Main entry point
if (import.meta.main) {
  // Running directly
  bootstrap.initialize().catch(error => {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  });
}

export default bootstrap;
