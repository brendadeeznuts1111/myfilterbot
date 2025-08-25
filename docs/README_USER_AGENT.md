# User-Agent Customization with Bun CLI

This project demonstrates how to use Bun CLI's `--user-agent` flag to customize HTTP request headers across all services in the FantDev Trading Bot application.

## 🚀 Quick Start

### Basic Usage
```bash
# Run with custom User-Agent
bun --user-agent "MyCustomApp/1.0" your-script.ts

# Without flag (uses default Bun User-Agent)
bun your-script.ts
```

### Demo Script
```bash
# See current User-Agent
bun examples/user-agent-demo.ts

# Test with custom User-Agent
bun --user-agent "Fantdev-Trading-Bot/2.1.0" examples/user-agent-demo.ts
```

## 📚 What's Included

### 1. Core Implementation
- **Fixed Dashboard Server**: Resolved import issues and properly initialized router
- **404 Test Fix**: All API endpoint tests now pass successfully
- **User-Agent Support**: Full integration with Bun CLI's `--user-agent` flag

### 2. Documentation
- **User-Agent Customization Guide**: `docs/USER_AGENT_CUSTOMIZATION.md`
- **Integration Examples**: `examples/user-agent-integration-examples.md`
- **Comprehensive README**: This file

### 3. Scripts and Tools
- **Service Management**: `scripts/start-services-with-user-agents.sh`
- **Service Cleanup**: `scripts/stop-services.sh`
- **Demo Application**: `examples/user-agent-demo.ts`

## 🔧 How It Works

### The `--user-agent` Flag
Bun CLI's `--user-agent` flag overrides the default User-Agent header for all `fetch()` requests within your application:

```typescript
// This will use the --user-agent flag value, not the header
const response = await fetch(url, {
  headers: {
    'User-Agent': 'This will be ignored' // Flag overrides this
  }
});
```

### Service Integration
Each service can be started with a unique User-Agent for better monitoring:

```bash
# Start dashboard with custom User-Agent
bun --user-agent "Fantdev-Dashboard/2.1.0-Prod" src/server/dashboard-server.ts

# Start bot with custom User-Agent
bun --user-agent "Fantdev-TelegramBot/2.1.0-Prod" src/telegram_bot_service.ts
```

## 📊 Use Cases

### 1. **API Compliance**
Some APIs require specific User-Agent strings:
```bash
# GitHub API compliance
bun --user-agent "MyApp/1.0 (contact@example.com)" src/github-integration.ts

# Twitter API compliance
bun --user-agent "MyBot/1.0" src/twitter-bot.ts
```

### 2. **Service Monitoring**
Identify services in logs and monitoring tools:
```bash
# Production services with identifiable User-Agents
bun --user-agent "Fantdev-Dashboard-v2.1.0-Prod" src/server/dashboard-server.ts &
bun --user-agent "Fantdev-Bot-v2.1.0-Prod" src/telegram_bot_service.ts &
bun --user-agent "Fantdev-API-v2.1.0-Prod" src/server/api/router.ts &
```

### 3. **Load Testing**
Test with different User-Agent values:
```bash
# Load test with specific User-Agents
bun --user-agent "Fantdev-LoadTest-User1" scripts/run-tests.ts &
bun --user-agent "Fantdev-LoadTest-User2" scripts/run-tests.ts &
bun --user-agent "Fantdev-LoadTest-User3" scripts/run-tests.ts &
```

### 4. **Environment Management**
Different User-Agents for different environments:
```bash
# Development
bun --user-agent "Fantdev-Dashboard-Dev/2.1.0" src/server/dashboard-server.ts

# Staging
bun --user-agent "Fantdev-Dashboard-Staging/2.1.0" src/server/dashboard-server.ts

# Production
bun --user-agent "Fantdev-Dashboard-Prod/2.1.0" src/server/dashboard-server.ts
```

## 🛠️ Service Management

### Start All Services
```bash
# Start all services with custom User-Agents
./scripts/start-services-with-user-agents.sh

# Start with specific environment
ENVIRONMENT=production ./scripts/start-services-with-user-agents.sh
```

### Stop All Services
```bash
# Stop all services
./scripts/stop-services.sh
```

### Individual Service Control
```bash
# Start individual services
bun --user-agent "Fantdev-Dashboard/2.1.0" src/server/dashboard-server.ts &
bun --user-agent "Fantdev-Bot/2.1.0" src/telegram_bot_service.ts &
bun --user-agent "Fantdev-API/2.1.0" src/server/api/router.ts &
```

## 📋 Best Practices

