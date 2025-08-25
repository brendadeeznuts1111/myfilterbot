# 🛡️ Proactive Security Actions - Integration Guide

## Overview
The Proactive Security Actions system provides automated threat detection, response, and monitoring capabilities for the Fantdev Trading Platform. This system operates independently but integrates seamlessly with existing portals, notification systems, and bot infrastructure.

## Architecture Overview

### Core Components

1. **Security Engine** (`src/security/security_engine.py`)
   - Rule-based threat detection system
   - Automated response actions
   - Real-time event processing
   - Audit trail and logging

2. **Security API** (`src/api/security_api.py`)
   - REST endpoints for admin management
   - Real-time status monitoring
   - Manual override capabilities
   - Configuration management

3. **Security Dashboard** (`security_dashboard.html`)
   - Real-time security operations center
   - Visual threat level monitoring
   - Event and action tracking
   - Manual intervention controls

4. **Security Processor** (`src/security/security_processor.py`)
   - Integration layer for existing systems
   - Event analysis and pattern detection
   - Decorator-based monitoring

## Quick Start Integration

### 1. Initialize Security Engine

```python
# In your main application startup
from src.security.security_engine import initialize_security_engine
from services.notification_service import notification_service

# Initialize with notification integration
security_engine = await initialize_security_engine(notification_service)
```

### 2. Add Security API to Portal Server

```python
# In portal_server.py
from src.api.security_api import register_security_api

# Register security routes
register_security_api(app)
```

### 3. Monitor Login Attempts

```python
from src.security.security_processor import monitor_login, get_security_processor

@monitor_login
async def customer_login(customer_id, password, ip_address, user_agent):
    # Your existing login logic
    success = authenticate_customer(customer_id, password)
    return {'success': success}
```

### 4. Monitor Transactions

```python
from src.security.security_processor import monitor_transaction

@monitor_transaction
async def process_transaction(customer_id, transaction_data, ip_address=None):
    # Your existing transaction processing
    result = execute_transaction(transaction_data)
    return result
```

## Configuration

### Default Security Rules

The system comes with pre-configured rules:

- **Failed Login Burst**: 5 failed logins from same IP in 5 minutes → IP Block + Admin Alert
- **Suspicious Transactions**: 3 large transactions (>$10k) in 10 minutes → Account Freeze + Admin Alert
- **Rapid Transaction Sequence**: 10 transactions in 2 minutes → Rate Limit + Require 2FA
- **New Device Large Transaction**: >$5k transaction from device <1 hour old → Require 2FA + Admin Alert
- **Unusual IP Access**: Access from new geographic location → Admin Alert + Require 2FA

### Customizing Rules

```python
# Get security engine instance
engine = get_security_engine()

# Update rule thresholds
rule = engine.data_store.rules['failed_login_burst']
rule.conditions['count'] = 3  # Reduce to 3 failed attempts
rule.conditions['time_window_minutes'] = 3  # Reduce time window

# Enable/disable rules
rule.enabled = False  # Disable rule
```

## Data Sources & Detection

### Monitored Data Points

1. **Authentication Events**
   - Login attempts (success/failure)
   - Password changes
   - 2FA activations
   - Session activities

2. **Transaction Patterns**
   - Transaction amounts and frequency
   - Unusual timing patterns
   - Geographic inconsistencies
   - Account balance changes

3. **System Access**
   - IP address patterns
   - User agent analysis
   - Device fingerprinting
   - Admin actions

4. **Message Analysis**
   - Bot interaction patterns
   - Social engineering attempts
   - Unusual command usage

### Pattern Detection

The system uses multiple detection methods:

- **Statistical Analysis**: Deviation from normal patterns
- **Rule-Based Detection**: Configurable threshold violations
- **Pattern Matching**: Regex-based content analysis
- **Temporal Analysis**: Time-based sequence detection
- **Geographic Analysis**: IP location inconsistencies

## Automated Response Actions

### Available Actions

1. **Account Freeze** (`account_freeze`)
   - Temporarily disables customer account
   - Prevents all transactions and logins
   - Reversible through admin dashboard

2. **IP Blocking** (`ip_block`)
   - Blocks access from specific IP addresses
   - Configurable duration (default 1 hour)
   - Automatic expiration

3. **Rate Limiting** (`rate_limit`)
   - Throttles requests from specific sources
   - Configurable limits and windows
   - Per-customer or per-IP basis

4. **Require 2FA** (`require_2fa`)
   - Forces 2FA for next login
   - Enhanced security verification
   - Temporary security elevation

5. **Admin Alerts** (`alert_admin`)
   - Real-time notifications to administrators
   - Integrated with notification system
   - Escalation based on threat level

### Action Execution Flow

```
Event Detected → Rule Evaluation → Action Triggered → Notification Sent → Audit Logged
      ↓              ↓                ↓                  ↓               ↓
   Pattern      Threshold        Execute           Admin Alert    Security Log
   Analysis     Comparison       Response          Generated      Entry Created
```

## Notification Integration

### Admin Notifications

Security events automatically generate notifications through the existing notification system:

