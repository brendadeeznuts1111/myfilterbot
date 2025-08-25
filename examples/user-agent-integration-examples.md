# User-Agent Integration Examples

This guide demonstrates how to use the `--user-agent` flag with various scripts and services in the FantDev Trading Bot application.

## Script Integration Examples

### 1. Dashboard Server
```bash
# Start dashboard with custom User-Agent
bun --user-agent "Fantdev-Dashboard/2.1.0" src/server/dashboard-server.ts

# Start with environment-specific User-Agent
bun --user-agent "Fantdev-Dashboard-Prod/2.1.0" src/server/dashboard-server.ts
```

### 2. Telegram Bot Service
```bash
# Start bot with custom User-Agent
bun --user-agent "Fantdev-TelegramBot/2.1.0" src/telegram_bot_service.ts

# Start with monitoring User-Agent
bun --user-agent "Fantdev-Bot-Monitor/2.1.0" src/telegram_bot_service.ts
```

### 3. Admin Portal Server
```bash
# Start admin portal with custom User-Agent
bun --user-agent "Fantdev-AdminPortal/2.1.0" src/admin_portal_server.ts

# Start with security-focused User-Agent
bun --user-agent "Fantdev-Admin-Secure/2.1.0" src/admin_portal_server.ts
```

### 4. Test Scripts
```bash
# Run tests with custom User-Agent
bun --user-agent "Fantdev-TestRunner/2.1.0" scripts/run-tests.ts

# Run integration tests with specific User-Agent
bun --user-agent "Fantdev-IntegrationTest/2.1.0" scripts/test-integration.ts

# Run dashboard tests with custom User-Agent
bun --user-agent "Fantdev-DashboardTest/2.1.0" scripts/test-dashboard.ts
```

### 5. Utility Scripts
```bash
# Validate configuration with custom User-Agent
bun --user-agent "Fantdev-ConfigValidator/2.1.0" scripts/validate-config.ts

# Collect metrics with custom User-Agent
bun --user-agent "Fantdev-MetricsCollector/2.1.0" scripts/collect_metrics.ts

# Analyze feedback with custom User-Agent
bun --user-agent "Fantdev-FeedbackAnalyzer/2.1.0" scripts/analyze-feedback.ts
```

### 6. Development Scripts
```bash
# Start development server with custom User-Agent
bun --user-agent "Fantdev-DevServer/2.1.0" scripts/dev-with-defines.js

# Build with custom User-Agent
bun --user-agent "Fantdev-Builder/2.1.0" scripts/build-with-defines.js

# Verify integration with custom User-Agent
bun --user-agent "Fantdev-IntegrationVerifier/2.1.0" scripts/verify_integration.js
```

## Service-Specific User-Agent Patterns

### Trading Bot Services
```bash
# Main trading bot
bun --user-agent "Fantdev-TradingBot/2.1.0" src/services/bot/manager.ts

# Customer service
bun --user-agent "Fantdev-CustomerService/2.1.0" src/services/bot/customer.ts

# Fire support bot
bun --user-agent "Fantdev-FireSupport/2.1.0" src/services/bot/fire-support-bot.ts
```

### API Services
```bash
# Main API router
bun --user-agent "Fantdev-APIRouter/2.1.0" src/server/api/router.ts

# Dashboard API
bun --user-agent "Fantdev-DashboardAPI/2.1.0" src/server/api/dashboard-router.ts

# Customer API
bun --user-agent "Fantdev-CustomerAPI/2.1.0" src/server/api/customer.ts
```

### Monitoring and Analytics
```bash
# Performance monitor
bun --user-agent "Fantdev-PerformanceMonitor/2.1.0" src/services/performance-monitor.ts

# Cache warming service
bun --user-agent "Fantdev-CacheWarmer/2.1.0" src/services/cache-warming-service.ts

# WebSocket service
bun --user-agent "Fantdev-WebSocket/2.1.0" src/services/websocket_service.ts
```

## Environment-Specific Examples

### Development Environment
```bash
# Development dashboard
bun --user-agent "Fantdev-Dashboard-Dev/2.1.0" src/server/dashboard-server.ts

# Development bot
bun --user-agent "Fantdev-Bot-Dev/2.1.0" src/telegram_bot_service.ts

# Development API
bun --user-agent "Fantdev-API-Dev/2.1.0" src/server/api/router.ts
```

### Staging Environment
```bash
# Staging dashboard
bun --user-agent "Fantdev-Dashboard-Staging/2.1.0" src/server/dashboard-server.ts

# Staging bot
bun --user-agent "Fantdev-Bot-Staging/2.1.0" src/telegram_bot_service.ts

# Staging API
bun --user-agent "Fantdev-API-Staging/2.1.0" src/server/api/router.ts
```

