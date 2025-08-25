/**
 * Redis Streams Event Bus
 * High-performance event-driven architecture for Telegram bot system
 * Supports pub/sub, event sourcing, and parallel processing
 */

import { EventEmitter } from 'events';

// Simple Redis client interface for Bun
interface RedisClient {
  xgroup(command: string, stream: string, group: string, id: string, ...args: string[]): Promise<string>;
  xadd(stream: string, ...args: (string | number)[]): Promise<string>;
  xreadgroup(...args: (string | number)[]): Promise<any[]>;
  xack(stream: string, group: string, id: string): Promise<number>;
  xinfo(command: string, stream: string): Promise<any[]>;
  quit(): Promise<void>;
}

class BunRedisClient implements RedisClient {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  private async executeCommand(command: string[]): Promise<any> {
    // For now, we'll use a mock implementation
    // In production, you'd use Bun's Redis client or a simple TCP connection
    console.log(`Redis command: ${command.join(' ')}`);

    // Mock responses for development
    if (command[0] === 'XGROUP') {
      return 'OK';
    } else if (command[0] === 'XADD') {
      return `${Date.now()}-0`;
    } else if (command[0] === 'XREADGROUP') {
      return []; // No messages
    } else if (command[0] === 'XACK') {
      return 1;
    } else if (command[0] === 'XINFO') {
      return [
        'length', 0,
        'radix-tree-keys', 1,
        'radix-tree-nodes', 2,
        'groups', 1,
        'last-generated-id', '0-0',
        'first-entry', null,
        'last-entry', null
      ];
    }
    return 'OK';
  }

  async xgroup(command: string, stream: string, group: string, id: string, ...args: string[]): Promise<string> {
    return await this.executeCommand(['XGROUP', command, stream, group, id, ...args]);
  }

  async xadd(stream: string, ...args: (string | number)[]): Promise<string> {
    return await this.executeCommand(['XADD', stream, ...args.map(String)]);
  }

  async xreadgroup(...args: (string | number)[]): Promise<any[]> {
    return await this.executeCommand(['XREADGROUP', ...args.map(String)]);
  }

  async xack(stream: string, group: string, id: string): Promise<number> {
    return await this.executeCommand(['XACK', stream, group, id]);
  }

  async xinfo(command: string, stream: string): Promise<any[]> {
    return await this.executeCommand(['XINFO', command, stream]);
  }

  async quit(): Promise<void> {
    console.log('Redis client disconnected');
  }
}

export interface EventMessage {
  id?: string;
  type: string;
  source: string;
  data: any;
  timestamp: string;
  correlationId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  retryCount?: number;
  metadata?: Record<string, any>;
}

export interface EventHandler {
  (message: EventMessage): Promise<void>;
}

export interface StreamConfig {
  name: string;
  maxLength?: number;
  consumerGroup: string;
  consumerName: string;
  batchSize?: number;
  blockTime?: number;
}

export class EventBus extends EventEmitter {
  private redis: RedisClient;
  private streams: Map<string, StreamConfig> = new Map();
  private handlers: Map<string, EventHandler[]> = new Map();
  private isRunning = false;
  private processingPromises: Promise<void>[] = [];

  constructor(redisUrl: string = 'redis://localhost:6379') {
    super();
    this.redis = new BunRedisClient(redisUrl);
    console.log('🔗 Event Bus initialized with Bun Redis client');
  }

  /**
   * Register a stream for event processing
   */
  async registerStream(config: StreamConfig): Promise<void> {
    this.streams.set(config.name, {
      maxLength: 10000,
      batchSize: 10,
      blockTime: 1000,
      ...config,
    });

    try {
      // Create consumer group if it doesn't exist
      await this.redis.xgroup(
        'CREATE',
        config.name,
        config.consumerGroup,
        '$',
        'MKSTREAM'
      );
      console.log(`📡 Registered stream: ${config.name}`);
    } catch (error: any) {
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
      // Consumer group already exists
    }
  }

