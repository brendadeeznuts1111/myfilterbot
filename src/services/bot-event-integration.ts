/**
 * Bot Event Integration
 * Bridges existing bot handlers with the new event-driven architecture
 */

import { eventBusService, publishTelegramEvent, publishCustomerEvent, publishTransactionEvent } from './event-bus-service';

export class BotEventIntegration {
  private static instance: BotEventIntegration;
  private isInitialized = false;

  static getInstance(): BotEventIntegration {
    if (!BotEventIntegration.instance) {
      BotEventIntegration.instance = new BotEventIntegration();
    }
    return BotEventIntegration.instance;
  }

  /**
   * Initialize the integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🔗 Initializing Bot Event Integration...');
    
    try {
      // Initialize the event bus service
      await eventBusService.initialize();
      
      this.isInitialized = true;
      console.log('✅ Bot Event Integration initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Bot Event Integration:', error);
      throw error;
    }
  }

  /**
   * Handle Telegram message (called from existing bot handlers)
   */
  async onTelegramMessage(messageData: {
    messageId: number;
    chatId: number;
    userId: number;
    username?: string;
    text: string;
    messageType: 'text' | 'command' | 'callback' | 'inline';
    botInstance?: 'main' | 'cashier' | 'admin';
  }): Promise<void> {
    if (!this.isInitialized) {
      console.warn('⚠️ Bot Event Integration not initialized');
      return;
    }

    try {
      await publishTelegramEvent('telegram.message.received', {
        ...messageData,
        botInstance: messageData.botInstance || 'main',
      });
      
      console.log(`📱 Published Telegram message event for user ${messageData.userId}`);
    } catch (error) {
      console.error('❌ Error publishing Telegram message event:', error);
    }
  }

  /**
   * Handle customer registration (called from existing registration handlers)
   */
  async onCustomerRegistered(customerData: {
    customerId: string;
    telegramId: number;
    telegramUsername?: string;
    registrationMethod: 'bot' | 'portal' | 'api';
  }): Promise<void> {
    if (!this.isInitialized) {
      console.warn('⚠️ Bot Event Integration not initialized');
      return;
    }

    try {
      await publishCustomerEvent('customer.registered', customerData, 'medium');
      console.log(`👤 Published customer registration event for ${customerData.customerId}`);
    } catch (error) {
      console.error('❌ Error publishing customer registration event:', error);
    }
  }

  /**
   * Handle customer validation (called from existing validation handlers)
   */
  async onCustomerValidated(validationData: {
    customerId: string;
    telegramId: number;
    isValid: boolean;
    validationErrors?: string[];
  }): Promise<void> {
    if (!this.isInitialized) {
      console.warn('⚠️ Bot Event Integration not initialized');
      return;
    }

    try {
      await publishCustomerEvent('customer.validated', validationData, 'medium');
      console.log(`✅ Published customer validation event for ${validationData.customerId}`);
    } catch (error) {
      console.error('❌ Error publishing customer validation event:', error);
    }
  }

  /**
   * Handle transaction request (called from existing transaction handlers)
   */
  async onTransactionRequested(transactionData: {
    transactionId: string;
    customerId: string;
    type: 'deposit' | 'withdrawal' | 'bet' | 'payout';
    amount: number;
    currency: string;
    paymentMethod?: string;
    description?: string;
  }): Promise<void> {
    if (!this.isInitialized) {
      console.warn('⚠️ Bot Event Integration not initialized');
      return;
    }

    try {
      await publishTransactionEvent('transaction.requested', transactionData, 'high');
      console.log(`💳 Published transaction request event for ${transactionData.transactionId}`);
    } catch (error) {
      console.error('❌ Error publishing transaction request event:', error);
    }
  }

  /**
   * Handle balance update (called from existing balance handlers)
   */
  async onBalanceUpdated(balanceData: {
    customerId: string;
    oldBalance: number;
    newBalance: number;
    changeAmount: number;
    changeReason: string;
    transactionId?: string;
  }): Promise<void> {
    if (!this.isInitialized) {
      console.warn('⚠️ Bot Event Integration not initialized');
      return;
    }

    try {
      await publishCustomerEvent('customer.balance.updated', balanceData, 'medium');
      console.log(`💰 Published balance update event for ${balanceData.customerId}`);
    } catch (error) {
      console.error('❌ Error publishing balance update event:', error);
    }
  }

  /**
   * Handle command processing (called from existing command handlers)
   */
  async onCommandProcessed(commandData: {
    command: string;
    userId: number;
    chatId: number;
    args: string[];
    processingTime: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    if (!this.isInitialized) {
      console.warn('⚠️ Bot Event Integration not initialized');
      return;
    }

    try {
      await publishTelegramEvent('telegram.command.processed', commandData);
      console.log(`⚡ Published command processed event: ${commandData.command}`);
    } catch (error) {
      console.error('❌ Error publishing command processed event:', error);
    }
  }

  /**
   * Get event bus statistics
   */
  async getStatistics(): Promise<Record<string, any>> {
    if (!this.isInitialized) {
      return { error: 'Not initialized' };
    }

    return await eventBusService.getStatistics();
  }

  /**
   * Check if integration is running
   */
  isRunning(): boolean {
    return this.isInitialized && eventBusService.isRunning();
  }

  /**
   * Stop the integration
   */
  async stop(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    console.log('⏹️ Stopping Bot Event Integration...');
    await eventBusService.stop();
    this.isInitialized = false;
    console.log('✅ Bot Event Integration stopped');
  }
}

// Global instance for easy access
export const botEventIntegration = BotEventIntegration.getInstance();

// Convenience functions for existing bot code to use
export const onTelegramMessage = (messageData: any) => botEventIntegration.onTelegramMessage(messageData);
export const onCustomerRegistered = (customerData: any) => botEventIntegration.onCustomerRegistered(customerData);
export const onCustomerValidated = (validationData: any) => botEventIntegration.onCustomerValidated(validationData);
export const onTransactionRequested = (transactionData: any) => botEventIntegration.onTransactionRequested(transactionData);
export const onBalanceUpdated = (balanceData: any) => botEventIntegration.onBalanceUpdated(balanceData);
export const onCommandProcessed = (commandData: any) => botEventIntegration.onCommandProcessed(commandData);

/**
 * Initialize the bot event integration
 * Call this from your main bot startup
 */
export async function initializeBotEventIntegration(): Promise<void> {
  try {
    await botEventIntegration.initialize();
    console.log('🎉 Bot Event Integration ready!');
  } catch (error) {
    console.error('💥 Failed to initialize Bot Event Integration:', error);
    throw error;
  }
}

/**
 * Middleware function to wrap existing handlers with event publishing
 */
export function withEventPublishing<T extends (...args: any[]) => any>(
  originalHandler: T,
  eventPublisher: (result: any, ...args: Parameters<T>) => Promise<void>
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    
    try {
      const result = await originalHandler(...args);
      // Publish success event
      await eventPublisher(result, ...args);
      
      return result;
    } catch (error) {
      // Publish error event
      await eventPublisher({ error: error.message, processingTime: Date.now() - startTime }, ...args);
      
      throw error;
    }
  }) as T;
}
