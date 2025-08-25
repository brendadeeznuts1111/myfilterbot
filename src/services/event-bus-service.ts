/**
 * Event Bus Service
 * Main service that sets up and manages the event-driven architecture
 */

import { EventBus } from './event-bus';
import { STREAMS, CONSUMER_GROUPS } from './event-types';
import {
  customerValidationHandler,
  transactionRequestedHandler,
  fraudCheckHandler,
  notificationHandler,
  telegramMessageHandler
} from './event-handlers';

export class EventBusService {
  private eventBus: EventBus;
  private isInitialized = false;

  constructor(redisUrl?: string) {
    this.eventBus = new EventBus(redisUrl);
  }

  /**
   * Initialize the event bus with all streams and handlers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('⚠️ Event Bus Service already initialized');
      return;
    }

    console.log('🚀 Initializing Event Bus Service...');

    try {
      // Register all streams
      await this.registerStreams();
      
      // Register all event handlers
      await this.registerHandlers();
      
      // Start the event bus
      await this.eventBus.start();
      
      this.isInitialized = true;
      console.log('✅ Event Bus Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Event Bus Service:', error);
      throw error;
    }
  }

  /**
   * Register all event streams
   */
  private async registerStreams(): Promise<void> {
    const streams = [
      {
        name: STREAMS.CUSTOMER,
        consumerGroup: CONSUMER_GROUPS.BOT_HANDLERS,
        consumerName: 'customer-handler-1',
        maxLength: 10000,
        batchSize: 10,
      },
      {
        name: STREAMS.TRANSACTION,
        consumerGroup: CONSUMER_GROUPS.TRANSACTION_PROCESSOR,
        consumerName: 'transaction-processor-1',
        maxLength: 50000,
        batchSize: 20,
      },
      {
        name: STREAMS.FRAUD,
        consumerGroup: CONSUMER_GROUPS.FRAUD_DETECTOR,
        consumerName: 'fraud-detector-1',
        maxLength: 20000,
        batchSize: 5,
      },
      {
        name: STREAMS.NOTIFICATION,
        consumerGroup: CONSUMER_GROUPS.NOTIFICATION_SERVICE,
        consumerName: 'notification-service-1',
        maxLength: 30000,
        batchSize: 15,
      },
      {
        name: STREAMS.TELEGRAM,
        consumerGroup: CONSUMER_GROUPS.BOT_HANDLERS,
        consumerName: 'telegram-handler-1',
        maxLength: 100000,
        batchSize: 25,
      },
      {
        name: STREAMS.SYSTEM,
        consumerGroup: CONSUMER_GROUPS.ANALYTICS,
        consumerName: 'system-monitor-1',
        maxLength: 50000,
        batchSize: 10,
      },
    ];

    for (const stream of streams) {
      await this.eventBus.registerStream(stream);
    }

    console.log(`📡 Registered ${streams.length} event streams`);
  }

  /**
   * Register all event handlers
   */
  private async registerHandlers(): Promise<void> {
    // Customer events
    this.eventBus.subscribe('customer.validated', customerValidationHandler);
    this.eventBus.subscribe('customer.registered', customerValidationHandler);

    // Transaction events
    this.eventBus.subscribe('transaction.requested', transactionRequestedHandler);
    this.eventBus.subscribe('transaction.processing', transactionRequestedHandler);

    // Fraud events
    this.eventBus.subscribe('fraud.check.requested', fraudCheckHandler);

    // Notification events
    this.eventBus.subscribe('notification.requested', notificationHandler);

    // Telegram events
    this.eventBus.subscribe('telegram.message.received', telegramMessageHandler);
    this.eventBus.subscribe('telegram.command.processed', telegramMessageHandler);

    // System events
    this.eventBus.subscribe('system.error', this.handleSystemError.bind(this));
    this.eventBus.subscribe('system.health.check', this.handleHealthCheck.bind(this));

    console.log('🔔 Registered all event handlers');
  }

  /**
   * Publish an event to the appropriate stream
   */
  async publishEvent(streamName: string, eventType: string, data: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Event Bus Service not initialized');
    }

