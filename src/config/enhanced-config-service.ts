/**
 * Enhanced Configuration Service
 * Production-ready config management with caching, validation, and encryption
 */

import { YAML } from 'bun';
import crypto from 'crypto';
import { 
  AppConfig, 
  DatabaseConfig, 
  FeaturesConfig,
  validateAppConfig,
  validateDatabaseConfig,
  validateFeaturesConfig,
  validateProductionConfig,
  validateDevelopmentConfig,
  safeParseAppConfig,
  type FeatureConfig
} from './schemas';

// ============================================================================
// Configuration Cache
// ============================================================================

class ConfigCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl: number;

  constructor(ttlSeconds: number = 300) {
    this.ttl = ttlSeconds * 1000;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// ============================================================================
// Configuration Encryption
// ============================================================================

class ConfigEncryption {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor(encryptionKey?: string) {
    // Use provided key or generate from environment
    const keyString = encryptionKey || process.env.CONFIG_ENCRYPTION_KEY || 'default-dev-key-32-chars-long!!!!';
    this.key = crypto.scryptSync(keyString, 'salt', 32);
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  encryptObject(obj: any): string {
    return this.encrypt(JSON.stringify(obj));
  }

  decryptObject<T>(encryptedData: string): T {
    return JSON.parse(this.decrypt(encryptedData));
  }
}

// ============================================================================
// Enhanced Environment Variable Parser
// ============================================================================

class EnvParser {
  /**
   * Parse environment variables with improved error handling
   */
  static parse(value: any): any {
    if (typeof value === 'string') {
      return value.replace(
        /\${([^}]+)}/g,
        (_, expr) => {
          // Handle complex expressions: ${VAR:-default}, ${VAR:?error}, ${VAR:+replacement}
          const colonIndex = expr.indexOf(':');
          
          if (colonIndex === -1) {
            // Simple variable
            const envValue = process.env[expr];
            if (envValue === undefined) {
              console.warn(`Warning: Environment variable ${expr} is not set`);
            }
            return envValue ?? '';
          }

          const varName = expr.substring(0, colonIndex);
          const operator = expr[colonIndex + 1];
          const operand = expr.substring(colonIndex + 2);
          const envValue = process.env[varName];

          switch (operator) {
            case '-': // Use default if not set
              return envValue ?? operand;
            
            case '?': // Error if not set
              if (!envValue) {
                throw new Error(operand || `Environment variable ${varName} is required`);
              }
              return envValue;
            
            case '+': // Use replacement if set
              return envValue ? operand : '';
            
            default:
              return envValue ?? '';
          }
        }
      );
    }

    if (Array.isArray(value)) {
      return value.map(EnvParser.parse);
    }

    if (value !== null && typeof value === 'object') {
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = EnvParser.parse(val);
      }
      return result;
    }

    return value;
  }
}

// ============================================================================
// Enhanced Configuration Service
// ============================================================================

export class EnhancedConfigService {
  private static instance: EnhancedConfigService;
  
  private cache: ConfigCache;
  private encryption: ConfigEncryption;
  private environment: string;
  private configDir: string;
  private validatedConfigs = new Set<string>();

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.configDir = process.env.CONFIG_DIR || 'config';
    
    // Initialize cache with different TTL for production
    const cacheTTL = this.environment === 'production' ? 3600 : 60;
    this.cache = new ConfigCache(cacheTTL);
    
