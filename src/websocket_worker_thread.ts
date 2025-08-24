/**
 * WebSocket Worker Thread Implementation
 * Processes message queues and handles broadcasting logic
 * Optimized for Bun's fast postMessage() performance
 */

import type { 
  BroadcastRequest, 
  BroadcastResponse, 
  WebSocketMessage 
} from './websocket_worker.ts';

// Mock WebSocket connections for demonstration
// In real implementation, this would connect to actual WebSocket server
const mockConnections = new Map<string, {
  customer_id: string;
  socket_id: string;
  room?: string;
  connected: boolean;
  last_ping: number;
}>();

// Message delivery statistics
const deliveryStats = {
  totalSent: 0,
  totalFailed: 0,
  averageProcessingTime: 0,
  lastProcessed: null as Date | null
};

// Worker thread message handler
self.onmessage = (event: MessageEvent<BroadcastRequest>) => {
  const startTime = performance.now();
  const { type, messages, target_ids, room, requestId } = event.data;

  try {
    let processed_count = 0;
    let failed_count = 0;

    switch (type) {
      case 'broadcast':
        [processed_count, failed_count] = processBroadcast(messages!);
        break;
      
      case 'targeted':
        [processed_count, failed_count] = processTargeted(messages!, target_ids!);
        break;
      
      case 'group_broadcast':
        [processed_count, failed_count] = processGroupBroadcast(messages!, room!);
        break;
      
      case 'process_queue':
        [processed_count, failed_count] = processMessageQueue(messages!);
        break;
      
      default:
        throw new Error(`Unknown broadcast type: ${type}`);
    }

    const processingTime = performance.now() - startTime;
    
    // Update statistics
    deliveryStats.totalSent += processed_count;
    deliveryStats.totalFailed += failed_count;
    deliveryStats.averageProcessingTime = 
      (deliveryStats.averageProcessingTime + processingTime) / 2;
    deliveryStats.lastProcessed = new Date();

    const response: BroadcastResponse = {
      requestId,
      type,
      processed_count,
      failed_count,
      processingTime,
      queueSize: messages?.length || 0
    };

    // Fast postMessage() response - benefits from 500x performance improvement
    self.postMessage(response);

  } catch (error) {
    const processingTime = performance.now() - startTime;
    
    const response: BroadcastResponse = {
      requestId,
      type,
      processed_count: 0,
      failed_count: messages?.length || 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
      queueSize: 0
    };

    self.postMessage(response);
  }
};

