# Configuration Best Practices - Fantdev Trading Bot

## 🎯 **OVERVIEW**

This document outlines the **correct** way to handle configuration in the Fantdev Trading Bot, based on the existing robust YAML configuration system.

## ✅ **RECOMMENDED CONFIGURATION SYSTEM**

### **Use the Existing System: `src/utils/yaml-config.ts`**

The codebase already has a **comprehensive, production-ready** YAML configuration system. **DO NOT** create new configuration systems.

```typescript
// ✅ CORRECT: Use existing system
import { configManager, getConfig } from '@/utils/yaml-config';

// Load configuration with environment variable interpolation
const appConfig = await getConfig('app.yaml');
const featuresConfig = await getConfig('features.yaml');
```

## 🏗️ **CONFIGURATION ARCHITECTURE**

### **1. Single Source of Truth**
```typescript
// ✅ CORRECT: Single config manager
import { configManager } from '@/utils/yaml-config';

// All configs go through this manager
const config = await configManager.get('app.yaml');
```

### **2. Environment Variable Interpolation**
```yaml
# ✅ CORRECT: Use ${VAR:-default} syntax
# config/app.yaml
app:
  port: ${PORT:-3000}
  database:
    url: ${DATABASE_URL:-postgresql://localhost:5432/fantdev}
    max_connections: ${MAX_CONNECTIONS:-10}
```

### **3. Environment-Specific Overrides**
```yaml
# ✅ CORRECT: Environment-specific configs
# config/app.yaml
app:
  debug: false
  log_level: info

environments:
  development:
    debug: true
    log_level: debug
  production:
    debug: false
    log_level: warn
```

## 📁 **CONFIGURATION FILE STRUCTURE**

### **Standard Configuration Files**
```
config/
├── app.yaml              # Main application config
├── features.yaml         # Feature flags
├── telegram.yaml         # Telegram bot config
├── database.yaml         # Database configuration
├── services.yaml         # Service configurations
├── environments/         # Environment-specific overrides
│   ├── development.yaml
│   └── production.yaml
└── env.config.ts         # Environment variables (TypeScript)
```

### **Configuration File Naming**
- Use `.yaml` extension (not `.yml`)
- Use lowercase with underscores: `telegram_bot.yaml`
- Group related configs: `telegram_*.yaml`

## 🔧 **USING THE CONFIGURATION SYSTEM**

### **Basic Configuration Loading**
```typescript
// ✅ CORRECT: Basic usage
import { getConfig } from '@/utils/yaml-config';

const appConfig = await getConfig('app.yaml');
console.log(`Server port: ${appConfig.app.port}`);
```

### **Configuration with Options**
```typescript
// ✅ CORRECT: Advanced usage with options
import { configManager } from '@/utils/yaml-config';

const config = await configManager.get('app.yaml', {
  environment: 'production',
  interpolateEnv: true,
  configPath: 'config'
});
```

### **Hot-Reload Configuration**
```typescript
// ✅ CORRECT: Watch for configuration changes
import { configManager } from '@/utils/yaml-config';

// Subscribe to configuration changes
const unsubscribe = configManager.watch('app.yaml', (newConfig) => {
  console.log('Configuration updated:', newConfig);
  
  // Apply new configuration
  updateServerConfig(newConfig);
});

// Cleanup when done
unsubscribe();
```

### **Feature Flags**
```typescript
// ✅ CORRECT: Use feature flag system
import { isFeatureEnabled } from '@/utils/yaml-config';

const isDebugMode = await isFeatureEnabled('debug_mode');
const isNewUI = await isFeatureEnabled('new_ui', userId);
```

## 🚫 **WHAT NOT TO DO**

### **❌ Don't Create New YAML Parsers**
```typescript
// ❌ WRONG: Don't create new parsers
import { parse } from "yaml";
import { expandEnv } from "./env-expander";

export function loadYaml<T>(path: string, schema: z.ZodSchema<T>): T {
  const raw = Bun.file(path).textSync();
  const expanded = expandEnv(raw);
  return schema.parse(parse(expanded));
}
```

**Why this is wrong:**
- Duplicates existing functionality
- Loses hot-reload capability
- Loses caching
- Loses environment-specific overrides
- Loses feature flag support

### **❌ Don't Import YAML Files Directly**
```typescript
// ❌ WRONG: Direct imports
import appConfig from '../config/app.yaml';
import featuresConfig from '../config/features.yaml';
```

**Why this is wrong:**
- No environment variable interpolation
- No hot-reload
- No caching
- No environment-specific overrides

### **❌ Don't Hardcode Configuration Values**
```typescript
// ❌ WRONG: Hardcoded values
const PORT = 3000;
const JWT_SECRET = "hardcoded-secret";
const COOKIE_NAME = "dashboard_session";
```

**Why this is wrong:**
- Not configurable per environment
- Security risks
- Hard to maintain

## 🔄 **CONFIGURATION HOT-RELOAD**

### **Automatic Hot-Reload**
The existing system automatically watches for configuration changes:

```typescript
// ✅ CORRECT: Hot-reload is automatic
import { configManager } from '@/utils/yaml-config';

// Configuration automatically reloads when files change
const config = await configManager.get('app.yaml');

// Subscribe to changes
configManager.watch('app.yaml', (newConfig) => {
  console.log('Configuration updated!');
  // Apply new configuration
});
```

