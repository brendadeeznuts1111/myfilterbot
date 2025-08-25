# WebSocket Events Reference

> **🔌 Real-time communication guide for Fantasy402 Trading Platform**

This document provides comprehensive documentation for WebSocket events, real-time updates, and Socket.IO integration in the Fantasy402 Trading Platform.

## 🚀 Getting Started

### Connection Setup
```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  },
  transports: ['websocket', 'polling'],
  timeout: 20000
});
```

### Authentication
All WebSocket connections require JWT authentication:
```javascript
socket.auth = {
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

## 📡 Event Categories

### Customer Events

#### Balance Updates
Subscribe to real-time balance changes:
```javascript
// Subscribe to balance updates
socket.emit('subscribe', {
  type: 'customer_balance',
  customer_id: 'BB1042'
});

// Listen for balance changes
socket.on('balance_update', (data) => {
  console.log('Balance updated:', {
    customer_id: data.customer_id,
    new_balance: data.balance,
    change: data.change,
    previous_balance: data.previous_balance,
    timestamp: data.timestamp
  });
});
```

#### Transaction Events
Real-time transaction notifications:
```javascript
// Subscribe to transaction updates
socket.emit('subscribe', {
  type: 'transactions',
  customer_id: 'BB1042'
});

// New transaction event
socket.on('new_transaction', (transaction) => {
  console.log('New transaction:', {
    id: transaction.id,
    type: transaction.type,        // 'deposit', 'withdrawal', 'trade'
    amount: transaction.amount,
    status: transaction.status,    // 'pending', 'completed', 'failed'
    timestamp: transaction.timestamp
  });
});

// Transaction status change
socket.on('transaction_status', (data) => {
  console.log('Transaction status changed:', {
    transaction_id: data.transaction_id,
    old_status: data.old_status,
    new_status: data.new_status,
    reason: data.reason
  });
});
```

### Agent Events

#### Agent Notifications
Real-time updates for agents:
```javascript
// Subscribe to agent events
socket.emit('subscribe', {
  type: 'agent_notifications',
  agent_id: 'A100'
});

// Customer assignment
socket.on('customer_assigned', (data) => {
  console.log('New customer assigned:', {
    customer_id: data.customer_id,
    agent_id: data.agent_id,
    assignment_date: data.timestamp
  });
});

// Commission updates
socket.on('commission_earned', (data) => {
  console.log('Commission earned:', {
    agent_id: data.agent_id,
    amount: data.commission_amount,
    customer_id: data.customer_id,
    transaction_id: data.transaction_id
  });
});

// Performance tier changes
socket.on('tier_updated', (data) => {
  console.log('Performance tier updated:', {
    agent_id: data.agent_id,
    old_tier: data.old_tier,
    new_tier: data.new_tier,
    monthly_volume: data.monthly_volume
  });
});
```

### System Events

#### System Notifications
Platform-wide announcements and alerts:
```javascript
// Subscribe to system notifications
socket.emit('subscribe', {
  type: 'system_notifications'
});

// System alerts
socket.on('system_alert', (data) => {
  console.log('System alert:', {
    level: data.level,           // 'info', 'warning', 'error', 'critical'
    message: data.message,
    category: data.category,     // 'maintenance', 'security', 'performance'
    timestamp: data.timestamp
  });
});

// Maintenance notifications
socket.on('maintenance_notice', (data) => {
  console.log('Maintenance scheduled:', {
    start_time: data.start_time,
    end_time: data.end_time,
    affected_services: data.services,
    description: data.description
  });
});
```

#### Configuration Updates
Hot-reload configuration changes:
```javascript
// Subscribe to config updates
socket.emit('subscribe', {
  type: 'config_updates'
});

// Configuration reload
socket.on('config_reloaded', (data) => {
  console.log('Configuration updated:', {
    files_changed: data.files,
    timestamp: data.timestamp,
    affected_services: data.services
  });
});
```

### Trading Events

#### Market Updates
Real-time trading information:
```javascript
// Subscribe to market data
socket.emit('subscribe', {
  type: 'market_updates',
  symbols: ['BTC/USD', 'ETH/USD']
});

// Price updates
socket.on('price_update', (data) => {
  console.log('Price updated:', {
    symbol: data.symbol,
    price: data.price,
    change_24h: data.change_24h,
    volume: data.volume,
    timestamp: data.timestamp
  });
});

