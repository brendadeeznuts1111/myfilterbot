#!/usr/bin/env bun
/**
 * Event-Driven Bot Startup Script
 * Demonstrates how to integrate the new event bus with existing bot system
 */

import { initializeBotEventIntegration, onTelegramMessage, onTransactionRequested } from './services/bot-event-integration';
import { eventBusService } from './services/event-bus-service';

// Mock existing bot handlers (replace with actual imports)
interface TelegramUpdate {
  message: {
    message_id: number;
    chat: { id: number };
    from: { id: number; username?: string };
    text: string;
  };
}

class ExistingBotHandlers {
  /**
   * Enhanced message handler with event publishing
   */
  static async handleMessage(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    
    console.log(`📱 Received message from ${message.from.id}: ${message.text}`);
    
    // Publish to event bus
    await onTelegramMessage({
      messageId: message.message_id,
      chatId: message.chat.id,
      userId: message.from.id,
      username: message.from.username,
      text: message.text,
      messageType: message.text.startsWith('/') ? 'command' : 'text',
      botInstance: 'main',
    });
    
    // Process transaction commands
    if (message.text.startsWith('/deposit')) {
      await ExistingBotHandlers.handleDepositCommand(message);
    } else if (message.text.startsWith('/withdraw')) {
      await ExistingBotHandlers.handleWithdrawCommand(message);
    } else if (message.text.startsWith('/balance')) {
      await ExistingBotHandlers.handleBalanceCommand(message);
    }
  }

  /**
   * Enhanced deposit handler with event publishing
   */
  static async handleDepositCommand(message: any): Promise<void> {
    const args = message.text.split(' ');
    const amount = parseFloat(args[1]) || 0;
    
    if (amount <= 0) {
      console.log('❌ Invalid deposit amount');
      return;
    }
    
    const transactionId = `dep_${Date.now()}_${message.from.id}`;
    const customerId = `customer_${message.from.id}`; // Simplified mapping
    
    console.log(`💰 Processing deposit: ${amount} for customer ${customerId}`);
    
    // Publish transaction event
    await onTransactionRequested({
      transactionId,
      customerId,
      type: 'deposit',
      amount,
      currency: 'USD',
      paymentMethod: 'telegram_bot',
      description: `Telegram deposit command: ${message.text}`,
    });
    
    console.log(`✅ Deposit request published to event bus`);
  }

  /**
   * Enhanced withdraw handler with event publishing
   */
  static async handleWithdrawCommand(message: any): Promise<void> {
    const args = message.text.split(' ');
    const amount = parseFloat(args[1]) || 0;
    
    if (amount <= 0) {
      console.log('❌ Invalid withdrawal amount');
      return;
    }
    
    const transactionId = `wth_${Date.now()}_${message.from.id}`;
    const customerId = `customer_${message.from.id}`;
    
    console.log(`💸 Processing withdrawal: ${amount} for customer ${customerId}`);
    
    // Publish transaction event
    await onTransactionRequested({
      transactionId,
      customerId,
      type: 'withdrawal',
      amount,
      currency: 'USD',
      paymentMethod: 'telegram_bot',
      description: `Telegram withdrawal command: ${message.text}`,
    });
    
    console.log(`✅ Withdrawal request published to event bus`);
  }

  /**
   * Balance command handler
   */
  static async handleBalanceCommand(message: any): Promise<void> {
    const customerId = `customer_${message.from.id}`;
    console.log(`💳 Balance request for customer ${customerId}`);
    
    // This would typically query the database and send response
    // For demo, we'll just log
    console.log(`📊 Balance: $1,234.56`);
  }
}

/**
 * Main startup function
 */
async function startEventDrivenBot(): Promise<void> {
  console.log('🚀 Starting Event-Driven Telegram Bot System...');
  
  try {
    // Initialize the event-driven architecture
    await initializeBotEventIntegration();
    
    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⏹️ Shutting down gracefully...');
      await eventBusService.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n⏹️ Shutting down gracefully...');
      await eventBusService.stop();
      process.exit(0);
    });
    
    // Simulate some bot activity for demonstration
    await simulateBotActivity();
    
    console.log('✅ Event-Driven Bot System is running!');
    console.log('📊 Use Ctrl+C to stop');
    
    // Keep the process alive
    await new Promise(() => {}); // Run forever
    
  } catch (error) {
    console.error('💥 Failed to start Event-Driven Bot System:', error);
    process.exit(1);
  }
}

/**
 * Simulate bot activity for demonstration
 */
async function simulateBotActivity(): Promise<void> {
  console.log('🎭 Simulating bot activity...');
  
  // Simulate incoming messages
  const simulatedMessages = [
    { message_id: 1, chat: { id: 123 }, from: { id: 456, username: 'testuser' }, text: '/deposit 100' },
    { message_id: 2, chat: { id: 123 }, from: { id: 789, username: 'anotheruser' }, text: '/balance' },
    { message_id: 3, chat: { id: 123 }, from: { id: 456, username: 'testuser' }, text: '/withdraw 50' },
    { message_id: 4, chat: { id: 123 }, from: { id: 999, username: 'newuser' }, text: 'Hello bot!' },
  ];
  
  for (const message of simulatedMessages) {
    await ExistingBotHandlers.handleMessage({ message });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between messages
  }
  
  console.log('✅ Simulation complete');
}

/**
 * Health check endpoint
 */
async function healthCheck(): Promise<{ status: string; statistics: any }> {
  try {
    const statistics = await eventBusService.getStatistics();
    return {
      status: eventBusService.isRunning() ? 'healthy' : 'unhealthy',
      statistics,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      statistics: { error: error.message },
    };
  }
}

/**
 * CLI interface
 */
if (import.meta.main) {
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      startEventDrivenBot();
      break;
      
    case 'health':
      healthCheck().then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.status === 'healthy' ? 0 : 1);
      });
      break;
      
    case 'simulate':
      initializeBotEventIntegration()
        .then(() => simulateBotActivity())
        .then(() => {
          console.log('✅ Simulation complete');
          return eventBusService.stop();
        })
        .then(() => {
          console.log('🏁 Event Bus stopped');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Simulation failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log(`
🤖 Event-Driven Telegram Bot System

Usage:
  bun src/start-event-driven-bot.ts start     - Start the bot system
  bun src/start-event-driven-bot.ts health    - Check system health
  bun src/start-event-driven-bot.ts simulate  - Run activity simulation

Environment Variables:
  REDIS_URL                - Redis connection URL (default: redis://localhost:6379)
  BOT_TOKEN               - Telegram bot token
  ADMIN_CHAT_ID           - Admin chat ID for notifications

Examples:
  REDIS_URL=redis://localhost:6379 bun src/start-event-driven-bot.ts start
  bun src/start-event-driven-bot.ts health
      `);
      process.exit(1);
  }
}
