# 📡 Fantasy402 Trading Platform - Complete API Documentation

> **🚀 Comprehensive API Reference for Fantasy402 Trading Platform v2.1**

This document provides complete API documentation for the Fantasy402 Trading Platform, covering authentication, customer management, admin endpoints, WebSocket integration, and system monitoring.

**Current Implementation**: The API is built using Bun runtime with TypeScript (`src/admin-server.ts`) and integrates with a Python Telegram bot (`src/bot/main.py`). Configuration is managed through YAML files in the `config/` directory.

## 🏗️ Platform Architecture

The system follows a **hybrid Python-TypeScript architecture** with these core components:

- **Python Bot System**: `src/bot/main.py` - Telegram bot using python-telegram-bot
- **TypeScript Server**: `src/server/` - Bun-powered admin server with REST APIs
- **React Web Interface**: `src/web/` - Dashboard and customer portal
- **Configuration System**: YAML-based configuration in `config/`

### Base URLs
```
Development:  http://localhost:5000
Production:   https://api.fantasy402.com
WebSocket:    ws://localhost:5000 (dev) | wss://ws.fantasy402.com (prod)
Dashboard:    http://localhost:3000 (admin)
```

### Global Headers
All API requests should include:
```http
Content-Type: application/json
ngrok-skip-browser-warning: true  # For development with ngrok
```

## 🔐 Authentication System

The platform uses **JWT (JSON Web Token)** authentication with Bearer tokens for secure API access.

### Customer Authentication

#### POST `/api/login`
Authenticate a customer account and receive access token.

**Implementation**: Customer authentication is handled through the admin server with JWT token generation using the `jose` library.

**Request:**
```json
{
  "customer_id": "BB1042",
  "password": "N9H9"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": "24h",
  "customer": {
    "customer_id": "BB1042",
    "balance": 1450.00,
    "weekly_pnl": 3000.00,
    "active": true,
    "registered": true,
    "phone": "+1234567890",
    "telegram_username": "@billabongwanger",
    "telegram_id": "123456789",
    "last_activity": "2025-08-25T14:30:00Z"
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "error": "Invalid credentials",
  "message": "Customer ID or password incorrect"
}
```

### Admin Authentication

#### POST `/api/admin/login`
Administrative login for dashboard and system management.

**Implementation**: Admin authentication uses JWT tokens with RBAC (Role-Based Access Control) defined in `src/server/rbac/`.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "administrator",
    "permissions": ["read", "write", "delete", "system"],
    "login_time": "2025-08-25T14:30:00Z"
  }
}
```

#### POST `/api/auth/login`
Alternative admin login endpoint for dashboard access.

**Request:**
```json
{
  "password": "your_admin_password"
}
```

### Token Usage
Include JWT tokens in requests via:
- **Authorization Header:** `Authorization: Bearer <token>`
- **Cookie:** `dashboard_session=<token>` (for dashboard)

**Token Details:**
- **Algorithm:** HS256
- **Expiration:** 24 hours
- **Payload:** Contains user_id, type (customer/admin), permissions

## 👥 Customer Management API

### Customer Information

#### GET `/api/customer/{customer_id}`
Retrieve detailed customer information with analytics.

**Implementation**: Customer data is loaded using `LazyCustomerLoader` service (`src/services/lazy-customer-loader.ts`) with multi-level caching.

**Headers Required:**
```http
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "customer": {
    "customer_id": "BB1042",
    "balance": 1450.00,
    "weekly_pnl": 3000.00,
    "daily_pnl": [100, -50, 200, 300, 150, 500, 100],
    "active": true,
    "registered": true,
    "phone": "+1234567890",
    "telegram_username": "@billabongwanger",
    "telegram_id": "123456789",
    "today_activity": 5,
    "last_activity": "2025-08-25T14:30:00Z",
    "agent_id": "A100",
    "risk_score": "low",
    "vip_status": false,
    "alerts": {
      "low_balance": false,
      "inactive": false,
      "suspicious_activity": false
    },
    "analytics": {
      "total_deposits": 10000.00,
      "total_withdrawals": 5000.00,
      "avg_daily_volume": 500.00,
      "roi_percentage": 15.5,
      "trade_count": 156,
      "win_rate": 73.2
    }
  }
}
```

### Transaction Management

#### GET `/api/transactions/{customer_id}`
Get comprehensive transaction history for a customer.

**Parameters:**
- `customer_id` (string): Customer identifier
- `limit` (optional, int): Maximum transactions (default: 100)
- `offset` (optional, int): Pagination offset (default: 0)
- `type` (optional, string): Filter by type (deposit, withdrawal, trade, bonus)
- `date_from` (optional, string): Start date (ISO format)
- `date_to` (optional, string): End date (ISO format)

**Response (200):**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "txn_123456",
      "timestamp": "2025-08-25T14:30:00Z",
      "type": "deposit",
      "amount": 500.00,
      "status": "completed",
      "description": "Bank transfer deposit",
      "reference": "REF123456",
      "agent_id": "A100",
      "commission_paid": 25.00,
      "fees": 0.00,
      "balance_after": 1450.00
    },
    {
      "id": "txn_123457", 
      "timestamp": "2025-08-25T15:45:00Z",
      "type": "trade",
      "amount": -100.00,
      "status": "completed",
      "description": "BTC/USD position",
      "reference": "TRADE789",
      "pnl": 50.00,
      "balance_after": 1400.00
    }
  ],
  "pagination": {
    "page": 1,
    "total": 245,
    "has_more": true,
    "limit": 100
  },
  "summary": {
    "total_deposits": 10000.00,
    "total_withdrawals": 5000.00,
    "net_pnl": 1500.00,
    "total_fees": 125.00
  }
}
```

