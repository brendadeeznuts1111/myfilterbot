# Configuration Best Practices - Fantdev Trading Bot

## 🎯 **OVERVIEW**

This document outlines the **correct** way to handle configuration in the Fantdev Trading Bot, based on the existing robust YAML configuration system.

## ✅ **RECOMMENDED CONFIGURATION SYSTEM**

### **Option 1: Use Bun's Native YAML Support (Recommended for New Code)**

Bun provides **first-class YAML support** with built-in features. This is the **preferred approach** for new configuration needs:

```typescript
// ✅ NATIVE: Use Bun's built-in YAML capabilities
import config from "./config.yaml";
import { database, features } from "./config.yaml";

// Hot reloading works automatically with bun --hot
// Environment variables supported natively
// Zero runtime parsing overhead
```

**Native Features:**
- Direct YAML file imports
- Automatic hot reloading
- Environment variable interpolation
- Build-time optimization
- 90%+ YAML 1.2 specification compliance

### **Option 2: Use the Existing System: `src/utils/yaml-config.ts`**

The codebase also has a **comprehensive, production-ready** custom YAML configuration system. Use this for **existing functionality** or when you need custom features:

```typescript
// ✅ EXISTING: Use existing system for advanced features
import { configManager, getConfig } from '@/utils/yaml-config';

// Advanced features like custom caching, validation, etc.
const config = await configManager.get('app.yaml');
```

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

#### **Option 1: Bun's Native Support (Recommended)**
```yaml
# ✅ NATIVE: Environment variables in YAML
# config/app.yaml
app:
  port: ${PORT:-3000}
  database:
    host: ${DB_HOST:-localhost}
    port: ${DB_PORT:-5432}
    name: ${DB_NAME:-fantdev}
    password: ${DB_PASSWORD}
```

**Usage with Bun:**
```typescript
// ✅ NATIVE: Environment variables automatically interpolated
import config from "./config/app.yaml";

console.log(`Port: ${config.app.port}`);           // Uses ${PORT:-3000}
console.log(`DB Host: ${config.app.database.host}`); // Uses ${DB_HOST:-localhost}
```

#### **Option 2: Custom Interpolation (Advanced)**
```yaml
# ✅ CUSTOM: Advanced environment variable handling
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

### **Option 1: Bun's Native YAML Support (Recommended)**

#### **Basic Configuration Loading**
```typescript
// ✅ NATIVE: Direct YAML import
import config from "./config.yaml";

console.log(`Server port: ${config.server.port}`);
console.log(`Database: ${config.database.host}:${config.database.port}`);
```

#### **Named Imports for Destructuring**
```typescript
// ✅ NATIVE: Destructure top-level properties
import { database, server, features } from "./config.yaml";

if (features.auth) {
  setupAuthentication(database);
}

const serverConfig = {
  port: server.port,
  timeout: server.timeout
};
```

#### **Import Attributes Syntax**
```typescript
// ✅ NATIVE: Explicit YAML type declaration
import config from "./config.yaml" with { type: "yaml" };

// This ensures Bun treats the file as YAML
```

#### **Runtime YAML Parsing**
```typescript
// ✅ NATIVE: Parse YAML strings at runtime
import { YAML } from "bun";

const yamlString = `
database:
  host: localhost
  port: 5432
`;

const config = YAML.parse(yamlString);
console.log(config.database.host); // => "localhost"
```

### **Option 2: Existing Custom System (For Advanced Features)**
```typescript
// ✅ EXISTING: Use existing system for advanced features
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

### **Option 1: Bun's Native Hot-Reload (Automatic)**

Bun provides **automatic hot-reload** when running with `bun --hot`:

```typescript
// ✅ NATIVE: Automatic hot-reload with bun --hot
import { server, features } from "./config/server.yaml";

console.log(`Server port: ${server.port}`);

// Run with: bun --hot server.ts
// Changes to config/server.yaml automatically reload!
```

**Start with Hot-Reload:**
```bash
# Enable hot-reload for automatic configuration updates
bun --hot server.ts

# Now edit config/server.yaml and see changes instantly
echo "port: 4000" >> config/server.yaml
# Server automatically uses new port 4000
```

