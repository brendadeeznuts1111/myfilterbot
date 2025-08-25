/**
 * YAML Configuration Validator
 * Validates configuration on startup and provides helpful error messages
 */

import { yamlConfigService } from '../services/yaml-config-service';
import { YAML } from 'bun';
import { existsSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Validate all configuration files
   */
  async validateAll(): Promise<ValidationResult> {
    console.log('🔍 Validating YAML configurations...');

    this.errors = [];
    this.warnings = [];

    // Check if config files exist
    await this.checkConfigFiles();

    // Validate app configuration
    await this.validateAppConfig();

    // Validate database configuration
    await this.validateDatabaseConfig();

    // Validate feature flags
    await this.validateFeatures();

    // Validate environment-specific configs
    await this.validateEnvironmentConfig();

    const result = {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };

    this.printResults(result);

    return result;
  }

  /**
   * Check if required config files exist
   */
  private async checkConfigFiles() {
    const requiredFiles = [
      'config/app.yaml',
      'config/database.yaml',
      'config/features.yaml',
    ];

    const optionalFiles = [
      'config/environments/development.yaml',
      'config/environments/production.yaml',
      'config/environments/staging.yaml',
    ];

    for (const file of requiredFiles) {
      const path = join(process.cwd(), file);
      if (!existsSync(path)) {
        this.errors.push(`Required config file missing: ${file}`);
      }
    }

    for (const file of optionalFiles) {
      const path = join(process.cwd(), file);
      if (!existsSync(path)) {
        this.warnings.push(`Optional config file missing: ${file}`);
      }
    }
  }

  /**
   * Validate app configuration
   */
  private async validateAppConfig() {
    try {
      const config = await yamlConfigService.getAppConfig();

      // Check required fields
      if (!config?.app?.name) {
        this.errors.push('app.name is required in app.yaml');
      }

      // Validate server configurations
      const serverTypes = ['bot', 'admin', 'api', 'websocket'];
      for (const type of serverTypes) {
        const serverConfig = await yamlConfigService
          .getServerConfig(type as any)
          .catch(() => null);
        if (serverConfig) {
          if (
            !serverConfig.port ||
            serverConfig.port < 1 ||
            serverConfig.port > 65535
          ) {
            this.errors.push(
              `Invalid port for server.${type}: ${serverConfig.port}`
            );
          }
        }
      }

      // Validate security configuration
      const security = await yamlConfigService.getSecurityConfig();
      if (security) {
        if (
          !security.jwt?.secret ||
          security.jwt.secret === 'dev-secret-key-change-in-production'
        ) {
          if (process.env.NODE_ENV === 'production') {
            this.errors.push('JWT secret must be changed in production');
          } else {
            this.warnings.push(
              'Using default JWT secret - change before production'
            );
          }
        }
      }

      // Validate paths
      const paths = await yamlConfigService.getPathsConfig();
      if (paths) {
        for (const [key, path] of Object.entries(paths)) {
          if (typeof path === 'string' && !path) {
            this.warnings.push(`Empty path for: ${key}`);
          }
        }
      }
    } catch (error) {
      this.errors.push(`Failed to validate app config: ${error}`);
    }
  }

  /**
   * Validate database configuration
   */
  private async validateDatabaseConfig() {
    try {
      const connections = ['postgres', 'redis', 'clickhouse'];

      for (const conn of connections) {
        const config = await yamlConfigService
          .getDatabase(conn)
          .catch(() => null);

        if (config) {
          // Check required fields
          if (!config.host) {
            this.errors.push(`Database ${conn}: host is required`);
          }
          if (!config.port) {
            this.errors.push(`Database ${conn}: port is required`);
          }

          // Check for missing credentials in production
          if (process.env.NODE_ENV === 'production') {
            if (conn !== 'redis' && !config.password) {
              this.errors.push(
                `Database ${conn}: password is required in production`
              );
            }
          }

          // Validate connection pool settings
          if (config.pool) {
            if (config.pool.min > config.pool.max) {
              this.errors.push(
                `Database ${conn}: pool.min cannot be greater than pool.max`
              );
            }
          }
        } else if (conn === 'postgres') {
          // PostgreSQL is required
          this.errors.push(`Database configuration missing for: ${conn}`);
        }
      }
    } catch (error) {
      this.errors.push(`Failed to validate database config: ${error}`);
    }
  }

  /**
   * Validate feature flags
   */
  private async validateFeatures() {
    try {
      const features = await yamlConfigService.getFeatureFlags();

      // Check for feature dependencies
      const config = await import('../../config/features.yaml');
      const dependencies = config.dependencies || {};

      for (const [feature, deps] of Object.entries(dependencies)) {
        if (features[feature]) {
          const requires = (deps as any).requires || [];
          for (const required of requires) {
            if (!features[required]) {
              this.warnings.push(
                `Feature ${feature} requires ${required} to be enabled`
              );
            }
          }
        }
      }

      // Validate rollout percentages
      for (const [name, enabled] of Object.entries(features)) {
        const featureConfig = await yamlConfigService.getFeatureConfig(name);
        if (featureConfig) {
          const rollout = featureConfig.rolloutPercentage;
          if (rollout !== undefined && (rollout < 0 || rollout > 100)) {
            this.errors.push(
              `Invalid rollout percentage for feature ${name}: ${rollout}`
            );
          }
        }
      }
    } catch (error) {
      this.warnings.push(`Failed to validate features: ${error}`);
    }
  }

  /**
   * Validate environment-specific configuration
   */
  private async validateEnvironmentConfig() {
    const env = process.env.NODE_ENV || 'development';

    // Production-specific checks
    if (env === 'production') {
      // Check for debug mode
      const debugMode = process.env.ENABLE_DEBUG_MODE === 'true';
      if (debugMode) {
        this.warnings.push('Debug mode is enabled in production');
      }

      // Check for required environment variables
      const requiredEnvVars = [
        'JWT_SECRET',
        'DB_HOST',
        'DB_PASS',
        'TELEGRAM_BOT_TOKEN',
      ];

      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          this.errors.push(
            `Required environment variable missing in production: ${envVar}`
          );
        }
      }
    }

    // Development-specific checks
    if (env === 'development') {
      // Check for hot reload
      if (!import.meta.hot) {
        this.warnings.push(
          "Hot reload not enabled - use 'bun --hot' for better development experience"
        );
      }
    }
  }

  /**
   * Print validation results
   */
  private printResults(result: ValidationResult) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 YAML Configuration Validation Results');
    console.log('='.repeat(60));

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }

    if (result.valid) {
      console.log('\n✅ Configuration is valid!');
    } else {
      console.log('\n❌ Configuration validation failed!');
      console.log(
        '   Please fix the errors above before starting the application.'
      );
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * Validate and exit if invalid
   */
  async validateOrExit(): Promise<void> {
    const result = await this.validateAll();

    if (!result.valid) {
      console.error('💥 Exiting due to configuration errors');
      process.exit(1);
    }
  }
}

// Export singleton instance
export const configValidator = new ConfigValidator();

// Convenience function for validation
export async function validateConfig(): Promise<ValidationResult> {
  return configValidator.validateAll();
}

// Run validation if this is the main module
if (import.meta.main) {
  configValidator.validateOrExit();
}
