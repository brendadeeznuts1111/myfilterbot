# 📡 API Documentation - Fantdev Trading Bot

## Base Configuration

### Server URL
```
Development: http://localhost:5000
Production: https://your-ngrok-url.ngrok-free.app
```

### Headers
All requests should include:
```http
Content-Type: application/json
ngrok-skip-browser-warning: true
```

## 🔐 Authentication

### POST `/api/login`
Authenticate a customer account.

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
  "customer": {
    "customer_id": "BB1042",
    "balance": 1450.00,
    "weekly_pnl": 3000.00,
    "active": true,
    "registered": false
  }
}
```

#### Response (Error - 401)
```json
{
  "success": false,
  "error": "Customer ID not found"
}
```

## 📊 Customer Endpoints

### GET `/api/customer/{customer_id}`
Retrieve detailed customer information.

#### Parameters
- `customer_id` (string): Customer identifier

#### Response (200)
```json
{
  "customer_id": "BB1042",
  "balance": 1450.00,
  "weekly_pnl": 3000.00,
  "active": true,
  "registered": false,
  "today_activity": 5,
  "daily_pnl": [100, -50, 200, 300, 150, 500, 100],
  "transactions": [
    {
      "type": "deposit",
      "amount": 500,
      "time": "Aug 23 2:30 PM",
      "status": "completed",
      "message": "Deposit successful"
    }
  ],
  "alerts": {
    "low_balance": false,
    "inactive": false
  }
}
```

### GET `/api/transactions/{customer_id}`
Get transaction history for a customer.

#### Parameters
- `customer_id` (string): Customer identifier
- `limit` (optional, int): Maximum transactions to return (default: 100)

#### Response (200)
```json
{
  "transactions": [
    {
      "timestamp": "2025-08-23T14:30:00",
      "type": "deposit",
      "amount": 500.00,
      "message": "[credited!] Your deposit has been processed",
      "from_user": "@username",
      "status": "completed"
    }
  ],
  "count": 25
}
```

## 👥 Member Management

### GET `/api/members`
Retrieve all group members with their permissions.

#### Response (200)
```json
{
  "members": [
    {
      "member_id": "M20250823155934",
      "telegram_id": 123456,
      "username": "alice_trader",
      "group_id": -1001234567890,
      "group_name": "Test Trading Group",
      "join_date": "2025-08-23T15:59:34",
      "status": "approved",
      "permissions": {
        "can_view": true,
        "can_trade": true,
        "can_withdraw": false,
        "daily_limit": 500,
        "notes": "Verified trader"
      },
      "customer_id": "BB1042"
    }
  ],
  "stats": {
    "total_members": 5,
    "pending": 2,
    "approved": 3,
    "denied": 0,
    "groups": 2
  }
}
```

### GET `/api/members/pending`
Get members awaiting approval.

#### Response (200)
```json
{
  "pending": [
    {
      "member_id": "M20250823160000",
      "telegram_id": 789012,
      "username": "new_member",
      "group_id": -1001234567890,
      "group_name": "Test Trading Group",
      "join_date": "2025-08-23T16:00:00",
      "requested_permissions": {
        "can_view": false,
        "can_trade": false,
        "can_withdraw": false,
        "daily_limit": 0,
        "notes": ""
      }
    }
  ],
  "count": 2
}
```

### POST `/api/members/approve`
Approve a member with specific permissions.

#### Request
```json
{
  "group_id": -1001234567890,
  "telegram_id": 123456,
  "permissions": {
    "can_view": true,
    "can_trade": true,
    "can_withdraw": false,
    "daily_limit": 500,
    "notes": "Approved after verification"
  }
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Member approved successfully"
}
```

### POST `/api/members/deny`
Deny a member's access request.

#### Request
```json
{
  "group_id": -1001234567890,
  "telegram_id": 123456,
  "reason": "Insufficient verification documents"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Member denied"
}
```

### POST `/api/members/update`
Update existing member permissions.

#### Request
```json
{
  "group_id": -1001234567890,
  "telegram_id": 123456,
  "permissions": {
    "can_view": true,
    "can_trade": true,
    "can_withdraw": true,
    "daily_limit": 1000,
    "notes": "Upgraded to VIP"
  }
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Permissions updated"
}
```

### POST `/api/members/add`
Add a new member (primarily for testing).

#### Request
```json
{
  "telegram_id": 456789,
  "username": "test_user",
  "group_id": -1001234567890,
  "group_name": "Test Trading Group"
}
```

#### Response (200)
```json
{
  "success": true,
  "member_id": "M20250823161234",
  "message": "Member added to pending"
}
```

## 📈 Statistics

### GET `/api/stats`
Get global system statistics.

#### Response (200)
```json
{
  "total_customers": 25,
  "active_customers": 20,
  "total_balance": 17209.00,
  "total_weekly_pnl": 12345.00,
  "registered_users": 5,
  "top_performers": [
    {
      "customer_id": "BB1043",
      "weekly_pnl": 7000.00
    },
    {
      "customer_id": "BB1044",
      "weekly_pnl": 7000.00
    }
  ]
}
```

## 🏥 Health Check

### GET `/health`
Check server health status.

#### Response (200)
```json
{
  "status": "healthy",
  "database": true,
  "customers_loaded": 25,
  "members_loaded": 5,
  "timestamp": "2025-08-23T16:00:00"
}
```

## 🌐 Web Portal Routes

### GET `/`
Serves the customer portal (customer_portal_api.html).

### GET `/admin`
Serves the admin portal (admin_portal.html).

## ⚠️ Error Responses

All endpoints may return the following error formats:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication failed"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error occurred"
}
```