// Trade executions
socket.on('trade_executed', (data) => {
  console.log('Trade executed:', {
    customer_id: data.customer_id,
    symbol: data.symbol,
    side: data.side,           // 'buy' or 'sell'
    quantity: data.quantity,
    price: data.price,
    pnl: data.pnl
  });
});
```

### Telegram Bot Events

#### Bot Integration
Real-time bot activity updates:
```javascript
// Subscribe to bot events
socket.emit('subscribe', {
  type: 'telegram_bot'
});

// Message received
socket.on('telegram_message', (data) => {
  console.log('Telegram message:', {
    user_id: data.user_id,
    message: data.message,
    command: data.command,
    chat_id: data.chat_id
  });
});

// User joined/left
socket.on('telegram_user_status', (data) => {
  console.log('User status changed:', {
    user_id: data.user_id,
    status: data.status,      // 'joined', 'left', 'banned'
    chat_id: data.chat_id
  });
});
```

## 🛠️ Advanced Features

### Room Management
Organize connections into logical groups:
```javascript
// Join specific rooms
socket.emit('join_room', {
  room: 'agents',
  agent_id: 'A100'
});

socket.emit('join_room', {
  room: 'customers',
  customer_id: 'BB1042'
});

socket.emit('join_room', {
  room: 'admins'
});
```

### Event Filtering
Subscribe to specific event subsets:
```javascript
// Subscribe with filters
socket.emit('subscribe', {
  type: 'transactions',
  filters: {
    customer_id: 'BB1042',
    transaction_types: ['deposit', 'withdrawal'],
    min_amount: 100,
    status: 'completed'
  }
});
```

### Message Acknowledgments
Ensure message delivery:
```javascript
// Send with acknowledgment
socket.emit('subscribe', {
  type: 'customer_balance',
  customer_id: 'BB1042'
}, (response) => {
  if (response.success) {
    console.log('Subscription confirmed');
  } else {
    console.error('Subscription failed:', response.error);
  }
});
```

## 📊 Event Payload Examples

### Complete Balance Update
```json
{
  "event": "balance_update",
  "data": {
    "customer_id": "BB1042",
    "balance": 1450.00,
    "previous_balance": 1350.00,
    "change": 100.00,
    "change_reason": "deposit",
    "transaction_id": "txn_123456",
    "timestamp": "2025-08-25T14:30:00Z",
    "currency": "USD"
  }
}
```

### Transaction Notification
```json
{
  "event": "new_transaction",
  "data": {
    "id": "txn_123456",
    "customer_id": "BB1042",
    "type": "deposit",
    "amount": 100.00,
    "status": "completed",
    "method": "credit_card",
    "reference": "REF123456",
    "fees": 2.90,
    "balance_after": 1450.00,
    "timestamp": "2025-08-25T14:30:00Z",
    "agent_commission": 5.00
  }
}
```

### System Alert
```json
{
  "event": "system_alert",
  "data": {
    "id": "alert_789",
    "level": "warning",
    "category": "performance",
    "title": "High Server Load",
    "message": "Server load is above 80%. Monitoring situation.",
    "affected_services": ["api", "websocket"],
    "timestamp": "2025-08-25T14:30:00Z",
    "auto_resolve": true,
    "resolution_eta": "2025-08-25T15:00:00Z"
  }
}
```

## 🔄 Connection Management

### Connection Events
Handle connection lifecycle:
```javascript
// Connection established
socket.on('connect', () => {
  console.log('Connected to server');
  console.log('Socket ID:', socket.id);
});

// Connection lost
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Server disconnected, manual reconnection needed
    socket.connect();
  }
});

// Connection error
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

// Reconnection attempts
socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Reconnection attempt:', attemptNumber);
});

// Successful reconnection
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Re-subscribe to events
  resubscribeToEvents();
});
```

### Heartbeat & Keep-Alive
Monitor connection health:
```javascript
// Heartbeat configuration
const socket = io('ws://localhost:5000', {
  pingTimeout: 60000,      // 60 seconds
  pingInterval: 25000,     // 25 seconds
  auth: { token: 'jwt_token' }
});

// Custom heartbeat handling
setInterval(() => {
  socket.emit('ping', { timestamp: Date.now() });
}, 30000);

