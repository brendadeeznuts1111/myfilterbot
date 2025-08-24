# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Fantdev Trading Bot - an enterprise-grade Telegram trading platform with web portals, real-time monitoring, and automated reporting. The system uses Python for the bot core and TypeScript/Bun for high-performance web services.

## 🚀 Bun Runtime (Required)

### Why Bun?
This project leverages Bun v1.2.21+ for critical performance optimizations:
- **500x faster postMessage()** for worker threads handling large JSON payloads
- **Built-in TypeScript** execution without transpilation
- **Native JSX/TSX** support for React components
- **Automatic ETag** generation for HTTP caching (v1.2.20+)
- **40x faster AbortSignal** for improved timeout handling
- **Built-in test runner** with watch mode
- **Package manager** that's 10-100x faster than npm

### Installing Bun
```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (WSL required)
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version  # Should be 1.2.21 or higher
```

### Bun-Specific Features Used

#### 1. Bun.serve() for HTTP Servers
```typescript
// Native HTTP server with automatic ETag support
const server = Bun.serve({
  port: 3003,
  development: true,  // Enables hot reload
  fetch(req) { /* handler */ }
});
```

#### 2. Bun.env for Environment Variables
```typescript
// Type-safe environment variables
import { config } from './src/env.config';
const token = Bun.env.BOT_TOKEN;  // Direct access
```

#### 3. Worker Threads with Optimized postMessage()
```typescript
// 500x faster for large JSON transfers
new Worker('./src/admin_portal_worker_thread.ts');
```

#### 4. Built-in Testing
```bash
bun test                    # Run all tests
bun test --watch           # Watch mode
bun test --coverage        # Coverage report
```

#### 5. Bun-Specific Configuration (bunfig.toml)
```toml
[serve.static]
plugins = ["bun-plugin-tailwind"]
env = "BUN_PUBLIC_*"

[test]
coveragePathIgnorePatterns = [
  "**/__tests__/**",
  "**/test_*.py",
  "**/backup/**",
  "**/cloudflare-worker/dist/**"
]

[worker]
env = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "BOT_TOKEN",
  "ADMIN_CHAT_ID",
  "WEBHOOK_SECRET"
]

[worker.build]
target = "browser"
format = "esm"
minify = true
sourcemap = "linked"
```

#### 6. Performance Benchmarks (Bun vs Node.js)
- **Package Installation**: 10-100x faster than npm
- **Cold Starts**: 4x faster than Node.js
- **JSON Parsing**: 3-4x faster for large payloads
- **Worker postMessage()**: 500x faster for strings (v1.2.21+)
- **HTTP Serving**: 2-3x faster than Express
- **TypeScript Execution**: No transpilation needed

#### 7. Bun-Specific Files in Project
```
bunfig.toml          # Bun configuration
build.ts             # Custom build script with Bun APIs
bun.lock             # Lock file (faster than package-lock.json)
src/env.config.ts    # Environment config using Bun.env
*.worker.ts          # Worker threads optimized for Bun
```

#### 6. Enhanced ReadableStream (v1.2.21+)
```typescript
// Direct stream consumption (NEW)
const {stdout} = Bun.spawn({cmd: ["python3", "script.py"], stdout: "pipe"});
const data = await stdout.json();  // No Response wrapper needed

// Old pattern (replaced)
const data = await new Response(stdout).json();
const text = await Bun.readableStreamToText(stdout);
```

## ⚠️ Critical Security Notes

- **Bot Token**: Currently hardcoded in `src/config.py:12` - use environment variable in production
- **JWT Secrets**: Default secrets in portal servers need changing before deployment
- **Security Module**: `SECURITY_FIX_duplicate_passwords.py` handles registration security
- **Admin Chat ID**: `-2714719687` hardcoded - should be environment variable

## Commands

### Core Bot Operations
```bash
# Main bot (requires BOT_TOKEN in config or env)
python3 main_bot.py

# Integrated system (bot + portal together)
python3 run_integrated_system.py

# Auto-reporter for scheduled tasks
python3 auto_reporter.py
```

### Portal Servers (Multiple Implementations)

#### Python Flask Servers
```bash
python3 portal_server.py                      # Basic portal (port 5000)
python3 enhanced_portal_server.py             # Enhanced with WebSocket (port 5001)
python3 enhanced_portal_server_integrated.py  # Full integration version
```

#### TypeScript/Bun Servers
```bash
bun run admin_portal_server.ts               # Admin server (port 3002)
bun run enhanced_admin_server.ts             # Enhanced admin (port 3003)
bun run enhanced_admin_server_v2.ts          # V2 improvements
```

### Development & Building

