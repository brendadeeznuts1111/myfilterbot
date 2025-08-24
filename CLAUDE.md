# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Fantdev Trading Bot - an enterprise-grade Telegram trading platform with web portals, real-time monitoring, and automated reporting capabilities. The system uses Python for the bot core and TypeScript/Bun for high-performance web services.

## Commands

### Core Bot Operations
```bash
# Main bot (requires BOT_TOKEN in config or env)
python3 main_bot.py

# Integrated system (bot + portal)
python3 run_integrated_system.py

# Auto-reporter for scheduled tasks
python3 auto_reporter.py
```

### Portal Servers
```bash
# Python Flask servers
python3 portal_server.py                  # Basic portal (port 5000)
python3 enhanced_portal_server.py         # Enhanced portal (port 5001)
python3 enhanced_portal_server_integrated.py  # Integrated portal

# TypeScript/Bun servers (requires Bun runtime)
bun run admin_portal_server.ts           # Admin server (port 3003)
bun run enhanced_admin_server.ts         # Enhanced admin server
bun run enhanced_admin_server_v2.ts      # V2 with improvements
```

### Development & Building
```bash
# Install dependencies
pip install -r requirements_portal_integration.txt
bun install

# Development mode
bun dev                    # React dev server with hot reload
bun --hot src/index.tsx   # Direct hot reload

# Build production
bun run build             # Build React app
bun run build.ts          # Build with options (use --help for details)

# Cloudflare Worker commands
bun run worker:dev        # Development mode
bun run worker:deploy     # Deploy to production
bun run worker:tail       # View logs
```

### Testing
```bash
# Python tests
python3 test_integration.py               # Core integration tests
python3 test_enhanced_integration.py      # Enhanced system tests
python3 test_error_handling.py           # Error handling system
python3 test_telegram_dashboard.py       # Dashboard integration
python3 test_chat_system.py              # Chat management tests

# TypeScript tests
bun test                                  # Run all tests
bun test src/web_analysis.test.ts       # Specific test file
```

### Utilities & Scripts
```bash
# Generate test data
python3 generate_2000_customers.py       # Create test customer data

# System health checks
python3 health_check.py                  # Check system status
python3 show_all_clients.py             # Display client information

# Performance testing
bash run_and_benchmark.sh                # Run benchmarks
```

## Architecture

### Core Components

1. **Bot Core** (`main_bot.py` + `src/`)
   - Entry point with modular handler system
   - Transaction detection via regex patterns
   - Customer management with JSON database
   - Real-time forwarding to admin chat
   - Error tracking and debug interface

2. **Data Layer**
   - `customer_database.json` - Primary customer data (balance, P&L, groups)
   - `chat_tracker.db` - SQLite for chat tracking
   - `group_monitor.db` - SQLite for group monitoring
   - Automatic backups before saves

3. **Web Services**
   - Flask API servers for portal backends
   - TypeScript/Bun admin servers with worker threads
   - WebSocket support for real-time updates
   - React components with Tailwind CSS

4. **Worker System** (Bun v1.2.21+ optimized)
   - `src/admin_portal_worker_thread.ts` - Admin operations
   - `src/report_worker.ts` - Report generation
   - `src/websocket_worker.ts` - WebSocket handling
   - 500x faster postMessage() for large JSON payloads

### Key Patterns

- **Handler Decorators**: Error tracking wrapper for all bot handlers
- **Rate Limiting**: Built-in spam protection
- **Transaction Patterns**: Configurable regex in `src/config.py`
- **Worker Threads**: CPU-intensive tasks in background
- **Real-time Processing**: WebSocket + worker threads for instant updates

## Configuration

### Environment Variables
Create `.env` from `.env.example`:
```bash
BOT_TOKEN=your_telegram_bot_token
ADMIN_CHAT_ID=your_admin_chat_id
DATABASE_PATH=customer_database.json
PORTAL_SERVER_PORT=5000
ADMIN_SERVER_PORT=3003
```

### Key Config Files
- `src/config.py` - Bot configuration and patterns
- `bunfig.toml` - Bun runtime configuration
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables (create from .env.example)

### Bot Settings (src/config.py)
- Token: BOT_TOKEN env var or hardcoded
- Admin Chat: ADMIN_CHAT_ID env var or `-2714719687`
- Thresholds: Low balance, large transactions, inactive days
- Feature flags: Auto-balance, alerts, analytics

## Key Implementation Details

### Transaction Detection Flow
1. Message received → `handlers.process_message()`
2. Pattern matching via `utils.detect_transaction()`
3. Customer lookup in database
4. Balance update if enabled
5. Alert forwarding to admin

### Customer Management
- Registration: `/register <id> <password>`
- Data: ID, password, balance, P&L, telegram_id
- Group members tracked per customer
- Admin portal for management

### Error Handling System
- Centralized tracking in `src/error_handler.py`
- Debug interface via `/debug` command
- Structured logging in `logs/`
- Admin notifications for critical errors
- Error categorization and severity levels

### Performance Optimizations
- Bun worker threads for heavy operations
- 500x faster string transfer for JSON
- WebSocket batching for updates
- SQLite for persistent tracking
- Priority queuing for tasks

## Development Workflow

### Adding New Features
1. Check existing patterns in similar files
2. Follow the handler pattern for bot commands
3. Use error decorators for automatic tracking
4. Add tests for new functionality
5. Update documentation if needed

### Testing Changes
1. Run relevant test files
2. Check error logs in `logs/`
3. Test with real Telegram messages
4. Verify portal integration
5. Monitor worker thread performance

### Debugging
- Use `/debug` command for interactive debugging
- Check `logs/error.log` for issues
- Monitor `logs/debug.log` for detailed traces
- Use `test_error_handling.py` for error simulation

## Important Notes

### Current State
- Multiple server implementations (Python Flask + TypeScript/Bun)
- Worker system leverages Bun's optimized postMessage()
- Comprehensive error handling and debugging tools
- Real-time WebSocket integration for instant updates

### Dependencies
- Core: `python-telegram-bot>=20.0`
- Web: `flask`, `flask-cors`, `flask-socketio`
- Scheduling: `schedule`
- TypeScript: Bun runtime required
- See `requirements_portal_integration.txt` for full Python deps

### Testing Approach
- Python tests use standard unittest/pytest patterns
- TypeScript tests run with `bun test`
- Integration tests cover bot + portal interaction
- Error handling has dedicated test suite