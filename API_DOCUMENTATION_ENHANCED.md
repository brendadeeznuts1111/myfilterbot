# 📡 Enhanced API Documentation - Fantdev Trading Bot v2.0

## 🚀 What's New in v2.0
- **JWT Authentication**: Secure token-based authentication
- **WebSocket Support**: Real-time updates via Socket.IO
- **Enhanced Security**: Bearer token authorization
- **Live Data Streaming**: Real-time balance and transaction updates

## Base Configuration

### Server URLs
```
Development: http://localhost:5000
WebSocket: ws://localhost:5000
Production: https://your-domain.com
```

### Required Headers
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>  # For authenticated endpoints
ngrok-skip-browser-warning: true   # For ngrok tunnels
```

## 🔐 Authentication (JWT)

### POST `/api/login`
Authenticate a customer and receive JWT token.

#### Request
```json
{
  "customer_id": "BB1042",
  "password": "N9H9"
}
```

#### Response (Success - 200)
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "customer": {
    "customer_id": "BB1042",
    "balance": 1450.00,
    "weekly_pnl": 3000.00,
    "active": true,
    "registered": true,
    "phone": "",
    "telegram_username": "@billabongwanger"
  }
}
```

#### Token Details
- **Algorithm**: HS256
- **Expiration**: 24 hours
- **Payload**: Contains user_id and type (customer/admin)

### POST `/api/admin/login`
Admin authentication endpoint.

#### Request
```json
{
  "username": "admin",
  "password": "admin123"
}
```

