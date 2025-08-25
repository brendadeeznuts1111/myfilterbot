# Unified Dashboard - User Guide

## Overview

The Unified Dashboard combines the best features from both previous dashboards with native Bun YAML support, providing a comprehensive interface for monitoring and managing your Fantdev Trading Bot system.

## Features

### 🎯 Core Features
- **Real-time Configuration Management** - Edit YAML files directly in the browser
- **Hot-Reload Support** - Changes take effect without server restart
- **Feature Flag Management** - Toggle features on/off with instant updates
- **Service Health Monitoring** - Check status of all services
- **API Testing Interface** - Test endpoints directly from the dashboard
- **Live Log Streaming** - Monitor system logs in real-time
- **Timezone Support** - Display times in your preferred timezone

### 🔥 Bun YAML Integration
- Native YAML import/export using Bun's built-in support
- Multi-document YAML parsing
- Real-time validation with error reporting
- Environment-specific configuration management
- Hot-reload notifications via Server-Sent Events

## Getting Started

### 1. Start the Dashboard
```bash
# Start with hot-reload enabled (development)
bun --hot src/admin-server.ts

# Or start normally (production)
bun src/admin-server.ts
```

### 2. Access the Dashboard
Open your browser and navigate to:
```
http://localhost:3003/dashboard
```

### 3. Test the Implementation
```bash
# Run comprehensive tests
bun run scripts/test-dashboard.ts
```

## Dashboard Tabs

### Overview Tab
- **System Metrics** - Active users, transactions, balances, uptime
- **Quick Actions** - Start/stop services, health checks, exports
- **Hot-Reload Status** - Monitor YAML file changes and reloads

### Services Tab
- **Service Health** - Real-time status of all system components
- **Response Times** - Monitor API response performance
- **Auto-Check** - Automatically monitor service health

### API Testing Tab
- **Endpoint Testing** - Send GET/POST/PUT/DELETE requests
- **Quick Presets** - Pre-configured endpoints for common operations
- **Response Display** - View formatted JSON responses

### YAML Config Tab
- **File Selection** - Choose from app, features, services, telegram, database configs
- **Live Editor** - Edit YAML with syntax highlighting
- **Real-time Validation** - Instant feedback on YAML syntax
- **Hot-Reload** - Changes apply immediately without restart

### Feature Flags Tab
- **Toggle Features** - Enable/disable features with visual toggles
- **Feature Information** - Description and rollout percentages
- **Real-time Updates** - Changes propagate instantly via SSE

### Live Logs Tab
- **Real-time Streaming** - View logs as they happen
- **Filtering** - Filter by log level (error, warn, info, debug)
- **Search** - Find specific log entries
- **Export** - Download logs for analysis

## Hot-Reload Functionality

### How It Works
1. The dashboard monitors all YAML files in the `config/` directory
2. When a file changes, Bun automatically reloads the module
3. The dashboard receives a notification via Server-Sent Events
4. UI updates immediately to reflect the changes

### Supported Operations
- **Configuration Updates** - Changes to app.yaml, features.yaml, etc.
- **Feature Flag Toggles** - Enable/disable features instantly
- **Timezone Changes** - Server timezone updates without restart
- **Environment Switching** - Switch between dev/production configs

## YAML Configuration Management

### File Structure
```yaml
# app.yaml - Main application configuration
app:
  name: fantdev-trading-bot
  version: 3.0.0
  timezone: America/New_York

server:
  admin:
    port: 3003
    host: localhost

# features.yaml - Feature flag management
features:
  newDashboard:
    enabled: true
    rolloutPercentage: 100
    description: Unified dashboard with YAML support
```

### Best Practices
1. **Validate Before Save** - Always validate YAML syntax before saving
2. **Use Environment Variables** - Reference secrets via `${VARIABLE_NAME}`
3. **Test Changes** - Use the API testing tab to verify configuration changes
4. **Monitor Logs** - Watch the logs tab for any configuration errors
5. **Backup Configs** - Export configurations before making major changes

## Timezone Configuration

### Setting Timezone
Add to your `app.yaml`:
```yaml
app:
  timezone: America/New_York  # Your preferred timezone

# Environment-specific overrides
environments:
  development:
    timezone: UTC
  production:
    timezone: Europe/London
```

### Supported Formats
- **IANA Timezone Names** - `America/New_York`, `Europe/London`
- **UTC Offsets** - `+05:30`, `-08:00`
- **Common Abbreviations** - `EST`, `PST`, `GMT`

## API Endpoints

### Dashboard API
- `GET /api/dashboard/overview` - System overview data
- `GET /api/yaml/list` - List all YAML files
- `GET /api/yaml/{file}` - Get specific YAML content
- `POST /api/yaml/{file}` - Update YAML file
- `POST /api/yaml/validate` - Validate YAML syntax

### Feature Flags API
- `GET /api/features` - Get all feature flags
- `POST /api/features/{flag}/toggle` - Toggle specific feature

### System API
- `GET /api/version` - Get version information
- `GET /api/system/stats` - Get system statistics
- `GET /api/health/full` - Complete health check

### Real-time Updates
- `GET /api/dashboard/stream` - Server-Sent Events for real-time updates

## Troubleshooting

### Common Issues

#### Hot-Reload Not Working
```bash
# Check if files are being watched
curl http://localhost:3003/api/hotreload/status

# Restart with hot-reload enabled
bun --hot src/admin-server.ts
```

#### YAML Validation Errors
1. Check syntax in the YAML Config tab
2. Use the validation button before saving
3. Review logs for specific error messages

#### Timezone Not Updating
1. Verify timezone format in configuration
2. Check that hot-reload is enabled
3. Monitor logs for timezone change notifications

#### API Endpoints Not Responding
1. Verify server is running on correct port
2. Check CORS headers in browser dev tools
3. Test endpoints using curl or similar tool

### Debug Mode
Start with debug logging enabled:
```bash
LOG_LEVEL=debug bun src/admin-server.ts
```

## Development

### Adding New Features
1. Update the appropriate YAML configuration schema
2. Add new API endpoints to `dashboard-router.ts`
3. Update the dashboard UI to handle new features
4. Test with the test script

### Contributing
1. Follow the existing code structure
2. Update documentation for any new features
3. Test thoroughly with the test script
4. Ensure hot-reload works with changes

## Security Considerations

1. **Environment Variables** - Store secrets in environment variables, not YAML files
2. **Access Control** - Dashboard should be behind authentication in production
3. **CORS** - Configure appropriate CORS headers for your domain
4. **Input Validation** - All YAML inputs are validated before processing
5. **File Permissions** - Ensure configuration files have appropriate permissions

## Performance

### Optimization Tips
1. **Minimize Config Size** - Keep YAML files focused and concise
2. **Use Environment Overrides** - Avoid duplicating configuration
3. **Monitor Memory Usage** - Watch system stats in the dashboard
4. **Enable Compression** - Use gzip compression for API responses

### Monitoring
- Monitor hot-reload frequency in the Overview tab
- Watch memory usage in the system stats
- Check API response times in the Services tab
- Review logs for performance warnings

## Next Steps

1. **Add Authentication** - Secure the dashboard with user authentication
2. **Enhance Visualizations** - Add charts and graphs for better insights
3. **Mobile Support** - Optimize dashboard for mobile devices
4. **Backup/Restore** - Add configuration backup and restore functionality
5. **Multi-Environment** - Support for managing multiple environments