# 📚 Fantdev Trading Bot - Complete Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Installation Guide](#installation-guide)
4. [Configuration](#configuration)
5. [Core Components](#core-components)
6. [API Documentation](#api-documentation)
7. [Web Portals](#web-portals)
8. [Bot Commands](#bot-commands)
9. [Database Schema](#database-schema)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)
13. [Development Guidelines](#development-guidelines)
14. [Security Considerations](#security-considerations)

---

## Project Overview

**Fantdev Trading Bot** is a comprehensive Telegram bot system designed for automated trading management, customer tracking, and real-time transaction monitoring. The system includes web portals for administration and customer self-service, automated reporting, and robust transaction detection capabilities.

### Key Features

- **Real-time Transaction Monitoring**: Automatic detection and forwarding of deposits, withdrawals, and denials
- **Customer Management**: Support for 25+ customers with individual balance tracking
- **Web Portal System**: Admin dashboard and customer self-service portal
- **Automated Reporting**: Scheduled daily and weekly reports
- **Smart Alerts**: Low balance warnings, large transaction notifications
- **P&L Tracking**: Weekly profit/loss calculation and reporting

### Technology Stack

- **Backend**: Python 3.8+ with asyncio
- **Bot Framework**: python-telegram-bot 20.0+
- **Web Server**: Flask with CORS and WebSocket support
- **Frontend**: React 18+ with TypeScript, Tailwind CSS
- **Runtime**: Bun 1.2.21+ for high-performance worker threads
- **Data Storage**: JSON files + SQLite for monitoring
- **Real-time**: Socket.IO for WebSocket communication
- **Worker Threads**: Bun's optimized postMessage (500x faster)
- **Deployment**: Compatible with ngrok, Cloudflare Workers

---

## Telegram Dashboard Integration

### Overview

The Telegram Dashboard provides comprehensive monitoring and management capabilities for the bot's Telegram interactions, offering real-time insights and administrative controls.

### Dashboard Modules

#### 1. Message Streamer (`src/telegram_dashboard/message_streamer.py`)
- **Real-time Message Processing**: Streams messages from Telegram groups with WebSocket support
- **Priority Queue System**: High/medium/low priority message handling
- **Transaction Detection**: Automatic identification of deposits, withdrawals, and denials
- **Subscription Model**: Multiple subscribers for message events
- **Statistics Tracking**: Message volume, processing time, queue metrics

#### 2. Group Monitor (`src/telegram_dashboard/group_monitor.py`)
- **Multi-Group Management**: Monitor unlimited Telegram groups/channels
- **SQLite Persistence**: Reliable data storage with WAL mode
- **Member Analytics**: Track joins, leaves, and activity patterns
- **Message Statistics**: Hourly distribution, peak times, volume trends
- **Administrator Tracking**: Monitor admin actions and permissions

#### 3. Bot Status Monitor (`src/telegram_dashboard/bot_status.py`)
- **System Metrics**: CPU usage, memory consumption, disk space
- **Performance Scoring**: Health score calculation (0-100)
- **Response Time Tracking**: API latency monitoring
- **Error Rate Analysis**: Track and categorize errors
- **Uptime Monitoring**: Connection stability tracking

#### 4. Admin Interface (`src/telegram_dashboard/admin_interface.py`)
- **Message Management**: Send, forward, delete, pin messages
- **User Administration**: Ban, unban, mute, promote users
- **Group Controls**: Update settings, permissions, descriptions
- **Bulk Operations**: Process multiple actions simultaneously
- **Data Export**: Export chat history and analytics

### Integration Points

- **WebSocket Events**: Real-time updates via Socket.IO
- **REST API Endpoints**: 10+ new endpoints for dashboard operations
- **Database Synchronization**: Automatic sync with customer database
- **Worker Thread Processing**: Background tasks via Bun workers

---

## React Component System

### Component Architecture

The system includes 23 production-ready React components built with TypeScript and optimized for performance.

### Core Components

#### Dashboard Components
- **AdminPanel.tsx**: Main administrative dashboard with tabbed interface
- **Dashboard.tsx**: Primary overview with key metrics and charts
- **CustomerPortal.tsx**: Customer-facing self-service interface

#### Data Visualization
- **TransactionChart.tsx**: Interactive transaction trend visualization
- **BalanceChart.tsx**: Balance history and projections
- **MetricCard.tsx**: Animated metric display cards
- **ActivityFeed.tsx**: Real-time activity stream

#### System Management
- **SystemStatus.tsx**: Comprehensive system health monitoring
- **NotificationSystem.tsx**: Toast notifications with priority levels
- **RateLimitMonitor.tsx**: API rate limit tracking and alerts
- **Settings.tsx**: Configuration management interface

#### User Experience
- **Navigation.tsx**: Responsive navigation with role-based menus
- **LoginForm.tsx**: Secure authentication with JWT support
- **LoadingSpinner.tsx**: Skeleton loaders and progress indicators
- **ErrorFallback.tsx**: Error boundary with recovery options

### Component Features

- **TypeScript**: Full type safety and IntelliSense support
- **React Query**: Efficient data fetching and caching
- **Tailwind CSS**: Utility-first styling with dark mode
- **Chart.js**: Interactive data visualizations
- **WebSocket Integration**: Real-time updates without polling

---

## Worker Thread Architecture

### High-Performance Processing

Leveraging Bun v1.2.21's 500x faster postMessage() for optimal performance:

#### Admin Portal Worker (`src/admin_portal_worker_thread.ts`)
- **Task Types**: CUSTOMER_STATS, TRANSACTION_ANALYTICS, MEMBER_PROCESSING
- **Priority Queue**: High/medium/low priority task handling
- **Error Recovery**: Automatic retry with exponential backoff
- **Performance Monitoring**: Task execution time tracking
- **Memory Management**: Automatic cleanup and optimization

#### Report Worker (`src/report_worker_thread.ts`)
- **Report Generation**: Background processing of large reports
- **Format Support**: CSV, JSON, PDF export capabilities
- **Scheduled Tasks**: Cron-like scheduling for automated reports
- **Batch Processing**: Efficient handling of bulk operations

#### WebSocket Worker (`src/websocket_worker_thread.ts`)
- **Message Queue**: High-throughput message processing
- **Broadcasting**: Efficient multi-client message distribution
- **Connection Management**: Automatic reconnection and cleanup
- **Message Batching**: Optimize network utilization

### Performance Metrics

| Data Size | Traditional | Bun v1.2.21 | Improvement |
|-----------|------------|-------------|-------------|
| Small (11 chars) | 806 ns | 543 ns | 1.5x |
| Medium (14 KB) | 1,220 ns | 460 ns | 2.7x |
| Large (3 MB) | 242,110 ns | 593 ns | 408x |

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Telegram Bot                         │
│                       (main_bot.py)                        │
├─────────────────────────────────────────────────────────────┤
│                     Core Modules (src/)                     │
│  ┌──────────┬──────────┬──────────┬────────────────────┐  │
│  │config.py │database.py│handlers.py│utils.py           │  │
│  └──────────┴──────────┴──────────┴────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      Data Layer                             │
│  ┌──────────────────────┬─────────────────────────────┐   │
│  │customer_database.json│customer_config.json         │   │
│  └──────────────────────┴─────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Web Portal System                        │
│  ┌──────────────┬────────────────┬──────────────────┐     │
│  │portal_server │Admin Portal    │Customer Portal   │     │
│  │(Flask API)   │(HTML/JS)       │(HTML/JS)        │     │
│  └──────────────┴────────────────┴──────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
myfilterbot/
├── main_bot.py                 # Main bot entry point
├── portal_server.py            # Flask API server
├── enhanced_portal_server.py   # Enhanced API with WebSocket support
├── src/auto_reporter.py            # Automated reporting system
├── tests/python/smoke_test.py               # Basic functionality tests
├── test_integration.py         # Integration tests
├── test_enhanced_portal.py     # Portal tests
│
├── src/                        # Core modules
│   ├── __init__.py            # Package initialization
│   ├── config.py              # Configuration settings
│   ├── database.py            # Database abstraction layer
│   ├── handlers.py            # Telegram bot handlers
│   ├── utils.py               # Utility functions
│   └── payment_gateway.py     # Payment processing (placeholder)
│
├── backup/                     # Legacy implementations
│   ├── main_bot_enhanced.py
│   ├── filter_bot.py
│   ├── multi_customer_bot.py
│   └── webapp_server.py
│
├── portal/                     # Portal resources (if used)
│
├── Data Files
│   ├── customer_database.json        # Main customer data
│   ├── customer_database.json.backup # Automatic backup
│   └── customer_config.json         # Customer metadata
│
├── Web Interfaces
│   ├── index.html                    # Message viewer
│   ├── admin_portal.html            # Basic admin dashboard
│   ├── admin_portal_enhanced.html   # Advanced admin dashboard
│   ├── admin_portal_ultimate.html   # Ultimate admin dashboard
│   ├── enhanced_admin_portal.html   # Latest admin portal
│   ├── customer_portal.html         # Basic customer portal
│   ├── customer_portal_api.html     # API-integrated customer portal
│   ├── enhanced_customer_portal.html           # Enhanced customer portal
│   └── enhanced_customer_portal_integrated.html # Integrated customer portal
│
├── Configuration Files
│   ├── requirements.txt              # Basic Python dependencies
│   ├── requirements_enhanced.txt     # Full dependencies
│   ├── CLAUDE.md                    # AI assistant instructions
│   ├── readme.md                    # Basic README
│   ├── QUICKSTART.md               # Quick start guide
│   ├── setup_instructions.md        # Setup instructions
│   ├── API_DOCUMENTATION.md        # API docs
│   └── API_DOCUMENTATION_ENHANCED.md # Enhanced API docs
│
└── Utilities
    ├── test_api.html                # API testing interface
    ├── test_api.sh                  # API test script
    └── websocket_client.js          # WebSocket test client
```

---

## Installation Guide

### Prerequisites

- Python 3.7 or higher
- pip (Python package manager)
- Telegram Bot Token from [@BotFather](https://t.me/botfather)
- Admin Chat ID (group or personal chat)

### Step-by-Step Installation

1. **Clone the Repository**
```bash
git clone https://github.com/brendadeeznuts1111/myfilterbot.git
cd myfilterbot
```

2. **Create Virtual Environment (Recommended)**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install Dependencies**
```bash
# Install basic requirements
pip install -r requirements.txt

# Install additional required packages (not in requirements.txt)
pip install flask flask-cors schedule

# Or use the enhanced requirements file
pip install -r requirements_enhanced.txt
```

4. **Configure Environment Variables (Optional)**
```bash
export BOT_TOKEN="your_bot_token_here"
export ADMIN_CHAT_ID="-2714719687"
export DATABASE_PATH="customer_database.json"
```

5. **Verify Installation**
```bash
python3 tests/python/smoke_test.py
```

---

## Configuration

### Environment Variables

Configuration can be set via environment variables or directly in `src/config.py`:

| Variable | Description | Default |
|----------|-------------|---------|
| `BOT_TOKEN` | Telegram Bot API token | Configured in config.py |
| `ADMIN_CHAT_ID` | Admin group/chat ID | `-2714719687` |
| `DATABASE_PATH` | Path to customer database | `customer_database.json` |
| `LOW_BALANCE_THRESHOLD` | Alert threshold for low balance | `500` |
| `LARGE_TRANSACTION_THRESHOLD` | Alert threshold for large transactions | `1000` |

### Configuration File (src/config.py)

```python
# Bot Configuration
BOT_TOKEN = os.environ.get('BOT_TOKEN', 'your_token_here')
ADMIN_CHAT_ID = int(os.environ.get('ADMIN_CHAT_ID', '-2714719687'))

# Alert Thresholds
LOW_BALANCE_THRESHOLD = 500
LARGE_TRANSACTION_THRESHOLD = 1000

# Transaction Patterns
DEPOSIT_KEYWORDS = ['deposit', 'credited', 'received', 'added']
WITHDRAWAL_KEYWORDS = ['withdraw', 'withdrawn', 'sent', 'deducted']
DENIAL_KEYWORDS = ['denied', 'rejected', 'failed', 'declined']

# Rate Limiting
RATE_LIMIT_MESSAGES = 10
RATE_LIMIT_WINDOW = 60  # seconds
```

---

## API Enhancements

### Telegram Dashboard Endpoints

#### Message Management
- `GET /api/telegram/messages` - Retrieve recent messages with filtering
- `POST /api/telegram/send-message` - Send messages to any chat
- `DELETE /api/telegram/message/<id>` - Delete specific messages

#### Group Monitoring
- `GET /api/telegram/groups` - List all monitored groups
- `POST /api/telegram/groups` - Add new group to monitoring
- `GET /api/telegram/groups/<id>` - Get specific group details
- `GET /api/telegram/analytics/<id>` - Group analytics and statistics

#### System Status
- `GET /api/telegram/bot-status` - Comprehensive bot health check
- `GET /api/telegram/statistics` - System-wide statistics
- `GET /api/telegram/performance` - Performance metrics

### WebSocket Events

#### Real-time Updates
```javascript
// Client subscription
socket.on('telegram_message', (data) => {
  // Handle new message
});

socket.on('bot_status_update', (status) => {
  // Update status display
});

socket.on('transaction', (transaction) => {
  // Process transaction
});
```

---

## Core Components

### 1. Main Bot (main_bot.py)

The main entry point that initializes and runs the Telegram bot.

**Key Functions:**
- Bot initialization with token
- Handler registration
- Error handling setup
- Application lifecycle management

**Usage:**
```bash
python3 main_bot.py
```

### 2. Configuration Module (src/config.py)

Manages all configuration settings, environment variables, and constants.

**Features:**
- Environment variable loading
- Default values
- Transaction patterns
- Alert thresholds

### 3. Database Module (src/database.py)

Provides database abstraction layer for customer data management.

**Key Classes:**
- `Customer`: Customer data model
- `Transaction`: Transaction data model
- `Database`: Database operations handler

**Functions:**
- `load_database()`: Load customer data from JSON
- `save_database()`: Save with automatic backup
- `get_customer()`: Retrieve customer by ID
- `update_balance()`: Update customer balance
- `add_transaction()`: Record new transaction

### 4. Handlers Module (src/handlers.py)

Contains all bot command and message handlers.

**Customer Commands:**
- `/start`: Welcome message and menu
- `/register <id> <password>`: Account registration
- `/balance`: Check current balance
- `/account`: Account management menu
- `/transactions`: View recent transactions
- `/help`: Help and support

**Admin Commands:**
- `/admin` or `/dashboard`: Admin dashboard
- `/stats`: View statistics
- `/broadcast <message>`: Send message to all users

### 5. Utilities Module (src/utils.py)

Utility functions for transaction processing and formatting.

**Key Functions:**
- `detect_transaction(message)`: Pattern-based transaction detection
- `format_alert(transaction)`: Format alerts for admin
- `calculate_pnl(transactions)`: Calculate profit/loss
- `rate_limit_check(user_id)`: Check rate limiting

---

## API Documentation

### Portal Server API (portal_server.py)

The Flask-based API server provides endpoints for web portal integration.

**Base URL:** `http://localhost:5000`

### Authentication

#### POST `/api/login`
Authenticate customer credentials.

**Request:**
```json
{
  "customer_id": "BB1042",
  "password": "N9H9"
}
```

**Response (200):**
```json
{
  "success": true,
  "customer": {
    "customer_id": "BB1042",
    "balance": 1450.00,
    "weekly_pnl": 3000.00,
    "active": true
  }
}
```

### Customer Data

#### GET `/api/customer/{customer_id}`
Retrieve customer information.

**Response (200):**
```json
{
  "customer_id": "BB1042",
  "balance": 1450.00,
  "weekly_pnl": 3000.00,
  "transactions": [...],
  "alerts": {
    "low_balance": false,
    "inactive": false
  }
}
```

#### GET `/api/transactions/{customer_id}`
Get transaction history.

**Query Parameters:**
- `limit` (optional): Maximum transactions to return
- `type` (optional): Filter by transaction type

### Admin Endpoints

#### GET `/api/admin/stats`
Get system statistics.

**Response (200):**
```json
{
  "total_customers": 25,
  "active_customers": 18,
  "total_balance": 45000.00,
  "total_weekly_pnl": 12000.00,
  "top_performers": [...],
  "low_balance_alerts": [...]
}
```

#### GET `/api/admin/customers`
List all customers with details.

#### POST `/api/admin/broadcast`
Send broadcast message.

**Request:**
```json
{
  "message": "System maintenance scheduled",
  "target": "all"  // or "active", "inactive"
}
```

---

## Web Portals

### Admin Portal

Multiple versions available for different needs:

1. **admin_portal.html** - Basic admin dashboard
2. **enhanced_admin_portal.html** - Advanced features with real-time updates
3. **admin_portal_ultimate.html** - Full-featured enterprise dashboard

**Features:**
- Customer overview with statistics
- Real-time transaction monitoring
- Member approval/denial workflow
- Permission management system
- Message templates configuration
- Advanced filtering and search
- Mobile-responsive design

### Customer Portal

Customer self-service interfaces:

1. **customer_portal.html** - Basic customer interface
2. **customer_portal_api.html** - API-integrated version
3. **enhanced_customer_portal.html** - Enhanced UI/UX
4. **enhanced_customer_portal_integrated.html** - Full integration

**Features:**
- Balance display
- Transaction history
- P&L charts
- Account alerts
- Profile management
- Dark mode support

### Message Viewer (index.html)

Simple interface for viewing bot messages and transactions.

---

## Bot Commands

### Customer Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Start bot and show menu | `/start` |
| `/register` | Register account | `/register BB1042 N9H9` |
| `/balance` | Check current balance | `/balance` |
| `/account` | Account management menu | `/account` |
| `/transactions` | View recent transactions | `/transactions` |
| `/help` | Get help and support | `/help` |

### Admin Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/admin` | Open admin dashboard | `/admin` |
| `/dashboard` | Alias for admin | `/dashboard` |
| `/stats` | View statistics | `/stats` |
| `/customers` | List all customers | `/customers` |
| `/broadcast` | Send broadcast | `/broadcast Maintenance at 10 PM` |
| `/backup` | Force database backup | `/backup` |

---

## Database Schema

### customer_database.json

```json
{
  "customers": [
    {
      "customer_id": "BB1042",
      "password": "N9H9",
      "balance": 1450.00,
      "weekly_pnl": 3000.00,
      "total_deposits": 5000.00,
      "total_withdrawals": 3550.00,
      "last_activity": "2025-08-23T14:30:00",
      "registered": false,
      "telegram_id": null,
      "active": true,
      "created_at": "2025-01-01T00:00:00",
      "group_members": []
    }
  ],
  "metadata": {
    "version": "2.0.0",
    "last_updated": "2025-08-23T14:30:00",
    "total_customers": 25
  }
}
```

### customer_config.json

```json
{
  "settings": {
    "auto_balance_update": true,
    "alert_on_low_balance": true,
    "alert_on_large_transaction": true,
    "daily_report_time": "21:00",
    "weekly_report_day": "Sunday"
  },
  "templates": {
    "welcome_message": "Welcome to Fantdev Trading Bot!",
    "low_balance_alert": "Warning: Low balance detected",
    "transaction_confirmation": "Transaction processed successfully"
  }
}
```

---

## Testing

### Unit Tests (tests/python/smoke_test.py)

Basic functionality tests:
```bash
python3 tests/python/smoke_test.py
```

Tests include:
- Configuration loading
- Database operations
- Transaction detection
- Handler functions
- API endpoints

### Integration Tests (test_integration.py)

End-to-end testing:
```bash
python3 test_integration.py
```

### Portal Tests (test_enhanced_portal.py)

Web portal testing:
```bash
python3 test_enhanced_portal.py
```

### API Testing (test_api.html)

Interactive API testing interface accessible via browser.

---

## Deployment

### Local Development

1. **Start the Bot:**
```bash
python3 main_bot.py
```

2. **Start the Portal Server:**
```bash
python3 portal_server.py
```

3. **Start Auto-Reporter (Optional):**
```bash
python3 src/auto_reporter.py
```

### Production Deployment

#### Using ngrok

1. **Install ngrok:**
```bash
# macOS
brew install ngrok

# Linux
snap install ngrok

# Windows
choco install ngrok
```

2. **Start ngrok tunnel:**
```bash
ngrok http 5000
```

3. **Configure webhook:**
```python
# In config.py
WEBHOOK_URL = "https://your-ngrok-url.ngrok-free.app/webhook"
```

#### Using a VPS

1. **Setup server** (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install python3 python3-pip nginx
```

2. **Configure systemd service:**
```ini
# /etc/systemd/system/fantdev-bot.service
[Unit]
Description=Fantdev Trading Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/myfilterbot
ExecStart=/usr/bin/python3 /home/ubuntu/myfilterbot/main_bot.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

3. **Start service:**
```bash
sudo systemctl enable fantdev-bot
sudo systemctl start fantdev-bot
```

---

## Troubleshooting

### Common Issues

#### Bot Not Responding
- Check bot token is correct
- Verify network connectivity
- Check logs for errors: `tail -f bot.log`

#### Database Errors
- Ensure `customer_database.json` exists
- Check file permissions
- Verify JSON syntax

#### Portal Not Loading
- Check Flask server is running
- Verify port 5000 is not blocked
- Check CORS settings

#### Transaction Not Detected
- Review transaction patterns in config.py
- Check message format matches patterns
- Verify customer is registered

### Debug Mode

Enable debug logging:
```python
# In main_bot.py
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

---

## Development Guidelines

### Code Style

- Follow PEP 8 Python style guide
- Use type hints where applicable
- Document functions with docstrings
- Keep functions focused and small

### Git Workflow

1. **Branch naming:**
   - Features: `feature/description`
   - Bugs: `bugfix/description`
   - Hotfixes: `hotfix/description`

2. **Commit messages:**
   - Use present tense
   - Be descriptive
   - Reference issue numbers

### Adding New Features

1. **Create handler in `src/handlers.py`:**
```python
async def new_feature_handler(update, context):
    """Handle new feature command."""
    # Implementation
    pass
```

2. **Register handler in `main_bot.py`:**
```python
application.add_handler(CommandHandler("newfeature", new_feature_handler))
```

3. **Update configuration if needed:**
```python
# In config.py
NEW_FEATURE_SETTING = "value"
```

4. **Add tests:**
```python
# In test_integration.py
def test_new_feature():
    # Test implementation
    pass
```

---

## Security Considerations

### Best Practices

1. **Token Security:**
   - Never commit tokens to repository
   - Use environment variables
   - Rotate tokens regularly

2. **Data Protection:**
   - Automatic backups before saves
   - Rate limiting to prevent abuse
   - Input validation on all commands

3. **Access Control:**
   - Admin commands restricted to ADMIN_CHAT_ID
   - Password protection for registration
   - Session management for web portals

4. **Network Security:**
   - Use HTTPS in production
   - Configure CORS properly
   - Validate webhook requests

### Security Checklist

- [ ] Bot token stored securely
- [ ] Admin chat ID configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Backups configured
- [ ] HTTPS enabled for production
- [ ] CORS configured correctly
- [ ] Error messages don't leak sensitive info

---

## Support and Maintenance

### Getting Help

- **GitHub Issues:** [Create an issue](https://github.com/brendadeeznuts1111/myfilterbot/issues)
- **Telegram Support:** Contact @admin
- **Documentation:** This file and CLAUDE.md

### Regular Maintenance

1. **Daily:**
   - Monitor bot logs
   - Check alert notifications
   - Review transaction processing

2. **Weekly:**
   - Database backup verification
   - Performance metrics review
   - Security audit

3. **Monthly:**
   - Dependency updates
   - Code optimization
   - Feature planning

### Version History

- **v2.1.0** - Telegram Dashboard, React components, Worker threads
- **v2.0.0** - Enhanced portals and WebSocket support
- **v1.5.0** - Added auto-reporter
- **v1.0.0** - Initial release

---

## License

MIT License - See LICENSE file for details

---

## Contributors

- **Fantdev** - Lead Developer
- **Contributors** - See GitHub contributors

---

*Last Updated: August 24, 2025*
*Version: 2.1.0*
*Repository: https://github.com/brendadeeznuts1111/myfilterbot*
