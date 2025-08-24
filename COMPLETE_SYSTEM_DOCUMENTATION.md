# 📊 FantDev Trading Platform - Complete System Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Web Portal System](#web-portal-system)
5. [API Documentation](#api-documentation)
6. [Database Schema](#database-schema)
7. [Authentication & Security](#authentication--security)
8. [Installation & Setup](#installation--setup)
9. [Configuration](#configuration)
10. [Deployment Guide](#deployment-guide)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## System Overview

**FantDev Trading Platform** is a comprehensive trading bot management system featuring:
- Telegram bot integration for automated trading operations
- Unified web portal with consistent branding
- Real-time transaction monitoring and alerts
- Customer management with balance tracking
- Advanced analytics and reporting
- Secure authentication with JWT tokens

### Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Backend | Python | 3.9+ |
| Bot Framework | python-telegram-bot | 20.0+ |
| Web Server | Flask | 3.1.2 |
| Frontend | HTML5/CSS3/JavaScript | ES6+ |
| Styling | FantDev Component System | 1.0 |
| Database | JSON File Storage | - |
| Authentication | JWT | pyjwt 2.10.1 |

---

## Project Structure

### Current Directory Layout

```
myfilterbot/
├── main_bot.py                    # Telegram bot entry point
├── unified_server.py               # Unified Flask server with all routes
├── portal_server.py                # Basic portal server
├── enhanced_portal_server.py       # Enhanced server with WebSocket
├── auto_reporter.py                # Automated reporting system
│
├── src/                            # Core modules
│   ├── __init__.py
│   ├── config.py                   # Bot configuration
│   ├── database.py                 # Database abstraction
│   ├── handlers.py                 # Telegram handlers
│   ├── utils.py                    # Utility functions
│   ├── cashier_manager.py         # Cashier management
│   ├── payment_gateway.py         # Payment processing
│   ├── error_handler.py           # Error handling
│   ├── session_manager.py         # Session management
│   ├── chat_tracker.py            # Chat tracking
│   └── telegram_dashboard/        # Telegram dashboard components
│       ├── __init__.py
│       ├── message_streamer.py
│       ├── group_monitor.py
│       └── bot_status.py
│
├── templates/                      # Jinja2 templates
│   ├── base.html                  # Base template
│   ├── login.html                 # Authentication
│   ├── dashboard.html             # Main dashboard
│   ├── customers.html             # Customer management
│   ├── groups.html                # Group management
│   ├── transactions.html          # Transaction history
│   ├── analytics.html             # Analytics page
│   ├── settings.html              # Settings page
│   ├── profile.html               # User profile
│   ├── help.html                  # Help center
│   └── error.html                 # Error pages
│
├── static/                         # Static assets
│   ├── css/
│   │   └── fantdev-components.css # Component library
│   └── js/
│       └── fantdev-core.js        # Core JavaScript
│
├── branding.json                   # Brand configuration
├── customer_database.json          # Customer data
├── customer_config.json            # Customer configuration
├── requirements.txt                # Python dependencies
└── CLAUDE.md                       # Project instructions
```

---

## Core Components

### 1. Telegram Bot (`main_bot.py`)

**Purpose**: Main bot application handling Telegram interactions

**Key Functions**:
- Command processing (`/start`, `/register`, `/balance`, `/help`)
- Transaction detection and forwarding
- Admin notifications
- Customer registration

**Entry Point**:
```python
python3 main_bot.py
```

### 2. Database Module (`src/database.py`)

**Purpose**: Abstraction layer for data operations

**Key Classes**:
- `Customer`: Customer data model
- `Transaction`: Transaction records
- `GroupMember`: Group membership tracking
- `Database`: Main database interface

**Features**:
- Automatic backups before save
- JSON file storage
- Thread-safe operations

### 3. Configuration (`src/config.py`)

**Environment Variables**:
```bash
BOT_TOKEN=your_bot_token_here
ADMIN_CHAT_ID=-2714719687
DATABASE_PATH=customer_database.json
AUTO_BALANCE_UPDATE=true
ALERT_THRESHOLD=1000
```

### 4. Handlers (`src/handlers.py`)

**Bot Commands**:
| Command | Description | Access |
|---------|-------------|--------|
| `/start` | Initialize bot | All |
| `/register <id> <password>` | Register account | Customers |
| `/balance` | Check balance | Registered |
| `/history` | Transaction history | Registered |
| `/help` | Help information | All |
| `/broadcast <message>` | Send to all users | Admin |
| `/stats` | System statistics | Admin |

---

## Web Portal System

### Unified Server (`unified_server.py`)

**Features**:
- Single entry point for all web services
- JWT authentication
- Template rendering with Jinja2
- CORS support for API access
- Session management

**Start Command**:
```bash
python3 unified_server.py
```

**Default Port**: 5000

### Portal Pages

| Route | Template | Description | Access |
|-------|----------|-------------|--------|
| `/login` | login.html | Authentication | Public |
| `/dashboard` | dashboard.html | Main overview | Authenticated |
| `/customers` | customers.html | Customer management | Admin |
| `/groups` | groups.html | Group management | Admin |
| `/transactions` | transactions.html | Transaction history | All |
| `/analytics` | analytics.html | Performance analytics | All |
| `/settings` | settings.html | User settings | All |
| `/profile` | profile.html | User profile | All |
| `/help` | help.html | Help center | All |

### Branding System (`branding.json`)

**Configuration**:
```json
{
  "company": {
    "name": "FantDev Trading",
    "tagline": "Advanced Trading Intelligence Platform"
  },
  "colors": {
    "primary": "#2563eb",
    "secondary": "#7c3aed"
  }
}
```

---

## API Documentation

### Authentication Endpoints

#### POST `/api/login`
**Customer Login**
```json
Request:
{
  "customer_id": "BB1042",
  "password": "N9H9"
}

Response:
{
  "success": true,
  "token": "jwt_token_here",
  "redirect": "/dashboard"
}
```

#### POST `/api/admin/login`
**Admin Login**
```json
Request:
{
  "username": "admin",
  "password": "admin123"
}
```

### Data Endpoints

#### GET `/api/stats`
Returns global statistics

#### GET `/api/customer/<id>`
Returns customer data and transactions

#### GET `/api/transactions/<id>`
Returns transaction history

#### GET `/api/members`
Returns group members (admin only)

### Admin Endpoints

#### GET `/api/admin/statistics`
System-wide statistics

#### POST `/api/admin/customers`
Add new customer

#### POST `/api/admin/members/<id>/approve`
Approve group member

---

## Database Schema

### Customer Model
```json
{
  "customer_id": "BB1042",
  "password": "N9H9",
  "balance": 1450,
  "weekly_pnl": 3000,
  "phone": "",
  "telegram_id": 8013171035,
  "telegram_username": "@username",
  "active": true,
  "last_activity": "2025-08-23T15:52:37"
}
```

### Transaction Model
```json
{
  "timestamp": "2025-08-23T15:52:37",
  "customer_id": "BB1042",
  "type": "deposit",
  "amount": 500,
  "message": "Transaction details",
  "from_user": "@sender",
  "status": "completed"
}
```

---

## Authentication & Security

### JWT Configuration
- **Algorithm**: HS256
- **Expiration**: 24 hours
- **Secret**: Configurable in environment

### Security Features
- Password hashing (implementation pending)
- Session management
- CORS protection
- Input validation
- SQL injection prevention (N/A - JSON storage)

### Login Credentials

**Admin Access**:
- Username: `admin`
- Password: `admin123`

**Demo Customer**:
- ID: `BB1042`
- Password: `N9H9`

---

## Installation & Setup

### Prerequisites
```bash
# Python 3.9+
python3 --version

# pip package manager
pip3 --version
```

### Installation Steps

1. **Clone Repository**:
```bash
git clone https://github.com/brendadeeznuts1111/myfilterbot.git
cd myfilterbot
```

2. **Install Dependencies**:
```bash
pip3 install -r requirements.txt
pip3 install flask flask-cors pyjwt
```

3. **Configure Environment**:
```bash
export BOT_TOKEN="your_bot_token"
export ADMIN_CHAT_ID="-2714719687"
```

4. **Initialize Database**:
```bash
# Database is auto-created on first run
python3 main_bot.py
```

5. **Start Services**:
```bash
# Terminal 1: Bot
python3 main_bot.py

# Terminal 2: Web Portal
python3 unified_server.py

# Terminal 3: Auto Reporter (optional)
python3 auto_reporter.py
```

---

## Configuration

### Bot Configuration (`src/config.py`)

```python
# Bot Settings
BOT_TOKEN = os.getenv('BOT_TOKEN')
ADMIN_CHAT_ID = int(os.getenv('ADMIN_CHAT_ID', '-2714719687'))

# Database
DATABASE_PATH = os.getenv('DATABASE_PATH', 'customer_database.json')

# Features
AUTO_BALANCE_UPDATE = os.getenv('AUTO_BALANCE_UPDATE', 'true') == 'true'
ALERT_THRESHOLD = float(os.getenv('ALERT_THRESHOLD', '1000'))

# Transaction Patterns
DEPOSIT_PATTERN = r'deposit.*?(\d+(?:\.\d+)?)'
WITHDRAWAL_PATTERN = r'withdrawal.*?(\d+(?:\.\d+)?)'
DENIAL_PATTERN = r'denied|rejected|declined'
```

### Portal Configuration

**Server Settings**:
- Host: `0.0.0.0`
- Port: `5000`
- Debug: `True` (disable in production)

**Session Configuration**:
- Secret Key: Change in production
- Session Timeout: 24 hours

---

## Deployment Guide

### Local Development
```bash
# Start all services
./start_dev.sh

# Or manually:
python3 main_bot.py &
python3 unified_server.py &
```

### Production Deployment

#### Using Ngrok
```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com

# Expose portal
ngrok http 5000

# Use provided HTTPS URL
```

#### Using Heroku
```bash
# Create Procfile
echo "web: python unified_server.py" > Procfile
echo "worker: python main_bot.py" >> Procfile

# Deploy
heroku create fantdev-trading
git push heroku main
```

#### Using Docker
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "unified_server.py"]
```

---

## Testing

### Run Tests
```bash
# Basic smoke test
python3 smoke_test.py

# Integration tests
python3 test_integration.py

# Portal tests
python3 test_enhanced_portal.py
```

### Test Coverage
- Bot commands
- Database operations
- API endpoints
- Authentication flow
- Transaction detection

---

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process
lsof -i :5000

# Kill process
kill -9 <PID>
```

#### Database Lock
```bash
# Remove lock file if exists
rm customer_database.json.lock

# Restore from backup
cp customer_database.json.backup customer_database.json
```

#### Bot Not Responding
1. Check bot token is valid
2. Verify network connectivity
3. Check Telegram API status
4. Review logs for errors

#### Login Issues
1. Clear browser cookies
2. Check credentials in database
3. Verify JWT secret is set
4. Check session expiration

### Debug Mode
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Health Check
```bash
# Check portal health
curl http://localhost:5000/api/health

# Check bot status
python3 -c "from src.database import db; print(db.get_statistics())"
```

---

## Support & Resources

### Documentation
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [python-telegram-bot](https://python-telegram-bot.org/)

### Contact
- GitHub: [brendadeeznuts1111/myfilterbot](https://github.com/brendadeeznuts1111/myfilterbot)
- Telegram Support: @fantdev_support

### License
MIT License - See LICENSE file for details

---

## Changelog

### Version 2.0.0 (2025-08-24)
- ✅ Unified portal system with consistent branding
- ✅ Complete template system with 10 pages
- ✅ JWT authentication implementation
- ✅ Fixed all DOM warnings and 404 errors
- ✅ Mobile responsive design
- ✅ Dark/light theme support

### Version 1.0.0 (2025-08-23)
- Initial release
- Basic bot functionality
- Customer management
- Transaction detection

---

*Last Updated: August 24, 2025*