## 🏢 Admin Management API

### Customer Administration

#### GET `/api/admin/customers`
List all customers with filtering and pagination.

**Implementation**: Customer listing uses the `buildTable` utility (`src/lib/table.ts`) with CSV export capabilities and performance monitoring.

**Headers Required:**
```http
Authorization: Bearer <admin_token>
```

**Parameters:**
- `page` (optional, int): Page number (default: 1)
- `limit` (optional, int): Items per page (default: 50, max: 500)
- `search` (optional, string): Search by customer ID or username
- `agent_id` (optional, string): Filter by agent
- `status` (optional, string): Filter by status (active, inactive, suspended)
- `balance_min` (optional, number): Minimum balance filter
- `balance_max` (optional, number): Maximum balance filter

**Response (200):**
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
      "registered": true,
      "last_activity": "2025-08-25T14:30:00Z",
      "agent_id": "A100",
      "agent_name": "Alice Chen",
      "risk_score": "low",
      "vip_status": false,
      "keywords": ["trading", "crypto"],
      "group_chat_id": "-2714719687"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 3142,
    "total_pages": 63,
    "has_next": true,
    "has_prev": false
  },
  "summary": {
    "total_customers": 3142,
    "active_customers": 2876,
    "total_balance": 4500000.00,
    "total_weekly_pnl": 750000.00,
    "avg_balance": 1433.02,
    "vip_customers": 89
  }
}
```

#### GET `/api/admin/customer/{customer_id}/details`
Get comprehensive customer details for admin view.

**Response (200):**
```json
{
  "success": true,
  "customer": {
    "customer_id": "BB1042",
    "personal_info": {
      "phone": "+1234567890",
      "telegram_id": "123456789",
      "telegram_username": "@billabongwanger",
      "registered_date": "2025-01-15T10:30:00Z",
      "last_login": "2025-08-25T14:30:00Z",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0..."
    },
    "financial_data": {
      "balance": 1450.00,
      "weekly_pnl": 3000.00,
      "total_deposits": 10000.00,
      "total_withdrawals": 5000.00,
      "pending_withdrawals": 0.00,
      "credit_limit": 5000.00,
      "margin_used": 500.00,
      "unrealized_pnl": 150.00
    },
    "agent_relationship": {
      "agent_id": "A100",
      "agent_name": "Alice Chen",
      "agent_code": "AC100",
      "assigned_date": "2025-01-15T10:30:00Z",
      "commission_rate": 5.0,
      "total_commissions_paid": 500.00
    },
    "activity_metrics": {
      "login_count": 156,
      "trade_count": 89,
      "avg_session_duration": 1800,
      "last_activity": "2025-08-25T14:30:00Z",
      "activity_score": 8.5,
      "engagement_level": "high"
    },
    "risk_assessment": {
      "risk_score": "low",
      "kyc_status": "verified",
      "suspicious_activity": false,
      "fraud_flags": [],
      "compliance_status": "compliant"
    }
  }
}
```

### Agent Management

#### GET `/api/admin/agents`
List all agents with their performance metrics.

**Implementation**: Agent data is loaded from YAML configuration (`config/agents.yml`) with commission calculation via `src/lib/commission.ts`.

**Response (200):**
```json
{
  "success": true,
  "agents": [
    {
      "id": "A100",
      "name": "Alice Chen", 
      "code": "AC100",
      "status": "active",
      "master_id": "M10",
      "master_name": "Master Mike Zhang",
      "customer_count": 5,
      "total_balance": 25000.00,
      "commission_rate": 5.0,
      "balance": 5420.50,
      "total_earned": 125000.00,
      "monthly_volume": 500000.00,
      "performance_tier": "gold",
      "joined_date": "2024-01-15T00:00:00Z",
      "telegram_id": "100200300"
    }
  ],
  "summary": {
    "total_agents": 5,
    "active_agents": 4,
    "suspended_agents": 1,
    "total_customers_managed": 24,
    "total_commissions_paid": 892000.00
  }
}
```

## 📊 System Monitoring API

### Health Checks

#### GET `/health`
Basic health check endpoint.

**Implementation**: Health checks are managed by the `PerformanceMonitor` service (`src/services/performance-monitor.ts`).

**Response (200):**
```json
{
  "status": "ok",
  "service": "fantasy402_api",
  "uptime": 86400,
  "timestamp": "2025-08-25T14:30:00Z",
  "version": "2.1.0"
}
```

#### GET `/api/health`
Detailed system health status.

**Response (200):**
```json
{
  "status": "ok",
  "service": "fantasy402_api",
  "uptime": 86400,
  "timestamp": "2025-08-25T14:30:00Z",
  "version": "2.1.0",
  "components": {
    "database": {
      "status": "ok",
      "response_time": 5,
      "connection_pool": {
        "active": 8,
        "idle": 12,
        "total": 20
      }
    },
    "redis": {
      "status": "ok", 
      "response_time": 2,
      "memory_usage": "45MB",
      "connected_clients": 15
    },
    "telegram_bot": {
      "status": "ok",
      "webhook_status": "active",
      "message_queue": 0,
      "last_update": "2025-08-25T14:29:55Z"
    },
    "websocket": {
      "status": "ok",
      "active_connections": 234,
      "messages_per_minute": 450
    }
  }
}
```

#### GET `/api/system/metrics`
Comprehensive system metrics for monitoring.

**Headers Required:**
```http
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "metrics": {
    "system": {
      "cpu_usage": 45.2,
      "memory_usage": 68.5,
      "disk_usage": 32.1,
      "load_average": [1.2, 1.5, 1.8],
      "uptime": 86400
    },
    "api": {
      "requests_per_minute": 1250,
      "avg_response_time": 125,
      "error_rate": 0.02,
      "active_sessions": 456
    },
    "database": {
      "query_time_avg": 12,
      "connections_active": 15,
      "cache_hit_rate": 94.5,
      "storage_used": "2.1GB"
    },
    "business": {
      "active_customers": 2876,
      "total_balance": 4500000.00,
      "daily_transactions": 1250,
      "daily_volume": 125000.00
    }
  },
  "timestamp": "2025-08-25T14:30:00Z"
}
```

### Service-Specific Health

#### GET `/api/bot/status`
Telegram bot health status.

#### GET `/api/db/status` 
Database connection health.

#### GET `/api/redis/status`
Redis cache health status.

#### GET `/api/ws/status`
WebSocket server health.

## 🔌 WebSocket Integration

### Connection
Connect to WebSocket for real-time updates:
```javascript
const socket = io('ws://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

**Implementation**: WebSocket functionality is provided by worker threads (`src/server/workers/websocket_worker_thread.ts`) with compressed WebSocket server (`src/server/websocket/compressed-ws-server.ts`).

### Events

#### Customer Updates
```javascript
// Subscribe to customer balance updates
socket.emit('subscribe', { type: 'customer_balance', customer_id: 'BB1042' });

// Listen for balance changes
socket.on('balance_update', (data) => {
  console.log('New balance:', data.balance);
  console.log('Change:', data.change);
});
```

#### System Notifications
```javascript
// Subscribe to system notifications
socket.emit('subscribe', { type: 'system_notifications' });

// Listen for system alerts
socket.on('system_alert', (data) => {
  console.log('Alert:', data.message);
  console.log('Severity:', data.level);
});
```

#### Transaction Updates
```javascript
// Subscribe to transaction updates for specific customer
socket.emit('subscribe', { 
  type: 'transactions', 
  customer_id: 'BB1042' 
});

// Listen for new transactions
socket.on('new_transaction', (transaction) => {
  console.log('New transaction:', transaction);
});
```

## 📋 Configuration Management API

### YAML Configuration

#### GET `/api/yaml/list`
Get current YAML configuration files.

**Implementation**: Configuration management uses Bun's native YAML support with hot-reload capabilities via `dashboard-config-service.ts`.

**Headers Required:**
```http
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "configurations": {
    "agents": {
      "total_agents": 5,
      "active_agents": 4,
      "commission_rates": {
        "base_agent": 5.0,
        "base_master": 2.0,
        "master_override": 1.0
      }
    },
    "system": {
      "maintenance_mode": false,
      "api_rate_limit": 1000,
      "session_timeout": 3600,
      "debug_mode": false
    },
    "telegram": {
      "bot_active": true,
      "webhook_configured": true,
      "vip_threshold": 10000,
      "fraud_detection": true
    }
  },
  "last_updated": "2025-08-25T14:30:00Z"
}
```

#### POST `/api/yaml/{config_name}`
Update and validate YAML configuration files with hot reload.

**Implementation**: Uses `yaml-formatter.ts` utilities for validation and formatting, with automatic config reloading.

**Response (200):**
```json
{
  "success": true,
  "message": "Configuration reloaded successfully",
  "reloaded_files": [
    "agents.yml",
    "telegram.yml", 
    "database.yml"
  ],
  "timestamp": "2025-08-25T14:30:00Z"
}
```

## 📈 Analytics & Reporting API

### Business Analytics

#### GET `/api/admin/analytics/dashboard`
Get comprehensive dashboard analytics.

**Headers Required:**
```http
Authorization: Bearer <admin_token>
```

**Parameters:**
- `period` (optional, string): Time period (today, week, month, quarter, year)
- `agent_id` (optional, string): Filter by specific agent

**Response (200):**
```json
{
  "success": true,
  "analytics": {
    "overview": {
      "total_customers": 3142,
      "active_customers": 2876,
      "total_balance": 4500000.00,
      "total_pnl": 750000.00,
      "avg_customer_value": 1433.02
    },
    "financial": {
      "total_deposits": 2500000.00,
      "total_withdrawals": 1200000.00,
      "net_deposits": 1300000.00,
      "commission_paid": 125000.00,
      "revenue": 95000.00
    },
    "activity": {
      "daily_active_users": 456,
      "new_registrations": 23,
      "transactions_count": 1250,
      "avg_session_duration": 1800
    },
    "agent_performance": {
      "top_agent": {
        "id": "A104",
        "name": "Emma Wilson", 
        "customers": 7,
        "volume": 350000.00
      },
      "total_commissions": 125000.00
    },
    "trends": {
      "balance_trend": [4400000, 4450000, 4500000],
      "user_growth": [3120, 3135, 3142],
      "revenue_trend": [92000, 93500, 95000]
    }
  },
  "period": "month",
  "generated_at": "2025-08-25T14:30:00Z"
}
```

## 🛡️ Security & Compliance

### Security Headers
All responses include security headers:
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Rate Limiting
API endpoints are rate limited:
- **General API**: 1000 requests per hour per IP
- **Authentication**: 20 attempts per hour per IP
- **Admin API**: 5000 requests per hour per authenticated user

### Error Handling
Standardized error responses:
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error description",
  "details": {
    "field": "specific_field_with_error",
    "code": "VALIDATION_ERROR"
  },
  "timestamp": "2025-08-25T14:30:00Z",
  "request_id": "req_123456"
}
```

## 📝 Request/Response Examples

### Complete Customer Management Flow
```bash
# 1. Admin login
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 2. List customers
curl -X GET "http://localhost:5000/api/admin/customers?limit=10" \
  -H "Authorization: Bearer <admin_token>"

