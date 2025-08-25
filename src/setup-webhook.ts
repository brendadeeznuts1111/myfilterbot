#!/usr/bin/env bun
/**
 * Setup Telegram webhook for Cloudflare Worker
 * Handles rate limiting and provides rollback options
 */

// Read bot token from config.py using Bun native APIs
import { join } from 'path';

async function getBotTokenFromConfig(): Promise<string | undefined> {
  try {
    const configPath = join(process.cwd(), 'src', 'config.py');
    // Use Bun.file() for faster file reading (no blocking I/O)
    const configFile = Bun.file(configPath);
    const configContent = await configFile.text();
    const tokenMatch = configContent.match(/token:\s*str\s*=\s*"([^"]+)"/);
    return tokenMatch ? tokenMatch[1] : undefined;
  } catch (error) {
    return undefined;
  }
}

interface WebhookInfo {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

class WebhookSetup {
  private botToken: string;
  private workerUrl: string;
  private webhookSecret: string;
  private apiBaseUrl: string = 'https://api.telegram.org';

  constructor() {
    // Initialize with environment variables first (Bun.env is faster than process.env)
    this.workerUrl = Bun.env.WORKER_URL || 'https://telegram-bot-worker.workers.dev';
    this.webhookSecret = Bun.env.WEBHOOK_SECRET || this.generateSecret();
    this.botToken = Bun.env.BOT_TOKEN || ''; // Will be resolved in async init
  }

  /**
   * Async initialization to load config from file if needed
   */
  async init(): Promise<void> {
    if (!this.botToken) {
      this.botToken = await getBotTokenFromConfig() || '';
    }
    
    if (!this.botToken) {
      console.error('❌ BOT_TOKEN is required!');
      console.log('Set it in environment variable BOT_TOKEN or in src/config.py');
      process.exit(1);
    }
  }

