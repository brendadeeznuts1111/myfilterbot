# 🔥 Fire Support CS Bot Setup Guide

## Your Bot is Live! 🎉

**Bot Username:** [@Firesupportcs_bot](https://t.me/Firesupportcs_bot)  
**Bot ID:** 8039557687  
**Status:** ✅ Running

## Quick Start

### 1. Test Your Bot
Open Telegram and search for `@Firesupportcs_bot` or visit:  
https://t.me/Firesupportcs_bot

Try these commands:
- `/start` - See the welcome menu
- `/help` - View all commands
- `/profile` - Check your profile
- `/balance` - View balance
- `/support` - Get support options

### 2. Features Available

#### Customer Commands
- **Account Management**: Profile, balance, settings
- **Transactions**: Deposit, withdraw, history
- **Betting**: Place bets, view results
- **Support**: Live chat, tickets, FAQ
- **Referrals**: Generate and track referral links

#### Admin Features
- Support ticket notifications
- User activity logging
- Transaction tracking
- Real-time message logging

### 3. Integration with Dashboard

All bot events are logged to `data/bot_events.jsonl` and accessible via:
- `/api/admin/telegram/messages` - View all messages
- `/api/admin/telegram/chats` - List active chats
- `/api/admin/telegram/send` - Send messages from dashboard

### 4. Customize Your Bot

#### Set Bot Description
```
/setdescription
🔥 Fire Support CS - Your 24/7 customer support bot for Fantasy402 trading platform. Manage deposits, withdrawals, and get instant support.
```

#### Set About Text
```
/setabouttext
Fire Support CS Bot - Professional customer support for Fantasy402
```

#### Set Commands
```
/setcommands
start - Main menu
help - Show all commands
profile - View your profile
balance - Check balance
deposit - Make a deposit
withdraw - Request withdrawal
support - Get support
ticket - Open support ticket
refer - Get referral link
settings - Account settings
```

### 5. Environment Variables

Add to your `.env` file:
```bash
TELEGRAM_BOT_TOKEN=8039557687:AAEaDQUYya1H0y7qv4tmhYsCSqGrzpS-heU
TELEGRAM_ADMIN_GROUP=-1001234567890  # Your admin group ID
```

### 6. Running in Production

```bash
# With PM2
pm2 start services/bot/fire-support-bot.ts --name "fire-bot"

# With systemd
bun services/bot/fire-support-bot.ts

# With Docker
docker run -e TELEGRAM_BOT_TOKEN=... your-bot-image
```

### 7. Monitor Bot Activity

Check logs:
```bash
tail -f data/bot_events.jsonl
tail -f data/telegram_messages.jsonl
```

View in dashboard:
```
http://localhost:55254/dashboard
→ Telegram Chats tab
```

### 8. Security Notes

⚠️ **IMPORTANT**: 
- Never commit your bot token to git
- Store token in environment variables
- Use `.env` file (already in .gitignore)
- Rotate token if compromised

### 9. Next Steps

1. **Create Admin Group**: Create a Telegram group for admin notifications
2. **Get Group ID**: Add bot to group, it will log the group ID
3. **Update Config**: Set `TELEGRAM_ADMIN_GROUP` in .env
4. **Add Profile Picture**: Send a 512x512 image to @BotFather
5. **Request Username**: Once fully operational, request better username from @BotSupport

## Support

Your bot is now handling customer support 24/7! 🚀

For bot issues, check:
- Logs: `data/bot_events.jsonl`
- Console: Bot output in terminal
- Telegram: @BotFather for bot settings