### **Manual Reload**
```typescript
// ✅ CORRECT: Manual reload when needed
await configManager.reload('app.yaml');
```

## 🧪 **TESTING CONFIGURATION**

### **Unit Testing**
```typescript
// ✅ CORRECT: Test configuration loading
import { describe, it, expect } from 'bun:test';
import { getConfig } from '@/utils/yaml-config';

describe('Configuration', () => {
  it('should load app configuration', async () => {
    const config = await getConfig('app.yaml');
    expect(config.app).toBeDefined();
    expect(config.app.port).toBeGreaterThan(0);
  });
});
```

### **Integration Testing**
```typescript
// ✅ CORRECT: Test with different environments
describe('Environment Configuration', () => {
  it('should load development config', async () => {
    const config = await getConfig('app.yaml', { environment: 'development' });
    expect(config.app.debug).toBe(true);
  });
  
  it('should load production config', async () => {
    const config = await getConfig('app.yaml', { environment: 'production' });
    expect(config.app.debug).toBe(false);
  });
});
```

## 📊 **PERFORMANCE OPTIMIZATION**

### **Caching**
The existing system automatically caches configurations:

```typescript
// ✅ CORRECT: Caching is automatic
const config1 = await getConfig('app.yaml');  // Loads from file
const config2 = await getConfig('app.yaml');  // Loads from cache
// config1 === config2 (same reference)
```

### **Lazy Loading**
```typescript
// ✅ CORRECT: Load only when needed
class Service {
  private config: any = null;
  
  async getConfig() {
    if (!this.config) {
      this.config = await getConfig('services.yaml');
    }
    return this.config;
  }
}
```

## 🔒 **SECURITY CONSIDERATIONS**

### **Environment Variable Interpolation**
```yaml
# ✅ CORRECT: Secure configuration
# config/database.yaml
database:
  # Use environment variables for sensitive data
  password: ${DATABASE_PASSWORD}
  api_key: ${API_KEY}
  
  # Provide defaults for non-sensitive data
  host: ${DATABASE_HOST:-localhost}
  port: ${DATABASE_PORT:-5432}
```

### **Configuration Validation**
```typescript
// ✅ CORRECT: Validate configuration
import { z } from 'zod';

const AppConfigSchema = z.object({
  app: z.object({
    port: z.number().positive(),
    debug: z.boolean(),
    log_level: z.enum(['debug', 'info', 'warn', 'error'])
  })
});

const config = await getConfig('app.yaml');
const validatedConfig = AppConfigSchema.parse(config);
```

## 📚 **EXAMPLES**

### **Complete Configuration Example**
```yaml
# config/app.yaml
app:
  name: "Fantdev Trading Bot"
  version: "2.1.0"
  port: ${PORT:-3000}
  environment: ${NODE_ENV:-development}
  
  database:
    url: ${DATABASE_URL:-postgresql://localhost:5432/fantdev}
    max_connections: ${MAX_CONNECTIONS:-10}
    timeout: ${DB_TIMEOUT:-5000}
  
  telegram:
    bot_token: ${BOT_TOKEN}
    admin_chat_id: ${ADMIN_CHAT_ID}
    webhook_secret: ${WEBHOOK_SECRET}
  
  security:
    jwt_secret: ${JWT_SECRET}
    session_secret: ${SESSION_SECRET}
    rate_limit: ${RATE_LIMIT:-100}

environments:
  development:
    debug: true
    log_level: debug
    database:
      url: "postgresql://localhost:5432/fantdev_dev"
  
  production:
    debug: false
    log_level: warn
    database:
      max_connections: 50
```

### **Usage in Code**
```typescript
// ✅ CORRECT: Complete usage example
import { getConfig, isFeatureEnabled } from '@/utils/yaml-config';

class AppServer {
  private config: any = null;
  
  async initialize() {
    // Load configuration
    this.config = await getConfig('app.yaml');
    
    // Check feature flags
    const isDebugMode = await isFeatureEnabled('debug_mode');
    
    // Start server with configuration
    const server = Bun.serve({
      port: this.config.app.port,
      fetch: this.handleRequest.bind(this)
    });
    
    console.log(`🚀 Server running on port ${this.config.app.port}`);
  }
  
  private async handleRequest(req: Request): Promise<Response> {
    // Use configuration throughout the application
    if (this.config.app.debug) {
      console.log('Request:', req.url);
    }
    
    // ... handle request
  }
}
```

## 🎯 **SUMMARY**

### **✅ DO:**
- Use the existing `src/utils/yaml-config.ts` system
- Use environment variable interpolation: `${VAR:-default}`
- Use environment-specific overrides
- Use feature flags for conditional functionality
- Use hot-reload for development
- Validate configuration with schemas

### **❌ DON'T:**
- Create new YAML parsers
- Import YAML files directly
- Hardcode configuration values
- Duplicate configuration logic
- Ignore the existing robust system

---

**Last Updated:** $(date)
**Status:** ✅ Best practices documented
**Priority:** HIGH - Use existing system correctly
