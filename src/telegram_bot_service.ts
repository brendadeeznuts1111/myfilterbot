/**
 * Telegram Bot Service for Fantasy402.com Integration
 * Connects to the real Telegram bot and monitors transactions
 */

import { serve } from "bun";
import { config } from "../config/env.config";

// Bot configuration from src/config.py
const BOT_TOKEN = "7555654864:AAE8ZsVnJbRK_41JZVMZAXDSCFstGRcxCY0";
const ADMIN_CHAT_ID = "-2714719687";
const WEBHOOK_URL = `${config.WEBSOCKET_URL}/webhook`;

// Load customer configuration
const configFile = await Bun.file("./customer_config.json");
const customerConfig = await configFile.json();

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      username?: string;
      first_name: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
    };
    text?: string;
    date: number;
  };
}

class TelegramBotService {
  private botToken: string;
  private adminChatId: string;
  private customers: any;
  private transactionPatterns: { [key: string]: RegExp[] };

  constructor() {
    this.botToken = BOT_TOKEN;
    this.adminChatId = ADMIN_CHAT_ID;
    this.customers = customerConfig.customers;
    
    // Transaction detection patterns from src/config.py
    this.transactionPatterns = {
      deposit: [
        /\[credited!\]/i,
        /\bcredited\b/i,
        /deposit.*success/i,
        /received.*\$?\d+/i,
        /added.*account/i,
        /payment.*received/i
      ],
      withdrawal: [
        /\bwithdraw/i,
        /\bwithdrawn\b/i,
        /sent.*\$?\d+/i,
        /withdrawal.*success/i,
        /deducted.*account/i
      ],
      denied: [
        /\bdenied\b/i,
        /\brejected\b/i,
        /\bfailed\b/i,
        /insufficient.*funds/i,
        /transaction.*failed/i,
        /not.*approved/i
      ],
      pending: [
        /\bpending\b/i,
        /\bprocessing\b/i,
        /confirming/i,
        /awaiting.*confirmation/i,
        /under.*review/i
      ],
      expired: [
        /\bexpired\b/i,
        /timeout/i,
        /10 minutes.*expired/i,
        /session.*ended/i,
        /time.*limit/i
      ]
    };
  }

