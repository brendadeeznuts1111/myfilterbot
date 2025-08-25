# API Endpoints Reference - Fantdev Trading Bot

## 🎯 **OVERVIEW**

This document provides a comprehensive reference for all API endpoints in the Fantdev Trading Bot system. The system is **production-ready** with a robust API that supports customer management, system monitoring, and configuration management.

## 🔐 **AUTHENTICATION**

### **Authentication Required**
Most endpoints require JWT authentication via:
- **Bearer Token**: `Authorization: Bearer <token>`
- **Cookie**: `dashboard_session=<token>`

### **Login Endpoint**
```http
POST /api/auth/login
Content-Type: application/json

{
  "password": "your_admin_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here"
}
```

## 📊 **HEALTH & SYSTEM ENDPOINTS**

### **Basic Health Check**
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "admin_server",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **Detailed Health Status**
```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "admin_server",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **Service-Specific Health Checks**
```http
GET /api/bot/status      # Telegram bot health
GET /api/db/status       # Database health
GET /api/redis/status    # Redis health
GET /api/ws/status       # WebSocket health
```

## 👥 **CUSTOMER MANAGEMENT ENDPOINTS**

### **List All Customers**
```http
GET /api/admin/customers
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "customers": [
    {
      "customer_id": "BB12345",
      "balance": 1500.00,
      "weekly_pnl": 250.00,
      "phone": "+1234567890",
      "telegram_id": "123456789",
      "telegram_username": "@user123",
      "active": true,
      "last_activity": "2024-01-01T00:00:00.000Z",
      "keywords": ["trading", "crypto"],
      "group_chat_id": "-2714719687"
    }
  ],
  "total": 3142,
  "total_balance": 4500000.00,
  "total_weekly_pnl": 750000.00
}
```

### **Get Single Customer**
```http
GET /api/admin/customers/{customer_id}
Authorization: Bearer <token>
```

### **Create Customer**
```http
POST /api/admin/customer
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer_id": "BB12346",
  "password": "secure_password",
  "telegram_id": "987654321",
  "telegram_username": "@newuser",
  "active": true
}
```

### **Update Customer**
```http
PUT /api/admin/customers/{customer_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "balance": 2000.00,
  "active": false
}
```

### **Delete Customer**
```http
DELETE /api/admin/customers/{customer_id}
Authorization: Bearer <token>
```

### **Customer Search**
```http
GET /api/admin/customers/search?q=search_term
Authorization: Bearer <token>
```

### **Customer Level Filtering**
```http
GET /api/admin/customers?level=vip      # VIP customers (balance > $10,000)
GET /api/admin/customers?level=basic    # Basic customers (balance ≤ $10,000)
```

### **Customer Export**
```http
GET /api/admin/export/customers?format=csv
GET /api/admin/export/customers?format=json
Authorization: Bearer <token>
```

## 📈 **STATISTICS & ANALYTICS ENDPOINTS**

### **System Statistics**
```http
GET /api/admin/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "customers": {
    "total": 3142,
    "total_balance": 4500000.00,
    "total_weekly_pnl": 750000.00,
    "active": 2800,
    "inactive": 342,
    "telegram_connected": 2750,
    "telegram_disconnected": 392
  },
  "members": {
    "approved": 2750,
    "pending": 342,
    "denied": 50
  },
  "groups": {
    "total": 5,
    "members_per_group": 550
  },
  "total_transactions": 1250,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **Customer Statistics**
```http
GET /api/stats
```

### **Recent Activity**
```http
GET /api/admin/activity
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1704067200000,
    "customer": "BB12345",
    "type": "deposit",
    "amount": 500.00,
    "status": "completed",
    "time": "2 mins ago"
  }
]
```

## ⚙️ **SYSTEM MANAGEMENT ENDPOINTS**

### **System Information**
```http
GET /api/admin/system
Authorization: Bearer <token>
```

