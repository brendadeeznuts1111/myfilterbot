/**
 * Notification Worker Thread
 * High-performance background processing for notifications
 * Leverages Bun v1.2.21+ ReadableStream features for optimal performance
 */

import { parentPort, workerData } from 'worker_threads';
import { spawnPythonJSON, DatabaseOperations, BotOperations } from '../utils/spawn-utils';
import { fetchJSON, StreamUtils } from '../utils/stream-helpers';

interface NotificationWorkerTask {
  type: 'DELIVER_NOTIFICATION' | 'BATCH_DELIVERY' | 'CLEANUP_EXPIRED' | 'PERFORMANCE_ANALYSIS';
  notification?: any;
  notifications?: any[];
  streamOptimized?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface DeliveryBatch {
  webSocket: any[];
  telegram: any[];
  email: any[];
  web: any[];
  push: any[];
}

class NotificationWorker {
  private processingQueue: NotificationWorkerTask[] = [];
  private isProcessing = false;
  private stats = {
    tasksProcessed: 0,
    deliveriesCompleted: 0,
    averageLatency: 0,
    streamOptimizedCount: 0,
    errors: 0
  };

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (!parentPort) {
      throw new Error('Worker must be run in a worker thread');
    }

    // Listen for tasks from main thread
    parentPort.on('message', (task: NotificationWorkerTask) => {
      this.addTask(task);
    });

    // Start processing loop
    this.startProcessing();

    // Send periodic status updates
    setInterval(() => {
      this.sendStatusUpdate();
    }, 30000); // Every 30 seconds

    console.log('[NotificationWorker] Initialized with stream optimization');
  }

  private addTask(task: NotificationWorkerTask) {
    // Priority queue - high priority tasks go first
    if (task.priority === 'critical' || task.priority === 'high') {
      this.processingQueue.unshift(task);
    } else {
      this.processingQueue.push(task);
    }
  }

