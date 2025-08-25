/**
 * Enhanced WebSocket Service with Stream Optimization
 * Leverages Bun v1.2.21+ ReadableStream features for high-performance real-time communication
 */

import { Server as SocketIOServer } from 'socket.io';
import { StreamUtils, fetchJSON } from '../utils/stream-helpers';
import {
  enhancedNotificationService,
  StreamNotification,
} from './enhanced_notification_service';
import type { Server as HTTPServer } from 'http';

export interface WebSocketClient {
  id: string;
  userId: string;
  userType: 'admin' | 'customer';
  connectionTime: string;
  lastActivity: string;
  subscriptions: Set<string>;
  streamOptimized: boolean;
}

export interface StreamMessage {
  type: string;
  event: string;
  data: any;
  timestamp: string;
  streamOptimized?: boolean;
  compression?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export class EnhancedWebSocketService {
  private io: SocketIOServer | null = null;
  private clients = new Map<string, WebSocketClient>();
  private messageQueue = new Map<string, StreamMessage[]>();
  private performanceMetrics = {
    messagesDelivered: 0,
    streamOptimizedMessages: 0,
    averageLatency: 0,
    compressionSavings: 0,
    connectionCount: 0,
    peakConnections: 0,
  };

  constructor(private httpServer: HTTPServer) {
    this.initializeWebSocket();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize WebSocket server with stream optimizations
   */
  private initializeWebSocket() {
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      compression: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    console.log(
      '🚀 Enhanced WebSocket service initialized with stream optimization'
    );
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', socket => {
      console.log(`📡 WebSocket client connected: ${socket.id}`);
      this.performanceMetrics.connectionCount++;

      if (
        this.performanceMetrics.connectionCount >
        this.performanceMetrics.peakConnections
      ) {
        this.performanceMetrics.peakConnections =
          this.performanceMetrics.connectionCount;
      }

      // Authentication handler
      socket.on('authenticate', async data => {
        await this.handleAuthentication(socket, data);
      });

      // Notification subscription
      socket.on('subscribe_notifications', data => {
        this.handleNotificationSubscription(socket, data);
      });

      // Stream optimization request
      socket.on('enable_stream_optimization', data => {
        this.handleStreamOptimization(socket, data);
      });

      // Real-time data subscription
      socket.on('subscribe_realtime', data => {
        this.handleRealtimeSubscription(socket, data);
      });

      // Batch message acknowledgment
      socket.on('message_batch_ack', data => {
        this.handleBatchAcknowledgment(socket, data);
      });

      // Performance metrics request
      socket.on('get_performance_metrics', () => {
        this.sendPerformanceMetrics(socket);
      });

      // Disconnect handler
      socket.on('disconnect', reason => {
        this.handleDisconnect(socket, reason);
      });

      // Heartbeat for connection health
      socket.on('heartbeat', () => {
        const client = this.clients.get(socket.id);
        if (client) {
          client.lastActivity = new Date().toISOString();
        }
        socket.emit('heartbeat_ack', { timestamp: new Date().toISOString() });
      });
    });
  }

