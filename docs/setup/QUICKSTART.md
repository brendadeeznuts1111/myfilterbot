# 🚀 Fantdev Trading Bot - Quick Start Guide

## ✅ System Status
- **Bot:** @fantdev_bot (ACTIVE)
- **Customers:** 25 loaded
- **Total Balance:** $17,209
- **Portal:** https://brendadeeznuts1111.github.io/myfilterbot/customer_portal.html

## 📱 Bot Commands

### For Customers:
- `/start` - Welcome message
- `/register BB1042 N9H9` - Register your account
- `/balance` - Check your balance
- `/history` - View transactions

### For Admin:
- `/dashboard` - View all customers and stats
- `/analytics` - Activity reports

## 👥 Customer Accounts

| Customer | Password | Balance | Weekly P&L |
|----------|----------|---------|------------|
| BB1042 | N9H9 | $1,450 | +$3,000 |
| BB1043 | I5H8 | $0 | +$7,000 |
| BB1044 | W2T7 | $0 | +$7,000 |
| BB1045 | V0J3 | $0 | +$6,000 |
| BCC202 | YEPSSS | $8,735 | +$2,600 |
| BB1840 | COMPETE11 | $5,017 | +$72 |

[Full list in customer_database.json]

## 🔍 What Gets Monitored

The bot automatically detects and forwards:
- Customer IDs (BB1042, BB1043, etc.)
- Passwords (when mentioned)
- Keywords: [credited!], deposit, withdrawal, denied
- Amounts: Extracts $ values automatically
- Special users: @blissfulborat

## 📊 How It Works

1. **In Groups:** Bot monitors all messages for customer activity
2. **Detects:** Customer IDs, transactions, keywords
3. **Forwards:** Sends alert to admin with full context
4. **Updates:** Automatically updates balances on deposits/withdrawals
5. **Alerts:** Low balance warnings, large transactions

## 🌐 Customer Portal

Visit: https://brendadeeznuts1111.github.io/myfilterbot/customer_portal.html

Test login:
- Customer ID: `BB1042`
- Password: `N9H9`

Features:
- Live balance display
- Weekly P&L charts
- Transaction history
- Account alerts

## 🔧 Running the Bot

```bash
# Main bot (currently running)
python3 enhanced_bot.py

# Auto reporter (for daily/weekly summaries)
python3 auto_reporter.py

# Run tests
python3 smoke_test.py
```

## 📝 Files Overview

- `enhanced_bot.py` - Main bot with all features
- `customer_database.json` - All 25 customers data
- `customer_portal.html` - Web dashboard
- `auto_reporter.py` - Scheduled reports
- `smoke_test.py` - System tests

## 💬 Testing Messages

Send these to test detection:
- "BB1042 deposit credited $500"
- "[credited!] Transaction complete"
- "deposit was denied for BB1043"
- Message from @blissfulborat (all forwarded)

## 🚨 Automated Alerts

Bot sends alerts for:
- Balance < $100
- Large deposits > $1,000
- Large withdrawals > $500
- 3+ days inactive

## 📅 Scheduled Reports

Auto reporter sends:
- Daily report: 9:00 PM
- Weekly report: Sunday 8:00 PM
- Inactive alerts: 10:00 AM
- Customer alerts: 3:00 PM

---

**Support:** Message @fantdev_bot with any issues
**Repository:** https://github.com/brendadeeznuts1111/myfilterbot