**Response:**
```json
{
  "server": {
    "uptime": 12345.67,
    "memory": {
      "rss": 123456789,
      "heapTotal": 987654321,
      "heapUsed": 456789123
    },
    "version": "v20.0.0",
    "platform": "darwin"
  },
  "application": {
    "customers": 3142,
    "environment": "development",
    "timezone": "UTC"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **Configuration Management**
```http
GET /api/admin/config
Authorization: Bearer <token>
```

**Response:**
```json
{
  "app": { /* app.yaml content */ },
  "features": { /* features.yaml content */ },
  "hotReload": {
    "active": true,
    "files": [
      "app.yaml",
      "features.yaml",
      "services.yaml",
      "telegram.yaml",
      "database.yaml"
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **Performance Metrics**
```http
GET /api/admin/metrics
Authorization: Bearer <token>
```

**Response:**
```json
{
  "requests": {
    "total": 12500,
    "per_minute": 85,
    "errors": 25
  },
  "services": {
    "database": { "latency": 5, "status": "ok" },
    "redis": { "latency": 3, "status": "ok" },
    "telegram": { "latency": 15, "status": "ok" }
  },
  "system": {
    "cpu_usage": 25,
    "memory_usage": 35,
    "disk_usage": 40
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 **SERVICE CONTROL ENDPOINTS**

### **Start All Services**
```http
POST /api/services/start
```

**Response:**
```json
{
  "success": true,
  "message": "All services started",
  "services": [
    "telegram_bot",
    "portal_server",
    "admin_server",
    "websocket",
    "database",
    "redis"
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **Stop All Services**
```http
POST /api/services/stop
```

### **Restart All Services**
```http
POST /api/services/restart
```

## 📝 **LOGGING ENDPOINTS**

### **Application Logs**
```http
GET /api/admin/logs
Authorization: Bearer <token>
```

### **Web Logs**
```http
GET /api/admin/logs/web?tail=100
Authorization: Bearer <token>
```

### **Service-Specific Logs**
```http
GET /api/admin/logs/service/{service_name}
Authorization: Bearer <token>
```

## 🚀 **DASHBOARD ENDPOINTS**

### **Main Dashboard**
```http
GET /dashboard
Authorization: Bearer <token>
```

### **Dashboard Configuration**
```http
GET /api/dashboard/config
```

### **Dashboard Stream (SSE)**
```http
GET /api/dashboard/stream
Authorization: Bearer <token>
```

## 🔐 **ADMIN HEALTH ENDPOINTS**

### **Database Health**
```http
GET /api/admin/health/db
Authorization: Bearer <token>
```

### **Redis Health**
```http
GET /api/admin/health/redis
Authorization: Bearer <token>
```

### **Bot Health**
```http
GET /api/admin/health/bot
Authorization: Bearer <token>
```

## 📊 **DATA TABLE ENDPOINTS**

### **Transactions Table**
```http
GET /api/admin/transactions?export=csv
GET /api/admin/transactions?export=json
Authorization: Bearer <token>
```

### **Bets Table**
```http
GET /api/admin/bets?export=csv
GET /api/admin/bets?export=json
Authorization: Bearer <token>
```

### **Deposits Table**
```http
GET /api/admin/deposits?export=csv
GET /api/admin/deposits?export=json
Authorization: Bearer <token>
```

### **Telegram Groups Table**
```http
GET /api/admin/tg-groups?export=csv
GET /api/admin/tg-groups?export=json
Authorization: Bearer <token>
```

## 🎛️ **FEATURE FLAG ENDPOINTS**

### **Get Feature Flags**
```http
GET /api/features
Authorization: Bearer <token>
```

### **Toggle Feature**
```http
POST /api/features/{feature_name}/toggle
Authorization: Bearer <token>
```

## 📱 **TELEGRAM INTEGRATION ENDPOINTS**

### **Bot Status**
```http
GET /api/admin/telegram/bot/status
Authorization: Bearer <token>
```

### **Cashier Status**
```http
GET /api/admin/telegram/cashier/status
Authorization: Bearer <token>
```

### **Telegram Groups**
```http
GET /api/admin/telegram/groups
Authorization: Bearer <token>
```

### **Group Messages**
```http
GET /api/admin/telegram/group/{group_id}
Authorization: Bearer <token>
```

### **Send Message**
```http
POST /api/admin/telegram/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "chat": "chat_id",
  "text": "Message content",
  "source": "bot"
}
```

### **Get Messages**
```http
GET /api/admin/telegram/messages?limit=100&chat=chat_id
Authorization: Bearer <token>
```

### **Get Chats**
```http
GET /api/admin/telegram/chats
Authorization: Bearer <token>
```

## 🚨 **FRAUD MANAGEMENT ENDPOINTS**

### **Fraud Scores**
```http
GET /api/admin/fraud/scores
Authorization: Bearer <token>
```

### **Flag Customer**
```http
POST /api/admin/fraud/flag/{customer_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "flag_type": "manual_review"
}
```

### **Fraud Logs**
```http
GET /api/admin/fraud/logs
Authorization: Bearer <token>
```

## 💰 **TRANSACTION ENDPOINTS**

### **List Transactions**
```http
GET /api/admin/transactions?customer=customer_id&from=date&to=date
Authorization: Bearer <token>
```

### **Create Transaction**
```http
POST /api/admin/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer_id": "BB12345",
  "type": "deposit",
  "amount": 500.00
}
```

### **Transaction Summary**
```http
GET /api/admin/transactions/summary
Authorization: Bearer <token>
```

## 🎲 **BETTING ENDPOINTS**

### **List Bets**
```http
GET /api/admin/bets?status=open&agent=agent_id
Authorization: Bearer <token>
```

### **Settle Bet**
```http
POST /api/admin/bets/{bet_id}/settle
Authorization: Bearer <token>
Content-Type: application/json

{
  "result": "win"
}
```

### **Bet Statistics**
```http
GET /api/admin/bets/stats
Authorization: Bearer <token>
```

## 👨‍💼 **AGENT MANAGEMENT ENDPOINTS**

### **List Agents**
```http
GET /api/admin/agents
Authorization: Bearer <token>
```

### **Agent Details**
```http
GET /api/admin/agents/{agent_id}
Authorization: Bearer <token>
```

### **List Masters**
```http
GET /api/admin/masters
Authorization: Bearer <token>
```

### **Master Details**
```http
GET /api/admin/masters/{master_id}
Authorization: Bearer <token>
```

## 💸 **COMMISSION ENDPOINTS**

### **Calculate All Commissions**
```http
GET /api/admin/commissions?period=2024-01
Authorization: Bearer <token>
```

### **Recalculate Commissions**
```http
POST /api/admin/commissions/calculate
Authorization: Bearer <token>
Content-Type: application/json

{
  "period": "2024-01"
}
```

### **Agent Statement**
```http
GET /api/admin/commissions/{agent_id}?period=2024-01
Authorization: Bearer <token>
```

## 🔄 **DATA MANAGEMENT ENDPOINTS**

### **Reload Data**
```http
POST /api/admin/data/reload
Authorization: Bearer <token>
```

### **Data Statistics**
```http
GET /api/admin/data-stats
Authorization: Bearer <token>
```

## 🌐 **REMOTE DASHBOARD ENDPOINTS**

### **Remote Customers**
```http
GET /api/remote/customers
```

### **Remote Transactions**
```http
GET /api/remote/transactions
```

### **Remote P2P Deposits**
```http
GET /api/remote/p2p/deposits
```

### **Remote P2P Withdrawals**
```http
GET /api/remote/p2p/withdrawals
```

### **Remote Telegram Groups**
```http
GET /api/remote/telegram/groups
```

### **Remote Telegram Messages**
```http
GET /api/remote/telegram/messages
```

### **Remote Dashboard Stats**
```http
GET /api/remote/stats
```

## 📋 **RESPONSE FORMATS**

### **Success Response**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **Error Response**
```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message",
  "status": 400,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **Paginated Response**
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 3142,
    "pages": 63
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 **QUERY PARAMETERS**

### **Common Parameters**
- `page`: Page number for pagination
- `limit`: Number of items per page
- `sort`: Sort field (e.g., `sort=created_at`)
- `order`: Sort order (`asc` or `desc`)
- `search`: Search term for filtering
- `export`: Export format (`csv` or `json`)

### **Filtering Parameters**
- `status`: Filter by status
- `type`: Filter by type
- `from`: Start date for date range
- `to`: End date for date range
- `customer`: Filter by customer ID
- `agent`: Filter by agent ID

## 📊 **RATE LIMITING**

### **Default Limits**
- **Authentication**: 5 attempts per minute
- **API Calls**: 100 requests per minute
- **File Uploads**: 10 files per minute
- **Export Operations**: 5 exports per minute

### **Rate Limit Headers**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067260
```

## 🚨 **ERROR CODES**

### **HTTP Status Codes**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

### **Common Error Codes**
- `AUTH_REQUIRED`: Authentication required
- `INVALID_TOKEN`: Invalid or expired token
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `VALIDATION_ERROR`: Input validation failed
- `RESOURCE_NOT_FOUND`: Requested resource not found

---

**Last Updated:** $(date)
**Status:** ✅ API reference documented
**Priority:** HIGH - Critical for developers
