/**
 * Event Type Definitions
 * Standardized events for the Telegram bot system
 */

// Base event interface
export interface BaseEvent {
  type: string;
  source: string;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  correlationId?: string;
  metadata?: Record<string, any>;
}

// Customer Events
export interface CustomerRegisteredEvent extends BaseEvent {
  type: 'customer.registered';
  data: {
    customerId: string;
    telegramId: number;
    telegramUsername?: string;
    registrationMethod: 'bot' | 'portal' | 'api';
  };
}

export interface CustomerValidatedEvent extends BaseEvent {
  type: 'customer.validated';
  data: {
    customerId: string;
    telegramId: number;
    isValid: boolean;
    validationErrors?: string[];
  };
}

export interface CustomerBalanceUpdatedEvent extends BaseEvent {
  type: 'customer.balance.updated';
  data: {
    customerId: string;
    oldBalance: number;
    newBalance: number;
    changeAmount: number;
    changeReason: string;
    transactionId?: string;
  };
}

// Transaction Events
export interface TransactionRequestedEvent extends BaseEvent {
  type: 'transaction.requested';
  data: {
    transactionId: string;
    customerId: string;
    type: 'deposit' | 'withdrawal' | 'bet' | 'payout';
    amount: number;
    currency: string;
    paymentMethod?: string;
    description?: string;
  };
}

export interface TransactionProcessingEvent extends BaseEvent {
  type: 'transaction.processing';
  data: {
    transactionId: string;
    customerId: string;
    status: 'pending' | 'processing' | 'verifying';
    processingStage: string;
  };
}

export interface TransactionCompletedEvent extends BaseEvent {
  type: 'transaction.completed';
  data: {
    transactionId: string;
    customerId: string;
    type: 'deposit' | 'withdrawal' | 'bet' | 'payout';
    amount: number;
    finalStatus: 'success' | 'failed' | 'cancelled';
    processingTime: number;
    fees?: number;
  };
}

// Fraud Detection Events
export interface FraudCheckRequestedEvent extends BaseEvent {
  type: 'fraud.check.requested';
  data: {
    customerId: string;
    transactionId?: string;
    checkType: 'transaction' | 'login' | 'registration' | 'pattern';
    riskFactors: string[];
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface FraudDetectedEvent extends BaseEvent {
  type: 'fraud.detected';
  data: {
    customerId: string;
    transactionId?: string;
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    detectedPatterns: string[];
    recommendedAction: 'allow' | 'review' | 'block' | 'suspend';
    confidence: number;
  };
}

// Notification Events
export interface NotificationRequestedEvent extends BaseEvent {
  type: 'notification.requested';
  data: {
    customerId: string;
    channel: 'telegram' | 'email' | 'sms' | 'push';
    template: string;
    variables: Record<string, any>;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    scheduledAt?: string;
  };
}

export interface NotificationSentEvent extends BaseEvent {
  type: 'notification.sent';
  data: {
    notificationId: string;
    customerId: string;
    channel: 'telegram' | 'email' | 'sms' | 'push';
    status: 'sent' | 'failed' | 'queued';
    sentAt: string;
    deliveryTime?: number;
  };
}

// Telegram Bot Events
export interface TelegramMessageReceivedEvent extends BaseEvent {
  type: 'telegram.message.received';
  data: {
    messageId: number;
    chatId: number;
    userId: number;
    username?: string;
    text: string;
    messageType: 'text' | 'command' | 'callback' | 'inline';
    botInstance: 'main' | 'cashier' | 'admin';
  };
}

export interface TelegramCommandProcessedEvent extends BaseEvent {
  type: 'telegram.command.processed';
  data: {
    command: string;
    userId: number;
    chatId: number;
    args: string[];
    processingTime: number;
    success: boolean;
    errorMessage?: string;
  };
}

// System Events
export interface SystemHealthCheckEvent extends BaseEvent {
  type: 'system.health.check';
  data: {
    component: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: Record<string, number>;
    timestamp: string;
  };
}

export interface SystemErrorEvent extends BaseEvent {
  type: 'system.error';
  data: {
    component: string;
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
    context: Record<string, any>;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

// Union type of all events
export type SystemEvent = 
  | CustomerRegisteredEvent
  | CustomerValidatedEvent
  | CustomerBalanceUpdatedEvent
  | TransactionRequestedEvent
  | TransactionProcessingEvent
  | TransactionCompletedEvent
  | FraudCheckRequestedEvent
  | FraudDetectedEvent
  | NotificationRequestedEvent
  | NotificationSentEvent
  | TelegramMessageReceivedEvent
  | TelegramCommandProcessedEvent
  | SystemHealthCheckEvent
  | SystemErrorEvent;

// Event stream names
export const STREAMS = {
  CUSTOMER: 'customer-events',
  TRANSACTION: 'transaction-events',
  FRAUD: 'fraud-events',
  NOTIFICATION: 'notification-events',
  TELEGRAM: 'telegram-events',
  SYSTEM: 'system-events',
} as const;

// Consumer groups
export const CONSUMER_GROUPS = {
  BOT_HANDLERS: 'bot-handlers',
  TRANSACTION_PROCESSOR: 'transaction-processor',
  FRAUD_DETECTOR: 'fraud-detector',
  NOTIFICATION_SERVICE: 'notification-service',
  ANALYTICS: 'analytics',
  AUDIT: 'audit',
} as const;