    // Initialize encryption
    this.encryption = new ConfigEncryption();
  }

  public static getInstance(): EnhancedConfigService {
    if (!EnhancedConfigService.instance) {
      EnhancedConfigService.instance = new EnhancedConfigService();
    }
    return EnhancedConfigService.instance;
  }

  /**
   * Load and validate app configuration
   */
  async getAppConfig(): Promise<AppConfig> {
    const cacheKey = 'app:config';
    
    // Check cache first in production
    if (this.environment === 'production' && this.cache.has(cacheKey)) {
      return this.cache.get<AppConfig>(cacheKey)!;
    }

    try {
      // Load YAML
      const config = await import(`../../${this.configDir}/app.yaml`);
      
      // Parse environment variables
      const parsed = EnvParser.parse(config.default || config);
      
      // Validate with Zod
      const validated = validateAppConfig(parsed);
      
      // Environment-specific validation
      if (this.environment === 'production') {
        validateProductionConfig(validated);
      } else if (this.environment === 'development') {
        validateDevelopmentConfig(validated);
      }
      
      // Cache the result
      this.cache.set(cacheKey, validated);
      this.validatedConfigs.add('app');
      
      return validated;
    } catch (error) {
      console.error('Failed to load app configuration:', error);
      throw error;
    }
  }

  /**
   * Load and validate database configuration
   */
  async getDatabaseConfig(): Promise<DatabaseConfig> {
    const cacheKey = 'database:config';
    
    if (this.environment === 'production' && this.cache.has(cacheKey)) {
      return this.cache.get<DatabaseConfig>(cacheKey)!;
    }

    try {
      const config = await import(`../../${this.configDir}/database.yaml`);
      const parsed = EnvParser.parse(config.default || config);
      const validated = validateDatabaseConfig(parsed);
      
      // Decrypt sensitive fields if encrypted
      if (validated.connections.postgres?.password?.startsWith('encrypted:')) {
        const encrypted = validated.connections.postgres.password.substring(10);
        validated.connections.postgres.password = this.encryption.decrypt(encrypted);
      }
      
      this.cache.set(cacheKey, validated);
      this.validatedConfigs.add('database');
      
      return validated;
    } catch (error) {
      console.error('Failed to load database configuration:', error);
      throw error;
    }
  }

  /**
   * Load and validate features configuration
   */
  async getFeaturesConfig(): Promise<FeaturesConfig> {
    const cacheKey = 'features:config';
    
    // Features might change more frequently, shorter cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get<FeaturesConfig>(cacheKey)!;
    }

    try {
      const config = await import(`../../${this.configDir}/features.yaml`);
      const parsed = EnvParser.parse(config.default || config);
      const validated = validateFeaturesConfig(parsed);
      
      this.cache.set(cacheKey, validated);
      this.validatedConfigs.add('features');
      
      return validated;
    } catch (error) {
      console.error('Failed to load features configuration:', error);
      throw error;
    }
  }

  /**
   * Check if a feature is enabled with improved logic
   */
  async isFeatureEnabled(featureName: string, userId?: string): Promise<boolean> {
    const config = await this.getFeaturesConfig();
    const feature = config.features[featureName];
    
    if (!feature || !feature.enabled) {
      return false;
    }

    // Check dependencies
    if (config.dependencies?.[featureName]) {
      const deps = config.dependencies[featureName].requires;
      for (const dep of deps) {
        if (!await this.isFeatureEnabled(dep, userId)) {
          return false;
        }
      }
    }

    // Check allowed users
    if (feature.allowedUsers?.length && userId) {
      if (feature.allowedUsers.includes(userId)) {
        return true;
      }
    }

    // Check rollout percentage
    if (feature.rolloutPercentage < 100 && userId) {
      const hash = this.hashUserId(userId);
      const bucket = hash % 100;
      return bucket < feature.rolloutPercentage;
    }

    return feature.rolloutPercentage > 0;
  }

  /**
   * Get A/B test variant with consistent assignment
   */
  async getABTestVariant(testName: string, userId: string): Promise<string | null> {
    const config = await this.getFeaturesConfig();
    const test = config.abTests?.[testName];
    
    if (!test?.enabled || !test.variants?.length) {
      return null;
    }

    const hash = this.hashUserId(userId + testName);
    const bucket = hash % 100;
    
    let accumulated = 0;
    for (const variant of test.variants) {
      accumulated += variant.weight;
      if (bucket < accumulated) {
        return variant.name;
      }
    }

    return test.variants[0]?.name || null;
  }

  /**
   * Encrypt sensitive configuration data
   */
  encryptSensitive(data: string): string {
    return 'encrypted:' + this.encryption.encrypt(data);
  }

  /**
   * Decrypt sensitive configuration data
   */
  decryptSensitive(data: string): string {
    if (data.startsWith('encrypted:')) {
      return this.encryption.decrypt(data.substring(10));
    }
    return data;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.validatedConfigs.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cached: string[]; validated: string[] } {
    return {
      cached: Array.from(this.cache['cache'].keys()),
      validated: Array.from(this.validatedConfigs),
    };
  }

  /**
   * Hash user ID for consistent bucketing
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Validate all configurations
   */
  async validateAll(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      await this.getAppConfig();
    } catch (error: any) {
      errors.push(`App config: ${error.message}`);
    }

    try {
      await this.getDatabaseConfig();
    } catch (error: any) {
      errors.push(`Database config: ${error.message}`);
    }

    try {
      await this.getFeaturesConfig();
    } catch (error: any) {
      errors.push(`Features config: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// Export Singleton and Helpers
// ============================================================================

export const enhancedConfig = EnhancedConfigService.getInstance();

export async function getConfig(): Promise<AppConfig> {
  return enhancedConfig.getAppConfig();
}

export async function getDatabaseConfig(): Promise<DatabaseConfig> {
  return enhancedConfig.getDatabaseConfig();
}

export async function getFeaturesConfig(): Promise<FeaturesConfig> {
  return enhancedConfig.getFeaturesConfig();
}

export async function isFeatureEnabled(feature: string, userId?: string): Promise<boolean> {
  return enhancedConfig.isFeatureEnabled(feature, userId);
}

export async function getABTestVariant(test: string, userId: string): Promise<string | null> {
  return enhancedConfig.getABTestVariant(test, userId);
}

export async function validateConfigs(): Promise<{ valid: boolean; errors: string[] }> {
  return enhancedConfig.validateAll();
}

export default enhancedConfig;