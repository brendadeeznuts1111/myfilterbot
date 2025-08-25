# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎉 CURRENT STATUS: ALL MAJOR ISSUES RESOLVED!

**The project is now in excellent condition with all critical issues fixed:**

✅ **TypeScript Configuration** - bun-types properly installed and configured  
✅ **Testing Infrastructure** - All JSON parsing, dev-server, and Python import issues resolved  
✅ **Code Quality** - ESLint/Prettier integration working  
✅ **Security** - Environment variables properly configured, no hardcoded credentials  
✅ **Performance** - Bun worker threads optimized, 500x faster postMessage  
✅ **Documentation** - Comprehensive and up-to-date guides  

## 🚀 Commands

### Core Operations
```bash
# Run the complete system (recommended)
bun run dev

# Run individual services
bun run dev:bot       # Python bot only
bun run dev:server    # Admin server only  
bun run dev:web       # React dev server only

# Run integrated system (bot + portal)
python3 src/run_integrated_system.py
```

### Development & Testing
```bash
# Install dependencies
pip install -r config/requirements_portal_integration.txt
bun install

# Run tests
bun test                    # All tests
bun test --coverage        # With coverage
bun run test:python        # Python tests only
bun run test:ts            # TypeScript tests only

# Build production
bun run build

# Development mode
bun run dev                # Start all services
bun --hot src/server/admin/index.ts   # Hot reload server
```

### Cloudflare Worker
```bash
bun run worker:dev          # Development
bun run worker:deploy       # Deploy to production
bun run worker:kv:create    # Create KV namespace
```

## 🏗️ Architecture

### Three-Layer System

1. **Telegram Bot Layer** (`src/bot/main.py` + Python modules)
   - Handles bot commands and message processing
   - Transaction detection via regex patterns
   - Customer registration with security checks
   - Error handling with decorators
   - **✅ Environment-based configuration working**

2. **API/Server Layer** (TypeScript/Bun servers)
   - `src/server/admin/index.ts` (port 3003) - Admin dashboard
   - `src/api/` - High-performance API modules
   - Worker threads for background processing
   - **✅ 500x faster postMessage() with Bun v1.2.21+ working**

3. **Data Layer**
   - `data/customer_database.json` - Customer data (JSON)
   - `chat_tracker.db` - Chat tracking (SQLite)
   - `group_monitor.db` - Group monitoring (SQLite)

### Key Modules

#### Bot Handlers (`src/bot/handlers/handlers.py`)
- All bot commands use error decorator pattern:
```python
@error_handler_decorator(ErrorCategory.DATABASE, ErrorSeverity.MEDIUM)
async def balance_command(self, update, context):
    # Implementation
```

#### API Router (`src/server/api/router.ts`)
- Unified routing for all API endpoints
- Built-in rate limiting and CORS
- Authentication via headers

#### Worker Threads
- `src/server/workers/admin_portal_worker_thread.ts` - Priority queue processing
- **✅ Leverages Bun's 500x faster postMessage() for large JSON working**

## ⚙️ Configuration

### Environment Variables
```bash
# ✅ All working with proper .env setup
BOT_TOKEN=your_telegram_bot_token
ADMIN_CHAT_ID=-2714719687
JWT_SECRET=change_this_in_production

# Server ports
PORTAL_SERVER_PORT=5000
ADMIN_SERVER_PORT=3003
DEV_SERVER_PORT=3000

# Performance settings
WORKER_POOL_SIZE=4
MAX_CONCURRENT_REQUESTS=50
CACHE_TTL=300
```

### Key Configuration Files
- `src/bot/config.py` - Bot configuration (✅ environment-based)
- `config/customer_config.json` - Customer metadata
- `bunfig.toml` - Bun test and coverage configuration
- `tsconfig.json` - TypeScript configuration (✅ bun-types working)

## 🔧 Common Development Tasks

### Adding a Bot Command
1. Add handler in `src/bot/handlers/handlers.py`:
```python
@error_handler_decorator(ErrorCategory.TELEGRAM, ErrorSeverity.LOW)
async def my_command(self, update, context):
    # Implementation
```

2. Register in `src/bot/main.py`:
```python
commands = [
    ("mycommand", handlers.my_command),
    # ...
]
```

### Adding an API Endpoint
1. Create handler in appropriate `src/server/api/` module
2. Register in `src/server/api/router.ts`
3. Add TypeScript types in `src/shared/types.ts`

### Working with React Components
- Components in `src/web/components/`
- Use TypeScript for all new components
- Follow existing patterns (CustomerPortal.tsx, Dashboard.tsx)

## 💰 Transaction Detection

The bot detects transactions using regex patterns in `src/bot/config.py`:
- Deposits: `[credited!]`, `deposit.*success`
- Withdrawals: `withdraw`, `sent.*\$?\d+`
- Denials: `denied`, `rejected`, `failed`

Patterns are configurable in `TransactionPatterns` class.

