# 🚀 Fantdev Trading Bot - Enterprise Trading Platform

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![Python](https://img.shields.io/badge/python-3.8+-green)
![Bun](https://img.shields.io/badge/bun-1.2.21+-orange)
![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue)
![React](https://img.shields.io/badge/react-19+-cyan)
![License](https://img.shields.io/badge/license-MIT-purple)

A comprehensive, enterprise-grade Telegram trading bot platform with real-time monitoring, React-based admin dashboard, and high-performance worker thread processing.

## 🌟 Key Features

### Core Trading Bot
- **Real-time Transaction Monitoring** - Automatic detection of deposits, withdrawals, and denials
- **Multi-Customer Support** - Manages 25+ customers with individual balance tracking
- **Smart Alerts** - Low balance warnings, large transaction notifications, inactive customer alerts
- **P&L Tracking** - Weekly profit/loss calculation and automated reporting
- **Pattern Recognition** - Advanced regex-based transaction detection

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

## 📦 Installation

### Prerequisites
- Python 3.7+
- Bun runtime 1.2.21+
- Telegram Bot Token
- Admin Chat ID

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/fantdev/trading-bot.git
cd trading-bot

# 2. Copy environment configuration
cp .env.example .env
# Edit .env with your configuration

# 3. Install Python dependencies
pip install -r config/requirements_portal_integration.txt

# 4. Install Bun dependencies
bun install

# 5. Start all services
bun run dev

# 6. Or start individual services
bun run dev:bot       # Bot only
bun run dev:server    # Admin server only
bun run dev:web       # React dev server only
```

### Detailed Installation

1. **Clone the repository**
```bash
git clone https://github.com/fantdev/myfilterbot.git
cd myfilterbot
```

2. **Set up environment variables**
```bash
# Copy the example environment file
cp .env.example .env

# Edit with your actual values
nano .env
```

3. **Install Python dependencies**
```bash
# Install python-dotenv for environment variable support
pip install python-dotenv

# Install all required packages
pip install -r config/requirements_portal_integration.txt
```

4. **Install Bun dependencies**
```bash
bun install
```

5. **Start the services**
```bash
# Start everything (recommended for development)
bun run dev

# Or start individual services:
python3 src/bot/main.py                    # Main bot
bun run src/server/admin/index.ts          # Admin server
bun run src/dev-server.ts                  # React dev server
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
├── src/
│   ├── bot/                    # Python bot core
│   │   ├── main.py            # Main bot entry point
│   │   ├── handlers/          # Bot command handlers
│   │   ├── services/          # Bot services
│   │   └── utils/             # Bot utilities
│   ├── server/                # TypeScript server code
│   │   ├── admin/             # Admin server
│   │   ├── api/               # API endpoints
│   │   └── workers/           # Worker threads
│   ├── web/                   # React frontend
│   │   ├── components/        # 23 React components
│   │   ├── hooks/             # React hooks
│   │   └── contexts/          # React contexts
│   └── shared/                # Shared types and utilities
├── tests/                     # Comprehensive test suite
│   ├── python/                # Python tests
│   └── typescript/            # TypeScript tests
├── config/                    # Configuration files
├── public/                    # Static assets and portals
├── docs/                      # Documentation
└── scripts/                   # Utility scripts
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
- [CLAUDE.md](CLAUDE.md) - AI assistant development guide
- [docs/](docs/) - Technical documentation
- [API Documentation](docs/api/) - Complete API reference

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [python-telegram-bot](https://github.com/python-telegram-bot/python-telegram-bot)
- React components powered by [React 19](https://react.dev/)
- High-performance runtime by [Bun](https://bun.sh/)
- UI components styled with [Tailwind CSS](https://tailwindcss.com/)

## 🆕 Recent Major Improvements (v3.0.0)

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

## 🔍 Quick Verification

After setup, verify everything works:

```bash
# Check environment variables
python3 -c "from dotenv import load_dotenv; load_dotenv(); import os; print('BOT_TOKEN:', 'SET' if os.getenv('BOT_TOKEN') else 'NOT_SET')"

# Check TypeScript configuration
bunx tsc --noEmit

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

**Version 3.0.0** | Last Updated: December 2024 | Built with ❤️ by Fantdev Team