### Production Environment
```bash
# Production dashboard
bun --user-agent "Fantdev-Dashboard-Prod/2.1.0" src/server/dashboard-server.ts

# Production bot
bun --user-agent "Fantdev-Bot-Prod/2.1.0" src/telegram_bot_service.ts

# Production API
bun --user-agent "Fantdev-API-Prod/2.1.0" src/server/api/router.ts
```

## Use Case Examples

### 1. API Rate Limiting and Monitoring
```bash
# Start services with identifiable User-Agents for better monitoring
bun --user-agent "Fantdev-Dashboard-v2.1.0-Prod" src/server/dashboard-server.ts &
bun --user-agent "Fantdev-Bot-v2.1.0-Prod" src/telegram_bot_service.ts &
bun --user-agent "Fantdev-API-v2.1.0-Prod" src/server/api/router.ts &
```

### 2. Load Testing and Debugging
```bash
# Load test with specific User-Agent
bun --user-agent "Fantdev-LoadTest-User1" scripts/run-tests.ts &
bun --user-agent "Fantdev-LoadTest-User2" scripts/run-tests.ts &
bun --user-agent "Fantdev-LoadTest-User3" scripts/run-tests.ts &
```

### 3. Service Discovery and Health Checks
```bash
# Health check with custom User-Agent
bun --user-agent "Fantdev-HealthCheck-Prod" scripts/health-check.ts

# Service discovery with custom User-Agent
bun --user-agent "Fantdev-ServiceDiscovery-Prod" scripts/service-discovery.ts
```

### 4. Compliance and Auditing
```bash
# Audit script with compliance User-Agent
bun --user-agent "Fantdev-Audit-Compliance/2.1.0" scripts/dependency-audit.js

# Security scan with custom User-Agent
bun --user-agent "Fantdev-SecurityScan/2.1.0" scripts/security-scan.ts
```

## Best Practices for Production

### 1. Consistent Naming Convention
```bash
# Use consistent format: AppName/Version-Environment
bun --user-agent "Fantdev-Dashboard/2.1.0-Prod" src/server/dashboard-server.ts
bun --user-agent "Fantdev-Bot/2.1.0-Prod" src/telegram_bot_service.ts
bun --user-agent "Fantdev-API/2.1.0-Prod" src/server/api/router.ts
```

### 2. Environment Identification
```bash
# Always include environment in production User-Agents
bun --user-agent "Fantdev-Dashboard/2.1.0-Production" src/server/dashboard-server.ts
bun --user-agent "Fantdev-Dashboard/2.1.0-Staging" src/server/dashboard-server.ts
bun --user-agent "Fantdev-Dashboard/2.1.0-Development" src/server/dashboard-server.ts
```

### 3. Version Tracking
```bash
# Include version for better tracking
bun --user-agent "Fantdev-Dashboard/2.1.0" src/server/dashboard-server.ts
bun --user-agent "Fantdev-Dashboard/2.1.1" src/server/dashboard-server.ts
bun --user-agent "Fantdev-Dashboard/2.2.0" src/server/dashboard-server.ts
```

## Troubleshooting

### User-Agent Not Applied
```bash
# Check if flag is in correct position
bun --user-agent "MyApp/1.0" script.ts  # ✅ Correct
bun script.ts --user-agent "MyApp/1.0"  # ❌ Wrong position

# Verify Bun version supports the flag
bun --version  # Should be 1.2.0 or higher
```

### Multiple User-Agent Headers
```bash
# The --user-agent flag overrides headers in code
# If you set both, the flag takes precedence
bun --user-agent "FlagValue" script.ts  # This wins
```

### Service-Specific Issues
```bash
# Check if service is using fetch() for HTTP requests
# The flag only affects fetch() calls, not other HTTP methods
```

## Integration with CI/CD

### GitHub Actions
```yaml
- name: Run tests with custom User-Agent
  run: |
    bun --user-agent "Fantdev-CI-TestRunner/2.1.0" scripts/run-tests.ts

- name: Deploy with custom User-Agent
  run: |
    bun --user-agent "Fantdev-CI-Deploy/2.1.0" scripts/deploy.ts
```

### Docker
```dockerfile
# Set default User-Agent for container
ENV BUN_USER_AGENT="Fantdev-Container/2.1.0"

# Override at runtime
docker run -e BUN_USER_AGENT="Fantdev-Container-Prod/2.1.0" myapp
```

This comprehensive guide shows how to integrate the `--user-agent` flag across all aspects of the FantDev Trading Bot application, providing better monitoring, debugging, and compliance capabilities.