#### Bun Commands
```bash
# Install dependencies (10-100x faster than npm)
bun install
bun add package-name         # Add new package
bun remove package-name      # Remove package
bun update                   # Update all packages

# Development mode
bun dev                      # React dev server with hot reload
bun --hot src/index.tsx     # Direct hot reload (watches file changes)
bun --watch src/server.ts   # Auto-restart on changes

# Run TypeScript directly (no build needed)
bun run admin_portal_server.ts
bun run src/any-file.ts

# Build production
bun run build               # Build React app
bun run build.ts --help     # See all build options
bun build ./src/index.tsx --outdir=./dist --minify

# Cloudflare Worker
bun run worker:dev          # Development mode
bun run worker:deploy       # Deploy to production
bun run worker:tail         # View logs
bun run worker:build        # Build for Cloudflare

# Bundle analyzer
bun build src/index.tsx --analyze
```

#### Python Setup
```bash
# Install Python dependencies
pip install -r requirements_portal_integration.txt
```

### Testing

#### Bun Testing (Built-in Test Runner)
```bash
# Run all tests (native runner, no jest needed)
bun test                                  # All tests
bun test --watch                         # Watch mode
bun test --coverage                      # Coverage report
bun test src/web_analysis.test.ts       # Specific test file
bun test --timeout 10000                # Custom timeout

# Test with specific patterns
bun test --match "API"                   # Run tests matching pattern
bun test --bail                          # Stop on first failure
```

#### Python Tests
```bash
python3 test_integration.py               # Core integration tests
python3 test_enhanced_integration.py      # Enhanced system tests
python3 test_error_handling.py           # Error handling system
python3 test_telegram_dashboard.py       # Dashboard integration
python3 test_chat_system.py              # Chat management tests
```

#### Performance Testing
```bash
bash run_and_benchmark.sh                # Run performance benchmarks
```

### Debugging & Monitoring
```bash
# Interactive debugging (in Telegram)
/debug                    # Admin-only debug interface

# Health checks
python3 health_check.py                  # System status check
python3 show_all_clients.py             # Display all clients

# Generate test data
python3 generate_2000_customers.py      # Create test customers
```

## Architecture

### Multi-Server Architecture

| Server | Port | Purpose | Technology | Runtime |
|--------|------|---------|------------|---------|
| portal_server.py | 5000 | Basic API | Flask | Python |
| enhanced_portal_server.py | 5001 | WebSocket + API | Flask-SocketIO | Python |
| admin_portal_server.ts | 3002 | Admin UI | Bun.serve + Static HTML | Bun |
| enhanced_admin_server.ts | 3003 | Enhanced Admin | Bun.serve + Mock Data | Bun |
| WebSocket Server | 3004 | Real-time updates | SocketIO | Python |
| Cloudflare Worker | 8787 | Edge computing | Hono Framework | Bun/Cloudflare |

### Bun-Powered Components

#### HTTP Servers
- **Native Performance**: Bun.serve() provides faster HTTP handling than Node.js
- **Automatic ETag**: Built-in caching headers (v1.2.20+)
- **Hot Reload**: Development mode automatically restarts on changes
- **Static Assets**: Integrated static file serving with plugins

#### Worker Threads
- **500x Faster postMessage()**: Large JSON transfers optimized in v1.2.21+
- **Priority Queuing**: Admin tasks processed with high/medium/low priority
- **Memory Efficient**: 22x less memory usage for multi-threaded operations
- **Background Processing**: CPU-intensive tasks don't block main thread

### Core Components

1. **Bot Core** (`main_bot.py` + `src/`)
   - Entry point with modular handler system
   - Transaction detection via configurable regex patterns
   - Error handling decorators on all handlers
   - Debug interface via `/debug` command
   - Rate limiting built into message processing

2. **Database Layer** (Dual System)
   - **JSON Database** (`customer_database.json`)
     - Customer data, balances, P&L tracking
     - Automatic backup before saves
     - In-memory with file persistence
   - **SQLite Databases**
     - `chat_tracker.db` - All chats/groups with shortlinks
     - `group_monitor.db` - Group monitoring data
     - Durable storage with row factories

3. **Handler System** (`src/handlers.py`)
   - Decorator pattern: `@error_handler_decorator(category, severity)`
   - InlineKeyboard menus for user interaction
   - Secure registration via `SecureRegistrationSystem`
   - Portal integration for real-time updates

4. **Error Handling System**
   - **Categories**: DATABASE, TELEGRAM, API, NETWORK, VALIDATION, PERMISSION, CONFIGURATION, TRANSACTION
   - **Severities**: CRITICAL, HIGH, MEDIUM, LOW, INFO
   - **Features**: Unique error IDs, admin notifications, history persistence
   - **Debug Commands**: `/debug` opens interactive debugging interface

