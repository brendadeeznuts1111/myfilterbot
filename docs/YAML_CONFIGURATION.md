# YAML Configuration with Bun

This project now leverages Bun's first-class YAML support for configuration management with hot reloading capabilities.

> **📚 Complete Reference:** For a comprehensive guide to all of Bun's YAML features, see [Bun YAML Reference](./BUN_YAML_REFERENCE.md). This includes detailed coverage of the runtime API, advanced YAML features, and configuration patterns.


## Features

✅ **Zero Runtime Overhead** - YAML is parsed at build time when bundled  
✅ **Hot Reloading** - Configuration changes are reflected immediately with `--hot` flag  
✅ **Environment Variables** - Full interpolation support with defaults  
✅ **Feature Flags** - Advanced rollout control and A/B testing  
✅ **Multi-Environment** - Separate configs for development, staging, production  
✅ **Type Safety** - Full TypeScript support with auto-completion  

## Configuration Files

```
config/
├── app.yaml                    # Main application configuration
├── database.yaml               # Database connections and settings
├── features.yaml               # Feature flags and A/B tests
└── environments/
    ├── development.yaml        # Development-specific settings
    └── production.yaml         # Production-specific settings
```

## Usage

### Basic Import

```typescript
// Import YAML directly as ES modules
import config from "./config/app.yaml";
import { server, security } from "./config/app.yaml";

console.log(config.server.api.port); // 3001
console.log(security.jwt.expiresIn); // "7d"
```

### Using the Config Service

```typescript
import { yamlConfigService } from "./services/yaml-config-service";

// Get server configuration
const apiConfig = await yamlConfigService.getServerConfig("api");

// Check feature flags
const isDarkModeEnabled = await yamlConfigService.isFeatureEnabled("darkMode", userId);

// Get database configuration
const dbConfig = await yamlConfigService.getDatabase("postgres");
```

### Environment Variable Interpolation

YAML files support environment variable interpolation:

```yaml
database:
  host: ${DB_HOST:-localhost}        # Uses DB_HOST or defaults to localhost
  port: ${DB_PORT:-5432}             # Uses DB_PORT or defaults to 5432
  password: ${DB_PASS}               # Required - no default
```

### Feature Flags

Configure feature rollouts in `config/features.yaml`:

```yaml
features:
  newDashboard:
    enabled: true
    rolloutPercentage: 50           # Roll out to 50% of users
    allowedUsers:                   # Always enabled for these users
      - admin@example.com
      - beta@example.com
```

Check features in code:

```typescript
if (await isFeatureEnabled("newDashboard", user.email)) {
  // Show new dashboard
} else {
  // Show legacy dashboard
}
```

### Hot Reloading

Run with hot reloading to see config changes immediately:

```bash
# Development with hot reload
bun --hot src/server.ts

# Test hot reload functionality
bun --hot src/test-yaml-hot-reload.ts
```

When you modify any YAML file, the changes are automatically detected and reloaded without restarting the server.

### Testing

Test the YAML configuration system:

```bash
# Run the hot reload test server
bun --hot src/test-yaml-hot-reload.ts

# Visit these endpoints:
# http://localhost:3001/          - View current configuration
# http://localhost:3001/features  - Check feature flags
# http://localhost:3001/reload    - Manually reload configuration
```

## Migration from JSON/ENV

### Before (JSON/ENV):
```typescript
const config = require("./config.json");
const port = process.env.PORT || config.port || 3000;
```

### After (YAML):
```typescript
import { server } from "./config/app.yaml";
const port = server.api.port; // Already interpolated with env vars
```

## Performance Benefits

1. **Build-time Parsing**: When bundled with `bun build`, YAML is converted to JavaScript at build time
2. **Tree Shaking**: Named imports allow unused configuration to be eliminated
3. **No Runtime Dependencies**: No YAML parser needed in production bundles
4. **Native Performance**: Bun's YAML parser is written in Zig for optimal speed

## Best Practices

1. **Use Environment-Specific Files**: Keep sensitive data in environment variables
2. **Version Control**: Commit YAML configs but not `.env` files
3. **Validation**: Use the config service's validation methods
4. **Hot Reload in Dev**: Always use `--hot` flag during development
5. **Feature Flags**: Use for gradual rollouts and A/B testing

## Troubleshooting

### Config Not Loading
- Ensure YAML files are in the `config/` directory
- Check for YAML syntax errors
- Verify environment variables are set

### Hot Reload Not Working
- Make sure to run with `bun --hot`
- Check that file watchers are not disabled
- Verify file permissions

### Environment Variables Not Interpolating
- Use the correct syntax: `${VAR_NAME:-default}`
- Ensure variables are exported in your shell or `.env` file
- Check for typos in variable names

## Examples

See `src/test-yaml-hot-reload.ts` for a complete working example of YAML configuration with hot reloading.
