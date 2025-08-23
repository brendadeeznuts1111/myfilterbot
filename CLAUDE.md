# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Running the Bot
```bash
python3 main_bot.py
```

### Running the Portal Server
```bash
python3 portal_server.py  # Runs on port 5000
```

### Running Auto-Reporter
```bash
python3 auto_reporter.py  # Scheduled reports (requires 'schedule' package)
```

### Running Tests
```bash
python3 smoke_test.py
```

### Installing Dependencies
```bash
pip install -r requirements.txt
# Note: requirements.txt is incomplete. Also install:
pip install flask flask-cors schedule
```

## Dependencies

Required Python packages:
- `python-telegram-bot>=20.0` - Telegram bot framework
- `flask` - Web server for portals (not in requirements.txt)
- `flask-cors` - CORS support for API (not in requirements.txt)
- `schedule` - Task scheduling for auto-reporter (not in requirements.txt)

## Architecture Overview

This is a Telegram trading bot with web portals and automated reporting:

### Core Components

1. **main_bot.py** - Application entry point and bot orchestration
   - Initializes bot with token and handlers
   - Sets up command routing and error handling
   - Manages the application lifecycle

2. **src/** - Core modules following separation of concerns:
   - **config.py** - Configuration management (tokens, thresholds, patterns)
   - **database.py** - Database abstraction layer with Customer and Transaction models
   - **handlers.py** - Bot command and message handlers
   - **utils.py** - Utility functions (transaction detection, formatting, rate limiting)

3. **Data Storage**
   - **customer_database.json** - Main customer data (25 customers with balances, P&L, group members)
   - **customer_config.json** - Customer configuration metadata
   - Automatic backup created before each save

4. **Web Portal System**
   - **portal_server.py** - Flask API server (port 5000)
   - **customer_portal_api.html** - Customer self-service portal with API integration
   - **admin_portal.html** - Admin dashboard for group management
   - **index.html** - Message viewer interface
   - ngrok-compatible headers for external access

5. **Automated Reporting** 
   - **auto_reporter.py** - Scheduled reporting system
   - Daily customer reports (9:00 PM)
   - Weekly P&L analysis (Sunday 8:00 PM)
   - Inactive customer alerts (10:00 AM, 3:00 PM)

6. **Legacy Code**
   - **backup/** directory contains older implementations
   - Preserved for reference but not actively used

### Key Design Patterns

- **Handler Pattern**: All bot commands routed through handlers.py
- **Transaction Detection**: Pattern-based regex matching for deposits/withdrawals/denials
- **Admin/Customer Separation**: Different command sets based on user role
- **Rate Limiting**: Built-in protection against spam/abuse

### Bot Configuration

- Bot Token: Configured in src/config.py (or via BOT_TOKEN env var)
- Admin Chat ID: `-2714719687` (or via ADMIN_CHAT_ID env var)
- Database Path: `customer_database.json` (or via DATABASE_PATH env var)
- Alert thresholds and patterns configurable in src/config.py
- Portal Server: Runs on port 5000, Flask-based with CORS enabled
- Auto-Reporter: Uses schedule library for cron-like scheduling

### Transaction Processing Flow

1. Message received → handlers.process_message()
2. Transaction detection via utils.detect_transaction()
3. Customer identification through database lookup
4. Balance updates if auto_balance_update enabled
5. Forwarding to admin chat with formatted alerts

### Customer Management

- Registration: `/register <id> <password>` validates against customer_database.json
- Each customer has: ID, password, balance, weekly P&L, telegram linking
- Admin dashboard provides statistics and customer overview
- Group member management via admin portal
- Member approval/denial workflow with permissions

## Important Implementation Notes

### Current Limitations

1. **Incomplete Dependencies**
   - requirements.txt only includes `python-telegram-bot>=20.0`
   - Missing: flask, flask-cors, schedule, python-socketio packages
   - Manual installation required for full functionality

2. **Portal Server (portal_server.py)**
   - Basic API endpoints without full CRUD operations
   - No real-time transaction streaming or WebSocket support (being implemented)
   - Limited session management

3. **Missing Telegram Features**
   - No inline keyboards for transaction confirmations
   - Limited use of Telegram's rich media capabilities
   - No scheduled messages or reminders
   - No voice/video message support

### Recent Enhancements

1. **Admin Portal (admin_portal.html)**
   - Full responsive design with mobile support
   - Advanced filtering and search capabilities
   - Permission management system with granular controls
   - Telegram API connection status monitoring
   - Automated message templates configuration
   - Member approval/denial workflow with modal interface

2. **Planned Improvements**
   - Enhanced customer portal with similar UI/UX improvements
   - WebSocket integration for real-time updates
   - Full API integration replacing mock data
   - Session management and authentication

### Areas for Enhancement

- Implement real API connections for live data in web portals
- Add WebSocket support for real-time updates
- Enhance search/filter with advanced query capabilities
- Add more Telegram-native features (inline queries, custom keyboards)
- Implement proper session management for web portals
- Add data visualization libraries for better charts