### **Option 2: Custom Hot-Reload System (Advanced Features)**

The existing system provides **custom hot-reload logic** for complex scenarios:

```typescript
// ✅ EXISTING: Custom hot-reload with advanced features
import { configManager } from '@/utils/yaml-config';

// Configuration automatically reloads when files change
const config = await configManager.get('app.yaml');

// Subscribe to changes with custom logic
configManager.watch('app.yaml', (newConfig) => {
  console.log('Configuration updated!');
  
  // Apply new configuration with validation
  if (validateConfig(newConfig)) {
    updateServerConfig(newConfig);
  }
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

## 📚 **PRACTICAL EXAMPLES**

### **Example 1: Server Configuration with Bun Native Support**
```yaml
# config/server.yaml
server:
  port: 3000
  host: localhost
  timeout: 30

database:
  host: localhost
  port: 5432
  name: fantdev
  pool:
    min: 2
    max: 10

features:
  auth: true
  rateLimit: true
  debug: false
```

**Usage in Server Code:**
```typescript
// server.ts
import { server, database, features } from "./config/server.yaml";

console.log(`Starting server on ${server.host}:${server.port}`);

// Database connection
const dbConfig = {
  host: database.host,
  port: database.port,
  database: database.name,
  pool: database.pool
};

// Feature flags
if (features.debug) {
  console.log("Debug mode enabled");
}

// Start server
Bun.serve({
  port: server.port,
  hostname: server.host,
  fetch(req) {
    if (features.rateLimit) {
      // Apply rate limiting
    }
    return new Response("Hello World");
  },
});
```

### **Example 2: Feature Flags with Bun Native Support**
```yaml
# config/app.yaml
app:
  name: "Fantdev Trading Bot"
  version: "2.1.0"
  port: ${PORT:-3000}
  environment: ${NODE_ENV:-development}
  
  database:
    host: localhost
    port: 5432
    name: fantdev
    max_connections: 10
    timeout: 5000
  
  server:
    port: 3000
    timeout: 30
  
  features:
    auth: true
    rateLimit: true
    debug: false
```

**Usage with Bun Native Support:**
```typescript
// ✅ NATIVE: Direct import (recommended)
import config from "./config.yml" with { type: "yaml" };

// Access nested properties
config.database.host; // => "localhost"
config.server.port;   // => 3000
config.features.auth; // => true

// ✅ NATIVE: Named imports for destructuring
import { database, server, features } from "./config.yml" with { type: "yaml" };

console.log(database.name);      // => "fantdev"
console.log(server.timeout);     // => 30
console.log(features.rateLimit); // => true

// ✅ NATIVE: Runtime parsing for dynamic YAML
const yamlString = `
name: John Doe
age: 30
hobbies:
  - reading
  - coding
`;

const data = Bun.YAML.parse(yamlString);
console.log(data.name);     // => "John Doe"
console.log(data.hobbies);  // => ["reading", "coding"]

// Hot reloading works automatically with bun --hot
console.log(`Server starting on port ${config.server.port}`);
```

### **Feature Flags with Bun Native Support**
```yaml
# config/features.yaml
features:
  newDashboard:
    enabled: true
    rolloutPercentage: 50
    allowedUsers:
      - admin@example.com
      - beta@example.com

  experimentalAPI:
    enabled: false
    endpoints:
      - /api/v2/experimental
      - /api/v2/beta

  darkMode:
    enabled: true
    default: auto
```

**Usage:**
```typescript
// ✅ NATIVE: Feature flag management
import { features } from "./config/features.yaml";

export function isFeatureEnabled(featureName: string, userEmail?: string): boolean {
  const feature = features[featureName];
  
  if (!feature?.enabled) return false;
  
  // Check rollout percentage
  if (feature.rolloutPercentage < 100) {
    const hash = hashCode(userEmail || "anonymous");
    if (hash % 100 >= feature.rolloutPercentage) return false;
  }
  
  // Check allowed users
  if (feature.allowedUsers && userEmail) {
    return feature.allowedUsers.includes(userEmail);
  }
  
  return true;
}