#### Response (Success - 200)
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "administrator"
  }
}
```

## 📊 Customer Endpoints (Protected)

All customer endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### GET `/api/customer/{customer_id}`
Retrieve customer data with statistics.

#### Headers Required
```http
Authorization: Bearer <jwt_token>
```

#### Response (200)
```json
{
  "customer": {
    "customer_id": "BB1042",
    "balance": 1450.00,
    "weekly_pnl": 3000.00,
    "active": true,
    "registered": true
  },
  "statistics": {
    "daily_volume": 1500.00,
    "weekly_volume": 8500.00,
    "win_rate": 65.5,
    "total_trades": 42,
    "wins": 27,
    "losses": 15
  },
  "recent_transactions": [
    {
      "timestamp": "2025-08-23T14:30:00",
      "type": "deposit",
      "amount": 500.00,
      "status": "completed"
    }
  ]
}
```

### GET `/api/customer/{customer_id}/transactions`
Get paginated transaction history.

#### Query Parameters
- `limit` (int): Number of transactions per page (default: 50)
- `offset` (int): Pagination offset (default: 0)
- `type` (string): Filter by transaction type (deposit/withdrawal)

#### Response (200)
```json
{
  "transactions": [
    {
      "timestamp": "2025-08-23T14:30:00",
      "type": "deposit",
      "amount": 500.00,
      "message": "Deposit successful",
      "status": "completed"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

## 👥 Admin Endpoints (Protected)

Require admin JWT token with `type: 'admin'` in payload.

### GET `/api/admin/statistics`
Get system-wide statistics.

#### Response (200)
```json
{
  "customers": {
    "total": 25,
    "active": 20,
    "total_balance": 17209.00,
    "total_weekly_pnl": 12345.00
  },
  "members": {
    "total": 15,
    "pending": 3,
    "approved": 10,
    "denied": 2,
    "groups": 4
  }
}
```

### GET `/api/admin/members`
Get all group members with filters.

#### Query Parameters
- `status` (string): Filter by status (pending/approved/denied)
- `group_id` (string): Filter by group ID
- `search` (string): Search by username or group name

#### Response (200)
```json
{
  "members": [
    {
      "telegram_id": 123456,
      "username": "alice_trader",
      "group_id": -1001234567890,
      "group_name": "Test Trading Group",
      "join_date": "2025-08-23T15:59:34",
      "status": "approved",
      "customer_id": "BB1042",
      "permissions": {
        "can_view": true,
        "can_trade": true,
        "can_withdraw": false,
        "daily_limit": 500
      }
    }
  ]
}
```

### POST `/api/admin/members/{telegram_id}/approve`
Approve a group member.

#### Request
```json
{
  "group_id": -1001234567890,
  "permissions": {
    "can_view": true,
    "can_trade": true,
    "can_withdraw": false,
    "daily_limit": 500
  },
  "customer_id": "BB1042"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Member approved"
}
```

### POST `/api/admin/members/{telegram_id}/deny`
Deny a group member.

#### Request
```json
{
  "group_id": -1001234567890,
  "reason": "Verification failed"
}
```

## 🔌 WebSocket Events

Connect to WebSocket for real-time updates.

### Connection
```javascript
const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling']
});
```

### Authentication Flow
```javascript
// 1. Connect
socket.on('connect', () => {
  console.log('Connected');
  
  // 2. Authenticate with JWT
  socket.emit('authenticate', { 
    token: 'your_jwt_token' 
  });
});

// 3. Handle authentication response
socket.on('auth_success', (data) => {
  console.log('Authenticated:', data);
  
  // 4. Subscribe to updates
  socket.emit('subscribe_updates', { 
    type: 'all' 
  });
});

socket.on('auth_error', (data) => {
  console.error('Auth failed:', data);
});
```

### Customer Events

#### `balance_update`
Real-time balance changes.
```json
{
  "balance": 1550.00,
  "change": 100.00,
  "percentage": 6.9
}
```

#### `transaction_update`
New transaction notification.
```json
{
  "type": "deposit",
  "amount": 100.00,
  "timestamp": "2025-08-23T16:30:00",
  "status": "completed"
}
```

#### `initial_data`
Initial data upon subscription.
```json
{
  "balance": 1450.00,
  "weekly_pnl": 3000.00
}
```

### Admin Events

#### `new_transaction`
System-wide transaction notification.
```json
{
  "customer_id": "BB1042",
  "type": "deposit",
  "amount": 500.00,
  "timestamp": "2025-08-23T16:30:00"
}
```

#### `member_approved`
Member approval notification.
```json
{
  "telegram_id": 123456,
  "username": "alice_trader",
  "group_name": "Test Trading Group"
}
```

#### `member_denied`
Member denial notification.
```json
{
  "telegram_id": 123456,
  "username": "bob_user",
  "reason": "Verification failed"
}
```

#### `customer_balance_update`
Customer balance change (admin view).
```json
{
  "customer_id": "BB1042",
  "balance": 1550.00,
  "change": 100.00
}
```

## 🏥 Health & Status

### GET `/api/health`
Check server health and connections.

#### Response (200)
```json
{
  "status": "healthy",
  "timestamp": "2025-08-23T16:00:00",
  "active_connections": 5,
  "database": "connected"
}
```

## 🌐 Web Portals

### Customer Portal
- **URL**: `/`
- **File**: `enhanced_customer_portal.html`
- **Features**: JWT auth, real-time updates, Chart.js visualization

### Admin Portal
- **URL**: `/admin`
- **File**: `admin_portal.html`
- **Features**: Member management, system statistics

## ⚠️ Error Responses

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Unauthorized"
}
```

### Token Expired
```json
{
  "error": "Invalid or expired token"
}
```

## 🔧 Testing Examples

### Login and Get Token
```bash
# Login
TOKEN=$(curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "BB1042", "password": "N9H9"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

### Authenticated Request
```bash
# Get customer data
curl -X GET http://localhost:5000/api/customer/BB1042 \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
```

### WebSocket Test (Node.js)
```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:5000');
const token = 'your_jwt_token';

socket.on('connect', () => {
  socket.emit('authenticate', { token });
});

socket.on('balance_update', (data) => {
  console.log('Balance updated:', data);
});
```

## 📦 Required Dependencies

```txt
# Core
flask>=2.3.0
flask-cors>=4.0.0
flask-socketio>=5.3.0

# WebSocket
python-socketio>=5.9.0
python-engineio>=4.7.0
eventlet>=0.33.0

# Authentication
pyjwt>=2.8.0
cryptography>=41.0.0

# Frontend
chart.js (CDN)
socket.io-client (CDN)
```

## 🚀 Deployment Checklist

### Security
- [ ] Change JWT_SECRET in production
- [ ] Use HTTPS for all endpoints
- [ ] Implement rate limiting
- [ ] Enable CORS for specific domains only
- [ ] Use environment variables for secrets

### Performance
- [ ] Enable WebSocket compression
- [ ] Implement connection pooling
- [ ] Add caching for frequently accessed data
- [ ] Use production WSGI server (gunicorn/uwsgi)

### Monitoring
- [ ] Set up logging
- [ ] Monitor WebSocket connections
- [ ] Track API response times
- [ ] Implement health checks

## 📈 Migration from v1.0

### Breaking Changes
1. All protected endpoints now require JWT token
2. Login response format changed (includes token)
3. WebSocket replaces polling for real-time updates

### Migration Steps
1. Update client to store JWT token
2. Add Authorization header to API calls
3. Implement WebSocket connection for real-time features
4. Update error handling for new auth errors

---

**API Version:** 2.0.0  
**Last Updated:** August 23, 2025  
**Contact:** admin@fantdev.trading