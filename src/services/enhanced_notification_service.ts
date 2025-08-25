/**
 * Enhanced Notification Service with ReadableStream Optimizations
 * Leverages Bun v1.2.21+ for high-performance real-time delivery
 * Integrates with stream utilities and worker threads
 */

import { Worker } from 'worker_threads';
import { fetchJSON, StreamBenchmark } from '../utils/stream-helpers';
import { spawnPythonJSON, DatabaseOperations } from '../utils/spawn-utils';

export enum NotificationType {
  TRANSACTION = 'transaction',
  BALANCE_UPDATE = 'balance_update',
  SECURITY_ALERT = 'security_alert',
  SYSTEM_UPDATE = 'system_update',
  MEMBER_REQUEST = 'member_request',
  TRADE_SIGNAL = 'trade_signal',
  MAINTENANCE = 'maintenance',
  ACCOUNT_UPDATE = 'account_update',
  PROMOTION = 'promotion',
  ERROR = 'error',
  WEB_ANALYSIS = 'web_analysis',
  MARKET_ALERT = 'market_alert',
  COMPETITOR_INTELLIGENCE = 'competitor_intelligence',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum NotificationChannel {
  WEB = 'web',
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  PUSH = 'push',
  SMS = 'sms',
  WEBSOCKET = 'websocket',
}

export interface StreamNotification {
  id: string;
  userId: string;
  userType: 'admin' | 'customer';
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  metadata: Record<string, any>;
  read: boolean;
  delivered: boolean;
  deliveryAttempts: number;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
  streamOptimized?: boolean;
  deliveryLatency?: number;
}

export interface NotificationPreferences {
  userId: string;
  userType: 'admin' | 'customer';
  channels: Record<NotificationType, NotificationChannel[]>;
  quietHours: { start: string; end: string };
  frequencyLimits: Record<NotificationType, number>;
  enabled: boolean;
  streamDelivery: boolean;
  batchDelivery: boolean;
  realtimeEnabled: boolean;
}

export interface DeliveryResult {
  success: boolean;
  channel: NotificationChannel;
  latency: number;
  error?: string;
  streamOptimized: boolean;
}

export class EnhancedNotificationService {
  private notificationWorker: Worker | null = null;
  private deliveryQueue = new Map<string, StreamNotification[]>();
  private streamBenchmark = new StreamBenchmark();
  private deliveryStats = {
    totalDelivered: 0,
    averageLatency: 0,
    streamOptimizedCount: 0,
    failureRate: 0,
  };

