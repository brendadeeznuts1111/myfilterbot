/**
 * YAML Configuration Service
 * Provides centralized access to all YAML configurations
 */

import { getAppConfig, getDatabaseConfig, isFeatureEnabled, configManager } from "../utils/yaml-config";
import type { YAML } from "bun";

export interface ServerConfig {
  host: string;
  port: number;
  workers?: number;
  debug?: boolean;
}

export interface DatabaseConnection {
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  pool?: {
    min: number;
    max: number;
    idleTimeout: number;
  };
}

export interface FeatureConfig {
  enabled: boolean;
  rolloutPercentage: number;
  description?: string;
  config?: Record<string, any>;
}

class YamlConfigService {
  private static instance: YamlConfigService;
  private appConfig: any = null;
  private featuresConfig: any = null;
  private databaseConfig: any = null;
  private environment: string;

  private constructor() {
    this.environment = process.env.NODE_ENV || "development";
    this.initialize();
  }

  public static getInstance(): YamlConfigService {
    if (!YamlConfigService.instance) {
      YamlConfigService.instance = new YamlConfigService();
    }
    return YamlConfigService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      // Load all configurations
      this.appConfig = await getAppConfig();
      this.featuresConfig = await import("../../config/features.yaml");
      this.databaseConfig = await import("../../config/database.yaml");
      
      console.log(`✅ YAML configurations loaded for environment: ${this.environment}`);
    } catch (error) {
      console.error("❌ Failed to load YAML configurations:", error);
    }
  }

  /**
   * Get server configuration
   */
  public async getServerConfig(serverType: "bot" | "admin" | "api" | "websocket"): Promise<ServerConfig> {
    if (!this.appConfig) await this.initialize();
    
    const config = this.appConfig?.server?.[serverType];
    if (!config) {
      throw new Error(`Server configuration not found for: ${serverType}`);
    }
    
    return config;
  }

  /**
   * Get database configuration by connection name
   */
  public async getDatabase(connectionName: string = "postgres"): Promise<DatabaseConnection> {
    return getDatabaseConfig(connectionName);
  }

  /**
   * Check if a feature is enabled for a user
   */
  public async isFeatureEnabled(featureName: string, userId?: string): Promise<boolean> {
    return isFeatureEnabled(featureName, userId);
  }

  /**
   * Get all feature flags status for a user
   */
  public async getFeatureFlags(userId?: string): Promise<Record<string, boolean>> {
    if (!this.featuresConfig) await this.initialize();
    
    const features = this.featuresConfig?.features?.features || {};
    const result: Record<string, boolean> = {};
    
    for (const featureName of Object.keys(features)) {
      result[featureName] = await this.isFeatureEnabled(featureName, userId);
    }
    
    return result;
  }

  /**
   * Get feature configuration
   */
  public async getFeatureConfig(featureName: string): Promise<FeatureConfig | null> {
    if (!this.featuresConfig) await this.initialize();
    
    return this.featuresConfig?.features?.features?.[featureName] || null;
  }

  /**
   * Get security configuration
   */
  public async getSecurityConfig(): Promise<any> {
    if (!this.appConfig) await this.initialize();
    
    return this.appConfig?.security || {};
  }

  /**
   * Get monitoring configuration
   */
  public async getMonitoringConfig(): Promise<any> {
    if (!this.appConfig) await this.initialize();
    
    return this.appConfig?.monitoring || {};
  }

  /**
   * Get paths configuration
   */
  public async getPathsConfig(): Promise<any> {
    if (!this.appConfig) await this.initialize();
    
    return this.appConfig?.paths || {};
  }

  /**
   * Get Telegram configuration
   */
  public async getTelegramConfig(): Promise<any> {
    if (!this.appConfig) await this.initialize();
    
    return this.appConfig?.telegram || {};
  }

  /**
   * Get cloud services configuration
   */
  public async getCloudConfig(service: "cloudflare" | "firebase"): Promise<any> {
    if (!this.appConfig) await this.initialize();
    
    return this.appConfig?.[service] || {};
  }

  /**
   * Watch configuration changes
   */
  public watchConfig(filename: string, callback: (config: any) => void): () => void {
    return configManager.watch(filename, callback);
  }

  /**
   * Reload all configurations
   */
  public async reloadAll(): Promise<void> {
    await configManager.reload("app.yaml");
    await configManager.reload("features.yaml");
    await configManager.reload("database.yaml");
    await this.initialize();
    
    console.log("🔄 All YAML configurations reloaded");
  }

  /**
   * Get environment-specific value with fallback
   */
  public getEnvValue<T>(
    key: string,
    defaultValue: T,
    environments?: Record<string, T>
  ): T {
    if (environments && environments[this.environment] !== undefined) {
      return environments[this.environment];
    }
    return defaultValue;
  }

  /**
   * Parse YAML string
   */
  public parseYaml(yamlString: string): any {
    const { YAML } = Bun;
    return YAML.parse(yamlString);
  }

  /**
   * Get A/B test variant for a user
   */
  public async getABTestVariant(testName: string, userId: string): Promise<string | null> {
    if (!this.featuresConfig) await this.initialize();
    
    const test = this.featuresConfig?.features?.abTests?.[testName];
    if (!test?.enabled || !test?.variants) {
      return null;
    }
    
    // Simple hash-based assignment
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    
    const bucketValue = Math.abs(hash) % 100;
    let accumulatedWeight = 0;
    
    for (const variant of test.variants) {
      accumulatedWeight += variant.weight;
      if (bucketValue < accumulatedWeight) {
        return variant.name;
      }
    }
    
    return test.variants[0]?.name || null;
  }

  /**
   * Validate database connection
   */
  public async validateDatabaseConnection(connectionName: string): Promise<boolean> {
    try {
      const config = await this.getDatabase(connectionName);
      
      // Check required fields
      if (!config.host || !config.port || !config.database) {
        console.error(`Invalid database configuration for: ${connectionName}`);
        return false;
      }
      
      console.log(`✅ Database configuration valid for: ${connectionName}`);
      return true;
    } catch (error) {
      console.error(`❌ Database configuration error for ${connectionName}:`, error);
      return false;
    }
  }

  /**
   * Get rate limit configuration
   */
  public async getRateLimitConfig(): Promise<{
    enabled: boolean;
    window: number;
    max: number;
  }> {
    const security = await this.getSecurityConfig();
    
    return {
      enabled: security?.rateLimit?.enabled || false,
      window: security?.rateLimit?.window || 60000,
      max: security?.rateLimit?.max || 100,
    };
  }

  /**
   * Get CORS configuration
   */
  public async getCorsConfig(): Promise<{
    origins: string[];
    credentials: boolean;
  }> {
    const security = await this.getSecurityConfig();
    
    return {
      origins: security?.cors?.origins || ["http://localhost:3000"],
      credentials: security?.cors?.credentials !== false,
    };
  }
}

// Export singleton instance
export const yamlConfigService = YamlConfigService.getInstance();

// Export convenience functions
export const getServerConfig = (serverType: "bot" | "admin" | "api" | "websocket") => 
  yamlConfigService.getServerConfig(serverType);

export const getFeatureFlags = (userId?: string) => 
  yamlConfigService.getFeatureFlags(userId);

export const checkFeature = (featureName: string, userId?: string) => 
  yamlConfigService.isFeatureEnabled(featureName, userId);

export const reloadConfigs = () => 
  yamlConfigService.reloadAll();

export default yamlConfigService;