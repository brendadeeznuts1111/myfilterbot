# Error Handling & Debugging System

## Overview

The Fantdev Trading Bot now includes a comprehensive error handling and debugging system that provides:

- **Centralized Error Logging**: All errors are logged with context and categorization
- **Real-time Error Notifications**: Critical errors are sent to admin immediately
- **Debug Interface**: Interactive debugging commands for system monitoring
- **Error Classification**: Automatic categorization by type and severity
- **Performance Monitoring**: System health and performance metrics
- **Error Recovery**: Graceful handling and recovery from various error types

## Components

### 1. Error Handler (`src/error_handler.py`)

**Key Features:**
- Error tracking with unique IDs
- Severity classification (Critical, High, Medium, Low)
- Category classification (Database, Telegram, API, Network, etc.)
- Automatic logging to files
- Admin notifications for high-severity errors
- Error history persistence

**Usage Example:**
```python
from src.error_handler import error_handler_decorator, ErrorCategory, ErrorSeverity

@error_handler_decorator(ErrorCategory.DATABASE, ErrorSeverity.HIGH)
async def my_database_function():
    # Function code here
    pass
```

### 2. Debug Handler (`src/debug_handler.py`)

**Key Features:**
- Interactive debug commands
- System status monitoring
- Error simulation for testing
- Performance metrics
- Database health checks
- Configuration inspection

**Access:** Use `/debug` command in Telegram (admin only)

### 3. Integration

The error handling system is automatically integrated into:
- All bot command handlers
- Database operations
- API endpoints
- Message processing
- Callback handlers

## Error Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `DATABASE` | Database-related errors | Connection failures, data corruption |
| `TELEGRAM` | Telegram API errors | Bad requests, rate limits |
| `API` | External API failures | Third-party service timeouts |
| `NETWORK` | Network connectivity issues | Connection timeouts, DNS failures |
| `VALIDATION` | Input validation errors | Invalid user data, format errors |
| `PERMISSION` | Access control errors | Unauthorized access attempts |
| `CONFIGURATION` | Config-related errors | Missing tokens, invalid settings |
| `TRANSACTION` | Transaction processing errors | Payment failures, balance errors |

## Error Severity Levels

| Severity | Description | Response |
|----------|-------------|----------|
| `CRITICAL` | System failure, immediate attention needed | Instant admin notification |
| `HIGH` | Major functionality affected | Admin notification |
| `MEDIUM` | Degraded functionality | Logged for review |
| `LOW` | Minor issues | Logged only |

## Debug Commands (Admin Only)

Access the debug interface with `/debug` command:

### Main Menu Options:

1. **🔍 System Status** - CPU, memory, disk usage, uptime
2. **❌ Recent Errors** - Latest errors with filtering
3. **📊 Performance** - Error statistics and trends
4. **💾 Database Health** - Database status and integrity checks
5. **🧪 Test Error** - Simulate errors for testing
6. **📝 Logs** - Recent log entries
7. **🔧 Configuration** - Current system configuration
8. **🔄 Clear Errors** - Remove old error records
9. **🚦 Toggle Debug Mode** - Enable/disable detailed error messages
10. **📤 Export Debug Info** - Download comprehensive debug report

## Error Simulation

For testing purposes, you can simulate different types of errors:

- **Critical Error**: System failure simulation
- **High Error**: Database failure simulation  
- **Medium Error**: API timeout simulation
- **Low Error**: Validation warning simulation

## Log Files

Error logs are stored in the `logs/` directory:

- `errors_YYYYMMDD.log` - Error-level and above
- `debug_YYYYMMDD.log` - All log levels with detailed info
- `critical_errors.log` - Critical errors only
- `error_history.json` - Structured error history

## Configuration

### Environment Variables

```bash
# Enable debug mode
DEBUG_MODE=true

# Set admin chat ID for notifications
ADMIN_CHAT_ID=-1234567890

# Configure error notification settings
ERROR_NOTIFICATIONS_ENABLED=true
```