```python
await notification_service.create_notification(
    user_id="admin",
    user_type="admin", 
    notification_type="security_alert",
    priority="high",
    custom_title="🛡️ Security Alert: Failed Login Burst",
    custom_message="Automated security rule triggered for 192.168.1.100",
    metadata={
        'rule_id': 'failed_login_burst',
        'ip_address': '192.168.1.100',
        'severity': 'high',
        'actions_taken': ['ip_block', 'alert_admin']
    }
)
```

### Customer Notifications

When security actions affect customers:

```python
# Account freeze notification
await notification_service.create_notification(
    user_id=customer_id,
    user_type="customer",
    notification_type="security_action",
    priority="critical",
    custom_title="🔒 Account Security Action",
    custom_message="Your account has been temporarily frozen due to suspicious activity",
    metadata={
        'action_type': 'account_freeze',
        'reason': 'suspicious_transaction_pattern',
        'contact_support': True
    }
)
```

## Audit Trail

### Comprehensive Logging

Every security event and action is logged:

```json
{
    "timestamp": "2024-01-15T10:30:00Z",
    "event_id": "evt_123456",
    "event_type": "failed_login",
    "ip_address": "192.168.1.100",
    "customer_id": "CUST001",
    "action": "ip_block",
    "message": "Action executed: ip_block",
    "rule_id": "failed_login_burst",
    "severity": "high"
}
```

### Audit Access

```python
# Get recent audit entries
engine = get_security_engine()
audit_log = engine.get_audit_log(limit=100)

# Export audit data
audit_data = {
    'export_timestamp': datetime.now().isoformat(),
    'entries': audit_log,
    'summary': engine.get_security_status()
}
```

## Admin Dashboard Features

### Security Operations Center

The security dashboard (`security_dashboard.html`) provides:

- **Real-time Threat Level**: Visual threat assessment
- **Active Security Metrics**: Blocked IPs, frozen accounts, rate limits
- **Event Timeline**: Chronological security event display
- **Action History**: Automated and manual action tracking
- **Manual Controls**: Override and manual intervention tools

### Manual Override Capabilities

Administrators can manually:

1. Block/unblock IP addresses
2. Freeze/unfreeze customer accounts  
3. Clear rate limits
4. Enable/disable security rules
5. Adjust rule thresholds
6. Export security reports

### Real-time Updates

The dashboard connects via WebSocket for real-time updates:

```javascript
socket.on('security_event', (data) => {
    // Real-time security event notification
    handleSecurityEvent(data);
});

socket.on('security_action', (data) => {
    // Real-time action notification  
    handleSecurityAction(data);
});
```

## Testing & Validation

### Event Simulation

For testing purposes, the system includes event simulation:

```python
# Simulate security events (development only)
await security_engine.process_event({
    'event_type': 'failed_login',
    'customer_id': 'TEST001',
    'ip': '192.168.1.100',
    'user_agent': 'TestClient/1.0',
    'metadata': {'test': True},
    'severity': 'medium'
})
```

### API Testing

```bash
# Simulate failed login burst
curl -X POST http://localhost:5000/api/security/simulate-event \
  -H "Content-Type: application/json" \
  -H "X-Admin-ID: admin" \
  -H "X-Environment: development" \
  -d '{
    "event_type": "failed_login",
    "customer_id": "TEST001", 
    "ip_address": "192.168.1.100",
    "metadata": {"test_scenario": "burst_detection"}
  }'
```

## Security Best Practices

### Rule Configuration

- Start with conservative thresholds
- Monitor false positive rates
- Regularly review and adjust rules
- Test changes in staging environment

### Response Actions

- Implement graduated responses
- Provide clear customer communication
- Maintain manual override capabilities
- Document all automated actions

### Monitoring & Maintenance

- Regular audit log reviews
- Performance metric monitoring
- Rule effectiveness analysis
- System health checks

## Performance Considerations

### Memory Management

The system implements automatic cleanup:

- Event history: 7 days retention
- Audit logs: 10,000 entry limit
- IP blocks: 1 hour default expiration
- Rate limits: 30 minute default expiration

### Scalability

- In-memory data store for fast access
- Configurable retention policies  
- Background cleanup tasks
- Efficient pattern matching

### Resource Usage

- Minimal CPU overhead (~1-2%)
- Memory usage ~50-100MB typical
- Network traffic for notifications only
- Storage for audit logs

## Emergency Procedures

### System Disable

```python
# Emergency disable of all security rules
engine = get_security_engine()
for rule in engine.data_store.rules.values():
    rule.enabled = False
```

### Bulk Unblock

```python
# Clear all blocks (emergency only)
engine.data_store.blocked_ips.clear()
engine.data_store.frozen_accounts.clear()
engine.data_store.rate_limits.clear()
```

### Manual Investigation

Use the security dashboard's manual tools:
1. Review recent events
2. Check action history
3. Examine audit trail
4. Override automated actions if needed

## Integration Checklist

- [ ] Security engine initialized in application startup
- [ ] Security API registered with portal server
- [ ] Login monitoring decorators applied
- [ ] Transaction monitoring decorators applied
- [ ] Notification service integration configured
- [ ] Admin dashboard deployed and accessible
- [ ] Security rules reviewed and customized
- [ ] Testing performed with simulated events
- [ ] Emergency procedures documented
- [ ] Staff trained on security dashboard

This comprehensive security system provides robust, automated protection while maintaining administrative control and audit transparency.