  private async startProcessing() {
    this.isProcessing = true;

    while (this.isProcessing) {
      if (this.processingQueue.length > 0) {
        const task = this.processingQueue.shift()!;
        const startTime = performance.now();

        try {
          await this.processTask(task);
          
          const processingTime = performance.now() - startTime;
          this.updateStats(processingTime, true);
          
        } catch (error: any) {
          console.error('[NotificationWorker] Task processing error:', error);
          this.updateStats(0, false);
          
          this.sendError({
            type: 'TASK_ERROR',
            error: error.message,
            task: task.type
          });
        }
      } else {
        // No tasks, wait a bit
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  private async processTask(task: NotificationWorkerTask) {
    switch (task.type) {
      case 'DELIVER_NOTIFICATION':
        await this.processSingleDelivery(task);
        break;
        
      case 'BATCH_DELIVERY':
        await this.processBatchDelivery(task);
        break;
        
      case 'CLEANUP_EXPIRED':
        await this.processCleanupExpired();
        break;
        
      case 'PERFORMANCE_ANALYSIS':
        await this.processPerformanceAnalysis();
        break;
        
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * Process single notification delivery
   */
  private async processSingleDelivery(task: NotificationWorkerTask) {
    const notification = task.notification;
    if (!notification) return;

    const deliveryResults = [];

    // Process each channel with stream optimization
    for (const channel of notification.channels) {
      try {
        const result = await this.deliverToChannel(notification, channel, task.streamOptimized || false);
        deliveryResults.push(result);
      } catch (error: any) {
        deliveryResults.push({
          channel,
          success: false,
          error: error.message,
          latency: 0
        });
      }
    }

    // Update delivery status in database
    await this.updateDeliveryStatus(notification.id, deliveryResults);

    // Send completion report to main thread
    this.sendResult({
      type: 'DELIVERY_COMPLETE',
      notificationId: notification.id,
      results: deliveryResults,
      streamOptimized: task.streamOptimized
    });
  }

  /**
   * Process batch notification delivery
   */
  private async processBatchDelivery(task: NotificationWorkerTask) {
    const notifications = task.notifications || [];
    if (notifications.length === 0) return;

    // Group notifications by delivery channel for optimal batching
    const batches: DeliveryBatch = {
      webSocket: [],
      telegram: [],
      email: [],
      web: [],
      push: []
    };

    // Organize notifications into batches
    for (const notification of notifications) {
      for (const channel of notification.channels) {
        switch (channel) {
          case 'websocket':
            batches.webSocket.push(notification);
            break;
          case 'telegram':
            batches.telegram.push(notification);
            break;
          case 'email':
            batches.email.push(notification);
            break;
          case 'web':
            batches.web.push(notification);
            break;
          case 'push':
            batches.push.push(notification);
            break;
        }
      }
    }

    // Process each batch concurrently
    const batchPromises = [
      this.processBatchWebSocket(batches.webSocket),
      this.processBatchTelegram(batches.telegram),
      this.processBatchEmail(batches.email),
      this.processBatchWeb(batches.web),
      this.processBatchPush(batches.push)
    ];

    const batchResults = await Promise.allSettled(batchPromises);
    
    // Calculate success metrics
    let totalDelivered = 0;
    let totalAttempted = notifications.length;

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        totalDelivered += result.value.delivered;
      }
    });

    this.sendResult({
      type: 'BATCH_COMPLETE',
      total: totalAttempted,
      delivered: totalDelivered,
      batches: batchResults.length
    });
  }

  /**
   * Deliver to specific channel with stream optimization
   */
  private async deliverToChannel(notification: any, channel: string, streamOptimized: boolean) {
    const startTime = performance.now();

    switch (channel) {
      case 'websocket':
        return await this.deliverWebSocketOptimized(notification, startTime, streamOptimized);
      
      case 'telegram':
        return await this.deliverTelegramOptimized(notification, startTime, streamOptimized);
      
      case 'web':
        return await this.deliverWebOptimized(notification, startTime, streamOptimized);
      
      case 'email':
        return await this.deliverEmailOptimized(notification, startTime, streamOptimized);
      
      case 'push':
        return await this.deliverPushOptimized(notification, startTime, streamOptimized);
      
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * WebSocket delivery with stream optimization
   */
  private async deliverWebSocketOptimized(notification: any, startTime: number, streamOptimized: boolean) {
    const payload = {
      type: 'notification',
      event: 'new_notification',
      data: notification,
      timestamp: new Date().toISOString(),
      streamOptimized
    };

    if (streamOptimized) {
      // Use Bun's optimized JSON streaming
      const jsonStream = StreamUtils.fromJSON(payload);
      const optimizedPayload = await jsonStream.text();
      
      // Send via stream-optimized WebSocket connection
      // This would integrate with your WebSocket server
      await this.broadcastWebSocketStream(notification.userId, notification.userType, optimizedPayload);
      
      this.stats.streamOptimizedCount++;
    } else {
      // Traditional JSON serialization
      const jsonPayload = JSON.stringify(payload);
      await this.broadcastWebSocketTraditional(notification.userId, notification.userType, jsonPayload);
    }

    return {
      channel: 'websocket',
      success: true,
      latency: performance.now() - startTime,
      streamOptimized
    };
  }

  /**
   * Telegram delivery with spawn operations
   */
  private async deliverTelegramOptimized(notification: any, startTime: number, streamOptimized: boolean) {
    if (streamOptimized) {
      // Use spawn operations for direct stream consumption
      const result = await spawnPythonJSON('./src/services/telegram_notification_delivery.py', [
        notification.userId,
        notification.title,
        notification.message,
        notification.type
      ]);
      
      if (result.success) {
        this.stats.streamOptimizedCount++;
        return {
          channel: 'telegram',
          success: true,
          latency: result.duration || (performance.now() - startTime),
          streamOptimized: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Telegram delivery failed');
      }
    } else {
      // Traditional approach
      const telegramData = {
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type
      };
      
      // Simulate traditional delivery
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return {
        channel: 'telegram',
        success: true,
        latency: performance.now() - startTime,
        streamOptimized: false
      };
    }
  }

  /**
   * Web portal delivery with optimized fetch
   */
  private async deliverWebOptimized(notification: any, startTime: number, streamOptimized: boolean) {
    if (streamOptimized) {
      const result = await fetchJSON('http://localhost:5000/api/notifications/deliver-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: notification.userId,
          userType: notification.userType,
          notification,
          streamOptimized: true
        })
      });

      this.stats.streamOptimizedCount++;
      
      return {
        channel: 'web',
        success: result.success,
        latency: result.duration || (performance.now() - startTime),
        streamOptimized: true,
        error: result.error
      };
    } else {
      // Traditional fetch
      const response = await fetch('http://localhost:5000/api/notifications/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: notification.userId,
          userType: notification.userType,
          notification
        })
      });

      return {
        channel: 'web',
        success: response.ok,
        latency: performance.now() - startTime,
        streamOptimized: false
      };
    }
  }

  /**
   * Email delivery optimization
   */
  private async deliverEmailOptimized(notification: any, startTime: number, streamOptimized: boolean) {
    // Email delivery implementation would go here
    // For now, simulate the process
    
    if (streamOptimized) {
      const emailResult = await spawnPythonJSON('./src/services/email_delivery.py', [
        notification.userId,
        notification.title,
        notification.message
      ]);
      
      this.stats.streamOptimizedCount++;
      
      return {
        channel: 'email',
        success: emailResult.success,
        latency: emailResult.duration || (performance.now() - startTime),
        streamOptimized: true,
        error: emailResult.error
      };
    } else {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        channel: 'email',
        success: true,
        latency: performance.now() - startTime,
        streamOptimized: false
      };
    }
  }

  /**
   * Push notification delivery
   */
  private async deliverPushOptimized(notification: any, startTime: number, streamOptimized: boolean) {
    // Push notification implementation
    await new Promise(resolve => setTimeout(resolve, 30));
    
    return {
      channel: 'push',
      success: true,
      latency: performance.now() - startTime,
      streamOptimized
    };
  }

  /**
   * Process batch WebSocket delivery
   */
  private async processBatchWebSocket(notifications: any[]) {
    if (notifications.length === 0) return { delivered: 0 };

    // Group notifications by user for efficient batching
    const userGroups = new Map<string, any[]>();
    
    notifications.forEach(notification => {
      const userKey = `${notification.userType}:${notification.userId}`;
      if (!userGroups.has(userKey)) {
        userGroups.set(userKey, []);
      }
      userGroups.get(userKey)!.push(notification);
    });

    let delivered = 0;
    
    // Process each user's notifications as a batch
    for (const [userKey, userNotifications] of userGroups) {
      try {
        const batchPayload = {
          type: 'notification_batch',
          notifications: userNotifications,
          count: userNotifications.length,
          timestamp: new Date().toISOString()
        };

        // Use stream-optimized batch delivery
        const jsonStream = StreamUtils.fromJSON(batchPayload);
        const optimizedPayload = await jsonStream.text();
        
        const [userType, userId] = userKey.split(':');
        await this.broadcastWebSocketStream(userId, userType, optimizedPayload);
        
        delivered += userNotifications.length;
      } catch (error: any) {
        console.error(`Batch WebSocket delivery failed for ${userKey}:`, error);
      }
    }

    return { delivered };
  }

  /**
   * Process batch Telegram delivery
   */
  private async processBatchTelegram(notifications: any[]) {
    if (notifications.length === 0) return { delivered: 0 };

    // Use spawn operation for batch telegram delivery
    const batchData = notifications.map(n => ({
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type
    }));

    const result = await spawnPythonJSON('./src/services/telegram_batch_delivery.py', [
      JSON.stringify(batchData)
    ]);

    return {
      delivered: result.success ? result.data?.delivered || 0 : 0,
      error: result.error
    };
  }

  /**
   * Process batch email delivery
   */
  private async processBatchEmail(notifications: any[]) {
    if (notifications.length === 0) return { delivered: 0 };
    
    // Simulate batch email processing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return { delivered: notifications.length };
  }

  /**
   * Process batch web delivery
   */
  private async processBatchWeb(notifications: any[]) {
    if (notifications.length === 0) return { delivered: 0 };
    
    const result = await fetchJSON('http://localhost:5000/api/notifications/batch-deliver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications })
    });

    return {
      delivered: result.success ? result.data?.delivered || 0 : 0,
      error: result.error
    };
  }

  /**
   * Process batch push delivery
   */
  private async processBatchPush(notifications: any[]) {
    if (notifications.length === 0) return { delivered: 0 };
    
    // Simulate batch push processing
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return { delivered: notifications.length };
  }

  /**
   * Clean up expired notifications
   */
  private async processCleanupExpired() {
    try {
      const result = await DatabaseOperations.cleanupExpiredNotifications();
      
      if (result.success) {
        this.sendResult({
          type: 'CLEANUP_COMPLETE',
          cleaned: result.data?.cleaned || 0
        });
      }
    } catch (error: any) {
      console.error('[NotificationWorker] Cleanup error:', error);
    }
  }

  /**
   * Analyze performance metrics
   */
  private async processPerformanceAnalysis() {
    const analysis = {
      tasksProcessed: this.stats.tasksProcessed,
      deliveriesCompleted: this.stats.deliveriesCompleted,
      averageLatency: this.stats.averageLatency,
      streamOptimizedPercentage: this.stats.deliveriesCompleted > 0 ? 
        (this.stats.streamOptimizedCount / this.stats.deliveriesCompleted * 100) : 0,
      errorRate: this.stats.tasksProcessed > 0 ? 
        (this.stats.errors / this.stats.tasksProcessed * 100) : 0,
      uptime: process.uptime()
    };

    this.sendResult({
      type: 'PERFORMANCE_ANALYSIS',
      analysis
    });
  }

  /**
   * Update delivery status in database
   */
  private async updateDeliveryStatus(notificationId: string, results: any[]) {
    const successful = results.filter(r => r.success);
    const delivered = successful.length === results.length;

    try {
      await DatabaseOperations.updateNotificationDeliveryStatus({
        notificationId,
        delivered,
        deliveryAttempts: results.length,
        deliveryResults: results
      });
    } catch (error: any) {
      console.error('Failed to update delivery status:', error);
    }
  }

  /**
   * Broadcast WebSocket message with stream optimization
   */
  private async broadcastWebSocketStream(userId: string, userType: string, payload: string) {
    // This would integrate with your existing WebSocket server
    console.log(`📡 Stream-optimized WebSocket broadcast to ${userType}:${userId} (${payload.length} bytes)`);
  }

  /**
   * Traditional WebSocket broadcast
   */
  private async broadcastWebSocketTraditional(userId: string, userType: string, payload: string) {
    console.log(`📡 Traditional WebSocket broadcast to ${userType}:${userId} (${payload.length} bytes)`);
  }

  /**
   * Update performance statistics
   */
  private updateStats(processingTime: number, success: boolean) {
    this.stats.tasksProcessed++;
    
    if (success) {
      this.stats.deliveriesCompleted++;
      this.stats.averageLatency = (this.stats.averageLatency + processingTime) / 2;
    } else {
      this.stats.errors++;
    }
  }

  /**
   * Send result back to main thread
   */
  private sendResult(result: any) {
    if (parentPort) {
      parentPort.postMessage(result);
    }
  }

  /**
   * Send error back to main thread
   */
  private sendError(error: any) {
    if (parentPort) {
      parentPort.postMessage({
        type: 'ERROR',
        ...error
      });
    }
  }

  /**
   * Send status update to main thread
   */
  private sendStatusUpdate() {
    this.sendResult({
      type: 'STATUS_UPDATE',
      stats: { ...this.stats },
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing
    });
  }
}

// Initialize worker
const worker = new NotificationWorker();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[NotificationWorker] Received SIGTERM, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[NotificationWorker] Received SIGINT, shutting down...');
  process.exit(0);
});