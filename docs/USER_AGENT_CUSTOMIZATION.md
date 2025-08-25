# 🚀 User-Agent Customization with Bun CLI

## Overview

Bun CLI now supports the `--user-agent` flag, allowing you to customize the User-Agent header for HTTP requests made with `fetch()`. This feature is particularly useful for:

- **Service Identification**: Distinguish between different services making API calls
- **API Rate Limiting**: Better control over external API requests
- **Monitoring & Debugging**: Easy identification of request sources
- **Testing**: Simulate different client types

## 🆕 New: bunx --package Support

Bun now supports the `--package` (or `-p`) flag with `bunx`, bringing functionality in line with `npx` and `yarn dlx`. This is perfect for packages with multiple binaries or scoped packages.

### Examples with --package Flag

```bash
# Run renovate-config-validator from renovate package
bunx --package renovate renovate-config-validator

# Use ng binary from @angular/cli package
bunx -p @angular/cli ng new my-app

# Run TypeScript compiler with custom User-Agent
bunx --package typescript --user-agent "Fantdev-Build-System/2.2.0" tsc --noEmit

# Use wrangler with custom User-Agent for Cloudflare deployment
bunx -p wrangler --user-agent "Fantdev-Deploy/2.2.0" wrangler deploy
```

## 🎯 Basic Usage

### Setting Custom User-Agent

```bash
# Basic usage
bun --user-agent "MyCustomApp/1.0" script.ts

# With specific version
bun --user-agent "Fantdev-Trading-Bot/2.2.0" src/start-event-driven-bot.ts start

# For development
bun --user-agent "Fantdev-Dev/2.2.0" --hot src/server/dashboard-server.ts
```

### In Your Code

```typescript
// The User-Agent is automatically set for all fetch() calls
const response = await fetch('https://api.example.com/data');
console.log('Request made with custom User-Agent');
```

## 🔧 Integration Examples

### 1. Service Management Scripts

Our service management scripts now use `bunx --package` for better reliability:

```bash
# Start services with custom User-Agents
./scripts/start-services-with-user-agents.sh

# Stop all services
./scripts/stop-services.sh
```

### 2. Development Workflow

```bash
# Type checking with custom User-Agent
bunx --package typescript --user-agent "Fantdev-TypeCheck/2.2.0" tsc --noEmit

# Linting with custom User-Agent
bunx --package eslint --user-agent "Fantdev-Lint/2.2.0" eslint src/

# Testing with custom User-Agent
bunx --package jest --user-agent "Fantdev-Test/2.2.0" jest --coverage
```

### 3. CI/CD Pipeline

```bash
# Build with custom User-Agent
bunx --package typescript --user-agent "Fantdev-CI/2.2.0" tsc --build

# Deploy with custom User-Agent
bunx -p wrangler --user-agent "Fantdev-Deploy/2.2.0" wrangler deploy

# Run security scans
bunx --package audit-ci --user-agent "Fantdev-Security/2.2.0" audit-ci
```

## 🚀 Advanced Usage

### Environment-Specific User-Agents

```bash
# Development
export DEV_USER_AGENT="Fantdev-Dev/2.2.0"
bun --user-agent "$DEV_USER_AGENT" src/dev-server.ts

# Staging
export STAGING_USER_AGENT="Fantdev-Staging/2.2.0"
bun --user-agent "$STAGING_USER_AGENT" src/staging-server.ts

# Production
export PROD_USER_AGENT="Fantdev-Prod/2.2.0"
bun --user-agent "$PROD_USER_AGENT" src/prod-server.ts
```

### Package-Specific User-Agents

```bash
# TypeScript operations
bunx --package typescript --user-agent "Fantdev-TS/2.2.0" tsc --noEmit

# ESLint operations
bunx --package eslint --user-agent "Fantdev-Lint/2.2.0" eslint src/

# Prettier operations
bunx --package prettier --user-agent "Fantdev-Format/2.2.0" prettier --write src/
```

## 📊 Monitoring & Analytics

### Request Tracking

With custom User-Agents, you can easily track requests in your analytics:

```typescript
// Example: Track different service types
const userAgent = process.env.USER_AGENT || 'Fantdev-Unknown/2.2.0';

// Log all requests with User-Agent
console.log(`📡 Request from: ${userAgent}`);

// Track in analytics
analytics.track('api_request', {
  userAgent,
  endpoint: '/api/data',
  timestamp: new Date().toISOString()
});
```

### Service Health Monitoring

```bash
# Check service health with custom User-Agent
bunx --package curl --user-agent "Fantdev-HealthCheck/2.2.0" \
  -H "Authorization: Bearer $TOKEN" \
  https://api.fantdev.com/health

# Monitor specific services
bunx --package curl --user-agent "Fantdev-Monitor/2.2.0" \
  -H "Authorization: Bearer $TOKEN" \
  https://api.fantdev.com/metrics
```

## 🛠️ Troubleshooting

### Common Issues

1. **Package Not Found**: Use `--package` flag for packages with different binary names
   ```bash
   # ❌ This might fail
   bunx tsc --noEmit
   
   # ✅ This will work
   bunx --package typescript tsc --noEmit
   ```

2. **User-Agent Not Set**: Ensure the flag is placed before the script name
   ```bash
   # ❌ Wrong order
   bun script.ts --user-agent "MyApp/1.0"
   
   # ✅ Correct order
   bun --user-agent "MyApp/1.0" script.ts
   ```

3. **Permission Issues**: Some packages may require additional setup
   ```bash
   # For global packages, ensure proper permissions
   bunx --package @angular/cli --user-agent "Fantdev-CLI/2.2.0" ng version
   ```

### Debug Mode

Enable debug mode to see what's happening:

```bash
# Enable Bun debug mode
BUN_DEBUG=1 bun --user-agent "Fantdev-Debug/2.2.0" script.ts

# Check User-Agent in requests
curl -H "User-Agent: Fantdev-Test/2.2.0" https://httpbin.org/user-agent
```

## 🔗 Related Documentation

- [Bun CLI Documentation](https://bun.sh/docs/cli/bun)
- [Bun Package Management](https://bun.sh/docs/cli/bunx)
- [FantDev Trading Bot README](../readme.md)
- [Service Management Scripts](../scripts/start-services-with-user-agents.sh)

## 📝 Changelog

### v2.2.0
- ✅ Added `--user-agent` flag support
- ✅ Added `--package` flag support for bunx
- ✅ Service management scripts with custom User-Agents
- ✅ Comprehensive documentation and examples
- ✅ Integration with existing development workflow

---

**Last Updated**: August 25, 2025  
**Bun Version**: 1.2.20+  
**FantDev Version**: 2.2.0
