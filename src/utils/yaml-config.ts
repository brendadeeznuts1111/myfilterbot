import { YAML } from "bun";
import { join } from "path";

interface ConfigOptions {
  environment?: string;
  interpolateEnv?: boolean;
  configPath?: string;
}

/**
 * Interpolates environment variables in configuration values
 * Supports ${VAR_NAME} and ${VAR_NAME:-defaultValue} syntax
 */
export function interpolateEnvVars(value: any): any {
  if (typeof value === "string") {
    const result = value.replace(
      /\${([^:-]+)(?::([^}]+))?}/g,
      (_, key, defaultValue) => {
        const envValue = process.env[key];
        if (envValue !== undefined) {
          return envValue;
        }
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        console.warn(`Warning: Environment variable ${key} is not set`);
        return "";
      }
    );
    
    // Try to parse as number if the result looks numeric
    if (/^\d+$/.test(result)) {
      return parseInt(result, 10);
    }
    if (/^\d+\.\d+$/.test(result)) {
      return parseFloat(result);
    }
    
    return result;
  }

  if (Array.isArray(value)) {
    return value.map(interpolateEnvVars);
  }

  if (value !== null && typeof value === "object") {
    const result: any = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = interpolateEnvVars(val);
    }
    return result;
  }

  return value;
}

/**
 * Deep merges two configuration objects
 */
export function deepMerge(target: any, source: any): any {
  if (!source) return target;
  if (!target) return source;

  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (
        typeof source[key] === "object" &&
        source[key] !== null &&
        !Array.isArray(source[key])
      ) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * Loads a YAML configuration file
 */
export async function loadYamlConfig<T = any>(
  filename: string,
  options: ConfigOptions = {}
): Promise<T> {
  const {
    environment = process.env.NODE_ENV || "development",
    interpolateEnv = true,
    configPath = "config",
  } = options;

  try {
    // Load base configuration
    const basePath = join(process.cwd(), configPath, filename);
    const baseConfig = await import(basePath);
    
    let config = baseConfig.default || baseConfig;

    // Check for environment-specific configuration
    if (config.environments && config.environments[environment]) {
      config = deepMerge(config, config.environments[environment]);
      delete config.environments;
    }

    // Try to load environment-specific file
    try {
      const envPath = join(
        process.cwd(),
        configPath,
        "environments",
        `${environment}.yaml`
      );
      const envConfig = await import(envPath);
      config = deepMerge(config, envConfig.default || envConfig);
    } catch {
      // Environment-specific file doesn't exist, continue with base config
    }

    // Interpolate environment variables if requested
    if (interpolateEnv) {
      config = interpolateEnvVars(config);
    }

    return config;
  } catch (error) {
    console.error(`Failed to load configuration from ${filename}:`, error);
    throw error;
  }
}

/**
 * Configuration manager singleton
 */
class ConfigManager {
  private cache = new Map<string, any>();
  private watchers = new Map<string, Set<(config: any) => void>>();

  /**
   * Loads or retrieves a cached configuration
   */
  async get<T = any>(
    filename: string,
    options: ConfigOptions = {}
  ): Promise<T> {
    const cacheKey = `${filename}:${options.environment || "default"}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const config = await loadYamlConfig<T>(filename, options);
    this.cache.set(cacheKey, config);
    
    return config;
  }

  /**
   * Clears a specific configuration from cache
   */
  clear(filename?: string): void {
    if (filename) {
      for (const [key] of this.cache) {
        if (key.startsWith(filename)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Watches a configuration file for changes (hot reload)
   */
  watch(filename: string, callback: (config: any) => void): () => void {
    if (!this.watchers.has(filename)) {
      this.watchers.set(filename, new Set());
    }
    
    this.watchers.get(filename)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const watchers = this.watchers.get(filename);
      if (watchers) {
        watchers.delete(callback);
        if (watchers.size === 0) {
          this.watchers.delete(filename);
        }
      }
    };
  }

  /**
   * Notifies watchers of configuration changes
   */
  private notify(filename: string, config: any): void {
    const watchers = this.watchers.get(filename);
    if (watchers) {
      watchers.forEach(callback => callback(config));
    }
  }

  /**
   * Reloads a configuration and notifies watchers
   */
  async reload(filename: string, options: ConfigOptions = {}): Promise<void> {
    this.clear(filename);
    const config = await this.get(filename, options);
    this.notify(filename, config);
  }
}

export const configManager = new ConfigManager();

/**
 * Helper function to get typed configuration
 */
export async function getConfig<T = any>(
  filename: string,
  options?: ConfigOptions
): Promise<T> {
  return configManager.get<T>(filename, options);
}

/**
 * Parse YAML string directly
 */
export function parseYaml<T = any>(yamlString: string): T {
  const parsed = YAML.parse(yamlString);
  return interpolateEnvVars(parsed);
}

/**
 * Feature flag helper
 */
export async function isFeatureEnabled(
  featureName: string,
  userId?: string
): Promise<boolean> {
  const features = await getConfig("features.yaml");
  const feature = features.features?.[featureName];

  if (!feature?.enabled) {
    return false;
  }

  // Check rollout percentage
  if (feature.rolloutPercentage < 100 && userId) {
    const hash = hashCode(userId);
    if ((hash % 100) >= feature.rolloutPercentage) {
      return false;
    }
  }

  // Check allowed users
  if (feature.allowedUsers?.length && userId) {
    return feature.allowedUsers.includes(userId);
  }

  return true;
}

/**
 * Simple hash function for rollout percentage
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get database configuration for specific connection
 */
export async function getDatabaseConfig(
  connectionName: string = "postgres"
): Promise<any> {
  const config = await getConfig("database.yaml");
  const env = process.env.NODE_ENV || "development";
  
  // Check for environment-specific override
  if (config.environments?.[env]?.[connectionName]) {
    return config.environments[env][connectionName];
  }
  
  return config.connections[connectionName];
}

/**
 * Get app configuration
 */
export async function getAppConfig(): Promise<any> {
  return getConfig("app.yaml");
}

/**
 * Export configuration utilities
 */
export default {
  load: loadYamlConfig,
  get: getConfig,
  parse: parseYaml,
  manager: configManager,
  interpolateEnvVars,
  deepMerge,
  isFeatureEnabled,
  getDatabaseConfig,
  getAppConfig,
};