  /**
   * Generate a secure webhook secret
   */
  private generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  /**
   * Make Telegram API call with error handling
   */
  private async apiCall(method: string, params: any = {}): Promise<any> {
    const url = `${this.apiBaseUrl}/bot${this.botToken}/${method}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.description || 'API call failed');
      }
      
      return data.result;
    } catch (error) {
      console.error(`❌ API Error (${method}):`, error);
      throw error;
    }
  }

  /**
   * Get current webhook info
   */
  async getWebhookInfo(): Promise<WebhookInfo> {
    console.log('📡 Getting current webhook info...');
    const info = await this.apiCall('getWebhookInfo');
    return info;
  }

  /**
   * Delete existing webhook
   */
  async deleteWebhook(): Promise<boolean> {
    console.log('🗑️  Deleting existing webhook...');
    const result = await this.apiCall('deleteWebhook');
    if (result) {
      console.log('✅ Webhook deleted successfully');
    }
    return result;
  }

  /**
   * Set new webhook
   */
  async setWebhook(url?: string): Promise<boolean> {
    const webhookUrl = url || `${this.workerUrl}/webhook`;
    
    console.log('🔧 Setting new webhook...');
    console.log(`   URL: ${webhookUrl}`);
    console.log(`   Secret: ${this.webhookSecret.substring(0, 8)}...`);
    
    const params = {
      url: webhookUrl,
      secret_token: this.webhookSecret,
      max_connections: 100,
      allowed_updates: [
        'message',
        'edited_message',
        'channel_post',
        'edited_channel_post',
        'inline_query',
        'chosen_inline_result',
        'callback_query',
        'shipping_query',
        'pre_checkout_query',
        'poll',
        'poll_answer',
        'my_chat_member',
        'chat_member',
        'chat_join_request'
      ]
    };

    try {
      const result = await this.apiCall('setWebhook', params);
      if (result) {
        console.log('✅ Webhook set successfully!');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to set webhook:', error);
      return false;
    }
    
    return false;
  }

  /**
   * Test webhook with getMe
   */
  async testBot(): Promise<void> {
    console.log('🤖 Testing bot connection...');
    try {
      const me = await this.apiCall('getMe');
      console.log('✅ Bot connected successfully!');
      console.log(`   Username: @${me.username}`);
      console.log(`   Name: ${me.first_name}`);
      console.log(`   ID: ${me.id}`);
    } catch (error) {
      console.error('❌ Failed to connect to bot');
      throw error;
    }
  }

  /**
   * Main setup flow
   */
  async setup(): Promise<void> {
    console.log('🚀 Telegram Webhook Setup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Ensure async initialization is complete
    await this.init();
    
    try {
      // Test bot connection
      await this.testBot();
      
      // Get current webhook info
      const currentInfo = await this.getWebhookInfo();
      
      if (currentInfo.url) {
        console.log('\n⚠️  Existing webhook found:');
        console.log(`   URL: ${currentInfo.url}`);
        console.log(`   Pending updates: ${currentInfo.pending_update_count || 0}`);
        
        if (currentInfo.last_error_message) {
          console.log(`   ❌ Last error: ${currentInfo.last_error_message}`);
        }
        
        // Ask for confirmation
        console.log('\n🤔 Do you want to replace it? (y/n)');
        const answer = prompt('> ');
        
        if (answer?.toLowerCase() !== 'y') {
          console.log('❌ Setup cancelled');
          return;
        }
        
        // Delete existing webhook
        await this.deleteWebhook();
      }
      
      // Set new webhook
      const success = await this.setWebhook();
      
      if (success) {
        // Verify webhook
        await this.delay(1000);
        const newInfo = await this.getWebhookInfo();
        
        console.log('\n✅ Webhook Configuration:');
        console.log(`   URL: ${newInfo.url}`);
        console.log(`   Max connections: ${newInfo.max_connections}`);
        console.log(`   IP: ${newInfo.ip_address || 'Not resolved yet'}`);
        
        // Save configuration
        console.log('\n💾 Configuration to save:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Add these to your Cloudflare Worker secrets:');
        console.log(`\nBOT_TOKEN=${this.botToken}`);
        console.log(`WEBHOOK_SECRET=${this.webhookSecret}`);
        console.log('\nRun these commands:');
        console.log(`bunx --package wrangler wrangler secret put BOT_TOKEN`);
        console.log(`bunx --package wrangler wrangler secret put WEBHOOK_SECRET`);
        
        console.log('\n✅ Setup complete!');
      } else {
        console.log('\n❌ Setup failed!');
      }
      
    } catch (error) {
      console.error('\n❌ Setup error:', error);
      process.exit(1);
    }
  }

  /**
   * Utility delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Interactive mode
   */
  async interactive(): Promise<void> {
    console.log('🎮 Interactive Webhook Setup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Ensure async initialization is complete
    await this.init();
    
    // Get Worker URL
    console.log('\n📡 Enter your Cloudflare Worker URL:');
    console.log('   (e.g., https://telegram-bot-worker.username.workers.dev)');
    console.log(`   Default: ${this.workerUrl}`);
    const workerInput = prompt('> ');
    if (workerInput) {
      this.workerUrl = workerInput;
    }
    
    // Generate or input secret
    console.log('\n🔐 Webhook secret (press Enter to generate):');
    const secretInput = prompt('> ');
    if (secretInput) {
      this.webhookSecret = secretInput;
    }
    
    // Proceed with setup
    await this.setup();
  }
}

// Run setup with Bun native performance
const setup = new WebhookSetup();

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Telegram Webhook Setup for Cloudflare Worker

Usage: bun run setup-webhook.ts [options]

Options:
  --url <worker-url>     Cloudflare Worker URL
  --token <bot-token>    Telegram Bot Token
  --secret <secret>      Webhook secret (auto-generated if not provided)
  --delete               Delete existing webhook only
  --info                 Show current webhook info only
  --interactive          Interactive setup mode
  --help, -h             Show this help

Examples:
  bun run setup-webhook.ts --interactive
  bun run setup-webhook.ts --url https://bot.example.workers.dev
  bun run setup-webhook.ts --info
  bun run setup-webhook.ts --delete
`);
  process.exit(0);
}

// Handle different modes
if (args.includes('--info')) {
  setup.getWebhookInfo().then(info => {
    console.log('Current Webhook Info:', JSON.stringify(info, null, 2));
  });
} else if (args.includes('--delete')) {
  setup.deleteWebhook();
} else if (args.includes('--interactive')) {
  setup.interactive();
} else {
  // Parse command line arguments
  const urlIndex = args.indexOf('--url');
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    process.env.WORKER_URL = args[urlIndex + 1];
  }
  
  const tokenIndex = args.indexOf('--token');
  if (tokenIndex !== -1 && args[tokenIndex + 1]) {
    process.env.BOT_TOKEN = args[tokenIndex + 1];
  }
  
  const secretIndex = args.indexOf('--secret');
  if (secretIndex !== -1 && args[secretIndex + 1]) {
    process.env.WEBHOOK_SECRET = args[secretIndex + 1];
  }
  
  setup.setup();
}