### 1. **Naming Convention**
Use consistent format: `AppName/Version-Environment`
```bash
bun --user-agent "Fantdev-Dashboard/2.1.0-Prod" src/server/dashboard-server.ts
bun --user-agent "Fantdev-Bot/2.1.0-Prod" src/telegram_bot_service.ts
bun --user-agent "Fantdev-API/2.1.0-Prod" src/server/api/router.ts
```

### 2. **Version Tracking**
Always include version numbers:
```bash
bun --user-agent "Fantdev-Dashboard/2.1.0" src/server/dashboard-server.ts
bun --user-agent "Fantdev-Dashboard/2.1.1" src/server/dashboard-server.ts
bun --user-agent "Fantdev-Dashboard/2.2.0" src/server/dashboard-server.ts
```

### 3. **Environment Identification**
Include environment in production User-Agents:
```bash
bun --user-agent "Fantdev-Dashboard/2.1.0-Production" src/server/dashboard-server.ts
bun --user-agent "Fantdev-Dashboard/2.1.0-Staging" src/server/dashboard-server.ts
bun --user-agent "Fantdev-Dashboard/2.1.0-Development" src/server/dashboard-server.ts
```

## 🔍 Troubleshooting

### User-Agent Not Applied
```bash
# Check flag position
bun --user-agent "MyApp/1.0" script.ts  # ✅ Correct
bun script.ts --user-agent "MyApp/1.0"  # ❌ Wrong position

# Verify Bun version
bun --version  # Should be 1.2.0 or higher
```

### Multiple User-Agent Headers
The `--user-agent` flag overrides headers in code:
```typescript
// This will use the --user-agent flag value, not the header
const response = await fetch(url, {
  headers: {
    'User-Agent': 'This will be ignored' // Flag overrides this
  }
});
```

### Service-Specific Issues
- Ensure service uses `fetch()` for HTTP requests
- The flag only affects `fetch()` calls, not other HTTP methods
- Check if service is properly handling User-Agent headers

## 🚀 Advanced Examples

### CI/CD Integration
```yaml
# GitHub Actions
- name: Run tests with custom User-Agent
  run: |
    bun --user-agent "Fantdev-CI-TestRunner/2.1.0" scripts/run-tests.ts

- name: Deploy with custom User-Agent
  run: |
    bun --user-agent "Fantdev-CI-Deploy/2.1.0" scripts/deploy.ts
```

### Docker Integration
```dockerfile
# Set default User-Agent for container
ENV BUN_USER_AGENT="Fantdev-Container/2.1.0"

# Override at runtime
docker run -e BUN_USER_AGENT="Fantdev-Container-Prod/2.1.0" myapp
```

### Load Balancing
```bash
# Start multiple instances with different User-Agents
bun --user-agent "Fantdev-API-Instance1/2.1.0" src/server/api/router.ts &
bun --user-agent "Fantdev-API-Instance2/2.1.0" src/server/api/router.ts &
bun --user-agent "Fantdev-API-Instance3/2.1.0" src/server/api/router.ts &
```

## 📈 Monitoring and Analytics

### Log Analysis
With custom User-Agents, you can easily filter logs:
```bash
# Filter logs by service
grep "Fantdev-Dashboard" logs/app.log
grep "Fantdev-Bot" logs/app.log
grep "Fantdev-API" logs/app.log

# Filter by environment
grep "Fantdev.*-Prod" logs/app.log
grep "Fantdev.*-Staging" logs/app.log
grep "Fantdev.*-Dev" logs/app.log
```

### External Service Monitoring
External services can identify your application:
```bash
# Services will see these User-Agents
Fantdev-Dashboard/2.1.0-Prod
Fantdev-TelegramBot/2.1.0-Prod
Fantdev-API/2.1.0-Prod
```

## 🔗 Related Documentation

- [Bun CLI Documentation](https://bun.sh/docs/cli)
- [HTTP User-Agent Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [User-Agent Customization Guide](docs/USER_AGENT_CUSTOMIZATION.md)
- [Integration Examples](examples/user-agent-integration-examples.md)

## 🎯 Summary

The User-Agent customization feature provides:

✅ **Easy Identification**: Each service has a unique, identifiable User-Agent  
✅ **Better Monitoring**: Filter logs and metrics by service and environment  
✅ **API Compliance**: Meet requirements for external services  
✅ **Flexibility**: Override User-Agent at runtime without code changes  
✅ **Production Ready**: Consistent naming conventions and best practices  

This implementation transforms how you can monitor, debug, and manage your FantDev Trading Bot services, making it easier to track performance, identify issues, and maintain compliance with external APIs.
