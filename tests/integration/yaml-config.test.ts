/**
 * Comprehensive YAML Configuration and Hot-Reload Testing
 * Tests YAML parsing, configuration loading, hot-reload functionality, and validation
 */

import { test, expect, describe, beforeAll, afterAll, mock, beforeEach } from 'bun:test';

describe('YAML Configuration and Hot-Reload Testing', () => {
  let mockFileSystem: Map<string, string>;
  let configWatchers: Map<string, Function[]>;

  beforeAll(() => {
    console.log('📄 Initializing YAML configuration tests...');
    
    // Mock file system for YAML files
    mockFileSystem = new Map();
    configWatchers = new Map();
    
    // Setup initial config files
    mockFileSystem.set('/config/app.yaml', `
app:
  name: "Fantasy402 Trading Bot"
  version: "2.1.0"
  environment: "development"
  debug: true
  
server:
  host: "localhost"
  port: 3001
  ssl:
    enabled: false
    cert_path: ""
    key_path: ""
  
database:
  connections:
    postgres:
      host: "localhost"
      port: 5432
      database: "fantdev_trading"
      username: "postgres"
      password: "password"
      pool:
        min: 2
        max: 10
        idleTimeout: 30000
    redis:
      host: "localhost"
      port: 6379
      password: ""
      db: 0
      keyPrefix: "fantdev:"
      
features:
  notifications:
    enabled: true
    channels: ["telegram", "email"]
  analytics:
    enabled: true
    realtime: true
  trading:
    enabled: true
    maxRiskLevel: "high"
    
limits:
  rateLimit: 1000
  maxUsers: 5000
  requestTimeout: 30000
    `);

    mockFileSystem.set('/config/notification.yaml', `
notifications:
  telegram:
    botToken: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
    chatId: "-1001234567890"
    enabled: true
    templates:
      welcome: "Welcome to Fantasy402! 🚀"
      alert: "⚠️ Alert: {message}"
      trade: "📊 Trade executed: {details}"
  
  email:
    smtp:
      host: "smtp.gmail.com"
      port: 587
      secure: false
      auth:
        user: "notifications@fantasy402.com"
        pass: "app-password"
    templates:
      welcome: "Welcome to Fantasy402 Trading Platform"
      alert: "Important Alert: {message}"
    
  push:
    firebase:
      serverKey: "AAAA1234567890"
      enabled: true
    topics:
      - "all-users"
      - "premium-users"
    `);

    mockFileSystem.set('/config/security.yaml', `
security:
  authentication:
    jwt:
      secret: "your-super-secret-jwt-key"
      expiresIn: "24h"
      issuer: "fantasy402.com"
    session:
      secret: "session-secret-key"
      maxAge: 86400000
  
  rateLimit:
    windowMs: 900000  # 15 minutes
    maxRequests: 100
    skipSuccessfulRequests: false
    
  cors:
    origin: ["http://localhost:3000", "https://fantasy402.com"]
    methods: ["GET", "POST", "PUT", "DELETE"]
    allowedHeaders: ["Content-Type", "Authorization"]
    
  encryption:
    algorithm: "aes-256-gcm"
    keyLength: 32
    ivLength: 16
    `);
  });

  describe('YAML Parsing and Loading', () => {
    test('Basic YAML parsing with Bun.YAML', async () => {
      const yamlContent = `
name: "Test Application"
version: "1.0.0"
settings:
  debug: true
  timeout: 5000
  features:
    - "auth"
    - "api"
    - "websocket"
database:
  host: "localhost"
  port: 5432
  credentials:
    username: "admin"
    password: "secret"
      `.trim();

      // Test Bun native YAML parsing
      const parsed = Bun.YAML.parse(yamlContent);
      
      expect(parsed.name).toBe('Test Application');
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.settings.debug).toBe(true);
      expect(parsed.settings.timeout).toBe(5000);
      expect(Array.isArray(parsed.settings.features)).toBe(true);
      expect(parsed.settings.features).toHaveLength(3);
      expect(parsed.settings.features).toContain('auth');
      expect(parsed.database.host).toBe('localhost');
      expect(parsed.database.port).toBe(5432);
      expect(parsed.database.credentials.username).toBe('admin');
    });

    test('Complex nested YAML structures', async () => {
      const complexYaml = `
application:
  metadata:
    name: "Complex App"
    tags: ["production", "trading", "fintech"]
  
  services:
    web:
      replicas: 3
      resources:
        limits:
          cpu: "1000m"
          memory: "512Mi"
        requests:
          cpu: "100m"
          memory: "128Mi"
    
    database:
      replicas: 1
      persistence:
        enabled: true
        size: "10Gi"
        storageClass: "fast-ssd"
      
  environments:
    development:
      replicas: 1
      debug: true
      external_services:
        - name: "test-db"
          url: "postgresql://localhost:5432/test"
    production:
      replicas: 5
      debug: false
      external_services:
        - name: "prod-db"  
          url: "postgresql://prod-host:5432/prod"
        - name: "cache"
          url: "redis://cache-cluster:6379"
      `.trim();

      const parsed = Bun.YAML.parse(complexYaml);
      
      expect(parsed.application.metadata.name).toBe('Complex App');
      expect(parsed.application.metadata.tags).toContain('production');
      expect(parsed.application.services.web.replicas).toBe(3);
      expect(parsed.application.services.web.resources.limits.cpu).toBe('1000m');
      expect(parsed.application.environments.development.debug).toBe(true);
      expect(parsed.application.environments.production.replicas).toBe(5);
      expect(parsed.application.environments.production.external_services).toHaveLength(2);
    });

    test('YAML parsing error handling', async () => {
      const invalidYaml = `
name: "Test"
invalid: 
  - item1
   - item2  # Invalid indentation
      `;

      expect(() => {
        Bun.YAML.parse(invalidYaml);
      }).toThrow();
      
      // Test empty YAML
      const emptyResult = Bun.YAML.parse('');
      expect(emptyResult).toBe(null);
      
      // Test YAML with only comments
      const commentOnlyYaml = `
# This is a comment
# Another comment
      `.trim();
      
      const commentResult = Bun.YAML.parse(commentOnlyYaml);
      expect(commentResult).toBe(null);
    });
  });

  describe('Configuration Loading and Validation', () => {
    test('Load and validate application configuration', async () => {
      const appConfig = mockFileSystem.get('/config/app.yaml');
      const parsed = Bun.YAML.parse(appConfig);
      
      // Validation function
      const validateAppConfig = (config: any) => {
        const errors: string[] = [];
        
        if (!config.app?.name) errors.push('app.name is required');
        if (!config.app?.version) errors.push('app.version is required');
        if (!config.server?.host) errors.push('server.host is required');
        if (!config.server?.port || typeof config.server.port !== 'number') {
          errors.push('server.port must be a valid number');
        }
        if (!config.database?.connections?.postgres?.host) {
          errors.push('database.connections.postgres.host is required');
        }
        
        return { valid: errors.length === 0, errors };
      };
      
      const validation = validateAppConfig(parsed);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(parsed.app.name).toBe('Fantasy402 Trading Bot');
      expect(parsed.server.port).toBe(3001);
      expect(parsed.database.connections.postgres.host).toBe('localhost');
    });

    test('Configuration schema validation', async () => {
      const securityConfig = mockFileSystem.get('/config/security.yaml');
      const parsed = Bun.YAML.parse(securityConfig);
      
      // Schema validation
      const validateSecurityConfig = (config: any) => {
        const schema = {
          security: {
            authentication: {
              jwt: {
                secret: 'string',
                expiresIn: 'string',
                issuer: 'string'
              },
              session: {
                secret: 'string',
                maxAge: 'number'
              }
            },
            rateLimit: {
              windowMs: 'number',
              maxRequests: 'number'
            },
            cors: {
              origin: 'array',
              methods: 'array'
            }
          }
        };

        const validateObject = (obj: any, schema: any, path = '') => {
          const errors: string[] = [];
          
          for (const key in schema) {
            const fullPath = path ? `${path}.${key}` : key;
            
            if (!(key in obj)) {
              errors.push(`Missing required field: ${fullPath}`);
              continue;
            }
            
            if (typeof schema[key] === 'object' && !Array.isArray(schema[key])) {
              errors.push(...validateObject(obj[key], schema[key], fullPath));
            } else if (schema[key] === 'array' && !Array.isArray(obj[key])) {
              errors.push(`${fullPath} must be an array`);
            } else if (schema[key] !== 'array' && typeof obj[key] !== schema[key]) {
              errors.push(`${fullPath} must be of type ${schema[key]}`);
            }
          }
          
          return errors;
        };

        const errors = validateObject(config, schema);
        return { valid: errors.length === 0, errors };
      };
      
      const validation = validateSecurityConfig(parsed);
      
      expect(validation.valid).toBe(true);
      expect(parsed.security.authentication.jwt.secret).toBeDefined();
      expect(parsed.security.rateLimit.windowMs).toBe(900000);
      expect(Array.isArray(parsed.security.cors.origin)).toBe(true);
    });

    test('Environment-specific configuration loading', async () => {
      const baseConfig = `
app:
  name: "Test App"
  debug: false

database:
  host: "prod-db"
  pool:
    max: 20
      `.trim();

      const devOverride = `
app:
  debug: true

database:
  host: "localhost"
  pool:
    max: 5
      `.trim();

      const base = Bun.YAML.parse(baseConfig);
      const dev = Bun.YAML.parse(devOverride);
      
      // Deep merge function
      const deepMerge = (target: any, source: any): any => {
        const result = { ...target };
        
        for (const key in source) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
          } else {
            result[key] = source[key];
          }
        }
        
        return result;
      };
      
      const merged = deepMerge(base, dev);
      
      expect(merged.app.name).toBe('Test App'); // From base
      expect(merged.app.debug).toBe(true); // Overridden by dev
      expect(merged.database.host).toBe('localhost'); // Overridden by dev
      expect(merged.database.pool.max).toBe(5); // Overridden by dev
    });
  });

  describe('Hot-Reload Configuration Monitoring', () => {
    test('File watcher setup and change detection', async () => {
      const mockFileWatcher = {
        watchers: new Map<string, Function[]>(),
        
        watchFile: function(path: string, callback: Function) {
          if (!this.watchers.has(path)) {
            this.watchers.set(path, []);
          }
          this.watchers.get(path)?.push(callback);
        },
        
        unwatchFile: function(path: string, callback?: Function) {
          if (callback) {
            const callbacks = this.watchers.get(path) || [];
            const index = callbacks.indexOf(callback);
            if (index > -1) {
              callbacks.splice(index, 1);
            }
          } else {
            this.watchers.delete(path);
          }
        },
        
        simulateFileChange: function(path: string, newContent: string) {
          mockFileSystem.set(path, newContent);
          const callbacks = this.watchers.get(path) || [];
          callbacks.forEach(callback => {
            callback(path, 'change', newContent);
          });
        }
      };

      const configPath = '/config/app.yaml';
      const changeHandler = mock();
      
      // Setup watcher
      mockFileWatcher.watchFile(configPath, changeHandler);
      expect(mockFileWatcher.watchers.has(configPath)).toBe(true);
      expect(mockFileWatcher.watchers.get(configPath)).toHaveLength(1);
      
      // Simulate file change
      const newConfig = `
app:
  name: "Updated App"
  version: "2.2.0"
server:
  port: 3002
      `.trim();
      
      mockFileWatcher.simulateFileChange(configPath, newConfig);
      
      expect(changeHandler).toHaveBeenCalledWith(configPath, 'change', newConfig);
      expect(mockFileSystem.get(configPath)).toBe(newConfig);
    });

    test('Configuration hot-reload implementation', async () => {
      let currentConfig: any = null;
      const configChangeCallbacks: Function[] = [];
      
      const mockConfigManager = {
        loadConfig: function(path: string) {
          const content = mockFileSystem.get(path);
          if (content) {
            currentConfig = Bun.YAML.parse(content);
            return currentConfig;
          }
          throw new Error(`Config file not found: ${path}`);
        },
        
        reloadConfig: function(path: string) {
          const oldConfig = { ...currentConfig };
          
          try {
            this.loadConfig(path);
            console.log(`Configuration reloaded from ${path}`);
            
            // Notify listeners
            configChangeCallbacks.forEach(callback => {
              callback(currentConfig, oldConfig);
            });
            
            return { success: true, config: currentConfig };
          } catch (error) {
            console.error(`Failed to reload config: ${error.message}`);
            return { success: false, error: error.message };
          }
        },
        
        onConfigChange: function(callback: Function) {
          configChangeCallbacks.push(callback);
        },
        
        getConfig: function() {
          return currentConfig;
        }
      };

      // Initial load
      const configPath = '/config/app.yaml';
      mockConfigManager.loadConfig(configPath);
      
      expect(currentConfig.app.name).toBe('Fantasy402 Trading Bot');
      expect(currentConfig.server.port).toBe(3001);
      
      // Setup change listener
      const changeListener = mock();
      mockConfigManager.onConfigChange(changeListener);
      
      // Update config file
      const updatedConfig = `
app:
  name: "Updated Trading Bot"
  version: "3.0.0"
  environment: "production"
  debug: false

server:
  host: "0.0.0.0"
  port: 8080
  ssl:
    enabled: true
    cert_path: "/ssl/cert.pem"
    key_path: "/ssl/key.pem"
      `.trim();
      
      mockFileSystem.set(configPath, updatedConfig);
      
      // Reload configuration
      const reloadResult = mockConfigManager.reloadConfig(configPath);
      
      expect(reloadResult.success).toBe(true);
      expect(changeListener).toHaveBeenCalledTimes(1);
      expect(currentConfig.app.name).toBe('Updated Trading Bot');
      expect(currentConfig.app.version).toBe('3.0.0');
      expect(currentConfig.server.port).toBe(8080);
      expect(currentConfig.server.ssl.enabled).toBe(true);
    });

    test('Configuration validation during hot-reload', async () => {
      const mockValidatingConfigManager = {
        config: null as any,
        
        validateConfig: function(config: any) {
          const errors: string[] = [];
          
          if (!config.app?.name) errors.push('app.name is required');
          if (!config.server?.port || config.server.port < 1 || config.server.port > 65535) {
            errors.push('server.port must be between 1 and 65535');
          }
          
          return { valid: errors.length === 0, errors };
        },
        
        loadAndValidateConfig: function(path: string) {
          const content = mockFileSystem.get(path);
          if (!content) {
            throw new Error(`Config file not found: ${path}`);
          }
          
          const parsed = Bun.YAML.parse(content);
          const validation = this.validateConfig(parsed);
          
          if (!validation.valid) {
            throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
          }
          
          this.config = parsed;
          return parsed;
        }
      };

      // Test valid configuration
      const validConfigPath = '/config/valid.yaml';
      const validConfig = `
app:
  name: "Valid App"
server:
  port: 3000
      `.trim();
      
      mockFileSystem.set(validConfigPath, validConfig);
      
      const loadedConfig = mockValidatingConfigManager.loadAndValidateConfig(validConfigPath);
      expect(loadedConfig.app.name).toBe('Valid App');
      
      // Test invalid configuration
      const invalidConfigPath = '/config/invalid.yaml';
      const invalidConfig = `
app:
  name: ""  # Invalid empty name
server:
  port: 70000  # Invalid port number
      `.trim();
      
      mockFileSystem.set(invalidConfigPath, invalidConfig);
      
      expect(() => {
        mockValidatingConfigManager.loadAndValidateConfig(invalidConfigPath);
      }).toThrow('Invalid configuration');
    });

    test('Graceful handling of reload failures', async () => {
      let currentConfig = { app: { name: 'Stable App' }, server: { port: 3000 } };
      
      const mockRobustConfigManager = {
        config: currentConfig,
        
        safeReload: function(path: string) {
          const backup = { ...this.config };
          
          try {
            const content = mockFileSystem.get(path);
            if (!content) {
              throw new Error('File not found');
            }
            
            const newConfig = Bun.YAML.parse(content);
            
            // Validate new config
            if (!newConfig.app?.name) {
              throw new Error('Invalid configuration: missing app.name');
            }
            
            this.config = newConfig;
            return { success: true, config: newConfig };
            
          } catch (error) {
            // Restore backup on failure
            this.config = backup;
            console.error(`Config reload failed, keeping previous configuration: ${error.message}`);
            
            return { 
              success: false, 
              error: error.message, 
              config: backup 
            };
          }
        }
      };

      // Test successful reload
      const goodConfigPath = '/config/good.yaml';
      const goodConfig = `
app:
  name: "New Good App"
server:
  port: 4000
      `.trim();
      
      mockFileSystem.set(goodConfigPath, goodConfig);
      
      let result = mockRobustConfigManager.safeReload(goodConfigPath);
      expect(result.success).toBe(true);
      expect(mockRobustConfigManager.config.app.name).toBe('New Good App');
      
      // Test failed reload
      const badConfigPath = '/config/bad.yaml';
      const badConfig = `
app:
  # Missing name field
server:
  port: 5000
      `.trim();
      
      mockFileSystem.set(badConfigPath, badConfig);
      
      result = mockRobustConfigManager.safeReload(badConfigPath);
      expect(result.success).toBe(false);
      expect(result.error).toContain('missing app.name');
      expect(mockRobustConfigManager.config.app.name).toBe('New Good App'); // Should remain unchanged
    });
  });

  describe('Configuration Merging and Templating', () => {
    test('Multi-file configuration merging', async () => {
      // Base configuration
      const baseConfig = `
app:
  name: "Trading Bot"
  version: "1.0.0"

database:
  postgres:
    host: "localhost"
    port: 5432
  redis:
    host: "localhost"
    port: 6379

features:
  trading: true
  analytics: true
      `.trim();

      // Environment-specific overrides
      const prodConfig = `
database:
  postgres:
    host: "prod-postgres.example.com"
    pool:
      max: 20
  redis:
    host: "prod-redis.example.com"

features:
  debug: false
  
security:
  ssl: true
      `.trim();

      const devConfig = `
database:
  postgres:
    host: "dev-postgres.local"
  redis:
    host: "dev-redis.local"

features:
  debug: true
  hotReload: true
      `.trim();

      const base = Bun.YAML.parse(baseConfig);
      const prod = Bun.YAML.parse(prodConfig);
      const dev = Bun.YAML.parse(devConfig);

      // Merge function
      const mergeConfigs = (base: any, ...overrides: any[]) => {
        return overrides.reduce((result, override) => {
          const merge = (target: any, source: any): any => {
            const merged = { ...target };
            
            for (const key in source) {
              if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                merged[key] = merge(merged[key] || {}, source[key]);
              } else {
                merged[key] = source[key];
              }
            }
            
            return merged;
          };
          
          return merge(result, override);
        }, base);
      };

      // Test production merge
      const prodMerged = mergeConfigs(base, prod);
      expect(prodMerged.app.name).toBe('Trading Bot');
      expect(prodMerged.database.postgres.host).toBe('prod-postgres.example.com');
      expect(prodMerged.database.postgres.port).toBe(5432); // From base
      expect(prodMerged.database.postgres.pool.max).toBe(20); // From prod
      expect(prodMerged.features.trading).toBe(true); // From base
      expect(prodMerged.features.debug).toBe(false); // From prod
      expect(prodMerged.security.ssl).toBe(true); // From prod

      // Test development merge
      const devMerged = mergeConfigs(base, dev);
      expect(devMerged.database.postgres.host).toBe('dev-postgres.local');
      expect(devMerged.features.debug).toBe(true);
      expect(devMerged.features.hotReload).toBe(true);
    });

    test('Environment variable templating in YAML', async () => {
      const templateConfig = `
app:
  name: "\${APP_NAME}"
  environment: "\${NODE_ENV:-development}"

database:
  postgres:
    host: "\${DB_HOST}"
    port: \${DB_PORT:5432}
    username: "\${DB_USER}"
    password: "\${DB_PASSWORD}"

api:
  baseUrl: "\${API_BASE_URL:-http://localhost:3000}"
  timeout: \${API_TIMEOUT:30000}
      `.trim();

      // Mock environment variables
      const mockEnv = {
        APP_NAME: 'Fantasy402 Trading',
        NODE_ENV: 'production',
        DB_HOST: 'prod-db.example.com',
        DB_PORT: '5432',
        DB_USER: 'trading_user',
        DB_PASSWORD: 'secure_password',
        API_TIMEOUT: '60000'
        // API_BASE_URL is intentionally missing to test defaults
      };

      const interpolateTemplate = (template: string, env: Record<string, string>) => {
        return template.replace(/\$\{([^}]+)\}/g, (match, variable) => {
          const [varName, defaultValue] = variable.split(':-');
          const value = env[varName.split(':')[0]];
          
          if (value !== undefined) {
            return value;
          } else if (defaultValue !== undefined) {
            return defaultValue;
          }
          
          throw new Error(`Environment variable ${varName} is not defined`);
        });
      };

      const interpolated = interpolateTemplate(templateConfig, mockEnv);
      const parsed = Bun.YAML.parse(interpolated);

      expect(parsed.app.name).toBe('Fantasy402 Trading');
      expect(parsed.app.environment).toBe('production');
      expect(parsed.database.postgres.host).toBe('prod-db.example.com');
      expect(parsed.database.postgres.port).toBe(5432);
      expect(parsed.database.postgres.username).toBe('trading_user');
      expect(parsed.database.postgres.password).toBe('secure_password');
      expect(parsed.api.baseUrl).toBe('http://localhost:3000'); // Default value
      expect(parsed.api.timeout).toBe(60000); // From env
    });

    test('Configuration inheritance and profiles', async () => {
      const profileManager = {
        profiles: new Map<string, any>(),
        
        registerProfile: function(name: string, config: any) {
          this.profiles.set(name, config);
        },
        
        buildConfig: function(profileName: string, baseConfig?: any) {
          const profile = this.profiles.get(profileName);
          if (!profile) {
            throw new Error(`Profile ${profileName} not found`);
          }
          
          let result = baseConfig ? { ...baseConfig } : {};
          
          // Apply inheritance chain
          if (profile.extends) {
            const parentConfig = this.buildConfig(profile.extends, baseConfig);
            result = this.deepMerge(result, parentConfig);
          }
          
          // Apply current profile
          result = this.deepMerge(result, profile.config || {});
          
          return result;
        },
        
        deepMerge: function(target: any, source: any): any {
          const result = { ...target };
          
          for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
              result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
              result[key] = source[key];
            }
          }
          
          return result;
        }
      };

      // Register profiles
      profileManager.registerProfile('base', {
        config: {
          app: { name: 'Base App', debug: false },
          server: { port: 3000 },
          features: { auth: true }
        }
      });

      profileManager.registerProfile('development', {
        extends: 'base',
        config: {
          app: { debug: true },
          server: { port: 3001 },
          features: { hotReload: true },
          database: { host: 'localhost' }
        }
      });

      profileManager.registerProfile('production', {
        extends: 'base',
        config: {
          app: { debug: false },
          server: { port: 80, ssl: true },
          database: { host: 'prod-server', pool: { max: 20 } },
          security: { strict: true }
        }
      });

      profileManager.registerProfile('testing', {
        extends: 'development',
        config: {
          database: { host: 'test-db', name: 'test_db' },
          features: { testing: true }
        }
      });

      // Test development profile
      const devConfig = profileManager.buildConfig('development');
      expect(devConfig.app.name).toBe('Base App'); // From base
      expect(devConfig.app.debug).toBe(true); // Overridden in dev
      expect(devConfig.server.port).toBe(3001); // From dev
      expect(devConfig.features.auth).toBe(true); // From base
      expect(devConfig.features.hotReload).toBe(true); // From dev

      // Test production profile
      const prodConfig = profileManager.buildConfig('production');
      expect(prodConfig.app.debug).toBe(false); // Explicitly set in prod
      expect(prodConfig.server.ssl).toBe(true); // From prod
      expect(prodConfig.database.pool.max).toBe(20); // From prod

      // Test testing profile (extends development)
      const testConfig = profileManager.buildConfig('testing');
      expect(testConfig.app.debug).toBe(true); // From development
      expect(testConfig.features.hotReload).toBe(true); // From development
      expect(testConfig.features.testing).toBe(true); // From testing
      expect(testConfig.database.host).toBe('test-db'); // Overridden in testing
    });
  });

  describe('Performance and Memory Management', () => {
    test('Configuration caching and performance', async () => {
      const performantConfigManager = {
        cache: new Map<string, { config: any, lastModified: number, ttl: number }>(),
        
        loadConfig: function(path: string, ttl = 60000) {
          const now = Date.now();
          const cached = this.cache.get(path);
          
          // Check cache validity
          if (cached && (now - cached.lastModified) < cached.ttl) {
            console.log(`Using cached config for ${path}`);
            return cached.config;
          }
          
          // Load and cache
          const content = mockFileSystem.get(path);
          if (!content) {
            throw new Error(`Config file not found: ${path}`);
          }
          
          const config = Bun.YAML.parse(content);
          
          this.cache.set(path, {
            config,
            lastModified: now,
            ttl
          });
          
          console.log(`Loaded and cached config for ${path}`);
          return config;
        },
        
        invalidateCache: function(path?: string) {
          if (path) {
            this.cache.delete(path);
          } else {
            this.cache.clear();
          }
        },
        
        getCacheStats: function() {
          return {
            size: this.cache.size,
            entries: Array.from(this.cache.entries()).map(([path, data]) => ({
              path,
              age: Date.now() - data.lastModified,
              ttl: data.ttl
            }))
          };
        }
      };

      const configPath = '/config/test-perf.yaml';
      const testConfig = 'app:\n  name: "Test"\nserver:\n  port: 3000';
      mockFileSystem.set(configPath, testConfig);

      // First load - should cache
      const startTime = performance.now();
      const config1 = performantConfigManager.loadConfig(configPath, 30000);
      const firstLoadTime = performance.now() - startTime;
      
      expect(config1.app.name).toBe('Test');
      expect(performantConfigManager.cache.size).toBe(1);

      // Second load - should use cache
      const cacheStartTime = performance.now();
      const config2 = performantConfigManager.loadConfig(configPath);
      const cacheLoadTime = performance.now() - cacheStartTime;
      
      expect(config2).toBe(config1); // Same object reference
      expect(cacheLoadTime).toBeLessThan(firstLoadTime); // Should be much faster

      // Test cache stats
      const stats = performantConfigManager.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries[0].path).toBe(configPath);
      expect(stats.entries[0].age).toBeLessThan(1000); // Should be recent

      console.log(`📊 First load: ${firstLoadTime.toFixed(2)}ms, Cached load: ${cacheLoadTime.toFixed(2)}ms`);
      console.log(`🚀 Cache speedup: ${(firstLoadTime / cacheLoadTime).toFixed(1)}x`);
    });

    test('Memory usage optimization for large configs', async () => {
      // Generate large configuration
      const generateLargeConfig = (size: number) => {
        const config: any = {
          app: { name: 'Large Config Test' },
          data: {}
        };
        
        for (let i = 0; i < size; i++) {
          config.data[`item_${i}`] = {
            id: i,
            name: `Item ${i}`,
            metadata: {
              tags: [`tag_${i % 10}`, `category_${i % 5}`],
              properties: Array(10).fill(null).map((_, j) => ({
                key: `prop_${j}`,
                value: `value_${i}_${j}`
              }))
            }
          };
        }
        
        return Bun.YAML.stringify(config);
      };

      const largeConfigYaml = generateLargeConfig(1000);
      const configPath = '/config/large.yaml';
      mockFileSystem.set(configPath, largeConfigYaml);

      // Test parsing performance
      const parseStart = performance.now();
      const parsed = Bun.YAML.parse(largeConfigYaml);
      const parseTime = performance.now() - parseStart;

      expect(parsed.app.name).toBe('Large Config Test');
      expect(Object.keys(parsed.data)).toHaveLength(1000);
      expect(parseTime).toBeLessThan(1000); // Should parse within 1 second

      console.log(`📊 Large config (1000 items) parsed in ${parseTime.toFixed(2)}ms`);

      // Test memory-efficient access patterns
      const accessStart = performance.now();
      let accessCount = 0;
      
      // Access patterns that might be memory intensive
      for (let i = 0; i < 100; i++) {
        const item = parsed.data[`item_${i}`];
        if (item && item.metadata && item.metadata.properties) {
          accessCount += item.metadata.properties.length;
        }
      }
      
      const accessTime = performance.now() - accessStart;
      
      expect(accessCount).toBe(1000); // 100 items * 10 properties each
      expect(accessTime).toBeLessThan(100); // Should be fast

      console.log(`📊 Accessed 1000 nested properties in ${accessTime.toFixed(2)}ms`);
    });
  });

  afterAll(() => {
    console.log('✅ YAML configuration and hot-reload tests completed');
  });
});