socket.on('pong', (data) => {
  const latency = Date.now() - data.timestamp;
  console.log('Connection latency:', latency + 'ms');
});
```

## 🎯 Best Practices

### Error Handling
```javascript
// Comprehensive error handling
socket.on('error', (error) => {
  console.error('Socket error:', error);
  
  // Handle different error types
  switch (error.type) {
    case 'AUTHENTICATION_FAILED':
      // Refresh token and reconnect
      refreshTokenAndReconnect();
      break;
    case 'RATE_LIMITED':
      // Implement exponential backoff
      setTimeout(() => socket.connect(), error.retry_after * 1000);
      break;
    case 'SUBSCRIPTION_FAILED':
      // Retry subscription
      retryFailedSubscriptions();
      break;
  }
});
```

### Subscription Management
```javascript
class SubscriptionManager {
  constructor(socket) {
    this.socket = socket;
    this.subscriptions = new Map();
  }
  
  subscribe(type, params, callback) {
    const subscriptionId = `${type}_${JSON.stringify(params)}`;
    
    this.socket.emit('subscribe', { type, ...params }, (response) => {
      if (response.success) {
        this.subscriptions.set(subscriptionId, { type, params, callback });
        this.socket.on(type, callback);
      }
    });
  }
  
  unsubscribe(type, params) {
    const subscriptionId = `${type}_${JSON.stringify(params)}`;
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (subscription) {
      this.socket.emit('unsubscribe', { type, ...params });
      this.socket.off(type, subscription.callback);
      this.subscriptions.delete(subscriptionId);
    }
  }
  
  resubscribeAll() {
    for (const [id, subscription] of this.subscriptions) {
      this.subscribe(subscription.type, subscription.params, subscription.callback);
    }
  }
}
```

### Performance Optimization
```javascript
// Throttle rapid events
const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

// Throttled balance update handler
const handleBalanceUpdate = throttle((data) => {
  updateBalanceUI(data);
}, 1000); // Max once per second

socket.on('balance_update', handleBalanceUpdate);
```

## 🔒 Security Considerations

### Token Management
```javascript
// Automatic token refresh
socket.on('token_expired', async () => {
  try {
    const newToken = await refreshAuthToken();
    socket.auth.token = newToken;
    socket.disconnect().connect();
  } catch (error) {
    console.error('Token refresh failed:', error);
    redirectToLogin();
  }
});
```

### Data Validation
```javascript
// Validate incoming data
socket.on('balance_update', (data) => {
  // Validate data structure
  if (!data.customer_id || typeof data.balance !== 'number') {
    console.warn('Invalid balance update data:', data);
    return;
  }
  
  // Sanitize data
  const sanitizedData = {
    customer_id: data.customer_id.toString(),
    balance: parseFloat(data.balance),
    timestamp: new Date(data.timestamp)
  };
  
  handleBalanceUpdate(sanitizedData);
});
```

## 📈 Monitoring & Analytics

### Event Metrics
```javascript
// Track event performance
const eventMetrics = {
  received: 0,
  processed: 0,
  errors: 0,
  avgProcessingTime: 0
};

socket.onAny((eventName, data) => {
  eventMetrics.received++;
  
  const startTime = performance.now();
  
  // Process event
  try {
    processEvent(eventName, data);
    eventMetrics.processed++;
  } catch (error) {
    eventMetrics.errors++;
    console.error(`Error processing ${eventName}:`, error);
  }
  
  // Update processing time
  const processingTime = performance.now() - startTime;
  eventMetrics.avgProcessingTime = 
    (eventMetrics.avgProcessingTime + processingTime) / 2;
});
```

## 🔗 Related Documentation

- [API Documentation](./API_DOCUMENTATION.md) - REST API reference
- [Real-time Dashboard](../user-guides/DASHBOARD_USER_GUIDE.md) - Dashboard WebSocket integration  
- [Agent Management](./AGENT_MANAGEMENT.md) - Agent-specific events
- [Security & Authentication](./SECURITY.md) - WebSocket security details
- [System Architecture](../architecture/SYSTEM_ARCHITECTURE.md) - WebSocket server design

---

**WebSocket Version**: Socket.IO v4  
**Protocol**: WebSocket with polling fallback  
**Authentication**: JWT Bearer tokens  
**Rate Limiting**: 450 messages/minute  
**Status**: ✅ 234 active connections, real-time updates enabled