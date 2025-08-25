# 🚀 Staging Deployment & Validation Guide

## Overview

This guide provides step-by-step instructions for deploying the codebase optimization changes to staging and validating the improvements.

## Prerequisites

- [ ] PR #1 reviewed and approved
- [ ] All critical lint errors resolved (✅ Done)
- [ ] Build compilation successful (✅ Done)
- [ ] Core test suite passing (✅ 95/99 tests pass)

## 🔧 Staging Environment Setup

### 1. Environment Configuration

Create or update staging environment variables:

```bash
# Copy production .env and modify for staging
cp .env .env.staging

# Update staging-specific values
NODE_ENV=staging
API_BASE_URL=https://staging-api.myfilterbot.com
BOT_TOKEN=<staging_bot_token>
ADMIN_CHAT_ID=<staging_admin_chat>

# Database paths for staging
CUSTOMER_DATABASE_PATH=./data/staging_customer_database.json
CHAT_TRACKER_DB=./data/staging_chat_tracker.db
```

### 2. Deploy Feature Branch

```bash
# Switch to feature branch
git checkout feature/codebase-optimization-v2.1

# Install dependencies
bun install
pip install -r config/requirements_portal_integration.txt

# Build optimized assets
bun run build

# Verify configuration loading
bun run config:test
```

### 3. Database Migration (if needed)

```bash
# Backup existing staging data
cp data/customer_database.json data/customer_database.backup.json
cp data/chat_tracker.db data/chat_tracker.backup.db

# Run any necessary migrations
python3 src/bot/database.py --migrate
```

## 🧪 Validation Checklist

### Build & Compilation Validation

- [x] **TypeScript Build**: `bun run build` completes successfully
- [x] **Python Compilation**: `python3 -m py_compile src/bot/main.py` passes
- [x] **Lint Status**: Critical errors resolved (175 issues remaining, mostly warnings)
- [x] **Import Standardization**: 35 files processed successfully

### Functional Testing

#### Bot Commands Testing
```bash
# Start the bot in staging mode
NODE_ENV=staging python3 src/bot/main.py

# Test core commands:
# /start - Bot initialization
# /balance - Customer balance retrieval
# /register - New customer registration
# /help - Command documentation
```

#### API Endpoints Testing
```bash
# Start admin portal
bun run admin:dev

# Test endpoints:
curl -H "X-Customer-ID: BB1042" http://localhost:3003/api/customer/balance
curl -H "X-Admin-ID: admin123" http://localhost:3003/api/admin/stats
curl http://localhost:3003/health
```

#### Web Portal Testing
```bash
# Start development server
bun run dev

# Verify:
# - Dashboard loads at http://localhost:3006
# - Customer portal accessible
# - Admin portal functional
# - CSS/Tailwind processing working
```

### Configuration Testing

#### Centralized Constants Validation
```python
# Test Python constants
python3 -c "
from config.app_constants import TIMEOUT_CONFIG, THRESHOLD_CONFIG
print(f'Session timeout: {TIMEOUT_CONFIG.SESSION_TIMEOUT}')
print(f'Max retries: {THRESHOLD_CONFIG.MAX_REQUESTS_PER_WINDOW}')
"
```

```typescript
// Test TypeScript constants
bun -e "
import { TIMEOUT_CONFIG, THRESHOLD_CONFIG } from './config/app_constants';
console.log('Session timeout:', TIMEOUT_CONFIG.SESSION_TIMEOUT);
console.log('Max retries:', THRESHOLD_CONFIG.MAX_REQUESTS_PER_WINDOW);
"
```

#### Environment Override Testing
```bash
# Test environment variable overrides
LOW_BALANCE_THRESHOLD=50 python3 -c "
from config.app_constants import THRESHOLD_CONFIG
print(f'Low balance threshold: {THRESHOLD_CONFIG.LOW_BALANCE_THRESHOLD}')
"
```

### Error Handling Testing

