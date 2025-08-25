# 🚀 Fantdev Trading Bot - Enterprise Trading Platform

![Version](https://img.shields.io/badge/version-2.2.0-blue)
![Python](https://img.shields.io/badge/python-3.8+-green)
![Bun](https://img.shields.io/badge/bun-1.2.20+-orange)
![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue)
![React](https://img.shields.io/badge/react-19+-cyan)
![License](https://img.shields.io/badge/license-MIT-purple)

A comprehensive, enterprise-grade Telegram trading bot platform with real-time monitoring, React-based admin dashboard, high-performance worker thread processing, and optimized caching architecture.

## 🌟 Key Features

### Core Trading Bot
- **Real-time Transaction Monitoring** - Automatic detection of deposits, withdrawals, and denials
- **Multi-Customer Support** - Manages 25+ customers with individual balance tracking
- **Smart Alerts** - Low balance warnings, large transaction notifications, inactive customer alerts
- **P&L Tracking** - Weekly profit/loss calculation and automated reporting
- **Pattern Recognition** - Advanced regex-based transaction detection
- **High-Performance Architecture** - Worker threads and optimized processing for scalable operations

### Telegram Dashboard Integration
- **Live Message Streaming** - Real-time message monitoring from all groups
- **Group Management** - Monitor and manage multiple Telegram groups/channels
- **Bot Health Monitoring** - CPU, memory, and performance metrics tracking
- **Administrative Controls** - Send messages, manage users, bulk operations
- **Analytics & Reporting** - Comprehensive statistics and trend analysis

### Web Portal System
- **React Admin Dashboard** - 23 production-ready React components
- **Customer Portal** - Self-service interface for customers
- **WebSocket Support** - Real-time updates without page refresh
- **Dark/Light Theme** - Modern UI with theme switching
- **Mobile Responsive** - Works seamlessly on all devices

### High-Performance Architecture
- **Worker Threads** - Leverages Bun's 500x faster postMessage()
- **Background Processing** - Non-blocking operations for heavy tasks
- **Priority Queue** - Intelligent task prioritization
- **SQLite Persistence** - Reliable data storage for monitoring
- **Auto-scaling** - Handles load spikes automatically
- **Optimized Processing** - Efficient data handling and caching

### User-Agent Customization
- **Bun CLI Integration** - Use `--user-agent` flag for custom HTTP headers
- **Service Identification** - Unique User-Agent strings for each service
- **API Rate Limiting** - Better control over external API requests
- **Monitoring & Debugging** - Easy identification of request sources

## 📦 Installation

### Prerequisites

- **Python 3.8+** - Core bot functionality
- **Bun 1.2.20+** - TypeScript runtime and package management
- **Telegram Bot Token** - From [@BotFather](https://t.me/botfather)
- **Admin Chat ID** - Your Telegram chat ID for admin notifications

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/brendadeeznuts1111/myfilterbot.git
cd myfilterbot

# 2. Copy environment configuration
cp config/env.example .env

# 3. Edit environment variables
nano .env  # Add your BOT_TOKEN and ADMIN_CHAT_ID

# 4. Install dependencies
pip install -r config/requirements_enhanced.txt
bun install

# 5. Start all services
bun run dev
```

### Detailed Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/brendadeeznuts1111/myfilterbot.git
   cd myfilterbot
   ```

2. **Set up environment variables:**
   ```bash
   # Copy the example environment file
   cp config/env.example .env

   # Edit with your actual values
   nano .env
   ```

3. **Install Python dependencies:**
   ```bash
   # Install all required packages
   pip install -r config/requirements_enhanced.txt
   ```

4. **Install Bun dependencies:**
   ```bash
   bun install
   ```

5. **Start the services:**
   ```bash
   # Start everything (recommended for development)
   bun run dev

   # Or start individual services:
   bun run dev:bot       # Bot only
   bun run dev:server    # Admin server only
   bun run dev:web       # React dev server only
   ```

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Fantdev Trading Platform                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  Telegram    │◄───│   Core Bot   │───►│   Database   │   │
│  │   Groups     │    │   Engine     │    │   (JSON)     │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         ▲                    │                    ▲           │
│         │                    ▼                    │           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  Telegram    │    │   WebSocket  │    │   Worker     │   │
│  │  Dashboard   │◄───│    Server    │───►│   Threads    │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         ▲                    │                    ▲           │
│         ▼                    │                    ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │    React     │◄───│   REST API   │───►│   Portal     │   │
│  │  Dashboard   │    │   Endpoints  │    │   Server     │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
myfilterbot/
├── src/                       # Core source code
│   ├── bot/                   # Python bot core
│   │   ├── main.py           # Bot entry point
│   │   ├── handlers/         # Command handlers
│   │   └── services/         # Bot services
│   ├── server/               # TypeScript server code
│   │   ├── admin/            # Admin server
│   │   ├── api/              # API endpoints
│   │   └── workers/          # Background processing
│   ├── web/                  # React web components
│   │   ├── components/       # Reusable React components
│   │   │   ├── analytics/    # Analytics charts and KPIs
│   │   │   ├── Dashboard.tsx # Main dashboard component
│   │   │   └── PerformanceMonitor.tsx
│   │   └── contexts/         # React contexts
│   ├── static/               # Static assets
│   │   ├── dashboard/        # Dashboard assets
│   │   └── logo.svg         # Brand assets
│   ├── lib/                  # Core libraries
│   │   ├── api-client.ts     # API client with rate limiting
│   │   ├── telegram-bridge.ts # Telegram integration
│   │   └── yaml-config.ts    # YAML configuration utilities
│   ├── utils/                # Utility functions
│   │   └── test-yaml.ts      # YAML testing utilities
│   └── services/             # Business logic services
│       ├── bun-sql-service.ts     # Native Bun.SQL integration
│       ├── bun-yaml-service.ts    # Native Bun YAML handling
│       ├── dashboard-config-service.ts # Dashboard configuration
│       ├── yaml-config-service.ts     # YAML configuration management
│       ├── cloudflare-client.ts       # Cloudflare Worker client
│       ├── cache-warming-service.ts   # Cache management
│       ├── multi-level-cache.ts       # Multi-level caching system
│       ├── performance-monitor.ts     # Performance monitoring
│       └── websocket-service.ts      # WebSocket communication
├── tests/                    # Automated test suites
│   ├── typescript/           # TypeScript unit tests
│   ├── python/               # Python bot tests
│   ├── integration/          # Integration tests
│   ├── e2e/                  # End-to-end tests
│   └── unit/                 # Additional unit tests
├── config/                   # Configuration files
│   ├── branding.json         # Brand configuration
│   └── requirements_enhanced.txt # Python dependencies
├── docs/                     # Comprehensive documentation
│   ├── BOT_SETUP.md          # Bot setup guide
│   ├── CACHE_ARCHITECTURE.md # Cache system documentation
│   ├── CHANGELOG.md          # Version history
│   ├── CONTRIBUTING.md       # Contribution guidelines
│   ├── MERGE_CHECKLIST.md    # PR merge checklist
│   ├── NAMING_CONVENTIONS.md # Code naming standards
│   ├── README_ADMIN.md       # Admin documentation
│   ├── README_USER_AGENT.md  # User-Agent customization
│   ├── TEST_REPORT.md        # Testing documentation
│   ├── YAML_VALIDATION_SUMMARY.md # YAML validation guide
│   ├── API_ENDPOINT_INVENTORY.md # API documentation
│   ├── API_YAML_FORMATTING.md # YAML formatting guide
│   ├── API_YAML_QUICK_REFERENCE.md # Quick reference
│   ├── CHAT_TRACKING_IMPLEMENTATION.md # Chat tracking docs
│   ├── CURRENT_STATUS_REPORT.md # Current status
│   ├── DOCUMENTATION_REVIEW_PROCESS.md # Documentation process
│   ├── DOCUMENTATION_STYLE_GUIDE.md # Style guide
│   ├── DOCUMENTATION_VALIDATION_REPORT.md # Validation report
│   ├── PERSISTENT_SESSION_GUIDE.md # Session management
│   ├── PROJECT_DOCUMENTATION.md # Project overview
│   ├── README_WORKERS.md     # Worker system docs
│   ├── TELEGRAM_RATE_LIMITS.md # Rate limiting guide
│   ├── TIMEZONE_CONFIGURATION.md # Timezone setup
│   ├── USER_AGENT_CUSTOMIZATION.md # User-Agent guide
│   ├── USER_FEEDBACK_SYSTEM.md # Feedback system
│   ├── worker_system_diagrams.md # Worker architecture
│   ├── load_test_plan.md     # Load testing guide
│   ├── performance_analysis.md # Performance analysis
│   └── deployment/           # Deployment guides
├── examples/                 # Example scripts
│   ├── user-agent-demo.ts    # User-Agent demonstration
│   └── user-agent-integration-examples.md # Integration examples
├── scripts/                  # Utility scripts
│   ├── start-services-with-user-agents.sh # Service startup script
│   ├── stop-services.sh      # Service shutdown script
│   ├── enhanced_verify.sh    # Enhanced verification
│   ├── final_verify.sh       # Final verification
│   ├── verify-bun-native.ts  # Bun native verification
│   ├── analyze-feedback.ts   # Feedback analysis
│   ├── analyze-typescript-errors.ts # TypeScript error analysis
│   ├── build-with-defines.js # Build optimization
│   ├── collect_metrics.ts    # Metrics collection
│   ├── dependency-audit.js   # Dependency auditing
│   ├── dev-with-defines.js   # Development with defines
│   ├── error_budget.ts       # Error budget tracking
│   ├── final-bot-test.ts     # Final bot testing
│   ├── fix_python_test_imports.py # Python import fixes
│   ├── gen-index.ts          # Index generation
│   ├── generate-customers.ts # Customer generation
│   ├── monitor-documentation-pipelines.ts # Documentation monitoring
│   ├── restart_server.sh     # Server restart
│   ├── run-tests.ts          # Test runner
│   ├── run-and-benchmark.sh  # Benchmarking
│   ├── setup-test-env.ts     # Test environment setup
│   ├── setup_integration.sh  # Integration setup
│   ├── standardize_imports.ts # Import standardization
│   ├── start-dashboard.ts    # Dashboard startup
│   ├── start_optimized.sh    # Optimized startup
│   ├── start_server.sh       # Server startup
│   ├── test-dashboard-integration.ts # Dashboard integration testing
│   ├── test-dashboard.ts     # Dashboard testing
│   ├── test-integration.ts   # Integration testing
│   ├── test-new-bot.ts       # New bot testing
│   ├── test-telegram-integration.ts # Telegram integration testing
│   ├── test_api.sh           # API testing
│   ├── validate-config.ts    # Configuration validation
│   └── validate_links.py     # Link validation
├── public/                   # Static assets and PWA
│   ├── manifest.json         # PWA manifest
│   ├── images/               # App icons and screenshots
│   └── portals/              # Portal HTML files
├── templates/                # HTML templates
│   ├── components/           # Jinja2 components
│   │   ├── _navigation.html  # Navigation component
│   │   ├── _user_menu.html   # User menu component
│   │   ├── _base_layouts.html # Base layouts
│   │   └── _forms.html       # Form components
│   ├── base_refactored.html  # Main base template
│   ├── dashboard_refactored.html # Dashboard template
│   ├── customers_refactored.html # Customers template
│   └── other templates...    # Additional page templates
├── data/                     # Data files and databases
│   ├── customer_database.json # Customer database
│   ├── customer_config.json  # Customer configuration
│   ├── customers.json        # Customer list
│   ├── wager-snapshot.json   # Wager snapshots
│   ├── real_transactions_sample.json # Transaction samples
│   ├── social_metadata.json  # Social media metadata
│   ├── telegram_groups.jsonl # Telegram groups
│   ├── telegram_messages.jsonl # Telegram messages
│   ├── telegram_onboarding.jsonl # Onboarding data
│   ├── telegram_referrals.jsonl # Referral data
│   ├── telegram_roles.jsonl  # Role definitions
│   ├── transactions.jsonl    # Transaction data
│   ├── bets.jsonl            # Betting data
│   ├── bot_events.jsonl      # Bot event logs
│   ├── deposits.jsonl        # Deposit records
│   ├── escrows.jsonl         # Escrow records
│   ├── p2p_deposits.jsonl    # P2P deposits
│   ├── p2p_withdrawals.jsonl # P2P withdrawals
│   ├── benchmark_results.json # Performance benchmarks
│   └── customer_profiles.jsonl # Customer profiles
├── cache/                    # Cache files
├── test-cache/               # Test cache files
├── benchmarks/               # Benchmark results
├── services/                 # Service definitions
├── static/                   # Static assets
├── .github/                  # GitHub workflows
├── .husky/                   # Git hooks
├── package.json              # Node.js dependencies
├── bunfig.toml              # Bun configuration
├── tsconfig.json            # TypeScript configuration
├── eslint.config.js         # ESLint configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── .prettierrc              # Prettier configuration
├── .gitignore               # Git ignore rules
├── .gitattributes           # Git attributes
├── .markdown-link-check.json # Markdown link checking
├── .markdownlint.json       # Markdown linting
├── audit-ci.json            # CI audit configuration
├── bun.lock                 # Bun lock file
└── readme.md                # This file
```

## 🎯 Core Components

### Bot System (`src/bot/`)
- **main.py** - Main bot entry point with command registration
- **handlers/handlers.py** - All bot command implementations
- **services/** - Chat management, notifications, and utilities
- **config.py** - Environment-based configuration

### Server System (`src/server/`)
- **admin/index.ts** - High-performance admin server
- **api/** - RESTful API endpoints with rate limiting
- **workers/** - Background processing with Bun worker threads

### Web Components (`src/web/`)
- **components/** - 23 production-ready React components
- **hooks/** - Custom React hooks for API integration
- **contexts/** - React context providers

### Worker Threads
- **admin_portal_worker_thread.ts** - Admin operations processing
- **report_worker_thread.ts** - Report generation
- **websocket_worker_thread.ts** - WebSocket message handling

## ⚡ Bun v1.2.21 Performance Optimizations

### Enhanced Execution with `bunx --package`
- **Faster CI/CD**: `bunx --package typescript tsc --noEmit` for rapid TypeScript checking
- **Reliable Package Execution**: Explicit package specification prevents binary resolution conflicts
- **Optimized Cloudflare Deployment**: `bunx --package wrangler wrangler deploy`
- **Reduced Execution Time**: Eliminates package lookup overhead
- **Multiple Binary Support**: Run binaries with different names from packages (e.g., `bunx --package renovate renovate-config-validator`)
- **Scoped Package Support**: Use `bunx -p @angular/cli ng new my-app` for scoped packages

### Native Bun Features Integration
- **Tree-shaking Optimization**: `sideEffects` glob patterns reduce bundle sizes
- **Native YAML Support**: Direct import of configuration files with hot-reload
- **Bun.SQL Integration**: High-performance database operations with PostgresError handling
- **Worker Thread Performance**: Enhanced background processing with Bun runtime

### Performance Improvements
- **~60% Faster CI**: Pre-commit hook bypassing and parallel job execution
- **Ultra-fast API Responses**: Sub-5ms response times with Bun's optimized fetch
- **Memory Efficiency**: Native string array support for SQL IN clauses
- **Custom User-Agent Headers**: Better API identification and rate limiting

```bash
# Optimized commands powered by Bun v1.2.21
bunx --package typescript tsc --noEmit --skipLibCheck    # Fast type checking
bunx --package wrangler wrangler deploy                  # Reliable deployment
bun test --coverage --timeout=30000                     # Efficient testing

# New: Multiple binary support with --package flag
bunx --package renovate renovate-config-validator        # Renovate config validation
bunx -p @angular/cli ng new my-app                      # Angular CLI with scoped package
bunx --package typescript --user-agent "Fantdev-Build/2.2.0" tsc --noEmit  # Custom User-Agent
```

## 🔌 API Endpoints

### Telegram Integration
- `GET /api/telegram/messages` - Get recent messages
- `GET /api/telegram/groups` - List monitored groups
- `POST /api/telegram/groups` - Add group to monitoring
- `GET /api/telegram/bot-status` - Bot health status
- `POST /api/telegram/send-message` - Send message
- `GET /api/telegram/analytics/<chat_id>` - Chat analytics
- `GET /api/telegram/statistics` - Comprehensive stats

### Customer Management
- `GET /api/customers` - List all customers
- `GET /api/customer/<id>` - Get customer details
- `POST /api/customer/<id>/balance` - Update balance
- `GET /api/stats` - System statistics

### WebSocket Events
- `telegram_message` - New Telegram message
- `bot_status_update` - Bot status change
- `balance_update` - Customer balance change
- `transaction` - New transaction detected

## 🚀 Performance

### Bun Runtime Benefits
- **500x faster** worker postMessage() for large JSON payloads
- **22x less memory** usage for multi-threaded operations
- **Non-blocking** background processing
- **Automatic batching** for optimal throughput
- **Native TypeScript** execution without transpilation
- **Dead code elimination** with `--define` flags (Bun 1.2.20+)
- **Environment-specific builds** with `--env-file` (Bun 1.2.20+)
- **Custom User-Agent Headers** - Better API identification and rate limiting

### Static Optimization (New in 1.2.20+)
```bash
# Development with defines
bun --env-file=.env.local --define process.env.NODE_ENV="'development'" src/index.ts

# Production build with dead code elimination
bun build --define ENABLE_CONSOLE_LOGS=false --define process.env.NODE_ENV="'production'" src/index.ts

# Custom User-Agent for API requests
bun --user-agent "Fantdev-Trading-Bot/2.2.0" src/server/admin/index.ts
```

### Benchmark Results
| Operation | Traditional | Bun v1.2.21 | Improvement |
|-----------|------------|-------------|-------------|
| Small JSON (11 chars) | 806 ns | 543 ns | 1.5x |
| Medium JSON (14 KB) | 1,220 ns | 460 ns | 2.7x |
| Large JSON (3 MB) | 242,110 ns | 593 ns | 408x |

## 🧪 Testing

```bash
# Run all tests
bun test

# Run specific test suites
bun run test:python          # Python tests only
bun run test:ts              # TypeScript tests only

# Run with coverage
bun test --coverage

# Run specific test files
bun test tests/python/test_integration.py
bun test tests/typescript/web_analysis.test.ts
```

## 📊 Monitoring & Analytics

The platform includes comprehensive monitoring:
- Real-time message streaming
- Group activity tracking
- Bot health metrics
- Transaction analytics
- Customer statistics
- Performance monitoring
- Error tracking and alerts

## 🔒 Security Features

- **Environment-based configuration** - No hardcoded credentials
- JWT authentication for API endpoints
- Rate limiting on all endpoints
- Input validation and sanitization
- Secure WebSocket connections
- Encrypted sensitive data storage
- Admin-only command restrictions
- Audit logging for all actions

## 🛠️ Development Tools

### Code Quality
- **ESLint** - TypeScript/JavaScript linting
- **Prettier** - Code formatting
- **TypeScript** - Type safety with bun-types
- **Python type hints** - Full type annotation coverage

### Development Experience
- **Hot reload** - Instant feedback during development
- **Path aliases** - Clean import statements
- **Comprehensive testing** - 80% coverage requirement
- **CI/CD pipeline** - Automated quality checks

## 📝 Documentation

- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Complete migration guide
- [docs/](docs/) - Technical documentation
- [API Documentation](docs/api/) - Complete API reference
- [USER_AGENT_CUSTOMIZATION.md](docs/USER_AGENT_CUSTOMIZATION.md) - User-Agent customization guide

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [python-telegram-bot](https://github.com/python-telegram-bot/python-telegram-bot)
- React components powered by [React 19](https://react.dev/)
- High-performance runtime by [Bun](https://bun.sh/)
- UI components styled with [Tailwind CSS](https://tailwindcss.com/)

## 🆕 Recent Major Improvements (v2.2.0)

### Enhanced Performance & Monitoring
- ✅ **Performance Monitoring** - Real-time performance metrics and optimization
- ✅ **Multi-Level Caching** - Intelligent caching system for better performance
- ✅ **Cache Warming** - Proactive cache management for optimal response times
- ✅ **WebSocket Integration** - Real-time communication and updates

### User-Agent Customization
- ✅ **Bun CLI Integration** - `--user-agent` flag support for custom HTTP headers
- ✅ **bunx --package Support** - New `--package` flag for multiple binary packages
- ✅ **Service Management Scripts** - Automated service startup with unique identifiers
- ✅ **API Rate Limiting** - Better control over external API requests
- ✅ **Monitoring & Debugging** - Easy identification of request sources

### Enhanced Configuration Service
- ✅ **Improved YAML Parsing** - Better handling of environment variables and types
- ✅ **Type Conversion** - Automatic string-to-number/boolean conversion
- ✅ **Error Handling** - Robust error handling for configuration issues
- ✅ **Performance Optimization** - Faster configuration loading and parsing

### TypeScript Configuration
- ✅ **Resolved bun-types configuration** - Proper TypeScript setup with Bun
- ✅ **Path aliases** - Clean import statements with @server/, @web/, @api/
- ✅ **Type safety** - Comprehensive type checking and validation

### Testing Infrastructure
- ✅ **Fixed all testing issues** - JSON parsing, dev-server refactoring, Python imports
- ✅ **Comprehensive test suite** - 80% coverage requirement with CI/CD
- ✅ **Performance testing** - Benchmark suite for worker threads

### Code Quality & Security
- ✅ **ESLint/Prettier integration** - Consistent code formatting
- ✅ **Environment variables** - No more hardcoded credentials
- ✅ **Security scanning** - Automated vulnerability detection
- ✅ **Performance optimization** - Bun worker threads and caching

### Development Experience
- ✅ **Hot reload** - Instant feedback during development
- ✅ **Path aliases** - Clean and maintainable imports
- ✅ **Comprehensive documentation** - Up-to-date guides and examples
- ✅ **CI/CD pipeline** - Automated quality assurance

## 🔧 New Scripts & Commands



### User-Agent Customization
```bash
# Start services with custom User-Agents
./scripts/start-services-with-user-agents.sh

# Stop all services
./scripts/stop-services.sh

# Custom User-Agent for specific scripts
bun --user-agent "MyCustomApp/1.0" examples/user-agent-demo.ts

# New: bunx --package with custom User-Agent
bunx --package typescript --user-agent "Fantdev-TypeCheck/2.2.0" tsc --noEmit
bunx -p eslint --user-agent "Fantdev-Lint/2.2.0" eslint src/
bunx --package prettier --user-agent "Fantdev-Format/2.2.0" prettier --write src/
```

## 🔍 Quick Verification

After setup, verify everything works:

```bash
# Check environment variables
python3 -c "from dotenv import load_dotenv; load_dotenv(); import os; print('BOT_TOKEN:', 'SET' if os.getenv('BOT_TOKEN') else 'NOT_SET')"

# Check TypeScript configuration
bunx --package typescript tsc --noEmit

# Check test suite
bun test

# Check development servers
bun run dev:bot      # Should start bot
bun run dev:server   # Should start admin server
bun run dev:web      # Should start React dev server
```

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check the [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
- Review the [documentation](docs/)
- Contact the development team

---

**Version 2.2.0** | Last Updated: August 25, 2025 | Built with ❤️ by Fantdev Team
