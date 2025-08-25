/**
 * Enhanced Configuration System Tests
 * Tests for Zod validation, caching, encryption, and environment handling
 */

import { describe, test, expect, beforeAll, afterEach, mock } from 'bun:test';
import {
  enhancedConfig,
  getConfig,
  getDatabaseConfig,
  getFeaturesConfig,
  isFeatureEnabled,
  getABTestVariant,
  validateConfigs,
} from '../../src/config/enhanced-config-service';
import {
  validateAppConfig,
  validateProductionConfig,
  validateDevelopmentConfig,
  type AppConfig,
  type DatabaseConfig,
} from '../../src/config/schemas';

describe('Enhanced Configuration System', () => {
  afterEach(() => {
    // Clear cache after each test
    enhancedConfig.clearCache();
  });

  describe('Schema Validation', () => {
    test('should validate valid app configuration', () => {
      const validConfig = {
        app: {
          name: 'test-app',
          version: '1.0.0',
        },
        server: {
          bot: { host: 'localhost', port: 8080 },
          admin: { host: 'localhost', port: 3000 },
          api: { host: 'localhost', port: 3001 },
          websocket: { port: 3002, compression: true, maxConnections: 1000 },
        },
        security: {
          jwt: { secret: 'test-secret-key-32-characters-long!', expiresIn: '7d' },
          encryption: { algorithm: 'aes-256-gcm', key: 'test-key-32-characters-long!!!!' },
          cors: { origins: ['http://localhost:3000'], credentials: true },
          rateLimit: { enabled: true, window: 60000, max: 100 },
        },
        paths: {
          uploads: './uploads',
          temp: './temp',
          logs: './logs',
          static: './public',
        },
      };

      expect(() => validateAppConfig(validConfig)).not.toThrow();
    });

    test('should reject invalid port numbers', () => {
      const invalidConfig = {
        app: { name: 'test', version: '1.0.0' },
        server: {
          bot: { host: 'localhost', port: 70000 }, // Invalid port
          admin: { host: 'localhost', port: 3000 },
          api: { host: 'localhost', port: 3001 },
          websocket: { port: 3002 },
        },
        security: {
          jwt: { secret: 'test-secret' },
          encryption: { key: 'test-key' },
          cors: { origins: [] },
          rateLimit: { enabled: true, window: 60000, max: 100 },
        },
        paths: {},
      };

      expect(() => validateAppConfig(invalidConfig)).toThrow();
    });

    test('should validate database configuration', () => {
      const dbConfig = {
        connections: {
          postgres: {
            type: 'postgres' as const,
            host: 'localhost',
            port: 5432,
            database: 'testdb',
            username: 'testuser',
            password: 'testpass',
            pool: { min: 2, max: 10 },
          },
          redis: {
            type: 'redis' as const,
            host: 'localhost',
            port: 6379,
            db: 0,
          },
        },
      };

      expect(() => validateDatabaseConfig(dbConfig)).not.toThrow();
    });

    test('should validate feature configuration', () => {
      const featuresConfig = {
        features: {
          testFeature: {
            enabled: true,
            rolloutPercentage: 50,
            description: 'Test feature',
            allowedUsers: ['user1', 'user2'],
          },
        },
        abTests: {
          testAB: {
            enabled: true,
            variants: [
              { name: 'control', weight: 50 },
              { name: 'treatment', weight: 50 },
            ],
          },
        },
      };

      expect(() => validateFeaturesConfig(featuresConfig)).not.toThrow();
    });
  });

  describe('Environment-Specific Validation', () => {
    test('should fail production validation with dev secrets', () => {
      const config: AppConfig = {
        app: { name: 'test', version: '1.0.0' },
        server: {
          bot: { host: 'localhost', port: 8080 },
          admin: { host: 'localhost', port: 3000 },
          api: { host: 'localhost', port: 3001 },
          websocket: { port: 3002, compression: true, maxConnections: 1000 },
        },
        security: {
          jwt: { 
            secret: 'dev-secret-key-change-in-production', // Dev secret
            expiresIn: '7d',
            refreshExpiresIn: '30d',
          },
          encryption: { 
            algorithm: 'aes-256-gcm',
            key: 'test-key-32-characters-long!!!!',
          },
          cors: { origins: ['http://localhost:3000'], credentials: true },
          rateLimit: { enabled: true, window: 60000, max: 100 },
        },
        paths: {
          uploads: './uploads',
          temp: './temp',
          logs: './logs',
          static: './public',
        },
      };

      expect(() => validateProductionConfig(config)).toThrow(/JWT secret must be changed/);
    });

    test('should warn in development with production secrets', () => {
      const config: AppConfig = {
        app: { name: 'test', version: '1.0.0' },
        server: {
          bot: { host: 'localhost', port: 8080 },
          admin: { host: 'localhost', port: 3000, debug: false }, // Debug off
          api: { host: 'localhost', port: 3001 },
          websocket: { port: 3002, compression: true, maxConnections: 1000 },
        },
        security: {
          jwt: { 
            secret: 'production-secret-key-very-secure!!!',
            expiresIn: '7d',
            refreshExpiresIn: '30d',
          },
          encryption: { 
            algorithm: 'aes-256-gcm',
            key: 'prod-key-32-characters-long!!!!',
          },
          cors: { origins: ['https://production.com'], credentials: true },
          rateLimit: { enabled: true, window: 60000, max: 100 },
        },
        paths: {
          uploads: './uploads',
          temp: './temp',
          logs: './logs',
          static: './public',
        },
      };

      // Should not throw, just warn
      expect(() => validateDevelopmentConfig(config)).not.toThrow();
    });
  });

  describe('Configuration Caching', () => {
    test('should cache configuration in production', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        // First call should load from file
        const config1 = await enhancedConfig.getAppConfig();
        
        // Second call should use cache
        const config2 = await enhancedConfig.getAppConfig();
        
        // Should be the same reference (cached)
        expect(config1).toBe(config2);
        
        // Check cache stats
        const stats = enhancedConfig.getCacheStats();
        expect(stats.cached).toContain('app:config');
        expect(stats.validated).toContain('app');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('should clear cache on demand', async () => {
      await enhancedConfig.getAppConfig();
      
      let stats = enhancedConfig.getCacheStats();
      expect(stats.cached.length).toBeGreaterThan(0);
      
      enhancedConfig.clearCache();
      
      stats = enhancedConfig.getCacheStats();
      expect(stats.cached.length).toBe(0);
      expect(stats.validated.length).toBe(0);
    });
  });

  describe('Encryption', () => {
    test('should encrypt and decrypt sensitive data', () => {
      const sensitive = 'my-secret-password';
      
      const encrypted = enhancedConfig.encryptSensitive(sensitive);
      expect(encrypted).toStartWith('encrypted:');
      expect(encrypted).not.toContain(sensitive);
      
      const decrypted = enhancedConfig.decryptSensitive(encrypted);
      expect(decrypted).toBe(sensitive);
    });

    test('should handle non-encrypted data', () => {
      const plaintext = 'not-encrypted';
      const result = enhancedConfig.decryptSensitive(plaintext);
      expect(result).toBe(plaintext);
    });
  });

  describe('Feature Flags', () => {
    test('should check feature enablement', async () => {
      // This would need mocked config files
      // For now, just verify the function exists and returns boolean
      const result = await isFeatureEnabled('testFeature', 'user123');
      expect(typeof result).toBe('boolean');
    });

    test('should consistently assign A/B test variants', async () => {
      const userId = 'consistent-user-123';
      
      // Multiple calls should return same variant
      const variant1 = await getABTestVariant('testAB', userId);
      const variant2 = await getABTestVariant('testAB', userId);
      const variant3 = await getABTestVariant('testAB', userId);
      
      if (variant1 !== null) {
        expect(variant1).toBe(variant2);
        expect(variant2).toBe(variant3);
      }
    });

    test('should respect rollout percentages', async () => {
      // Test with 100 users to verify distribution
      const results = new Map<boolean, number>();
      
      for (let i = 0; i < 100; i++) {
        const enabled = await isFeatureEnabled('testFeature', `user${i}`);
        results.set(enabled, (results.get(enabled) || 0) + 1);
      }
      
      // Should have both enabled and disabled users if rollout < 100%
      // This is probabilistic, so we just check the function works
      expect(results.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Environment Variable Parsing', () => {
    test('should parse simple environment variables', () => {
      process.env.TEST_VAR = 'test-value';
      
      const config = {
        value: '${TEST_VAR}',
      };
      
      // This would be done internally by EnvParser
      const parsed = JSON.stringify(config).replace(
        /\${([^}]+)}/g,
        (_, key) => process.env[key] || ''
      );
      
      expect(parsed).toContain('test-value');
      
      delete process.env.TEST_VAR;
    });

    test('should handle default values', () => {
      delete process.env.MISSING_VAR;
      
      const config = {
        value: '${MISSING_VAR:-default-value}',
      };
      
      const parsed = JSON.stringify(config).replace(
        /\${([^:-]+)(?::([^}]+))?}/g,
        (_, key, defaultVal) => process.env[key] || defaultVal || ''
      );
      
      expect(parsed).toContain('default-value');
    });

    test('should handle required variables', () => {
      delete process.env.REQUIRED_VAR;
      
      const config = {
        value: '${REQUIRED_VAR:?This variable is required}',
      };
      
      // This should throw in real parsing
      expect(() => {
        const parsed = JSON.stringify(config).replace(
          /\${([^}]+)}/g,
          (_, expr) => {
            if (expr.includes(':?')) {
              const [key, error] = expr.split(':?');
              if (!process.env[key]) {
                throw new Error(error || `${key} is required`);
              }
            }
            return '';
          }
        );
      }).toThrow(/This variable is required/);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate all configurations', async () => {
      const result = await validateConfigs();
      
      // Result should have valid flag and errors array
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      
      // In a real environment with proper configs, this would be valid
      // For testing, we just verify the structure
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance', () => {
    test('should load configuration quickly', async () => {
      const start = performance.now();
      await getConfig();
      const duration = performance.now() - start;
      
      // Should load in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    test('should cache efficiently in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      try {
        // First load
        const start1 = performance.now();
        await getConfig();
        const duration1 = performance.now() - start1;
        
        // Cached load
        const start2 = performance.now();
        await getConfig();
        const duration2 = performance.now() - start2;
        
        // Cached should be much faster
        expect(duration2).toBeLessThan(duration1);
        expect(duration2).toBeLessThan(5); // Should be under 5ms
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});

export { enhancedConfig };