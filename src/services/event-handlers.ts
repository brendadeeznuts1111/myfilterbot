/**
 * Event Handlers
 * Processes events from the event bus and integrates with existing services
 */

import { EventMessage, EventHandler } from './event-bus';
import { 
  TransactionRequestedEvent, 
  CustomerValidatedEvent,
  FraudCheckRequestedEvent,
  NotificationRequestedEvent,
  TelegramMessageReceivedEvent
} from './event-types';

// Mock database interface for demonstration
interface Customer {
  customer_id: string;
  telegram_id?: number;
  last_activity?: string;
  created_at?: string;
}

interface Transaction {
  transaction_id: string;
  timestamp: string;
  customer_id: string;
  type: string;
  amount: number;
  description?: string;
  status: string;
  payment_method?: string;
}

// Mock database implementation
class MockDatabase {
  private customers: Map<string, Customer> = new Map();
  private transactions: Map<string, Transaction> = new Map();

  async get_customer(customerId: string): Promise<Customer | null> {
    return this.customers.get(customerId) || null;
  }

  async save_customer(customer: Customer): Promise<void> {
    this.customers.set(customer.customer_id, customer);
    console.log(`💾 Saved customer: ${customer.customer_id}`);
  }

  async get_all_customers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async add_transaction(transaction: Transaction): Promise<void> {
    this.transactions.set(transaction.transaction_id, transaction);
    console.log(`💾 Saved transaction: ${transaction.transaction_id}`);
  }

  async get_customer_transactions(customerId: string, hours: number): Promise<Transaction[]> {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return Array.from(this.transactions.values()).filter(t =>
      t.customer_id === customerId &&
      new Date(t.timestamp).getTime() > cutoff
    );
  }
}

const db = new MockDatabase();

export class EventHandlers {
  /**
   * Handle customer validation events
   */
  static async handleCustomerValidation(message: EventMessage): Promise<void> {
    const event = message.data as CustomerValidatedEvent['data'];
    
    console.log(`👤 Processing customer validation for ${event.customerId}`);
    
    try {
      const customer = await db.get_customer(event.customerId);
      if (!customer) {
        console.warn(`⚠️ Customer ${event.customerId} not found`);
        return;
      }

      if (event.isValid) {
        // Update customer as validated
        customer.last_activity = new Date().toISOString();
        if (event.telegramId) {
          customer.telegram_id = event.telegramId;
        }
        await db.save_customer(customer);
        
        console.log(`✅ Customer ${event.customerId} validated successfully`);
      } else {
        console.log(`❌ Customer ${event.customerId} validation failed: ${event.validationErrors?.join(', ')}`);
      }
    } catch (error) {
      console.error(`❌ Error handling customer validation:`, error);
      throw error;
    }
  }

  /**
   * Handle transaction processing events
   */
  static async handleTransactionRequested(message: EventMessage): Promise<void> {
    const event = message.data as TransactionRequestedEvent['data'];
    
    console.log(`💳 Processing transaction request ${event.transactionId}`);
    
    try {
      // Create transaction record
      const transaction: Transaction = {
        transaction_id: event.transactionId,
        timestamp: new Date().toISOString(),
        customer_id: event.customerId,
        type: event.type,
        amount: event.amount,
        description: event.description,
        status: 'pending',
        payment_method: event.paymentMethod,
      };

      await db.add_transaction(transaction);
      
      // Trigger fraud check
      await EventHandlers.triggerFraudCheck(event.customerId, event.transactionId, event.amount);
      
      console.log(`✅ Transaction ${event.transactionId} queued for processing`);
    } catch (error) {
      console.error(`❌ Error handling transaction request:`, error);
      throw error;
    }
  }

  /**
   * Handle fraud detection events
   */
  static async handleFraudCheckRequested(message: EventMessage): Promise<void> {
    const event = message.data as FraudCheckRequestedEvent['data'];
    
    console.log(`🛡️ Processing fraud check for customer ${event.customerId}`);
    
    try {
      // Simple fraud scoring (can be enhanced with ML)
      let riskScore = 0;
      const riskFactors: string[] = [];

      // Check transaction velocity
      if (event.transactionId) {
        const recentTransactions = await db.get_customer_transactions(event.customerId, 24); // Last 24 hours
        if (recentTransactions.length > 10) {
          riskScore += 30;
          riskFactors.push('high_transaction_velocity');
        }
      }

      // Check customer history
      const customer = await db.get_customer(event.customerId);
      if (customer && customer.created_at) {
        const accountAge = Date.now() - new Date(customer.created_at).getTime();
        if (accountAge < 24 * 60 * 60 * 1000) { // Less than 24 hours old
          riskScore += 20;
          riskFactors.push('new_account');
        }
      }

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (riskScore < 20) riskLevel = 'low';
      else if (riskScore < 50) riskLevel = 'medium';
      else if (riskScore < 80) riskLevel = 'high';
      else riskLevel = 'critical';

      console.log(`🛡️ Fraud check completed: ${event.customerId} - Risk: ${riskLevel} (${riskScore})`);
      
      // If high risk, trigger notification
      if (riskLevel === 'high' || riskLevel === 'critical') {
        await EventHandlers.triggerNotification(
          'ADMIN',
          'telegram',
          'fraud_alert',
          {
            customerId: event.customerId,
            riskLevel,
            riskScore,
            riskFactors: riskFactors.join(', ')
          },
          'high'
        );
      }
    } catch (error) {
      console.error(`❌ Error handling fraud check:`, error);
      throw error;
    }
  }