## 🧪 Testing Strategy

### Bun Tests (TypeScript)
```bash
# ✅ All working with proper configuration
bun test                           # All tests
bun test tests/typescript/web_analysis.test.ts  # Specific test
```

### Python Tests
```bash
# ✅ All working with proper imports and dotenv
python3 tests/python/test_integration.py        # Integration tests
python3 tests/python/test_enhanced_portal.py    # Portal tests
python3 tests/python/test_telegram_dashboard.py # Dashboard tests
```

## 🔒 Security Status

✅ **All security issues resolved**:
- No hardcoded credentials
- Environment variables properly configured
- JWT authentication working
- Rate limiting implemented
- Input validation active

### Duplicate Password Handling
- `src/bot/security/` handles this properly
- Admin verification required for duplicate passwords

### Authentication
- JWT tokens for web authentication working
- Session management in `src/session_manager_bun.ts` optimized

## ⚡ Performance Optimizations

### Bun Runtime Benefits (✅ All Working)
- **500x faster** worker postMessage() (v1.2.21+)
- **Direct TypeScript execution** without transpilation
- **Built-in hot reload** with `bun --hot`
- **Automatic ETag generation** for caching

### Worker Thread Pattern
```typescript
// ✅ Large JSON transfers optimized in Bun v1.2.21+
parentPort.postMessage(largeDataObject);  // 500x faster
```

## 📍 Important File Locations

### Entry Points
- `src/bot/main.py` - Main bot entry (✅ working)
- `src/server/admin/index.ts` - Admin server (✅ working)
- `src/run_integrated_system.py` - Full system (✅ working)

### Configuration
- `src/bot/config.py` - Bot config (✅ environment-based)
- `bunfig.toml` - Bun configuration (✅ optimized)
- `tsconfig.json` - TypeScript config (✅ bun-types working)

### Data Files
- `data/customer_database.json` - Customer data
- `chat_tracker.db` - Chat tracking
- `logs/` - Error and debug logs

## 🐛 Debugging

### Bot Debugging
- Use `/debug` command in Telegram (admin only)
- Check `logs/errors_*.log` for errors
- Debug handler in `src/bot/debug_handler.py`

### Server Debugging
```bash
# ✅ Working with proper TypeScript configuration
bun --inspect src/server/admin/index.ts  # Enable debugger
```

### Common Issues (✅ All Resolved)
1. **Bot not responding**: ✅ Environment variables working
2. **Port conflicts**: ✅ Proper port configuration in .env
3. **Test failures**: ✅ All tests passing with proper setup
4. **Worker errors**: ✅ Bun v1.2.21+ working correctly
5. **TypeScript errors**: ✅ bun-types properly configured

## 🆕 Recent Successes

### TypeScript Configuration (Latest)
- ✅ **Resolved bun-types configuration issue** - Successfully installed and configured
- ✅ **Fixed tsconfig.json** - Proper path aliases and type resolution  
- ✅ **Verified TypeScript compilation** - No more configuration errors

### Testing Infrastructure
- ✅ **Fixed JSON parsing errors** - Frontend now hits correct server endpoints
- ✅ **Refactored dev-server.ts** - Direct import vs. subprocess, proper lifecycle
- ✅ **Integrated Tailwind CSS** - React styling now works correctly
- ✅ **Fixed Python bot imports** - dotenv integration and functional verification
- ✅ **Comprehensive test suite** - 80% coverage requirement with proper CI/CD

### Code Quality & Development Experience
- ✅ **ESLint/Prettier integration** - Consistent code formatting and linting
- ✅ **CI/CD pipeline** - Automated testing, linting, and security scanning
- ✅ **Performance optimizations** - Bun worker threads, 500x faster postMessage
- ✅ **Security improvements** - Environment variables, JWT authentication, rate limiting

## 🎯 Current Development Focus

With all major issues resolved, the project is now ready for:

1. **Feature Development** - Add new bot commands, API endpoints, React components
2. **Performance Optimization** - Further worker thread optimizations
3. **Testing Expansion** - Add more comprehensive test coverage
4. **Documentation** - Keep guides updated as new features are added
5. **Deployment** - Production deployment with confidence

## 🚀 Getting Started

1. **Clone and setup**:
```bash
git clone <repository>
cd myfilterbot
cp .env.example .env
# Edit .env with your values
```

2. **Install dependencies**:
```bash
pip install -r config/requirements_portal_integration.txt
bun install
```

3. **Start development**:
```bash
bun run dev  # Start everything
```

4. **Verify setup**:
```bash
bun test     # All tests should pass
bunx tsc --noEmit  # No TypeScript errors
```

## 📚 Documentation

- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Complete migration guide
- [README.md](readme.md) - Project overview and setup
- [docs/](docs/) - Technical documentation

---

**Status: ✅ PRODUCTION READY** | Last Updated: December 2024 | All major issues resolved