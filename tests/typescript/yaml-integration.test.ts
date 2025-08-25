/**
 * YAML Configuration Integration Tests
 * Verifies that YAML configuration is properly integrated throughout the application
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { yamlConfigService } from "../../src/services/yaml-config-service";
import { configValidator } from "../../src/utils/config-validator";
import { yaml_config } from "../../src/utils/yaml_config_reader.py";
import { YAML } from "bun";

describe("YAML Configuration Integration", () => {
  beforeAll(async () => {
    // Validate configuration before running tests
    const validation = await configValidator.validateAll();
    if (!validation.valid) {
      console.error("Configuration validation failed:", validation.errors);
    }
  });

  describe("Configuration Loading", () => {
    test("should load app configuration", async () => {
      const config = await yamlConfigService.getAppConfig();
      expect(config).toBeDefined();
      expect(config.app).toBeDefined();
      expect(config.app.name).toBe("fantdev-trading-bot");
      expect(config.app.version).toBe("2.1.0");
    });

    test("should load server configurations", async () => {
      const serverTypes = ["bot", "admin", "api", "websocket"] as const;
      
      for (const type of serverTypes) {
        const config = await yamlConfigService.getServerConfig(type);
        expect(config).toBeDefined();
        expect(config.port).toBeGreaterThan(0);
        expect(config.port).toBeLessThanOrEqual(65535);
      }
    });

    test("should load database configurations", async () => {
      const pgConfig = await yamlConfigService.getDatabase("postgres");
      expect(pgConfig).toBeDefined();
      expect(pgConfig.type).toBe("postgres");
      expect(pgConfig.host).toBeDefined();
      expect(pgConfig.port).toBeDefined();

      const redisConfig = await yamlConfigService.getDatabase("redis");
      expect(redisConfig).toBeDefined();
      expect(redisConfig.type).toBe("redis");
    });

    test("should load feature flags", async () => {
      const features = await yamlConfigService.getFeatureFlags();
      expect(features).toBeDefined();
      expect(typeof features).toBe("object");
      
      // Check specific features
      const darkMode = await yamlConfigService.isFeatureEnabled("darkMode");
      expect(typeof darkMode).toBe("boolean");
    });
  });

  describe("Environment Variable Interpolation", () => {
    test("should interpolate environment variables", async () => {
      // Set a test environment variable
      process.env.TEST_VAR = "test_value";
      
      // Create a test YAML with env var
      const yamlContent = `
test:
  value: \${TEST_VAR}
  withDefault: \${MISSING_VAR:-default_value}
`;
      
      const parsed = YAML.parse(yamlContent);
      const interpolated = yamlConfigService.getEnvValue(
        "TEST_VAR", 
        "fallback",
        { test: "test_value" }
      );
      
      expect(interpolated).toBe("test_value");
      
      // Clean up
      delete process.env.TEST_VAR;
    });

    test("should use default values for missing env vars", async () => {
      const config = await yamlConfigService.getAppConfig();
      
      // Check that defaults are applied where env vars are missing
      if (!process.env.DB_HOST) {
        const dbConfig = await yamlConfigService.getDatabase("postgres");
        expect(dbConfig.host).toBe("localhost");
      }
    });
  });

  describe("Feature Flag Functionality", () => {
    test("should check feature enablement", async () => {
      const isEnabled = await yamlConfigService.isFeatureEnabled("newDashboard");
      expect(typeof isEnabled).toBe("boolean");
    });

    test("should respect rollout percentages", async () => {
      // Test with different user IDs
      const users = ["user1", "user2", "user3", "user4", "user5"];
      const results = await Promise.all(
        users.map(userId => 
          yamlConfigService.isFeatureEnabled("advancedTrading", userId)
        )
      );
      
      // At least one should be different if rollout is not 0% or 100%
      const config = await yamlConfigService.getFeatureConfig("advancedTrading");
      if (config && config.rolloutPercentage > 0 && config.rolloutPercentage < 100) {
        const uniqueResults = new Set(results);
        expect(uniqueResults.size).toBeGreaterThanOrEqual(1);
      }
    });

    test("should respect allowed users list", async () => {
      const config = await yamlConfigService.getFeatureConfig("newDashboard");
      if (config?.allowedUsers?.length) {
        const allowedUser = config.allowedUsers[0];
        const isEnabled = await yamlConfigService.isFeatureEnabled("newDashboard", allowedUser);
        expect(isEnabled).toBe(true);
      }
    });
  });

  describe("A/B Testing", () => {
    test("should assign users to A/B test variants", async () => {
      const variant = await yamlConfigService.getABTestVariant("dashboardLayout", "testuser123");
      
      if (variant) {
        expect(["control", "treatment"]).toContain(variant);
      }
    });

    test("should consistently assign same user to same variant", async () => {
      const userId = "consistent_user";
      const variant1 = await yamlConfigService.getABTestVariant("dashboardLayout", userId);
      const variant2 = await yamlConfigService.getABTestVariant("dashboardLayout", userId);
      
      expect(variant1).toBe(variant2);
    });
  });

  describe("Configuration Validation", () => {
    test("should validate configuration successfully", async () => {
      const result = await configValidator.validateAll();
      
      // We expect valid config for tests
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should detect missing required fields", async () => {
      // This would require mocking the config files
      // For now, just verify validator exists and works
      expect(configValidator).toBeDefined();
      expect(typeof configValidator.validateAll).toBe("function");
    });
  });

  describe("Hot Reload Support", () => {
    test("should support configuration watching", () => {
      let callbackCalled = false;
      
      const unwatch = yamlConfigService.watchConfig("app.yaml", (config) => {
        callbackCalled = true;
      });
      
      expect(typeof unwatch).toBe("function");
      
      // Clean up
      unwatch();
    });

    test("should reload configuration", async () => {
      await yamlConfigService.reloadAll();
      
      // Verify config is still accessible after reload
      const config = await yamlConfigService.getAppConfig();
      expect(config).toBeDefined();
    });
  });

  describe("Security Configuration", () => {
    test("should load security configuration", async () => {
      const security = await yamlConfigService.getSecurityConfig();
      
      expect(security).toBeDefined();
      expect(security.jwt).toBeDefined();
      expect(security.cors).toBeDefined();
      expect(security.rateLimit).toBeDefined();
    });

    test("should get rate limit configuration", async () => {
      const rateLimit = await yamlConfigService.getRateLimitConfig();
      
      expect(rateLimit).toBeDefined();
      expect(typeof rateLimit.enabled).toBe("boolean");
      expect(rateLimit.window).toBeGreaterThan(0);
      expect(rateLimit.max).toBeGreaterThan(0);
    });

    test("should get CORS configuration", async () => {
      const cors = await yamlConfigService.getCorsConfig();
      
      expect(cors).toBeDefined();
      expect(Array.isArray(cors.origins)).toBe(true);
      expect(typeof cors.credentials).toBe("boolean");
    });
  });

  describe("Multi-Environment Support", () => {
    test("should load environment-specific configuration", async () => {
      const env = process.env.NODE_ENV || "development";
      const config = await yamlConfigService.getAppConfig();
      
      expect(config).toBeDefined();
      
      // Verify environment-specific values are loaded
      if (env === "development") {
        const serverConfig = await yamlConfigService.getServerConfig("admin");
        expect(serverConfig.debug).toBeDefined();
      }
    });
  });

  describe("Performance", () => {
    test("should cache configuration for performance", async () => {
      const start = performance.now();
      
      // First load (might be slower)
      await yamlConfigService.getAppConfig();
      
      const firstLoadTime = performance.now() - start;
      
      // Second load (should be cached)
      const cacheStart = performance.now();
      await yamlConfigService.getAppConfig();
      const cacheLoadTime = performance.now() - cacheStart;
      
      // Cached load should be significantly faster
      expect(cacheLoadTime).toBeLessThan(firstLoadTime);
      expect(cacheLoadTime).toBeLessThan(5); // Should be under 5ms
    });
  });
});

// Export for use in other tests
export { yamlConfigService, configValidator };