  constructor() {
    this.initializeWorkerThread();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize worker thread for background notification processing
   */
  private initializeWorkerThread() {
    try {
      this.notificationWorker = new Worker(
        './src/workers/notification-worker.ts',
        {
          workerData: {
            useStreamOptimization: true,
            batchSize: 50,
            maxRetries: 3,
          },
        }
      );

      this.notificationWorker.on('message', result => {
        this.handleWorkerResult(result);
      });

      this.notificationWorker.on('error', error => {
        console.error('Notification worker error:', error);
      });

      console.log('✅ Enhanced notification worker initialized');
    } catch (error: any) {
      console.warn(
        '⚠️ Worker thread unavailable, falling back to direct processing:',
        error.message
      );
    }
  }

  /**
   * Create notification with stream-optimized delivery
   */
  async createNotification(
    userId: string,
    userType: 'admin' | 'customer',
    type: NotificationType,
    title: string,
    message: string,
    options: {
      priority?: NotificationPriority;
      metadata?: Record<string, any>;
      expiresInHours?: number;
      forceStreamOptimization?: boolean;
      customChannels?: NotificationChannel[];
    } = {}
  ): Promise<StreamNotification | null> {
    const startTime = performance.now();

    try {
      // Get user preferences with stream optimization
      const preferences = await this.getUserPreferences(userId, userType);
      if (!preferences?.enabled) {
        return null;
      }

      // Determine delivery channels
      const channels = options.customChannels ||
        preferences.channels[type] || [NotificationChannel.WEB];

      // Create notification object
      const notification: StreamNotification = {
        id: `notif_${Date.now()}_${userId}_${Math.random().toString(36).substr(2, 8)}`,
        userId,
        userType,
        title,
        message,
        type,
        priority: options.priority || NotificationPriority.MEDIUM,
        channels,
        metadata: options.metadata || {},
        read: false,
        delivered: false,
        deliveryAttempts: 0,
        createdAt: new Date().toISOString(),
        expiresAt: options.expiresInHours
          ? new Date(
              Date.now() + options.expiresInHours * 60 * 60 * 1000
            ).toISOString()
          : undefined,
        streamOptimized:
          options.forceStreamOptimization || preferences.streamDelivery,
      };

      // Store notification using stream-optimized database operation
      const stored = await this.storeNotificationOptimized(notification);
      if (!stored) {
        return null;
      }

      // Queue for delivery
      await this.queueForDelivery(notification);

      // Track performance
      const processingTime = performance.now() - startTime;
      notification.deliveryLatency = processingTime;

      console.log(
        `📨 Notification created: ${notification.id} (${processingTime.toFixed(2)}ms)`
      );
      return notification;
    } catch (error: any) {
      console.error('Failed to create notification:', error);
      return null;
    }
  }

  /**
   * Store notification using stream-optimized database operations
   */
  private async storeNotificationOptimized(
    notification: StreamNotification
  ): Promise<boolean> {
    try {
      // Use spawn operations for direct stream consumption
      const result = await DatabaseOperations.storeNotification(notification);

      if (result.success) {
        console.log(
          `💾 Notification stored (${result.duration?.toFixed(2)}ms)`
        );
        return true;
      } else {
        console.error('Database storage failed:', result.error);
        return false;
      }
    } catch (error: any) {
      console.error('Error storing notification:', error);
      return false;
    }
  }

  /**
   * Queue notification for optimized delivery
   */
  private async queueForDelivery(notification: StreamNotification) {
    if (this.notificationWorker) {
      // Use worker thread for high-performance processing
      this.notificationWorker.postMessage({
        type: 'DELIVER_NOTIFICATION',
        notification,
        streamOptimized: true,
      });
    } else {
      // Fallback to direct delivery
      await this.deliverNotification(notification);
    }
  }

  /**
   * Deliver notification across all specified channels
   */
  private async deliverNotification(
    notification: StreamNotification
  ): Promise<DeliveryResult[]> {
    const deliveryPromises = notification.channels.map(channel =>
      this.deliverToChannel(notification, channel)
    );

    const results = await Promise.allSettled(deliveryPromises);
    const deliveryResults: DeliveryResult[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const channel = notification.channels[i];

      if (result.status === 'fulfilled') {
        deliveryResults.push(result.value);
      } else {
        deliveryResults.push({
          success: false,
          channel,
          latency: 0,
          error: result.reason?.message || 'Unknown error',
          streamOptimized: false,
        });
      }
    }

    // Update delivery stats
    this.updateDeliveryStats(deliveryResults);

    return deliveryResults;
  }

  /**
   * Deliver notification to specific channel with stream optimization
   */
  private async deliverToChannel(
    notification: StreamNotification,
    channel: NotificationChannel
  ): Promise<DeliveryResult> {
    const startTime = performance.now();

    try {
      switch (channel) {
        case NotificationChannel.WEBSOCKET:
          return await this.deliverWebSocket(notification, startTime);

        case NotificationChannel.WEB:
          return await this.deliverWeb(notification, startTime);

        case NotificationChannel.TELEGRAM:
          return await this.deliverTelegram(notification, startTime);

        case NotificationChannel.EMAIL:
          return await this.deliverEmail(notification, startTime);

        case NotificationChannel.PUSH:
          return await this.deliverPush(notification, startTime);

        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }
    } catch (error: any) {
      return {
        success: false,
        channel,
        latency: performance.now() - startTime,
        error: error.message,
        streamOptimized: false,
      };
    }
  }

  /**
   * Deliver via WebSocket using stream optimization
   */
  private async deliverWebSocket(
    notification: StreamNotification,
    startTime: number
  ): Promise<DeliveryResult> {
    const payload = {
      type: 'notification',
      event: 'new_notification',
      data: notification,
      timestamp: new Date().toISOString(),
      streamOptimized: notification.streamOptimized,
    };

    // Use stream-optimized JSON serialization
    const jsonStream = ReadableStream.from([JSON.stringify(payload)]);
    const optimizedPayload = await jsonStream.text();

    // Send to WebSocket server (integration point)
    await this.broadcastToWebSocket(
      notification.userId,
      notification.userType,
      optimizedPayload
    );

    return {
      success: true,
      channel: NotificationChannel.WEBSOCKET,
      latency: performance.now() - startTime,
      streamOptimized: true,
    };
  }

  /**
   * Deliver via Web portal using fetch with stream helpers
   */
  private async deliverWeb(
    notification: StreamNotification,
    startTime: number
  ): Promise<DeliveryResult> {
    const portalEndpoint = `http://localhost:5000/api/notifications/deliver`;

    const result = await fetchJSON(portalEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: notification.userId,
        userType: notification.userType,
        notification,
      }),
    });

