# 🔐 Persistent Session & Dashboard Integration Guide

## Overview
Complete guide for staying signed in, accessing player info, fraud detection, and dashboard connectivity.

## 🚀 Quick Start - Stay Signed In

### Method 1: Login with Remember Me (30 Days)
```
/login BB1042 N9H9 remember
```
This creates a 30-day persistent session that:
- ✅ Survives bot restarts
- ✅ Works across devices
- ✅ Syncs with web dashboard
- ✅ Enables fraud monitoring

### Method 2: Standard Login (24 Hours)
```
/login BB1042 N9H9
```
Creates a 24-hour session with same features but shorter duration.

## 📱 Bot Commands for Persistent Access

### **Authentication Commands**
```
/login <customer_id> <password> [remember]  - Login with session
/dashboard                                   - Access dashboard (if logged in)
/logout                                      - End session and revoke access
```

### **Information Commands** (Requires Login)
```
/history [days]     - Get player transaction history (default 30 days)
/fraud <customer_id> - Check fraud risk score (admin only)
/balance            - Quick balance with session context
/account            - Full account management
```

## 🌐 Dashboard Integration

### **After Login, You Get:**

1. **Dashboard URL with Auth Token**
   ```
   https://fantasy402.com/manager/dashboard?auth=eyJ0eXAiOiJKV1QiLCJhbGc...
   ```
   - One-click access, no re-login needed
   - Token embedded in URL
   - Works in any browser

2. **Session Token** (for API calls)
   ```
   session_token: "Kg7n3R_9mX2..."
   dashboard_token: "eyJ0eXAiOiJKV1QiLCJhbGc..."
   ```

3. **Direct Dashboard Button**
   - Click "🌐 Open Dashboard" button in Telegram
   - Opens authenticated dashboard instantly

## 📊 Player Information Access

### **Get Complete History**
```
/history 30

📜 Player History (30 days)
━━━━━━━━━━━━━━━━━
Customer: BB1042
Status: ACTIVE
Registered: 2025-08-20
Last Active: 2025-08-23

📊 Statistics:
• Current Balance: $1,450.00
• Weekly P&L: +$3,000.00
• Total Deposits: $5,000.00
• Total Withdrawals: $3,550.00
• Net Flow: +$1,450.00
• Transactions: 47

📜 Recent Transactions:
💰 08/23 2:30PM: $500.00
💸 08/23 1:15PM: $250.00
💰 08/22 9:45AM: $1,000.00
...
```

### **Access from Dashboard**
Once logged in, the dashboard shows:
- Real-time balance updates
- Complete transaction history
- P&L charts and analytics
- Risk indicators
- Activity timeline

## 🚨 Fraud Detection & Monitoring

### **Automatic Fraud Checks**
The system monitors for:
- Rapid login attempts (< 1 minute apart)
- Multiple IP addresses (> 3 different IPs)
- Failed login attempts (> 5 attempts)
- Unusual transaction patterns
- High withdrawal frequency
- Declining balance with losses

### **Check Fraud Risk** (Admin)
```
/fraud BB1042

🔍 Fraud Risk Analysis
━━━━━━━━━━━━━━━━━
Customer: BB1042
Risk Score: 35/100
Risk Level: ⚠️ MEDIUM 🟡

📊 Account Overview:
• Balance: $1,450.00
• Weekly P&L: +$3,000.00
• 30d Deposits: $5,000.00
• 30d Withdrawals: $3,550.00
• Transaction Count: 47

⚠️ Risk Indicators:
• High withdrawal frequency
• Unusual transaction sizes (3 large)

Recommendations:
• Monitor account closely
```

## 🔄 Session Persistence Features

### **What Persists Across Sessions:**
- ✅ Login state (no re-authentication needed)
- ✅ Customer ID and permissions
- ✅ Dashboard access token
- ✅ Transaction history cache
- ✅ Risk score calculations
- ✅ Activity timestamps

### **Session Storage:**
- **Redis** (if available): Enterprise-grade persistence
- **In-Memory**: Fallback for development
- **JWT Tokens**: Secure, signed, time-limited

## 🔗 Connect Everything Together

### **Full Integration Flow:**

1. **Customer Logs In**
   ```
   /login BB1042 N9H9 remember
   ```

2. **Bot Creates Session**
   - Generates session ID
   - Creates JWT token
   - Stores in Redis/memory
   - Returns dashboard URL

3. **Access Dashboard**
   - Click dashboard button
   - Browser opens with auth token
   - No login required
   - Full access to all features

4. **Use Bot Commands**
   ```
   /dashboard  → Quick stats + dashboard link
   /history    → Detailed transaction history
   /balance    → Current balance (session-aware)
   ```

5. **Dashboard Shows:**
   - Live balance updates
   - Transaction feed
   - P&L charts
   - Risk indicators
   - Export options

## 🛡️ Security Features

### **Session Security:**
- JWT tokens with expiration
- Session timeout (24h or 30d)
- IP tracking for fraud detection
- Activity monitoring
- One-click logout

### **Fraud Prevention:**
- Login pattern analysis
- Transaction velocity checks
- Amount anomaly detection
- Time-based risk scoring
- Admin alerts for high risk

## 📱 Mobile & Desktop Access

### **Telegram Bot** (Mobile Primary)
- Quick commands
- Push notifications
- One-tap dashboard access
- Session persistence

### **Web Dashboard** (Desktop Primary)
- Full analytics
- Advanced charts
- Bulk operations
- Export capabilities

### **API Access** (Programmatic)
```javascript
// Use dashboard_token for API calls
fetch('https://fantasy402.com/api/player/history', {
  headers: {
    'Authorization': `Bearer ${dashboard_token}`
  }
})
```

## 🔧 Configuration

### **Session Timeouts**
```python
# In session_manager.py
session_timeout = 86400  # 24 hours
remember_me_timeout = 2592000  # 30 days
```

### **Fraud Thresholds**
```python
# Risk scoring
rapid_login_threshold = 60  # seconds
max_ip_addresses = 3
max_failed_attempts = 5
high_risk_score = 50
```

## 📝 Implementation Status

### ✅ **Completed:**
- Session management system
- JWT token generation
- Dashboard URL generation
- Fraud detection engine
- Player history tracking
- Login/logout commands
- Dashboard integration
- History retrieval

### 🔄 **Next Steps:**
- Redis integration for production
- WebSocket real-time updates
- Advanced fraud ML models
- Multi-factor authentication

## 🚀 Getting Started

1. **Login to bot:**
   ```
   /login BB1042 N9H9 remember
   ```

2. **Copy dashboard URL or click button**

3. **Access everything:**
   - Bot: Quick commands and alerts
   - Dashboard: Full analytics and management
   - API: Programmatic access

The session persists across all platforms, keeping you connected and authenticated everywhere!