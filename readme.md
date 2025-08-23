Thank you for the screenshot. I can see you have the **Telegram Web** app installed. This is perfect for the next steps.

Let's be very clear about what this app is and what it is not, as this is the key to moving forward.

*   **What it IS:** Your **viewing window**. It's the official Telegram app that lets you read and send messages in a nice, visual interface.
*   **What it is NOT:** A tool for writing or running automated code. You cannot program it directly.

The automation we discussed (the bot or the Telethon script) is a separate program that runs on your computer and talks to Telegram's servers. It uses your Telegram Web app as its *output display*.

Here is your concrete plan, using the Telegram Web app you already have:

### Your Action Plan: Step-by-Step

**Step 1: Use the Web App to Create Your Filter Bot**

1.  Open your **Telegram Web** app.
2.  In the search bar at the top, type `@BotFather` and open the chat with him.
    ![](https://i.imgur.com/7CzJk2L.png)
3.  Send him the command `/newbot`.
4.  Follow his instructions. He will ask you to:
    *   Choose a name for your bot (e.g., `My Filter Bot`).
    *   Choose a username for your bot (must end in `bot`, e.g., `my_filter_123_bot`).
5.  **CRUCIALLY IMPORTANT:** After creating it, **@BotFather will give you a token.** It will look like a long string of numbers and letters. **SAVE THIS TOKEN.** This is the password for your bot. You will need it for the code.

**Step 2: Use the Web App to Add the Bot to Your Group**

1.  In your Telegram Web app, open the group you want to filter.
2.  Click on the group's name at the top to open its profile.
3.  Click on **"Add Members"**.
4.  Search for your bot's username (e.g., `my_filter_123_bot`).
5.  Add it to the group.
6.  You must now make the bot an **admin** so it can read all messages:
    *   Go to the group members list.
    *   Find your bot, click on it.
    *   Choose **"Admin"** and ensure the **"Read Messages"** permission is enabled. Save.

**Step 3: Run the Python Code on Your Computer**

The Telegram Web app is now setup. The next steps happen on your computer itself.

1.  **Install Python:** If you haven't already, download and install Python from [python.org](https://python.org).
2.  **Open a Command Prompt/Terminal** on your computer (not in Telegram).
3.  Install the required library by typing this command and pressing Enter:
    ```bash
    pip install python-telegram-bot
    ```
4.  Create a new file on your computer called `filter_bot.py`.
5.  **Copy and Paste the code below** into that file.
6.  **Edit the two lines** marked in all caps (`YOUR_TOKEN` and `YOUR_CHAT_ID`).

```python
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes

# 1. REPLACE THIS WITH YOUR TOKEN FROM BOTFATHER
BOT_TOKEN = "1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi" 
# 2. REPLACE THIS WITH YOUR NUMERIC CHAT ID (Message @userinfobot on Telegram to get it)
YOUR_CHAT_ID = "987654321" 
KEYWORDS = ["urgent", "help", "important", "#task"] # Your filter list

async def forward_if_important(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message.text and any(keyword in message.text.lower() for keyword in KEYWORDS):
        # Forward the important message to your private inbox
        await context.bot.forward_message(chat_id=YOUR_CHAT_ID, from_chat_id=message.chat_id, message_id=message.message_id)
        print(f"Forwarded a message: {message.text}")

if __name__ == '__main__':
    print("Starting filter bot...")
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, forward_if_important))
    app.run_polling()
    print("Bot is running and filtering. Press Ctrl+C to stop.")
```

**Step 4: See the Results in Your Web App**

1.  Save the `filter_bot.py` file.
2.  In your Command Prompt/Terminal, navigate to where the file is saved and run it:
    ```bash
    python filter_bot.py
    ```
3.  You should see `"Bot is running and filtering..."`.
4.  Now, go back to your **Telegram Web** app. Anyone in the group who sends a message containing words like "urgent" or "help" will have that message **instantly forwarded to your personal chat** (the chat with yourself called "Saved Messages"). You will see it pop up in your Web App.

The Telegram Web app is your dashboard where you see the final, filtered results. The Python script is the engine working in the background to make it happen.