    return {
      success: result.success,
      channel: NotificationChannel.WEB,
      latency: result.duration || performance.now() - startTime,
      error: result.error,
      streamOptimized: true,
    };
  }

  /**
   * Deliver via Telegram using spawn operations
   */
  private async deliverTelegram(
    notification: StreamNotification,
    startTime: number
  ): Promise<DeliveryResult> {
    try {
      const telegramData = {
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
      };

      const result = await spawnPythonJSON(
        './src/services/telegram_delivery.py',
        [JSON.stringify(telegramData)]
      );

      return {
        success: result.success,
        channel: NotificationChannel.TELEGRAM,
        latency: result.duration || performance.now() - startTime,
        error: result.error,
        streamOptimized: true,
      };
    } catch (error: any) {
      return {
        success: false,
        channel: NotificationChannel.TELEGRAM,
        latency: performance.now() - startTime,
        error: error.message,
        streamOptimized: false,
      };
    }
  }

  /**
   * Deliver via Email
   */
  private async deliverEmail(
    notification: StreamNotification,
    startTime: number
  ): Promise<DeliveryResult> {
    // Implementation for email delivery
    // This would integrate with your email service
    return {
      success: true,
      channel: NotificationChannel.EMAIL,
      latency: performance.now() - startTime,
      streamOptimized: false,
    };
  }

  /**
   * Deliver via Push notification
   */
  private async deliverPush(
    notification: StreamNotification,
    startTime: number
  ): Promise<DeliveryResult> {
    // Implementation for push notification delivery
    return {
      success: true,
      channel: NotificationChannel.PUSH,
      latency: performance.now() - startTime,
      streamOptimized: false,
    };
  }

  /**
   * Get user preferences with caching and stream optimization
   */
  private async getUserPreferences(
    userId: string,
    userType: string
  ): Promise<NotificationPreferences | null> {
    try {
      const result = await DatabaseOperations.getUserPreferences(
        userId,
        userType
      );

      if (result.success) {
        return result.data as NotificationPreferences;
      }

      // Create default preferences if none exist
      return this.createDefaultPreferences(
        userId,
        userType as 'admin' | 'customer'
      );
    } catch (error: any) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  /**
   * Create default notification preferences
   */
  private createDefaultPreferences(
    userId: string,
    userType: 'admin' | 'customer'
  ): NotificationPreferences {
    const defaultChannels =
      userType === 'admin'
        ? {
            [NotificationType.TRANSACTION]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
              NotificationChannel.TELEGRAM,
            ],
            [NotificationType.SECURITY_ALERT]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
              NotificationChannel.EMAIL,
              NotificationChannel.TELEGRAM,
            ],
            [NotificationType.SYSTEM_UPDATE]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
            ],
            [NotificationType.MEMBER_REQUEST]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
              NotificationChannel.TELEGRAM,
            ],
            [NotificationType.ERROR]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
              NotificationChannel.TELEGRAM,
            ],
            [NotificationType.WEB_ANALYSIS]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
            ],
            [NotificationType.MARKET_ALERT]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
              NotificationChannel.TELEGRAM,
            ],
            [NotificationType.COMPETITOR_INTELLIGENCE]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
            ],
          }
        : {
            [NotificationType.TRANSACTION]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
              NotificationChannel.TELEGRAM,
            ],
            [NotificationType.BALANCE_UPDATE]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
              NotificationChannel.TELEGRAM,
            ],
            [NotificationType.ACCOUNT_UPDATE]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
              NotificationChannel.EMAIL,
            ],
            [NotificationType.TRADE_SIGNAL]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
              NotificationChannel.TELEGRAM,
            ],
            [NotificationType.PROMOTION]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
            ],
            [NotificationType.MAINTENANCE]: [
              NotificationChannel.WEBSOCKET,
              NotificationChannel.WEB,
              NotificationChannel.EMAIL,
            ],
          };

    return {
      userId,
      userType,
      channels: defaultChannels,
      quietHours: { start: '22:00', end: '08:00' },
      frequencyLimits: {
        [NotificationType.TRANSACTION]: 20,
        [NotificationType.TRADE_SIGNAL]: 10,
        [NotificationType.PROMOTION]: 5,
        [NotificationType.MARKET_ALERT]: 15,
        [NotificationType.WEB_ANALYSIS]: 10,
      },
      enabled: true,
      streamDelivery: true,
      batchDelivery: false,
      realtimeEnabled: true,
    };
  }

  /**
   * Handle worker thread results
   */
  private handleWorkerResult(result: any) {
    if (result.type === 'DELIVERY_COMPLETE') {
      console.log(
        `✅ Batch delivery completed: ${result.delivered}/${result.total} notifications`
      );
      this.deliveryStats.totalDelivered += result.delivered;
    } else if (result.type === 'DELIVERY_ERROR') {
      console.error('❌ Worker delivery error:', result.error);
    }
  }

  /**
   * Update delivery performance statistics
   */
  private updateDeliveryStats(results: DeliveryResult[]) {
    const successful = results.filter(r => r.success);
    const streamOptimized = results.filter(r => r.streamOptimized);

    if (successful.length > 0) {
      const averageLatency =
        successful.reduce((sum, r) => sum + r.latency, 0) / successful.length;
      this.deliveryStats.averageLatency =
        (this.deliveryStats.averageLatency + averageLatency) / 2;
    }

    this.deliveryStats.streamOptimizedCount += streamOptimized.length;
    this.deliveryStats.failureRate =
      ((results.length - successful.length) / results.length) * 100;
  }

  /**
   * Broadcast to WebSocket server
   */
  private async broadcastToWebSocket(
    userId: string,
    userType: string,
    payload: string
  ) {
    // Integration point with existing WebSocket server
    // This would connect to your WebSocket server and broadcast the message
    console.log(`📡 WebSocket broadcast to ${userType}:${userId}`);
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring() {
    setInterval(() => {
      console.log('📊 Notification Delivery Stats:', {
        totalDelivered: this.deliveryStats.totalDelivered,
        averageLatency: `${this.deliveryStats.averageLatency.toFixed(2)}ms`,
        streamOptimizedPercent:
          this.deliveryStats.totalDelivered > 0
            ? `${((this.deliveryStats.streamOptimizedCount / this.deliveryStats.totalDelivered) * 100).toFixed(1)}%`
            : '0%',
        failureRate: `${this.deliveryStats.failureRate.toFixed(1)}%`,
      });
    }, 60000); // Every minute
  }

  /**
   * Get notification statistics
   */
  getDeliveryStats() {
    return { ...this.deliveryStats };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.notificationWorker) {
      await this.notificationWorker.terminate();
      console.log('🧹 Notification worker terminated');
    }
  }
}

// Export singleton instance
export const enhancedNotificationService = new EnhancedNotificationService();

// Graceful cleanup on process exit
process.on('SIGTERM', () => {
  enhancedNotificationService.cleanup();
});

process.on('SIGINT', () => {
  enhancedNotificationService.cleanup();
});