  /**
   * Publish an event to a stream
   */
  async publish(streamName: string, event: Omit<EventMessage, 'timestamp'>): Promise<string> {
    const message: EventMessage = {
      ...event,
      timestamp: new Date().toISOString(),
      correlationId: event.correlationId || this.generateCorrelationId(),
    };

    const messageId = await this.redis.xadd(
      streamName,
      'MAXLEN',
      '~',
      this.streams.get(streamName)?.maxLength || 10000,
      '*',
      'data',
      JSON.stringify(message)
    );

    console.log(`📤 Published event ${message.type} to ${streamName}: ${messageId}`);
    return messageId;
  }

  /**
   * Subscribe to events of a specific type
   */
  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    console.log(`🔔 Subscribed to event type: ${eventType}`);
  }

  /**
   * Start processing events from all registered streams
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('⚠️ Event Bus is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Event Bus...');

    // Start processing each stream
    for (const [streamName, config] of this.streams) {
      const promise = this.processStream(streamName, config);
      this.processingPromises.push(promise);
    }

    console.log(`✅ Event Bus started with ${this.streams.size} streams`);
  }

  /**
   * Stop the event bus
   */
  async stop(): Promise<void> {
    console.log('⏹️ Stopping Event Bus...');
    this.isRunning = false;

    // Wait for all processing to complete
    await Promise.all(this.processingPromises);
    await this.redis.quit();
    
    console.log('✅ Event Bus stopped');
  }

  /**
   * Process events from a specific stream
   */
  private async processStream(streamName: string, config: StreamConfig): Promise<void> {
    while (this.isRunning) {
      try {
        const results = await this.redis.xreadgroup(
          'GROUP',
          config.consumerGroup,
          config.consumerName,
          'COUNT',
          config.batchSize!,
          'BLOCK',
          config.blockTime!,
          'STREAMS',
          streamName,
          '>'
        );

        if (results && results.length > 0) {
          const [, messages] = results[0];
          await this.processMessages(streamName, config, messages);
        }
      } catch (error) {
        console.error(`❌ Error processing stream ${streamName}:`, error);
        await this.sleep(1000); // Wait before retrying
      }
    }
  }

  /**
   * Process a batch of messages
   */
  private async processMessages(
    streamName: string,
    config: StreamConfig,
    messages: any[]
  ): Promise<void> {
    const processingPromises = messages.map(async ([messageId, fields]) => {
      try {
        const messageData = JSON.parse(fields[1]) as EventMessage;
        messageData.id = messageId;

        // Find handlers for this event type
        const handlers = this.handlers.get(messageData.type) || [];
        
        if (handlers.length === 0) {
          console.warn(`⚠️ No handlers for event type: ${messageData.type}`);
          await this.acknowledgeMessage(streamName, config.consumerGroup, messageId);
          return;
        }

        // Process with all handlers in parallel
        await Promise.all(
          handlers.map(async (handler) => {
            try {
              await handler(messageData);
            } catch (error) {
              console.error(`❌ Handler error for ${messageData.type}:`, error);
              // Don't acknowledge failed messages - they'll be retried
              throw error;
            }
          })
        );

        // Acknowledge successful processing
        await this.acknowledgeMessage(streamName, config.consumerGroup, messageId);
        
      } catch (error) {
        console.error(`❌ Error processing message ${messageId}:`, error);
        // Message will remain unacknowledged and can be retried
      }
    });

    await Promise.all(processingPromises);
  }

  /**
   * Acknowledge a processed message
   */
  private async acknowledgeMessage(
    streamName: string,
    consumerGroup: string,
    messageId: string
  ): Promise<void> {
    await this.redis.xack(streamName, consumerGroup, messageId);
  }

  /**
   * Generate a unique correlation ID
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get stream statistics
   */
  async getStreamStats(streamName: string): Promise<any> {
    const info = await this.redis.xinfo('STREAM', streamName);
    return {
      length: info[1],
      radixTreeKeys: info[3],
      radixTreeNodes: info[5],
      groups: info[7],
      lastGeneratedId: info[9],
      firstEntry: info[11],
      lastEntry: info[13],
    };
  }
}