function processBroadcast(messages: WebSocketMessage[]): [number, number] {
  let processed = 0;
  let failed = 0;

  // Simulate broadcasting to all connections
  for (const message of messages) {
    try {
      // Group messages by priority for batching
      const highPriority = message.priority === 'urgent' || message.priority === 'high';
      
      if (highPriority) {
        // Process immediately
        const result = deliverMessage(message, Array.from(mockConnections.keys()));
        processed += result[0];
        failed += result[1];
      } else {
        // Batch with other low-priority messages
        const result = deliverMessage(message, Array.from(mockConnections.keys()));
        processed += result[0];
        failed += result[1];
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      failed++;
    }
  }

  return [processed, failed];
}

function processTargeted(messages: WebSocketMessage[], targetIds: string[]): [number, number] {
  let processed = 0;
  let failed = 0;

  for (const message of messages) {
    try {
      const result = deliverMessage(message, targetIds);
      processed += result[0];
      failed += result[1];
    } catch (error) {
      console.error('Targeted delivery error:', error);
      failed += targetIds.length;
    }
  }

  return [processed, failed];
}

function processGroupBroadcast(messages: WebSocketMessage[], room: string): [number, number] {
  let processed = 0;
  let failed = 0;

  // Find connections in the specified room
  const roomConnections = Array.from(mockConnections.values())
    .filter(conn => conn.room === room)
    .map(conn => conn.customer_id);

  for (const message of messages) {
    try {
      const result = deliverMessage(message, roomConnections);
      processed += result[0];
      failed += result[1];
    } catch (error) {
      console.error('Group broadcast error:', error);
      failed += roomConnections.length;
    }
  }

  return [processed, failed];
}

function processMessageQueue(messages: WebSocketMessage[]): [number, number] {
  let processed = 0;
  let failed = 0;

  // Sort messages by priority (urgent > high > medium > low)
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  const sortedMessages = messages.sort((a, b) => 
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  // Group messages by type and customer for efficient delivery
  const messageGroups = new Map<string, WebSocketMessage[]>();
  
  for (const message of sortedMessages) {
    let groupKey: string;
    
    if (message.customer_id) {
      groupKey = `customer:${message.customer_id}`;
    } else if (message.chat_id) {
      groupKey = `chat:${message.chat_id}`;
    } else {
      groupKey = 'broadcast';
    }
    
    if (!messageGroups.has(groupKey)) {
      messageGroups.set(groupKey, []);
    }
    messageGroups.get(groupKey)!.push(message);
  }

  // Process each group
  for (const [groupKey, groupMessages] of messageGroups) {
    try {
      if (groupKey === 'broadcast') {
        const result = processBroadcast(groupMessages);
        processed += result[0];
        failed += result[1];
      } else if (groupKey.startsWith('customer:')) {
        const customerId = groupKey.split(':')[1];
        const result = processTargeted(groupMessages, [customerId]);
        processed += result[0];
        failed += result[1];
      } else if (groupKey.startsWith('chat:')) {
        const chatId = groupKey.split(':')[1];
        const result = processGroupBroadcast(groupMessages, chatId);
        processed += result[0];
        failed += result[1];
      }
    } catch (error) {
      console.error(`Group processing error for ${groupKey}:`, error);
      failed += groupMessages.length;
    }
  }

  return [processed, failed];
}

function deliverMessage(message: WebSocketMessage, targetIds: string[]): [number, number] {
  let delivered = 0;
  let failed = 0;

  // Simulate message delivery with some realistic delays and failures
  for (const targetId of targetIds) {
    const connection = mockConnections.get(targetId);
    
    if (!connection || !connection.connected) {
      failed++;
      continue;
    }

    try {
      // Simulate WebSocket send
      const messagePayload = {
        id: generateMessageId(),
        type: message.type,
        customer_id: message.customer_id,
        chat_id: message.chat_id,
        data: message.data,
        timestamp: message.timestamp,
        priority: message.priority
      };

      // In real implementation, this would be:
      // connection.socket.send(JSON.stringify(messagePayload));
      
      // Simulate successful delivery
      delivered++;
      
      // Update connection activity
      connection.last_ping = Date.now();
      
    } catch (error) {
      console.error(`Delivery failed for ${targetId}:`, error);
      failed++;
    }
  }

  return [delivered, failed];
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Simulate some active connections for testing
function initializeMockConnections() {
  const customerIds = ['CUST001', 'CUST002', 'CUST003', 'ADMIN001', 'ADMIN002'];
  
  customerIds.forEach((customerId, index) => {
    mockConnections.set(customerId, {
      customer_id: customerId,
      socket_id: `socket_${index}`,
      room: customerId.startsWith('ADMIN') ? 'admin' : 'customers',
      connected: Math.random() > 0.1, // 90% connected
      last_ping: Date.now()
    });
  });
}

// Connection health monitoring
function monitorConnections() {
  const now = Date.now();
  const timeout = 30 * 1000; // 30 seconds

  for (const [customerId, connection] of mockConnections) {
    if (now - connection.last_ping > timeout) {
      connection.connected = false;
    }
  }
}

// Initialize mock data and monitoring
initializeMockConnections();

// Monitor connection health every 10 seconds
setInterval(monitorConnections, 10000);

// Simulate some connections dropping and reconnecting
setInterval(() => {
  // Randomly disconnect/reconnect some users
  for (const [customerId, connection] of mockConnections) {
    if (Math.random() < 0.05) { // 5% chance
      connection.connected = !connection.connected;
      if (connection.connected) {
        connection.last_ping = Date.now();
      }
    }
  }
}, 5000);

// Add new connections occasionally
setInterval(() => {
  if (Math.random() < 0.1) { // 10% chance
    const newCustomerId = `CUST${String(mockConnections.size + 1).padStart(3, '0')}`;
    mockConnections.set(newCustomerId, {
      customer_id: newCustomerId,
      socket_id: `socket_${mockConnections.size}`,
      room: 'customers',
      connected: true,
      last_ping: Date.now()
    });
  }
}, 15000);

// Log statistics periodically
setInterval(() => {
  const connectedCount = Array.from(mockConnections.values())
    .filter(c => c.connected).length;
  
  console.log(`WebSocket Stats - Connected: ${connectedCount}/${mockConnections.size}, ` +
              `Sent: ${deliveryStats.totalSent}, Failed: ${deliveryStats.totalFailed}, ` +
              `Avg Processing: ${deliveryStats.averageProcessingTime.toFixed(2)}ms`);
}, 30000);