### Code Configuration

```python
# Enable debug mode programmatically
error_handler.enable_debug_mode(True)

# Set admin chat for notifications
error_handler.set_admin_chat_id(config.admin_chat_id)

# Disable notifications temporarily
error_handler.notification_enabled = False
```

## API Integration

The error handling system integrates with the web portals to provide:

- Real-time error notifications
- Error statistics in admin dashboards
- System health indicators
- Debug information export

## Testing

Run the comprehensive test suite:

```bash
python3 test_error_handling.py
```

This will test:
- Error tracking functionality
- Classification systems
- Log file creation
- Database integration
- Configuration validation
- Decorator functionality

## Best Practices

### 1. Using Error Decorators

Always use decorators on async functions that might fail:

```python
@error_handler_decorator(ErrorCategory.TELEGRAM, ErrorSeverity.MEDIUM)
async def send_message(chat_id, text):
    # Implementation
    pass
```

### 2. Manual Error Logging

For complex scenarios, log errors manually:

```python
try:
    # Risky operation
    pass
except Exception as e:
    error_tracker.log_error(
        error=e,
        category=ErrorCategory.DATABASE,
        severity=ErrorSeverity.HIGH,
        context={"operation": "user_registration", "user_id": user_id}
    )
    raise  # Re-raise if needed
```

### 3. Context Information

Always provide context when logging errors:

```python
context = {
    "user_id": update.effective_user.id,
    "chat_id": update.effective_chat.id,
    "command": "register",
    "timestamp": datetime.now().isoformat()
}
```

### 4. Error Recovery

Implement graceful degradation:

```python
try:
    # Primary functionality
    return primary_operation()
except DatabaseError:
    # Fallback to cached data
    return get_cached_data()
except Exception as e:
    # Log error and provide user-friendly message
    error_tracker.log_error(e, ErrorCategory.UNKNOWN, ErrorSeverity.MEDIUM)
    return "Service temporarily unavailable"
```

## Monitoring

### Key Metrics to Monitor

1. **Error Rate**: Total errors per hour/day
2. **Critical Errors**: Any critical errors should trigger immediate attention
3. **Error Categories**: Trends in specific error types
4. **Resolution Rate**: Percentage of errors marked as resolved
5. **System Performance**: CPU/Memory usage correlation with errors

### Alerts

The system automatically sends alerts for:
- Critical errors (immediate)
- High severity errors (within 5 minutes)
- Error rate spikes (more than 10 errors in 10 minutes)
- System resource exhaustion (CPU > 90%, Memory > 95%)

## Troubleshooting

### Common Issues

1. **Debug command not working**
   - Check if user has admin privileges
   - Verify ADMIN_CHAT_ID is set correctly

2. **Errors not being logged**
   - Check file permissions for logs directory
   - Verify error_handler is properly initialized

3. **No admin notifications**
   - Confirm ADMIN_CHAT_ID is set
   - Check if bot can send messages to admin chat

4. **High memory usage**
   - Clear old errors with `/debug` → "Clear Errors"
   - Check error history size limit

### Debug Steps

1. Check system status: `/debug` → "System Status"
2. Review recent errors: `/debug` → "Recent Errors"  
3. Check configuration: `/debug` → "Configuration"
4. Export debug info: `/debug` → "Export Debug Info"
5. Test error handling: `/debug` → "Test Error"

## Future Enhancements

Planned improvements include:
- Webhook integration for external monitoring systems
- Machine learning-based error prediction
- Automated error resolution for common issues
- Enhanced performance profiling
- Real-time dashboard for error monitoring
- Integration with popular monitoring services (Prometheus, Grafana)

## Support

For questions or issues with the error handling system:

1. Check this documentation
2. Review log files in the `logs/` directory
3. Use the debug interface (`/debug`)
4. Run the test suite (`python3 test_error_handling.py`)
5. Check the error history in `logs/error_history.json`