5. **Worker System** (Bun v1.2.21+ optimized)
   - `admin_portal_worker_thread.ts` - Priority queue processing
   - `report_worker.ts` - Background report generation
   - `websocket_worker.ts` - Message batching
   - 500x faster postMessage() for JSON payloads

6. **Telegram Dashboard** (`src/telegram_dashboard/`)
   - `message_streamer.py` - Real-time message callbacks
   - `group_monitor.py` - SQLite-backed group tracking
   - `bot_status.py` - Health metrics and monitoring
   - `admin_interface.py` - Bulk operations interface

7. **React Components** (`src/components/`)
   - 21 production components with TypeScript
   - Dark/light theme support
   - Mobile responsive design
   - Components: AdminPanel, Dashboard, CustomerPortal, MemberManagement, NotificationSystem, etc.

### Data Models

#### Customer Model
```python
@dataclass
class Customer:
    customer_id: str
    password: str
    balance: float
    weekly_pnl: float
    telegram_id: Optional[int]
    telegram_username: Optional[str]
    active: bool
    last_activity: Optional[str]
```

#### GroupMember Model
```python
@dataclass
class GroupMember:
    member_id: str
    telegram_id: int
    username: str
    group_id: int
    status: str  # pending, approved, denied, restricted
    permissions: Dict  # can_view, can_trade, can_withdraw, daily_limit
```

## Configuration

### Environment Variables (.env)
```bash
# Critical - Must Set
BOT_TOKEN=your_telegram_bot_token
ADMIN_CHAT_ID=your_admin_chat_id
JWT_SECRET=change_this_in_production
SESSION_SECRET=change_this_in_production

# Database Paths
DATABASE_PATH=customer_database.json
CHAT_TRACKER_DB=chat_tracker.db
GROUP_MONITOR_DB=group_monitor.db

# Server Ports
PORTAL_SERVER_PORT=5000
ADMIN_SERVER_PORT=3003
WS_PORT=3004

# Feature Flags
ENABLE_WEBSOCKET=true
ENABLE_AUTO_REPORTER=true
ENABLE_ERROR_TRACKING=true
ENABLE_WORKER_THREADS=true
```

### Bot Configuration (`src/config.py`)
```python
# Transaction Detection Patterns
PATTERNS = {
    'deposit': {
        'patterns': [r'\[credited!\]', r'\bcredited\b', ...],
        'confidence': 0.8
    },
    'withdrawal': {...},
    'denial': {...}
}

# Thresholds
low_balance_threshold = 100
large_deposit_threshold = 1000
inactive_days_threshold = 3
```

## Stream Utilities (Bun v1.2.21+)

### Stream Helpers (`src/utils/stream-helpers.ts`)
- **Enhanced fetch operations** with direct stream consumption
- **Performance monitoring** with built-in timing
- **Error handling** with structured results
- **Benchmark utilities** for performance comparison

```typescript
// Enhanced fetch with stream optimization
import { fetchJSON } from '../utils/stream-helpers';

const result = await fetchJSON<APIResponse>('/api/data');
if (result.success) {
  console.log(`Fetched in ${result.duration}ms:`, result.data);
}
```

### Spawn Utilities (`src/utils/spawn-utils.ts`)
- **Python script execution** with JSON/text output
- **System operations** (health checks, database stats)
- **Batch operations** for multiple commands
- **Performance tracking** for all operations

```typescript
// Execute Python scripts with direct stream consumption
import { SystemOperations } from '../utils/spawn-utils';

const health = await SystemOperations.getHealthStatus();
const clients = await SystemOperations.getAllClients();
```

### Worker Thread Integration
- **Enhanced admin portal worker** with spawn capabilities
- **New task types**: SYSTEM_HEALTH, DATABASE_STATS, BOT_STATUS, RUN_TESTS
- **Background operations** without blocking main thread
- **Performance optimization** with 500x faster postMessage

## Key Implementation Patterns

### Transaction Detection Flow
1. Message received → `handlers.process_message()`
2. Transaction detection via `utils.detect_transaction()`
   - Regex pattern matching (configurable)
   - Confidence scoring based on matches
   - Amount extraction from text
3. Customer identification through database
4. Balance update if `auto_balance_update` enabled
5. Portal notification via `portal_integration.send_transaction_update()`
6. WebSocket emit for real-time updates
7. Admin chat forwarding with formatted alert

### Error Handling Pattern
```python
@error_handler_decorator(ErrorCategory.DATABASE, ErrorSeverity.MEDIUM)
async def database_operation(self, update, context):
    try:
        # Operation code
    except Exception as e:
        # Automatically logged, categorized, and admin notified if severe
        raise
```