  async setWebhook() {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: WEBHOOK_URL,
          allowed_updates: ['message', 'callback_query']
        })
      });
      
      const result = await response.json();
      console.log('Webhook set:', result);
      return result;
    } catch (error) {
      console.error('Failed to set webhook:', error);
      throw error;
    }
  }

  async sendMessage(chatId: string, text: string) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  detectTransaction(message: string): { type: string | null; confidence: number } {
    let bestMatch = { type: null, confidence: 0 };
    
    for (const [type, patterns] of Object.entries(this.transactionPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          const confidence = type === 'denied' ? 0.95 : type === 'expired' ? 0.9 : 0.85;
          if (confidence > bestMatch.confidence) {
            bestMatch = { type, confidence };
          }
        }
      }
    }
    
    return bestMatch;
  }

  findCustomerInMessage(message: string): string | null {
    for (const [customerId, customer] of Object.entries(this.customers)) {
      const keywords = (customer as any).keywords || [];
      
      for (const keyword of keywords) {
        if (message.toLowerCase().includes(keyword.toLowerCase())) {
          return customerId;
        }
      }
    }
    
    return null;
  }

  async processMessage(update: TelegramUpdate) {
    if (!update.message?.text) return;
    
    const message = update.message.text;
    const chatId = update.message.chat.id.toString();
    
    console.log(`📱 Message from ${chatId}: ${message}`);
    
    // Detect transaction
    const transaction = this.detectTransaction(message);
    const customerId = this.findCustomerInMessage(message);
    
    if (transaction.type && customerId) {
      console.log(`🔔 Transaction detected: ${transaction.type} for ${customerId}`);
      
      // Send alert to admin chat
      const alertMessage = `
🔔 <b>Transaction Alert</b>
━━━━━━━━━━━━━━━━

<b>Customer:</b> ${customerId}
<b>Type:</b> ${transaction.type.toUpperCase()}
<b>Confidence:</b> ${(transaction.confidence * 100).toFixed(1)}%

<b>Message:</b>
${message}

<b>Time:</b> ${new Date().toLocaleString()}
      `.trim();
      
      await this.sendMessage(this.adminChatId, alertMessage);
      
      // Update customer data (integrate with admin portal)
      await this.updateCustomerBalance(customerId, transaction.type);
    }
    
    // Handle bot commands
    if (message.startsWith('/')) {
      await this.handleCommand(update);
    }
  }

  async handleCommand(update: TelegramUpdate) {
    const message = update.message!.text!;
    const chatId = update.message!.chat.id.toString();
    const userId = update.message!.from.id;
    const username = update.message!.from.username;
    
    const [command, ...args] = message.split(' ');
    
    switch (command.toLowerCase()) {
      case '/start':
        await this.sendMessage(chatId, `
🤖 <b>FantDev Trading Bot</b>
━━━━━━━━━━━━━━━━━━

Welcome to your automated trading assistant!

<b>Available Commands:</b>
• /register &lt;customer_id&gt; &lt;password&gt; - Register your account
• /balance - Check your balance
• /help - Get help
• /admin - Admin dashboard

<b>Features:</b>
✅ Real-time transaction monitoring
📊 Balance tracking &amp; P&amp;L analysis
🔔 Instant alerts for important events
📈 Weekly performance reports

Add me to your group to start monitoring!
        `);
        break;
        
      case '/register':
        if (args.length < 2) {
          await this.sendMessage(chatId, '❌ Usage: /register &lt;customer_id&gt; &lt;password&gt;');
          return;
        }
        
        const [customerId, password] = args;
        if (this.customers[customerId]?.password === password) {
          await this.sendMessage(chatId, `
✅ <b>Registration Successful!</b>

<b>Account:</b> ${customerId}
<b>Status:</b> Active
<b>Telegram:</b> @${username}

You'll now receive:
• Transaction confirmations
• Balance updates
• Important alerts
• Weekly reports
          `);
          
          // Store telegram_id for customer
          // This would update the customer_config.json
          console.log(`✅ Customer ${customerId} registered with Telegram ID: ${userId}`);
        } else {
          await this.sendMessage(chatId, '❌ Invalid credentials. Please check your customer ID and password.');
        }
        break;
        
      case '/balance':
        await this.sendMessage(chatId, '📊 Balance check functionality coming soon!');
        break;
        
      case '/admin':
        await this.sendMessage(chatId, `
📊 <b>Admin Dashboard</b>

Access the web portal:
        🌐 ${config.ADMIN_SERVER_URL}/

<b>Features:</b>
• Customer management
• Real-time statistics
• Transaction monitoring
• Group member control
        `);
        break;
        
      default:
        await this.sendMessage(chatId, 'ℹ️ Unknown command. Type /help for available commands.');
    }
  }

  async updateCustomerBalance(customerId: string, transactionType: string) {
    // This would integrate with the admin portal API
    try {
              await fetch(`${config.API_BASE_URL}/admin/sync-balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`💰 Balance updated for ${customerId} after ${transactionType}`);
    } catch (error) {
      console.error('Failed to update balance:', error);
    }
  }
}

// Create webhook server
const botService = new TelegramBotService();

const server = serve({
  port: 3004,
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/webhook' && req.method === 'POST') {
      try {
        const update: TelegramUpdate = await req.json();
        await botService.processMessage(update);
        return new Response('OK');
      } catch (error) {
        console.error('Webhook error:', error);
        return new Response('Error', { status: 500 });
      }
    }
    
    if (url.pathname === '/setup') {
      try {
        const result = await botService.setWebhook();
        return Response.json(result);
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    if (url.pathname === '/health') {
      return Response.json({ 
        status: 'healthy',
        bot_token: BOT_TOKEN.slice(0, 10) + '...',
        admin_chat: ADMIN_CHAT_ID,
        customers: Object.keys(customerConfig.customers).length
      });
    }
    
    return new Response('Telegram Bot Service', { 
      headers: { 'Content-Type': 'text/plain' } 
    });
  }
});

console.log(`🤖 Telegram Bot Service running on port 3004`);
console.log(`📱 Bot Token: ${BOT_TOKEN.slice(0, 10)}...`);
console.log(`👥 Admin Chat: ${ADMIN_CHAT_ID}`);
console.log(`🔗 Webhook: ${WEBHOOK_URL}`);
    console.log(`⚡ Setup webhook: ${config.WEBSOCKET_URL}/setup`);