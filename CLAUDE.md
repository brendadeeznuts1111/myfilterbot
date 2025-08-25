# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL SECURITY ISSUE

**Bot token is hardcoded in `src/config.py:12`** - This MUST be changed to use environment variables before any deployment:
```python
# Current (INSECURE):
token: str = "7555654864:AAE8ZsVnJbRK_41JZVMZAXDSCFstGRcxCY0"

# Should be:
token: str = os.getenv("BOT_TOKEN", "")
```

## Commands

### Core Operations
```bash
# Run the Telegram bot
python3 src/main_bot.py

# Run the admin server (TypeScript/Bun)
bun run src/enhanced_admin_server.ts

# Run integrated system (bot + portal)
python3 src/run_integrated_system.py
```

### Development & Testing
```bash
# Install dependencies
pip install -r config/requirements_portal_integration.txt
bun install

# Run tests
NODE_ENV=test bun test                    # All tests
NODE_ENV=test bun test --coverage        # With coverage
python3 src/test_integration.py          # Python integration tests

# Build production
bun run build

# Development mode
bun dev                                   # React dev server
bun --hot src/enhanced_admin_server.ts   # Hot reload server
```

### Cloudflare Worker
```bash
bun run worker:dev          # Development
bun run worker:deploy       # Deploy to production
bun run worker:kv:create    # Create KV namespace
```

## Architecture

### Three-Layer System

1. **Telegram Bot Layer** (`src/main_bot.py` + Python modules)
   - Handles bot commands and message processing
   - Transaction detection via regex patterns
   - Customer registration with security checks
   - Error handling with decorators

2. **API/Server Layer** (TypeScript/Bun servers)
   - `src/enhanced_admin_server.ts` (port 3003) - Admin dashboard
   - `src/api/` - High-performance API modules
   - Worker threads for background processing
   - 500x faster postMessage() with Bun v1.2.21+

3. **Data Layer**
   - `data/customer_database.json` - Customer data (JSON)
   - `chat_tracker.db` - Chat tracking (SQLite)
   - `group_monitor.db` - Group monitoring (SQLite)

### Key Modules

#### Bot Handlers (`src/handlers.py`)
- All bot commands use error decorator pattern:
```python
@error_handler_decorator(ErrorCategory.DATABASE, ErrorSeverity.MEDIUM)
async def balance_command(self, update, context):
    # Implementation
```

#### API Router (`src/api/router.ts`)
- Unified routing for all API endpoints
- Built-in rate limiting and CORS
- Authentication via headers

#### Worker Threads
- `src/admin_portal_worker_thread.ts` - Priority queue processing
- Leverages Bun's 500x faster postMessage() for large JSON

## Configuration

### Environment Variables
```bash
# Required (currently hardcoded - MUST fix!)
BOT_TOKEN=your_telegram_bot_token
ADMIN_CHAT_ID=-2714719687
JWT_SECRET=change_this_in_production

# Server ports
PORTAL_SERVER_PORT=5000
ADMIN_SERVER_PORT=3003
```

### Key Configuration Files
- `src/config.py` - Bot configuration (⚠️ contains hardcoded token)
- `config/customer_config.json` - Customer metadata
- `bunfig.toml` - Bun test and coverage configuration

## Common Development Tasks

### Adding a Bot Command
1. Add handler in `src/handlers.py`:
```python
@error_handler_decorator(ErrorCategory.TELEGRAM, ErrorSeverity.LOW)
async def my_command(self, update, context):
    # Implementation
```

2. Register in `src/main_bot.py`:
```python
commands = [
    ("mycommand", handlers.my_command),
    # ...
]
```

### Adding an API Endpoint
1. Create handler in appropriate `src/api/` module
2. Register in `src/api/router.ts`
3. Add TypeScript types in `src/shared/types.ts`

### Working with React Components
- Components in `src/components/`
- Use TypeScript for all new components
- Follow existing patterns (CustomerPortal.tsx, Dashboard.tsx)

## Transaction Detection

The bot detects transactions using regex patterns in `src/config.py`:
- Deposits: `[credited!]`, `deposit.*success`
- Withdrawals: `withdraw`, `sent.*\$?\d+`
- Denials: `denied`, `rejected`, `failed`

Patterns are configurable in `TransactionPatterns` class.

## Testing Strategy

### Bun Tests (TypeScript)
```bash
NODE_ENV=test bun test                           # All tests
NODE_ENV=test bun test src/test/analytics-dashboard.test.ts  # Specific test
```

### Python Tests
```bash
python3 src/test_integration.py                  # Integration tests
python3 src/test_enhanced_portal.py             # Portal tests
python3 src/test_telegram_dashboard.py          # Dashboard tests
```

## Security Considerations

1. **Fix hardcoded credentials immediately**:
   - Bot token in `src/config.py:12`
   - Admin chat ID in config
   - JWT secrets in server files

2. **Duplicate password handling**:
   - `src/SECURITY_FIX_duplicate_passwords.py` handles this
   - Admin verification required for duplicate passwords

3. **Authentication**:
   - JWT tokens for web authentication
   - Session management in `src/session_manager.py`

## Performance Optimizations

### Bun Runtime Benefits
- 500x faster worker postMessage() (v1.2.21+)
- Direct TypeScript execution without transpilation
- Built-in hot reload with `bun --hot`
- Automatic ETag generation for caching

### Worker Thread Pattern
```typescript
// Large JSON transfers optimized in Bun v1.2.21+
parentPort.postMessage(largeDataObject);  // 500x faster
```

## Important File Locations

### Entry Points
- `src/main_bot.py` - Main bot entry
- `src/enhanced_admin_server.ts` - Admin server
- `src/run_integrated_system.py` - Full system

### Configuration
- `src/config.py` - Bot config (⚠️ hardcoded token!)
- `bunfig.toml` - Bun configuration
- `cloudflare-worker/wrangler.toml` - Worker config

### Data Files
- `data/customer_database.json` - Customer data
- `chat_tracker.db` - Chat tracking
- `logs/` - Error and debug logs

## Debugging

### Bot Debugging
- Use `/debug` command in Telegram (admin only)
- Check `logs/errors_*.log` for errors
- Debug handler in `src/debug_handler.py`

### Server Debugging
```bash
bun --inspect src/enhanced_admin_server.ts  # Enable debugger
```

### Common Issues
1. **Bot not responding**: Check token in `src/config.py`
2. **Port conflicts**: Check if ports 3003, 5000 are in use
3. **Test failures**: Ensure `NODE_ENV=test` is set
4. **Worker errors**: Check Bun version is 1.2.21+