#### Standardized Error Handler
```typescript
// Test new error handling
bun -e "
import { withErrorHandling } from './src/utils/standardized_error_handler';

const result = await withErrorHandling(
  async () => { throw new Error('Test error'); },
  { operation: 'test', userId: 'test123' },
  { maxAttempts: 2 }
);

console.log('Error handling result:', result);
"
```

#### Rate Limiting Validation
```bash
# Test rate limiting with multiple requests
for i in {1..10}; do
  curl -H "X-Customer-ID: BB1042" http://localhost:3003/api/customer/balance &
done
wait
```

## 📊 Performance Baseline Collection

### Response Time Metrics
```bash
# API response times
curl -w "@curl-format.txt" -H "X-Customer-ID: BB1042" \
  http://localhost:3003/api/customer/balance

# Bot command response times
time python3 -c "
import asyncio
from src.bot.handlers.handlers import FantdevBotHandlers
# Simulate command processing
"
```

### Memory Usage Monitoring
```bash
# Monitor memory usage during operation
ps aux | grep -E "(python|bun)" | awk '{print $4, $11}'

# Monitor worker pool utilization
bun run monitor:workers
```

### Error Rate Tracking
```bash
# Check error logs for patterns
tail -f logs/error.log | grep -E "(ERROR|CRITICAL)"

# Monitor error classification
grep -c "ErrorCategory" logs/application.log
```

## 🔍 Regression Testing

### Critical Path Testing
1. **Customer Registration Flow**
   - New customer signup
   - Balance initialization
   - First transaction detection

2. **Transaction Processing**
   - Deposit detection and processing
   - Withdrawal validation
   - Balance updates

3. **Admin Operations**
   - Customer management
   - System statistics
   - Error monitoring

### Integration Testing
```bash
# Run integration test suite
bun test src/test/analytics-dashboard.test.ts
python3 -m pytest tests/python/smoke_test.py -v
```

## 🚨 Rollback Plan

If issues are detected:

### Immediate Rollback
```bash
# Switch back to main branch
git checkout main

# Restart services
pkill -f "python.*main.py"
pkill -f "bun.*admin"

# Restore database backups
cp data/customer_database.backup.json data/customer_database.json
cp data/chat_tracker.backup.db data/chat_tracker.db

# Restart with stable version
python3 src/bot/main.py &
bun run admin:prod &
```

### Partial Rollback Options
- Disable new error handling: Set `USE_LEGACY_ERROR_HANDLING=true`
- Revert to hardcoded constants: Set `USE_LEGACY_CONFIG=true`
- Disable rate limiting: Set `DISABLE_RATE_LIMITING=true`

## ✅ Success Criteria

### Deployment Success Indicators
- [ ] All services start without errors
- [ ] Bot responds to commands within 2 seconds
- [ ] API endpoints return valid responses
- [ ] Web portals load and function correctly
- [ ] No critical errors in logs for 30 minutes

### Performance Improvements
- [ ] API response times ≤ previous baseline
- [ ] Memory usage stable or improved
- [ ] Error rates ≤ previous baseline
- [ ] Configuration loading < 100ms

### Feature Validation
- [ ] Centralized configuration working
- [ ] Error handling with retry logic functional
- [ ] Rate limiting protecting endpoints
- [ ] Type annotations improving IDE experience

## 📋 Post-Deployment Tasks

1. **Monitor for 24 hours**
   - Check error logs hourly
   - Monitor performance metrics
   - Validate customer transactions

2. **Collect baseline metrics**
   - Document response times
   - Record memory usage patterns
   - Track error rates by category

3. **Update documentation**
   - Record any deployment issues
   - Update configuration guides
   - Document performance improvements

## 🔗 Related Documentation

- [Configuration Management Guide](./CONFIGURATION_GUIDE.md)
- [Error Handling Patterns](./ERROR_HANDLING_GUIDE.md)
- [Performance Monitoring](./PERFORMANCE_MONITORING.md)
- [Rollback Procedures](./ROLLBACK_PROCEDURES.md)

---

**Note**: This deployment represents a major architectural improvement. Take time to validate each component thoroughly before proceeding to production.