### WebSocket Integration
```python
# Server side (Flask-SocketIO)
def on_new_message(message_data):
    socketio.emit('telegram_message', message_data, namespace='/telegram')

telegram_streamer.subscribe(on_new_message)

# Client side (React)
socket.on('telegram_message', (data) => {
    updateMessageFeed(data);
});
```

### Worker Thread Pattern
```typescript
// High-performance data transfer
parentPort.on('message', (task: AdminTask) => {
    // Process large JSON with 500x faster postMessage
    const result = processLargeDataset(task.data);
    parentPort.postMessage(result); // Optimized in Bun v1.2.21+
});
```

## Development Workflow

### Adding New Features
1. Check existing patterns in similar files
2. Follow handler decorator pattern for bot commands
3. Add to appropriate server (Python for bot logic, TypeScript for UI)
4. Use error decorators for automatic tracking
5. Add tests matching existing patterns
6. Update portal integration if needed

### Common Tasks

#### Adding a New Bot Command
1. Add handler in `src/handlers.py`
2. Use decorator: `@error_handler_decorator(category, severity)`
3. Register in `main_bot.py` setup
4. Add portal integration if needed

#### Adding API Endpoint
1. Choose server based on purpose
2. Add CORS headers for cross-origin
3. Integrate with database layer
4. Emit WebSocket events for real-time updates

#### Debugging Issues
1. Check `/debug` command output
2. Review `logs/error_*.log` files
3. Check `logs/debug_*.log` for traces
4. Use `test_error_handling.py` for simulation

## Important Notes

### Current Limitations
- Multiple server implementations can conflict on ports
- Mock data in TypeScript servers (not connected to real DB)
- Some endpoints return static responses
- WebSocket integration incomplete in some servers

### Performance Considerations
- Bun worker threads handle large JSON efficiently
- SQLite for persistent data, JSON for in-memory
- Rate limiting prevents spam
- Automatic backups impact save performance

### Security Considerations
- Change all default secrets before production
- Use environment variables for sensitive data
- Implement proper authentication on all endpoints
- Validate all user inputs
- Never log sensitive information

### Testing Approach
- Python tests use unittest patterns
- TypeScript tests use Bun's test runner
- Integration tests cover bot + portal
- Mock data for isolated testing
- Error simulation for edge cases

## 🔧 Bun-Specific Troubleshooting

### Common Bun Issues

#### 1. Version Requirements
- **Minimum**: Bun v1.2.20 for automatic ETag support
- **Recommended**: Bun v1.2.21+ for 500x faster postMessage()
- **Check version**: `bun --version`
- **Update**: `bun upgrade`

#### 2. Worker Thread Performance
- Large JSON payloads (>1MB) benefit most from v1.2.21+
- Use `parentPort.postMessage(largeObject)` directly
- Avoid JSON.stringify/parse in worker threads
- Monitor memory usage with `process.memoryUsage()`

#### 3. Development Mode
- Use `bun --hot` for instant restarts on file changes
- Use `bun dev` for React development server
- Enable `development: true` in Bun.serve() for debugging

#### 4. TypeScript Issues
- No need for tsc or transpilation
- Direct execution: `bun run file.ts`
- tsconfig.json still used for IDE support
- Use `"type": "module"` in package.json

#### 5. Package Compatibility
- Most npm packages work with Bun
- Some native modules may need rebuilding
- Use `bun install --force` to rebuild if needed
- Check `bun.lock` for dependency conflicts

#### 6. Port Conflicts
- Multiple Bun servers can conflict on same port
- Check `lsof -i :3003` to see port usage
- Use different ports for different server implementations
- Environment variables for port configuration recommended

### Bun Performance Tips

#### 1. Use Native APIs
```typescript
// Prefer Bun.serve() over Express
const server = Bun.serve({ port: 3003, fetch });

// Prefer Bun.file() over fs
const file = Bun.file("./data.json");
const data = await file.json();

// Prefer Bun.spawn() over child_process
const proc = Bun.spawn(["python3", "script.py"]);
```

#### 2. Worker Thread Optimization
```typescript
// Efficient for large data transfers
parentPort.postMessage(bigJSONObject);  // 500x faster in v1.2.21+

// Use priority queuing
if (task.priority === 'high') {
  taskQueue.unshift(task);  // High priority first
}
```

#### 3. Testing Performance
```bash
# Run tests with timing
bun test --verbose

# Profile memory usage
bun test --reporter=verbose --coverage

# Test specific patterns
bun test --match "performance"
```