## 🔄 Webhook Integration

For bot message forwarding (future implementation):

### POST `/api/message`
Receive forwarded messages from the bot.

#### Request
```json
{
  "text": "Message content",
  "from": "@username",
  "matched_keyword": "[credited!]",
  "chat_name": "Trading Group"
}
```

#### Response (200)
```json
{
  "success": true,
  "id": 123
}
```

## 📝 Notes

### Rate Limiting
- Default: 10 requests per minute per IP
- Authentication endpoints: 5 attempts per minute

### Data Formats
- Timestamps: ISO 8601 format (YYYY-MM-DDTHH:MM:SS)
- Currency: Float with 2 decimal places
- IDs: String format for customer IDs, integers for Telegram IDs

### Permission Levels
| Permission | Description | Type |
|------------|-------------|------|
| `can_view` | View balances and transactions | Boolean |
| `can_trade` | Execute trades | Boolean |
| `can_withdraw` | Make withdrawals | Boolean |
| `daily_limit` | Maximum daily transaction amount | Integer |
| `notes` | Admin notes about the member | String |

### Status Values
- `pending`: Awaiting approval
- `approved`: Active member
- `denied`: Access denied
- `restricted`: Limited access

## 🔧 Testing with cURL

### Login Example
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"customer_id": "BB1042", "password": "N9H9"}'
```

### Approve Member Example
```bash
curl -X POST http://localhost:5000/api/members/approve \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{
    "group_id": -1001234567890,
    "telegram_id": 123456,
    "permissions": {
      "can_view": true,
      "can_trade": true,
      "can_withdraw": false,
      "daily_limit": 500
    }
  }'
```

### Get Statistics Example
```bash
curl http://localhost:5000/api/stats \
  -H "ngrok-skip-browser-warning: true"
```

## 🚀 Deployment

### Environment Variables
```bash
export BOT_TOKEN="your_bot_token"
export ADMIN_CHAT_ID="your_chat_id"
export DATABASE_PATH="customer_database.json"
export PORT=5000
```

### Production Checklist
- [ ] Use HTTPS in production
- [ ] Implement proper authentication tokens
- [ ] Enable CORS for specific domains only
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Set up monitoring

---

**API Version:** 1.0.0  
**Last Updated:** August 23, 2025  
**Contact:** admin@fantdev.trading