# 3. Get specific customer
curl -X GET http://localhost:5000/api/admin/customer/BB1042/details \
  -H "Authorization: Bearer <admin_token>"

# 4. Customer login
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "BB1042", "password": "N9H9"}'

# 5. Get customer transactions
curl -X GET "http://localhost:5000/api/transactions/BB1042?limit=50" \
  -H "Authorization: Bearer <customer_token>"
```

## 📚 SDK & Integration Examples

### JavaScript/TypeScript
```typescript
import axios from 'axios';

class Fantasy402API {
  private baseURL: string;
  private token?: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async login(customerId: string, password: string) {
    const response = await axios.post(`${this.baseURL}/api/login`, {
      customer_id: customerId,
      password: password
    });
    
    this.token = response.data.token;
    return response.data;
  }

  async getCustomer(customerId: string) {
    return axios.get(`${this.baseURL}/api/customer/${customerId}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
  }

  async getTransactions(customerId: string, limit = 100) {
    return axios.get(`${this.baseURL}/api/transactions/${customerId}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      params: { limit }
    });
  }
}

// Usage
const api = new Fantasy402API('http://localhost:5000');
await api.login('BB1042', 'N9H9');
const customer = await api.getCustomer('BB1042');
```

### Python
```python
import requests
from typing import Optional, Dict, Any

