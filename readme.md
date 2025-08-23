# 🚀 Fantdev Trading Bot

A professional Telegram bot for automated trading management, customer tracking, and transaction monitoring.

## ✨ Features

- **🤖 Automated Monitoring** - Real-time transaction detection and forwarding
- **💰 Balance Tracking** - Automatic balance updates and P&L calculation
- **📊 Analytics Dashboard** - Comprehensive admin and customer dashboards
- **🔔 Smart Alerts** - Low balance warnings, large transaction notifications
- **👥 Multi-Customer Support** - Manage 25+ customers with individual tracking
- **🌐 Web Portal** - Customer self-service portal with charts and reports

## 🚀 Quick Start

### Prerequisites
- Python 3.7+
- Telegram Bot Token (from @BotFather)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/brendadeeznuts1111/myfilterbot.git
cd myfilterbot
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure your bot**
- Bot token is already configured
- Admin chat ID is set

4. **Run the bot**
```bash
python3 main_bot.py
```

## 📱 Bot Commands

### Customer Commands
- `/start` - Welcome message and quick menu
- `/register <id> <password>` - Register your account
- `/balance` - Check current balance
- `/account` - Full account management menu
- `/help` - Get help and support

### Admin Commands
- `/admin` or `/dashboard` - Admin dashboard with statistics
- `/help` - Help for all commands

## 🏗️ Project Structure

```
myfilterbot/
├── main_bot.py          # Main bot entry point
├── src/
│   ├── __init__.py      # Package initialization
│   ├── config.py        # Configuration and settings
│   ├── database.py      # Database abstraction layer
│   ├── handlers.py      # Bot command handlers
│   └── utils.py         # Utility functions
├── portal/
│   └── index.html       # Customer web portal
├── customer_database.json  # Customer data
└── requirements.txt     # Python dependencies
```

## 🔧 Configuration

Edit `src/config.py` to customize:
- Alert thresholds
- Transaction patterns
- Keywords and filters
- Message templates

## 💼 Customer Management

### Adding Customers
Customers are stored in `customer_database.json`. Each customer has:
- Customer ID
- Password
- Balance
- Weekly P&L
- Contact information

### Registration Process
1. Customer sends `/register BB1042 N9H9`
2. Bot validates credentials
3. Links Telegram account
4. Starts monitoring and alerts

## 📊 Transaction Detection

The bot automatically detects:
- Deposits (credited, received, added)
- Withdrawals (withdrawn, sent, deducted)
- Denials (denied, rejected, failed)
- Pending transactions
- Expired sessions

## 🌐 Web Portal

Customer portal available at:
`https://brendadeeznuts1111.github.io/myfilterbot/`

Features:
- Balance display
- P&L charts
- Transaction history
- Account alerts

## 📈 Analytics

The bot tracks:
- Total customer balance
- Weekly P&L performance
- Transaction volume
- Active vs inactive customers
- Top performers

## 🔒 Security

- Password-protected registration
- Rate limiting to prevent spam
- Secure database with backups
- Admin-only commands
- Telegram authentication

## 🛠️ Development

### Running Tests
```bash
python3 smoke_test.py
```

### Database Backup
Automatic backups are created before each save in `customer_database.json.backup`

### Adding Features
1. Add handlers in `src/handlers.py`
2. Update config in `src/config.py`
3. Add utilities in `src/utils.py`

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Support

For issues or questions:
- Create an issue on GitHub
- Contact @admin on Telegram

## 🎯 Roadmap

- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Email notifications
- [ ] API for external integrations
- [ ] Mobile app

---

**Version:** 2.0.0  
**Author:** Fantdev  
**Repository:** https://github.com/brendadeeznuts1111/myfilterbot