  /**
   * Handle notification requests
   */
  static async handleNotificationRequested(message: EventMessage): Promise<void> {
    const event = message.data as NotificationRequestedEvent['data'];
    
    console.log(`📢 Processing notification for ${event.customerId} via ${event.channel}`);
    
    try {
      if (event.channel === 'telegram') {
        // Get customer's Telegram ID
        const customer = await db.get_customer(event.customerId);
        if (!customer?.telegram_id) {
          console.warn(`⚠️ No Telegram ID for customer ${event.customerId}`);
          return;
        }

        // Format message based on template
        const message = EventHandlers.formatNotificationMessage(event.template, event.variables);
        
        // Send via existing Telegram integration
        // This would integrate with the existing bot services
        console.log(`📱 Sending Telegram notification to ${customer.telegram_id}: ${message}`);
        
        // TODO: Integrate with actual Telegram bot sending
        // await telegramBot.sendMessage(customer.telegram_id, message);
      }
      
      console.log(`✅ Notification sent to ${event.customerId}`);
    } catch (error) {
      console.error(`❌ Error handling notification:`, error);
      throw error;
    }
  }

  /**
   * Handle Telegram message events
   */
  static async handleTelegramMessage(message: EventMessage): Promise<void> {
    const event = message.data as TelegramMessageReceivedEvent['data'];
    
    console.log(`📱 Processing Telegram message from user ${event.userId}`);
    
    try {
      // Find customer by Telegram ID
      const customers = await db.get_all_customers();
      const customer = customers.find(c => c.telegram_id === event.userId);
      
      if (customer) {
        // Update last activity
        customer.last_activity = new Date().toISOString();
        await db.save_customer(customer);
        
        // Check for transaction keywords
        const transactionKeywords = ['deposit', 'withdraw', 'balance', 'bet'];
        const hasTransactionKeyword = transactionKeywords.some(keyword => 
          event.text.toLowerCase().includes(keyword)
        );
        
        if (hasTransactionKeyword) {
          console.log(`💰 Transaction-related message detected from ${customer.customer_id}`);
          // Could trigger transaction processing workflow
        }
      }
      
      console.log(`✅ Telegram message processed`);
    } catch (error) {
      console.error(`❌ Error handling Telegram message:`, error);
      throw error;
    }
  }

  /**
   * Helper: Trigger fraud check
   */
  private static async triggerFraudCheck(
    customerId: string, 
    transactionId: string, 
    _amount: number
  ): Promise<void> {
    // This would publish to the event bus
    console.log(`🛡️ Triggering fraud check for transaction ${transactionId}`);
    // await eventBus.publish(STREAMS.FRAUD, { ... });
  }

  /**
   * Helper: Trigger notification
   */
  private static async triggerNotification(
    customerId: string,
    channel: string,
    template: string,
    variables: Record<string, any>,
    priority: string
  ): Promise<void> {
    console.log(`📢 Triggering ${priority} notification for ${customerId}`);
    // await eventBus.publish(STREAMS.NOTIFICATION, { ... });
  }

  /**
   * Helper: Format notification message
   */
  private static formatNotificationMessage(template: string, variables: Record<string, any>): string {
    const templates: Record<string, string> = {
      'fraud_alert': `🚨 FRAUD ALERT\nCustomer: {customerId}\nRisk Level: {riskLevel}\nScore: {riskScore}\nFactors: {riskFactors}`,
      'transaction_success': `✅ Transaction Successful\nAmount: ${variables.amount}\nType: {type}\nBalance: {newBalance}`,
      'balance_low': `⚠️ Low Balance Alert\nCurrent Balance: {balance}\nPlease deposit funds to continue trading.`,
    };

    let message = templates[template] || template;
    
    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });
    
    return message;
  }
}

// Export individual handlers for easy registration
export const customerValidationHandler: EventHandler = EventHandlers.handleCustomerValidation;
export const transactionRequestedHandler: EventHandler = EventHandlers.handleTransactionRequested;
export const fraudCheckHandler: EventHandler = EventHandlers.handleFraudCheckRequested;
export const notificationHandler: EventHandler = EventHandlers.handleNotificationRequested;
export const telegramMessageHandler: EventHandler = EventHandlers.handleTelegramMessage;
