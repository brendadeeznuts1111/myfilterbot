# Telegram Filter Bot Setup Guide

## Quick Setup (5 minutes)

### 1. Create Your Bot in Telegram Web
1. Open Telegram Web and search for `@BotFather`
2. Send `/newbot` to BotFather
3. Choose a name (e.g., "My Filter Bot")
4. Choose a username ending in `bot` (e.g., "myfilter123_bot")
5. **SAVE THE TOKEN** BotFather gives you (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Get Your Personal Chat ID
1. In Telegram, search for `@userinfobot`
2. Start a chat with it
3. It will show your ID (a number like `123456789`)
4. **SAVE THIS NUMBER**

### 3. Setup the Bot Code
1. Open `filter_bot.py` in a text editor
2. Replace `YOUR_BOT_TOKEN_HERE` with your token from step 1
3. Replace `YOUR_CHAT_ID_HERE` with your ID from step 2
4. Save the file

### 4. Install Python Requirements
Open Terminal and run:
```bash
pip install python-telegram-bot
```

### 5. Add Bot to Your Group
1. Open the group you want to filter in Telegram
2. Click group name → Add Members
3. Search for your bot's username
4. Add it to the group
5. **IMPORTANT:** Make the bot an admin:
   - Click on the bot in members list
   - Select "Promote to Admin"
   - Enable "Read Messages" permission

### 6. Run the Bot
In Terminal, navigate to this folder and run:
```bash
python filter_bot.py
```

You should see:
```
✅ Bot configured!
📋 Filtering keywords: urgent, help, important, emergency, asap, #task
📬 Forwarding to chat: [your chat id]
Starting bot... (Press Ctrl+C to stop)
```

## How It Works
- The bot monitors all messages in your group
- When someone writes a message containing your keywords (urgent, help, etc.)
- That message gets instantly forwarded to your personal Telegram chat
- You see it immediately in Telegram Web

## Customization
Edit these in `filter_bot.py`:
- `KEYWORDS`: Add/remove words to filter for
- `IMPORTANT_USERS`: Add usernames to always forward from (e.g., your boss)

## Troubleshooting
- **Bot not responding?** Make sure it's an admin in the group
- **No forwards?** Check your chat ID is correct
- **Error messages?** The bot token might be wrong

## To Stop the Bot
Press `Ctrl+C` in Terminal