    return await this.eventBus.publish(streamName, {
      type: eventType,
      source: 'telegram-bot-system',
      data,
      priority,
    });
  }

  /**
   * Publish customer event
   */
  async publishCustomerEvent(eventType: string, data: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<string> {
    return this.publishEvent(STREAMS.CUSTOMER, eventType, data, priority);
  }

  /**
   * Publish transaction event
   */
  async publishTransactionEvent(eventType: string, data: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'high'): Promise<string> {
    return this.publishEvent(STREAMS.TRANSACTION, eventType, data, priority);
  }

  /**
   * Publish fraud event
   */
  async publishFraudEvent(eventType: string, data: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'high'): Promise<string> {
    return this.publishEvent(STREAMS.FRAUD, eventType, data, priority);
  }

  /**
   * Publish notification event
   */
  async publishNotificationEvent(eventType: string, data: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<string> {
    return this.publishEvent(STREAMS.NOTIFICATION, eventType, data, priority);
  }

  /**
   * Publish Telegram event
   */
  async publishTelegramEvent(eventType: string, data: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<string> {
    return this.publishEvent(STREAMS.TELEGRAM, eventType, data, priority);
  }

  /**
   * Handle system errors
   */
  private async handleSystemError(message: any): Promise<void> {
    console.error('🚨 System Error Event:', message.data);
    
    // Could trigger alerts, logging, etc.
    if (message.data.severity === 'critical') {
      // Send immediate notification to admin
      await this.publishNotificationEvent('notification.requested', {
        customerId: 'ADMIN',
        channel: 'telegram',
        template: 'system_error',
        variables: message.data,
        priority: 'urgent',
      }, 'critical');
    }
  }

  /**
   * Handle health checks
   */
  private async handleHealthCheck(message: any): Promise<void> {
    console.log('💓 Health Check:', message.data);
    
    // Store health metrics, trigger alerts if unhealthy
    if (message.data.status === 'unhealthy') {
      await this.publishNotificationEvent('notification.requested', {
        customerId: 'ADMIN',
        channel: 'telegram',
        template: 'health_alert',
        variables: message.data,
        priority: 'high',
      }, 'high');
    }
  }

  /**
   * Get event bus statistics
   */
  async getStatistics(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const streamName of Object.values(STREAMS)) {
      try {
        stats[streamName] = await this.eventBus.getStreamStats(streamName);
      } catch (error) {
        stats[streamName] = { error: error.message };
      }
    }
    
    return stats;
  }

  /**
   * Stop the event bus service
   */
  async stop(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    console.log('⏹️ Stopping Event Bus Service...');
    await this.eventBus.stop();
    this.isInitialized = false;
    console.log('✅ Event Bus Service stopped');
  }

  /**
   * Check if the service is running
   */
  isRunning(): boolean {
    return this.isInitialized;
  }
}

// Global instance
export const eventBusService = new EventBusService(
  process.env.REDIS_URL || 'redis://localhost:6379'
);

// Convenience functions for easy use throughout the application
export const publishCustomerEvent = (eventType: string, data: any, priority?: 'low' | 'medium' | 'high' | 'critical') => 
  eventBusService.publishCustomerEvent(eventType, data, priority);

export const publishTransactionEvent = (eventType: string, data: any, priority?: 'low' | 'medium' | 'high' | 'critical') => 
  eventBusService.publishTransactionEvent(eventType, data, priority);

export const publishFraudEvent = (eventType: string, data: any, priority?: 'low' | 'medium' | 'high' | 'critical') => 
  eventBusService.publishFraudEvent(eventType, data, priority);

export const publishNotificationEvent = (eventType: string, data: any, priority?: 'low' | 'medium' | 'high' | 'critical') => 
  eventBusService.publishNotificationEvent(eventType, data, priority);

export const publishTelegramEvent = (eventType: string, data: any, priority?: 'low' | 'medium' | 'high' | 'critical') => 
  eventBusService.publishTelegramEvent(eventType, data, priority);
