# Bun Native YAML Guide

## 📚 Official Documentation Links

- **[Bun YAML API Documentation](https://bun.com/docs/api/yaml)**
- **[Import YAML Files Guide](https://bun.com/guides/runtime/import-yaml)**

## 🚀 Quick Start

Bun has **first-class YAML support** built into the runtime. No external dependencies needed!

### Direct YAML Imports

```typescript
// Import entire YAML file
import config from "./config.yaml";

// Named imports from YAML
import { database, features, server } from "./config.yaml";

// Access nested properties
console.log(config.server.port); // 3000
console.log(database.host);      // localhost
```

### Environment Variable Interpolation

```yaml
# config.yaml
server:
  host: ${HOST:-localhost}
  port: ${PORT:-3000}
  
database:
  url: ${DATABASE_URL:-postgresql://localhost:5432/mydb}
  pool:
    max: ${DB_POOL_MAX:-10}
    min: ${DB_POOL_MIN:-2}
```

```typescript
// Bun automatically interpolates environment variables
import config from "./config.yaml";

// If PORT=8080 in environment:
console.log(config.server.port); // 8080

// If PORT is not set:
console.log(config.server.port); // 3000 (default)
```

## 🔥 Hot Reloading

YAML files automatically hot reload when running with `bun --hot`:

```bash
# Start with hot reloading
bun --hot src/server.ts
```

Any changes to YAML files will be automatically detected and reloaded without restarting!

## 📦 Build-Time Optimization

When you build with Bun, YAML files are parsed at build time:

```bash
bun build src/index.ts --outdir=dist
```

Benefits:
- **Zero runtime parsing overhead**
- **Smaller bundle size**
- **Type safety with TypeScript**
- **Tree shaking support**

## 🎯 TypeScript Support

Create type definitions for your YAML:

```typescript
// types/config.d.ts
declare module "*.yaml" {
  interface Config {
    server: {
      host: string;
      port: number;
    };
    database: {
      url: string;
      pool: {
        max: number;
        min: number;
      };
    };
    features: Record<string, {
      enabled: boolean;
      rolloutPercentage: number;
    }>;
  }
  
  const config: Config;
  export default config;
  export const { server, database, features }: Config;
}
```

Now you get full IntelliSense:

```typescript
import config from "./config.yaml";

// TypeScript knows the structure!
config.server.port // number
config.database.url // string
config.features.newDashboard.enabled // boolean
```

## 🛠️ YAML.parse() and YAML.stringify()

For dynamic YAML operations:

```typescript
import { YAML } from "bun";

// Parse YAML string
const yamlString = `
name: My App
version: 1.0.0
features:
  - auth
  - dashboard
`;

const parsed = YAML.parse(yamlString);
console.log(parsed.name); // "My App"

// Stringify to YAML
const obj = {
  server: { port: 3000, host: "localhost" },
  features: ["auth", "api", "dashboard"]
};

const yaml = YAML.stringify(obj);
console.log(yaml);
// server:
//   port: 3000
//   host: localhost
// features:
//   - auth
//   - api
//   - dashboard
```

## 📁 Multi-Document YAML

Support for multiple documents in one file:

```yaml
# config.yaml
---
# Document 1: Development
environment: development
server:
  port: 3000
  debug: true
---
# Document 2: Production
environment: production
server:
  port: 8080
  debug: false
```

```typescript
import { YAML } from "bun";

const file = Bun.file("config.yaml");
const text = await file.text();

// Parse all documents
const docs = YAML.parse(text, { all: true });
console.log(docs[0].environment); // "development"
console.log(docs[1].environment); // "production"
```

## 🔧 Advanced Features

### Watching YAML Files

```typescript
import { watch } from "fs";

// Watch for YAML changes
watch("./config", (event, filename) => {
  if (filename?.endsWith('.yaml')) {
    console.log(`Config changed: ${filename}`);
    // Reload configuration
    delete require.cache[require.resolve(`./config/${filename}`)];
  }
});
```

### Dynamic Imports

```typescript
// Load YAML based on environment
const env = process.env.NODE_ENV || "development";
const config = await import(`./config/${env}.yaml`);

console.log(config.default.server.port);
```

### Schema Validation

Combine with Zod for runtime validation:

```typescript
import { z } from "zod";
import config from "./config.yaml";

const ConfigSchema = z.object({
  server: z.object({
    port: z.number(),
    host: z.string()
  }),
  database: z.object({
    url: z.string().url()
  })
});

// Validate at startup
const validatedConfig = ConfigSchema.parse(config);
```

## 🎯 Best Practices

### 1. Use Environment-Specific Files

```
config/
  ├── base.yaml      # Shared configuration
  ├── development.yaml
  ├── production.yaml
  └── test.yaml
```

### 2. Leverage Default Values

```yaml
# Always provide defaults for optional values
server:
  port: ${PORT:-3000}
  host: ${HOST:-localhost}
  workers: ${WORKERS:-4}
```

### 3. Group Related Configuration

```yaml
# Good: Grouped by feature
authentication:
  jwt:
    secret: ${JWT_SECRET}
    expiresIn: 7d
  oauth:
    clientId: ${OAUTH_CLIENT_ID}
    clientSecret: ${OAUTH_CLIENT_SECRET}

# Bad: Flat structure
jwt_secret: ${JWT_SECRET}
jwt_expires: 7d
oauth_client_id: ${OAUTH_CLIENT_ID}
```

### 4. Use Type Definitions

Always create TypeScript definitions for your YAML files to get compile-time safety.

## 📊 Performance Comparison

| Feature | Bun Native YAML | Traditional (js-yaml) |
|---------|-----------------|----------------------|
| Parse Time | 0ms (build-time) | 5-10ms (runtime) |
| Bundle Size | 0 KB | ~40 KB |
| Hot Reload | ✅ Native | ❌ Custom setup |
| Env Variables | ✅ Automatic | ❌ Manual |
| TypeScript | ✅ Full support | ⚠️ Partial |
| Import Syntax | ✅ ESM native | ❌ Requires loader |

## 🚀 Migration Guide

### From js-yaml to Bun Native

**Before:**
```typescript
import fs from 'fs';
import yaml from 'js-yaml';

const configFile = fs.readFileSync('./config.yaml', 'utf8');
const config = yaml.load(configFile);
```

**After:**
```typescript
// Just import directly!
import config from "./config.yaml";
```

### From dotenv to YAML

**Before (.env):**
```
PORT=3000
DB_HOST=localhost
DB_NAME=myapp
```

**After (config.yaml):**
```yaml
server:
  port: ${PORT:-3000}
  
database:
  host: ${DB_HOST:-localhost}
  name: ${DB_NAME:-myapp}
```

## 🎉 Complete Example

```yaml
# app.yaml
app:
  name: Fantdev Trading Bot
  version: 2.1.0
  environment: ${NODE_ENV:-development}

server:
  admin:
    host: ${ADMIN_HOST:-localhost}
    port: ${ADMIN_PORT:-3000}
  api:
    host: ${API_HOST:-localhost}
    port: ${API_PORT:-3001}

features:
  dashboard:
    enabled: true
    version: 2.0
  trading:
    enabled: ${ENABLE_TRADING:-false}
    algorithms:
      - momentum
      - arbitrage

database:
  postgres:
    url: ${DATABASE_URL:-postgresql://localhost:5432/fantdev}
    ssl: ${DB_SSL:-false}
```

```typescript
// server.ts
import config from "./app.yaml";
import { server, features, database } from "./app.yaml";

// Full type safety and IntelliSense!
const app = Bun.serve({
  port: server.admin.port,
  hostname: server.admin.host,
  
  fetch(req) {
    if (features.dashboard.enabled) {
      return new Response(`Dashboard v${features.dashboard.version}`);
    }
    return new Response("Dashboard disabled");
  }
});

console.log(`Server running at ${server.admin.host}:${server.admin.port}`);
console.log(`Database: ${database.postgres.url}`);
console.log(`Trading: ${features.trading.enabled ? 'ON' : 'OFF'}`);
```

## 📚 Resources

- [Bun YAML API](https://bun.com/docs/api/yaml)
- [Import YAML Guide](https://bun.com/guides/runtime/import-yaml)
- [Bun Configuration Best Practices](https://bun.com/guides/runtime/configuration)
- [Environment Variables in Bun](https://bun.com/guides/runtime/env)

---

**Last Updated:** 2025-08-25
**Bun Version:** 1.2.21+
**Status:** ✅ Production Ready