class Fantasy402API:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token: Optional[str] = None
        
    def login(self, customer_id: str, password: str) -> Dict[Any, Any]:
        response = requests.post(
            f"{self.base_url}/api/login",
            json={"customer_id": customer_id, "password": password}
        )
        response.raise_for_status()
        
        data = response.json()
        self.token = data.get('token')
        return data
    
    def get_customer(self, customer_id: str) -> Dict[Any, Any]:
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(
            f"{self.base_url}/api/customer/{customer_id}",
            headers=headers
        )
        response.raise_for_status()
        return response.json()

# Usage
api = Fantasy402API('http://localhost:5000')
login_result = api.login('BB1042', 'N9H9')
customer_data = api.get_customer('BB1042')
```

## 🔗 Related Documentation

- [YAML Configuration Guide](../configuration/) - API configuration management
- [Telegram Bot Integration](../bot/) - Bot-specific API endpoints  
- [Security & Authentication](../security/) - Security implementation details
- [Database Schema](../database/) - Database structure and relationships

## 🆘 Troubleshooting

### Common Issues

#### Authentication Errors
```json
// 401 Unauthorized
{
  "success": false,
  "error": "INVALID_TOKEN",
  "message": "JWT token is invalid or expired"
}

// Solution: Re-authenticate to get new token
```

#### Rate Limiting
```json
// 429 Too Many Requests
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED", 
  "message": "Too many requests. Try again in 60 seconds",
  "retry_after": 60
}
```

#### Validation Errors
```json
// 400 Bad Request
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": {
    "customer_id": "Must be a valid customer ID format",
    "amount": "Must be a positive number"
  }
}
```

### Debug Mode
Enable debug mode for detailed error information:
```http
X-Debug: true
```

### Support Contacts
- **API Issues**: Check [system health endpoints](#-system-monitoring-api)
- **Authentication Problems**: Verify JWT token format and expiration  
- **Data Inconsistencies**: Validate YAML configuration files in `config/`
- **Performance Issues**: Check [system metrics](#get-apisystemmetrics)

---

**API Version**: 2.1.0  
**Documentation Version**: 2.1.0  
**Last Updated**: August 25, 2025  
**Authentication**: JWT with Bearer tokens  
**Rate Limiting**: Per-endpoint limits applied  
**WebSocket Support**: Socket.IO with authentication  
**Status**: ✅ Production Ready