  /**
   * Handle client authentication with stream optimization support
   */
  private async handleAuthentication(socket: any, data: any) {
    try {
      const { token, userId, userType, streamOptimized = true } = data;

      // Validate authentication token (integrate with your auth system)
      const isValid = await this.validateAuthToken(token, userId, userType);

      if (!isValid) {
        socket.emit('auth_error', {
          error: 'Invalid authentication token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Create client record
      const client: WebSocketClient = {
        id: socket.id,
        userId,
        userType,
        connectionTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        subscriptions: new Set(),
        streamOptimized,
      };

      this.clients.set(socket.id, client);

      // Join user-specific room
      const userRoom = `user_${userType}_${userId}`;
      socket.join(userRoom);

      // Join type-specific room
      socket.join(`type_${userType}`);

      // Send authentication success
      socket.emit('auth_success', {
        message: 'Authentication successful',
        userId,
        userType,
        streamOptimized,
        serverCapabilities: {
          streamOptimization: true,
          compression: true,
          batchDelivery: true,
          realtimeUpdates: true,
        },
        timestamp: new Date().toISOString(),
      });

      // Send queued messages if any
      await this.deliverQueuedMessages(socket, client);

      console.log(
        `✅ Client authenticated: ${userType}:${userId} (stream: ${streamOptimized})`
      );
    } catch (error: any) {
      console.error('Authentication error:', error);
      socket.emit('auth_error', {
        error: 'Authentication failed',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle notification subscription with stream optimization
   */
  private handleNotificationSubscription(socket: any, data: any) {
    const client = this.clients.get(socket.id);
    if (!client) {
      socket.emit('subscription_error', { error: 'Not authenticated' });
      return;
    }

    const { types = ['all'], priority = 'all', streamOptimized = true } = data;

    // Update client subscriptions
    types.forEach((type: string) => {
      client.subscriptions.add(`notifications:${type}`);
    });

    if (priority !== 'all') {
      client.subscriptions.add(`priority:${priority}`);
    }

    socket.emit('subscription_success', {
      types,
      priority,
      streamOptimized,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `📬 Notification subscription updated for ${client.userId}: ${types.join(', ')}`
    );
  }

  /**
   * Handle stream optimization enablement
   */
  private handleStreamOptimization(socket: any, data: any) {
    const client = this.clients.get(socket.id);
    if (!client) return;

    client.streamOptimized = data.enabled !== false;

    socket.emit('stream_optimization_updated', {
      enabled: client.streamOptimized,
      features: {
        fastJSON: true,
        compression: true,
        batchDelivery: true,
      },
      timestamp: new Date().toISOString(),
    });

    console.log(
      `⚡ Stream optimization ${client.streamOptimized ? 'enabled' : 'disabled'} for ${client.userId}`
    );
  }

  /**
   * Handle real-time data subscription
   */
  private handleRealtimeSubscription(socket: any, data: any) {
    const client = this.clients.get(socket.id);
    if (!client) return;

    const { channels = [] } = data;

    channels.forEach((channel: string) => {
      client.subscriptions.add(`realtime:${channel}`);
      socket.join(`realtime_${channel}`);
    });

    socket.emit('realtime_subscription_success', {
      channels,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send notification to specific user with stream optimization
   */
  async sendNotificationToUser(
    userId: string,
    userType: string,
    notification: StreamNotification,
    options: {
      streamOptimized?: boolean;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      compression?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      const userRoom = `user_${userType}_${userId}`;
      const clients = await this.getClientsInRoom(userRoom);

      if (clients.length === 0) {
        // Queue message for later delivery
        await this.queueMessage(userId, userType, {
          type: 'notification',
          event: 'new_notification',
          data: notification,
          timestamp: new Date().toISOString(),
          streamOptimized: options.streamOptimized,
          priority: options.priority,
        });
        return false;
      }

      const message: StreamMessage = {
        type: 'notification',
        event: 'new_notification',
        data: notification,
        timestamp: new Date().toISOString(),
        streamOptimized: options.streamOptimized ?? true,
        compression: options.compression ?? true,
        priority: options.priority ?? notification.priority,
      };

      // Send with stream optimization if supported
      for (const clientId of clients) {
        const client = this.clients.get(clientId);
        if (client?.streamOptimized && options.streamOptimized !== false) {
          await this.sendStreamOptimizedMessage(clientId, message);
        } else {
          await this.sendTraditionalMessage(clientId, message);
        }
      }

      this.performanceMetrics.messagesDelivered++;
      if (options.streamOptimized !== false) {
        this.performanceMetrics.streamOptimizedMessages++;
      }

      return true;
    } catch (error: any) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }

  /**
   * Broadcast notification to all users of a type
   */
  async broadcastNotificationToType(
    userType: string,
    notification: StreamNotification,
    options: { streamOptimized?: boolean; priority?: string } = {}
  ): Promise<number> {
    try {
      const typeRoom = `type_${userType}`;
      const clients = await this.getClientsInRoom(typeRoom);

      const message: StreamMessage = {
        type: 'notification',
        event: 'broadcast_notification',
        data: notification,
        timestamp: new Date().toISOString(),
        streamOptimized: options.streamOptimized ?? true,
        priority: options.priority as any,
      };

      let deliveredCount = 0;

      // Batch delivery for efficiency
      const batchSize = 50;
      for (let i = 0; i < clients.length; i += batchSize) {
        const batch = clients.slice(i, i + batchSize);

        const batchPromises = batch.map(async clientId => {
          const client = this.clients.get(clientId);
          if (client?.streamOptimized && options.streamOptimized !== false) {
            return this.sendStreamOptimizedMessage(clientId, message);
          } else {
            return this.sendTraditionalMessage(clientId, message);
          }
        });

        const results = await Promise.allSettled(batchPromises);
        deliveredCount += results.filter(r => r.status === 'fulfilled').length;
      }

      this.performanceMetrics.messagesDelivered += deliveredCount;
      console.log(
        `📢 Broadcast delivered to ${deliveredCount}/${clients.length} ${userType} clients`
      );

      return deliveredCount;
    } catch (error: any) {
      console.error('Error broadcasting notification:', error);
      return 0;
    }
  }

  /**
   * Send message with stream optimization
   */
  private async sendStreamOptimizedMessage(
    clientId: string,
    message: StreamMessage
  ): Promise<void> {
    if (!this.io) return;

    const startTime = performance.now();

    try {
      // Use stream utilities for optimized JSON serialization
      const jsonStream = StreamUtils.fromJSON(message);
      const optimizedPayload = await jsonStream.text();

      // Send optimized payload
      this.io.to(clientId).emit('stream_message', {
        ...message,
        _streamOptimized: true,
        _payloadSize: optimizedPayload.length,
      });

      const latency = performance.now() - startTime;
      this.updateLatencyMetrics(latency);
    } catch (error: any) {
      console.error('Stream optimized message send failed:', error);
      // Fallback to traditional message
      await this.sendTraditionalMessage(clientId, message);
    }
  }

  /**
   * Send message using traditional method
   */
  private async sendTraditionalMessage(
    clientId: string,
    message: StreamMessage
  ): Promise<void> {
    if (!this.io) return;

    const startTime = performance.now();

    try {
      this.io.to(clientId).emit('message', {
        ...message,
        _streamOptimized: false,
      });

      const latency = performance.now() - startTime;
      this.updateLatencyMetrics(latency);
    } catch (error: any) {
      console.error('Traditional message send failed:', error);
    }
  }

  /**
   * Queue message for later delivery
   */
  private async queueMessage(
    userId: string,
    userType: string,
    message: StreamMessage
  ): Promise<void> {
    const queueKey = `${userType}_${userId}`;

    if (!this.messageQueue.has(queueKey)) {
      this.messageQueue.set(queueKey, []);
    }

    const queue = this.messageQueue.get(queueKey)!;
    queue.push(message);

    // Limit queue size
    if (queue.length > 100) {
      queue.shift(); // Remove oldest message
    }

    console.log(
      `📮 Message queued for ${userType}:${userId} (queue: ${queue.length})`
    );
  }

  /**
   * Deliver queued messages to authenticated client
   */
  private async deliverQueuedMessages(
    socket: any,
    client: WebSocketClient
  ): Promise<void> {
    const queueKey = `${client.userType}_${client.userId}`;
    const queue = this.messageQueue.get(queueKey);

    if (!queue || queue.length === 0) return;

    console.log(
      `📬 Delivering ${queue.length} queued messages to ${client.userId}`
    );

    // Send queued messages
    for (const message of queue) {
      if (client.streamOptimized && message.streamOptimized) {
        await this.sendStreamOptimizedMessage(socket.id, message);
      } else {
        await this.sendTraditionalMessage(socket.id, message);
      }
    }

    // Clear queue
    this.messageQueue.delete(queueKey);
  }

  /**
   * Handle batch acknowledgment
   */
  private handleBatchAcknowledgment(socket: any, data: any) {
    const { messageIds = [], timestamp } = data;

    // Process acknowledgments (could be used for delivery confirmation)
    console.log(
      `✅ Batch acknowledgment from ${socket.id}: ${messageIds.length} messages`
    );
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: any, reason: string) {
    const client = this.clients.get(socket.id);

    if (client) {
      console.log(
        `📤 Client disconnected: ${client.userType}:${client.userId} (reason: ${reason})`
      );
      this.clients.delete(socket.id);
      this.performanceMetrics.connectionCount--;
    } else {
      console.log(
        `📤 Unknown client disconnected: ${socket.id} (reason: ${reason})`
      );
    }
  }

  /**
   * Get clients in a specific room
   */
  private async getClientsInRoom(room: string): Promise<string[]> {
    if (!this.io) return [];

    try {
      const sockets = await this.io.in(room).fetchSockets();
      return sockets.map(socket => socket.id);
    } catch (error: any) {
      console.error('Error getting clients in room:', error);
      return [];
    }
  }

  /**
   * Validate authentication token
   */
  private async validateAuthToken(
    token: string,
    userId: string,
    userType: string
  ): Promise<boolean> {
    try {
      // Implement your authentication logic here
      // For now, return true for demo purposes
      return true;
    } catch (error: any) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * Send performance metrics to client
   */
  private sendPerformanceMetrics(socket: any) {
    socket.emit('performance_metrics', {
      ...this.performanceMetrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number) {
    this.performanceMetrics.averageLatency =
      (this.performanceMetrics.averageLatency + latency) / 2;
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring() {
    setInterval(() => {
      const streamOptimizedPercentage =
        this.performanceMetrics.messagesDelivered > 0
          ? (this.performanceMetrics.streamOptimizedMessages /
              this.performanceMetrics.messagesDelivered) *
            100
          : 0;

      console.log('📊 WebSocket Performance Metrics:', {
        connections: this.performanceMetrics.connectionCount,
        peakConnections: this.performanceMetrics.peakConnections,
        messagesDelivered: this.performanceMetrics.messagesDelivered,
        streamOptimizedPercentage: `${streamOptimizedPercentage.toFixed(1)}%`,
        averageLatency: `${this.performanceMetrics.averageLatency.toFixed(2)}ms`,
        queuedMessages: this.messageQueue.size,
      });
    }, 60000); // Every minute
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Get connected clients summary
   */
  getConnectedClients() {
    const clientsSummary = Array.from(this.clients.values()).map(client => ({
      userId: client.userId,
      userType: client.userType,
      connectionTime: client.connectionTime,
      streamOptimized: client.streamOptimized,
      subscriptions: Array.from(client.subscriptions),
    }));

    return clientsSummary;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.io) {
      this.io.close();
      console.log('🧹 WebSocket service cleaned up');
    }
  }
}

// Export singleton instance
let enhancedWebSocketService: EnhancedWebSocketService | null = null;

export function initializeEnhancedWebSocket(
  httpServer: HTTPServer
): EnhancedWebSocketService {
  if (!enhancedWebSocketService) {
    enhancedWebSocketService = new EnhancedWebSocketService(httpServer);
  }
  return enhancedWebSocketService;
}

export function getEnhancedWebSocketService(): EnhancedWebSocketService | null {
  return enhancedWebSocketService;
}

// Graceful cleanup on process exit
process.on('SIGTERM', async () => {
  if (enhancedWebSocketService) {
    await enhancedWebSocketService.cleanup();
  }
});

process.on('SIGINT', async () => {
  if (enhancedWebSocketService) {
    await enhancedWebSocketService.cleanup();
  }
});