// Hot reloading works automatically!
if (isFeatureEnabled("newDashboard", user.email)) {
  renderNewDashboard();
} else {
  renderLegacyDashboard();
}
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

## 🎯 **WHEN TO USE EACH APPROACH**

### **Use Bun's Native YAML Support When:**
- ✅ **New configuration files** are needed
- ✅ **Simple configuration** without custom logic
- ✅ **Hot reloading** is the primary requirement
- ✅ **Environment variables** need interpolation
- ✅ **Build-time optimization** is desired
- ✅ **Direct imports** are preferred

### **Use Existing Custom System When:**
- ✅ **Advanced features** are needed (custom caching, validation)
- ✅ **Existing functionality** must be maintained
- ✅ **Custom hot-reload logic** is required
- ✅ **Feature flag management** with rollout percentages
- ✅ **Complex configuration merging** is needed
- ✅ **Backward compatibility** is critical

## 🚀 **COMPLETE BUN YAML IMPORT GUIDE**

### **Copy-Paste Ready Examples (No External Packages)**

#### **✅ 1. Import YAML directly (ESM)**
```typescript
// config.yml
// port: 3000
// debug: true

import config from "./config.yml" with { type: "yaml" };
console.log(config.port); // 3000
```

**Rules:**
- File must end in `.yml` or `.yaml`
- `with { type: "yaml" }` is **required** for ESM
- Works for **both** `import` and `require`

#### **✅ 2. Dynamic loading (CommonJS)**
```typescript
const config = require("./config.yml");
console.log(config.debug); // true
```

#### **✅ 3. Hot-reload YAML (dev only)**
```typescript
// auto-reload on edit
Bun.watch("config.yml", () => {
  const cfg = await import("./config.yml", { with: { type: "yaml" } });
  console.log("Reloaded", cfg.default);
});
```

#### **✅ 4. Environment variables inside YAML**
```typescript
// config.yml
// port: ${PORT:-3000}

const cfg = await import("./config.yml", { with: { type: "yaml" } });
// cfg.default.port === process.env.PORT || 3000
```

#### **✅ 5. Save YAML back to disk**
```typescript
import { stringify } from "yaml";
await Bun.write("config.yml", stringify(cfg, { indent: 2 }));
```

#### **✅ 6. Bundle-time optimization**
```bash
bun build app.ts --outdir=dist
```

YAML is **parsed at build time** → zero runtime cost.

---

**That's it**—import, hot-reload, bundle, done.

## 🚀 **MIGRATION GUIDE**

### **From Custom System to Bun Native**

#### **Step 1: Identify Simple Configurations**
```typescript
// Before: Custom system
import { getConfig } from '@/utils/yaml-config';
const config = await getConfig('app.yaml');

// After: Bun native
import config from "./config.yml" with { type: "yaml" };
```

#### **Step 2: Update Import Statements**
```typescript
// Before: Complex import
const { database, server } = await getConfig('app.yaml');

// After: Direct destructuring
import { database, server } from "./config/app.yaml";
```

#### **Step 3: Enable Hot-Reloading**
```bash
# Before: Manual reloading
await configManager.reload('app.yaml');

# After: Automatic with bun --hot
bun --hot server.ts
# Changes to YAML files automatically reload
```

### **When to Keep Custom System**
- **Complex validation logic** required
- **Custom caching strategies** needed
- **Advanced feature flag management**
- **Backward compatibility** requirements
- **Custom hot-reload logic** needed

## 🎯 **SUMMARY**

### **✅ DO:**
- **For new code**: Use Bun's native YAML support (`import config from "./config.yaml"`)
- **For existing code**: Use the existing `src/utils/yaml-config.ts` system
- Use environment variable interpolation: `${VAR:-default}`
- Use environment-specific overrides
- Use feature flags for conditional functionality
- Use hot-reload for development (`bun --hot`)
- Validate configuration with schemas

### **❌ DON'T:**
- Create new custom YAML parsers
- Ignore Bun's native capabilities
- Hardcode configuration values
- Duplicate configuration logic
- Mix approaches inconsistently
- Forget to use `bun --hot` for development

---

**Last Updated:** $(date)
**Status:** ✅ Best practices documented
**Priority:** HIGH - Use existing system correctly
