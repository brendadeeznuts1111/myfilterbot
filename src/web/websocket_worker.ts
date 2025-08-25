/**
 * WebSocket Message Processing Worker
 * Handles real-time message processing and broadcasting
 * Leverages Bun's 500x faster postMessage() for message queues
 */

const worker = new Worker(new URL('./websocket_worker_thread.ts', import.meta.url).href);

export interface WebSocketMessage {
  type: 'transaction' | 'balance_update' | 'alert' | 'system_status' | 'group_update';
  customer_id?: string;
  chat_id?: string;
  data: any;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface BroadcastRequest {
  type: 'broadcast' | 'targeted' | 'group_broadcast' | 'process_queue';
  messages?: WebSocketMessage[];
  target_ids?: string[];
  room?: string;
  requestId: string;
}

export interface BroadcastResponse {
  requestId: string;
  type: string;
  processed_count: number;
  failed_count: number;
  error?: string;
  processingTime: number;
  queueSize: number;
}

export interface ConnectionStats {
  customer_id: string;
  socket_id: string;
  connected_at: string;
  last_activity: string;
  room?: string;
  user_agent?: string;
}

class WebSocketMessageProcessor {
  private pendingRequests = new Map<string, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }>();

  private messageQueue: WebSocketMessage[] = [];
  private connectionStats = new Map<string, ConnectionStats>();
  private isProcessing = false;

  constructor() {
    // Handle responses from worker
    worker.onmessage = (event: MessageEvent<BroadcastResponse>) => {
      const { requestId, processed_count, failed_count, error, processingTime, queueSize } = event.data;
      
      console.log(`WebSocket processing: ${processed_count} sent, ${failed_count} failed in ${processingTime}ms (queue: ${queueSize})`);
      
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        this.pendingRequests.delete(requestId);
        
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve({ processed_count, failed_count, processingTime });
        }
      }
    };

    worker.onerror = (error) => {
      console.error('WebSocket worker error:', error);
      for (const [requestId, pending] of this.pendingRequests) {
        pending.reject(new Error('Worker error'));
        this.pendingRequests.delete(requestId);
      }
    };

    // Process queue every 100ms
    setInterval(() => {
      if (this.messageQueue.length > 0 && !this.isProcessing) {
        this.processMessageQueue();
      }
    }, 100);

    // Clean up old connection stats every 5 minutes
    setInterval(() => {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000);
      for (const [customerId, stats] of this.connectionStats) {
        if (new Date(stats.last_activity) < cutoff) {
          this.connectionStats.delete(customerId);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Queue a message for processing
   * Messages are batched and sent via fast postMessage()
   */
  queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);
    
    // Process immediately if high priority
    if (message.priority === 'urgent' || message.priority === 'high') {
      this.processMessageQueue();
    }
  }

  /**
   * Broadcast transaction notification
   */
  async notifyTransaction(customerId: string, transactionData: any): Promise<void> {
    const message: WebSocketMessage = {
      type: 'transaction',
      customer_id: customerId,
      data: transactionData,
      timestamp: new Date().toISOString(),
      priority: 'medium'
    };

    this.queueMessage(message);
  }

  /**
   * Broadcast balance update
   */
  async notifyBalanceUpdate(customerId: string, balance: number, previousBalance: number): Promise<void> {
    const message: WebSocketMessage = {
      type: 'balance_update',
      customer_id: customerId,
      data: {
        current_balance: balance,
        previous_balance: previousBalance,
        change: balance - previousBalance
      },
      timestamp: new Date().toISOString(),
      priority: 'high'
    };

    this.queueMessage(message);
  }

  /**
   * Send alert to specific customers or broadcast
   */
  async sendAlert(
    alertData: any, 
    targetCustomers?: string[], 
    priority: WebSocketMessage['priority'] = 'medium'
  ): Promise<void> {
    const message: WebSocketMessage = {
      type: 'alert',
      data: {
        ...alertData,
        target_customers: targetCustomers
      },
      timestamp: new Date().toISOString(),
      priority
    };

    this.queueMessage(message);
  }

  /**
   * Broadcast system status update
   */
  async broadcastSystemStatus(statusData: any): Promise<void> {
    const message: WebSocketMessage = {
      type: 'system_status',
      data: statusData,
      timestamp: new Date().toISOString(),
      priority: 'low'
    };

    this.queueMessage(message);
  }

  /**
   * Notify group about member changes
   */
  async notifyGroupUpdate(chatId: string, updateData: any): Promise<void> {
    const message: WebSocketMessage = {
      type: 'group_update',
      chat_id: chatId,
      data: updateData,
      timestamp: new Date().toISOString(),
      priority: 'medium'
    };

    this.queueMessage(message);
  }

  /**
   * Process queued messages using worker thread
   * Benefits from 500x faster postMessage() for large message batches
   */
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const requestId = `queue-${Date.now()}-${Math.random()}`;
    
    // Take messages from queue (batch processing)
    const messages = this.messageQueue.splice(0, Math.min(100, this.messageQueue.length));
    
    try {
      await new Promise<void>((resolve, reject) => {
        this.pendingRequests.set(requestId, { 
          resolve: () => resolve(), 
          reject 
        });
        
        const request: BroadcastRequest = {
          type: 'process_queue',
          messages,
          requestId
        };

        // Fast transfer of message batch to worker
        worker.postMessage(request);
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send targeted messages to specific connections
   */
  async sendTargeted(messages: WebSocketMessage[], targetIds: string[]): Promise<{processed_count: number; failed_count: number}> {
    const requestId = `targeted-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const request: BroadcastRequest = {
        type: 'targeted',
        messages,
        target_ids: targetIds,
        requestId
      };

      worker.postMessage(request);
    });
  }

  /**
   * Broadcast to all connections in a room
   */
  async broadcastToRoom(messages: WebSocketMessage[], room: string): Promise<{processed_count: number; failed_count: number}> {
    const requestId = `room-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const request: BroadcastRequest = {
        type: 'group_broadcast',
        messages,
        room,
        requestId
      };

      worker.postMessage(request);
    });
  }

  /**
   * Register a new connection
   */
  registerConnection(customerId: string, socketId: string, room?: string, userAgent?: string): void {
    this.connectionStats.set(customerId, {
      customer_id: customerId,
      socket_id: socketId,
      connected_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      room,
      user_agent: userAgent
    });
  }

  /**
   * Update connection activity
   */
  updateActivity(customerId: string): void {
    const stats = this.connectionStats.get(customerId);
    if (stats) {
      stats.last_activity = new Date().toISOString();
    }
  }

  /**
   * Remove connection
   */
  removeConnection(customerId: string): void {
    this.connectionStats.delete(customerId);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): ConnectionStats[] {
    return Array.from(this.connectionStats.values());
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queue_size: number;
    processing: boolean;
    connection_count: number;
  } {
    return {
      queue_size: this.messageQueue.length,
      processing: this.isProcessing,
      connection_count: this.connectionStats.size
    };
  }

  /**
   * Clear message queue (emergency use)
   */
  clearQueue(): void {
    this.messageQueue.length = 0;
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    worker.terminate();
    for (const [requestId, pending] of this.pendingRequests) {
      pending.reject(new Error('Worker terminated'));
    }
    this.pendingRequests.clear();
    this.messageQueue.length = 0;
    this.connectionStats.clear();
  }
}

// Export singleton instance
export const webSocketProcessor = new WebSocketMessageProcessor();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Terminating WebSocket worker...');
  webSocketProcessor.terminate();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Terminating WebSocket worker...');
  webSocketProcessor.terminate();
  process.exit(0);
});