# Dashboard User Guide - Fantdev Trading Bot

## 🎯 **OVERVIEW**

The Fantdev Trading Bot Dashboard is a **comprehensive, real-time** administrative interface that provides complete visibility into your trading operations, customer management, and system health. This guide covers all aspects of using the dashboard effectively.

## 🚀 **GETTING STARTED**

### **Accessing the Dashboard**

1. **Navigate to**: `http://localhost:3000/dashboard`
2. **Login**: Use your admin password
3. **Authentication**: JWT token automatically managed via cookies

### **System Requirements**
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Stable internet connection
- Admin credentials

## 🔐 **AUTHENTICATION & SECURITY**

### **Login Process**
```
1. Navigate to /login
2. Enter admin password
3. System generates JWT token
4. Redirected to dashboard
5. Token stored in secure HTTP-only cookie
```

### **Security Features**
- **JWT Authentication**: Secure, time-limited tokens
- **HttpOnly Cookies**: Protection against XSS attacks
- **Automatic Logout**: Token expiration handling
- **Rate Limiting**: Protection against brute force attacks

### **Logout**
- **Automatic**: Token expires after 12 hours
- **Manual**: Use logout endpoint or clear cookies
- **Security**: All sessions cleared on logout

## 📊 **DASHBOARD OVERVIEW**

### **Main Dashboard Layout**
```
┌─────────────────────────────────────────────────────────────┐
│                    TOP NAVIGATION BAR                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   CUSTOMERS │  │ TRANSACTIONS│  │ SYSTEM      │        │
│  │    3,142   │  │    1,250    │  │   HEALTH    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              REAL-TIME ACTIVITY FEED                │    │
│  │  • Customer BB12345 deposited $500                 │    │
│  │  • Transaction TX789 completed                     │    │
│  │  • New customer BB12346 registered                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              CONFIGURATION STATUS                   │    │
│  │  • YAML Hot-Reload: ✅ Active                      │    │
│  │  • Feature Flags: 15 active                        │    │
│  │  • Services: All running                            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### **Key Metrics Display**
- **Total Customers**: 3,142 (real-time count)
- **Total Balance**: $4,500,000 (aggregated)
- **Weekly P&L**: $750,000 (calculated)
- **Active Customers**: 2,800 (filtered)
- **System Uptime**: Real-time monitoring

## 👥 **CUSTOMER MANAGEMENT**

### **Customer List View**
```
┌─────────────────────────────────────────────────────────────┐
│ CUSTOMERS (3,142)                    [SEARCH] [FILTER] [EXPORT] │
├─────────────────────────────────────────────────────────────┤
│ ID      │ Balance │ P&L    │ Status │ Telegram │ Actions   │
├─────────────────────────────────────────────────────────────┤
│ BB12345 │ $1,500 │ +$250  │ Active │ @user123 │ [Edit] [View] │
│ BB12346 │ $2,000 │ -$100  │ Active │ @user456 │ [Edit] [View] │
│ BB12347 │ $0     │ $0     │ Inactive│ -        │ [Edit] [View] │
└─────────────────────────────────────────────────────────────┘
```

### **Customer Operations**

#### **View Customer Details**
1. Click customer ID or [View] button
2. **Customer Profile** displays:
   - Basic information
   - Balance history
   - Transaction log
   - Telegram integration status
   - Group memberships

#### **Edit Customer**
1. Click [Edit] button
2. **Editable Fields**:
   - Balance
   - Active status
   - Telegram information
   - Keywords/tags
   - Group assignments

#### **Customer Search & Filtering**
```
Search Options:
• Customer ID: BB12345
• Phone number: +1234567890
• Telegram username: @user123

Filter Options:
• Status: Active/Inactive
• Level: VIP (>$10k) / Basic (≤$10k)
• Balance range: $0 - $50,000+
• Registration date: Last 30/90/365 days
```

#### **Customer Export**
```
Export Formats:
• CSV: For spreadsheet analysis
• JSON: For API integration
• Custom date ranges
• Filtered exports
```

### **Customer Statistics**
```
Customer Overview:
┌─────────────────────────────────────────────────────────────┐
│ TOTAL CUSTOMERS: 3,142                                    │
├─────────────────────────────────────────────────────────────┤
│ Active: 2,800 (89.1%)    │ Inactive: 342 (10.9%)        │
│ VIP (>$10k): 450 (14.3%) │ Basic (≤$10k): 2,692 (85.7%) │
│ Telegram: 2,750 (87.5%)  │ No Telegram: 392 (12.5%)     │
└─────────────────────────────────────────────────────────────┘

Balance Distribution:
┌─────────────────────────────────────────────────────────────┐
│ $0 - $100: 1,200 customers                               │
│ $100 - $1,000: 800 customers                             │
│ $1,000 - $10,000: 692 customers                          │
│ $10,000+: 450 customers                                  │
└─────────────────────────────────────────────────────────────┘
```

## 📈 **TRANSACTION MONITORING**

### **Transaction Dashboard**
```
┌─────────────────────────────────────────────────────────────┐
│ TRANSACTIONS (1,250)              [FILTER] [EXPORT] [REFRESH] │
├─────────────────────────────────────────────────────────────┤
│ ID        │ Customer │ Type      │ Amount  │ Status   │ Time    │
├─────────────────────────────────────────────────────────────┤
│ TX789     │ BB12345  │ Deposit   │ $500    │ Complete │ 2m ago  │
│ TX788     │ BB12346  │ Withdrawal│ -$200   │ Pending  │ 5m ago  │
│ TX787     │ BB12347  │ Bet       │ $100    │ Open     │ 10m ago │
└─────────────────────────────────────────────────────────────┘
```

### **Transaction Types**
- **Deposits**: Customer funding
- **Withdrawals**: Customer cashouts
- **Bets**: Trading activities
- **Payouts**: Winnings distribution
- **Fees**: Service charges

### **Transaction Management**
```
Actions Available:
• View Details: Full transaction information
• Export: CSV/JSON format
• Filter: By type, status, date range
• Search: By transaction ID, customer
• Bulk Operations: Multiple transaction processing
```

## ⚙️ **SYSTEM MONITORING**

### **Health Dashboard**
```
┌─────────────────────────────────────────────────────────────┐
│ SYSTEM HEALTH STATUS                                        │
├─────────────────────────────────────────────────────────────┤
│ Service        │ Status │ Latency │ Last Check              │
├─────────────────────────────────────────────────────────────┤
│ Database       │ ✅ OK  │ 5ms     │ 2024-01-01 12:00:00    │
│ Redis          │ ✅ OK  │ 3ms     │ 2024-01-01 12:00:00    │
│ Telegram Bot   │ ✅ OK  │ 15ms    │ 2024-01-01 12:00:00    │
│ WebSocket      │ ✅ OK  │ 1ms     │ 2024-01-01 12:00:00    │
└─────────────────────────────────────────────────────────────┘
```

### **Performance Metrics**
```
System Performance:
┌─────────────────────────────────────────────────────────────┐
│ CPU Usage: 25%    │ Memory Usage: 35%    │ Disk: 40%      │
│ Requests/min: 85  │ Error Rate: 0.2%     │ Uptime: 99.9%  │
│ Response Time: 5ms│ Cache Hit Rate: 95%  │ Workers: 4     │
└─────────────────────────────────────────────────────────────┘
```

### **Service Control**
```
Service Management:
• Start All Services: [START] button
• Stop All Services: [STOP] button  
• Restart All Services: [RESTART] button
• Individual Service Control: Per-service buttons
```

## 🔧 **CONFIGURATION MANAGEMENT**

### **YAML Configuration Viewer**
```
┌─────────────────────────────────────────────────────────────┐
│ CONFIGURATION FILES                    [RELOAD] [EDIT]      │
├─────────────────────────────────────────────────────────────┤
│ File           │ Status │ Last Modified │ Size              │
├─────────────────────────────────────────────────────────────┤
│ app.yaml       │ ✅     │ 2m ago        │ 2.7KB             │
│ features.yaml  │ ✅     │ 5m ago        │ 3.3KB             │
│ telegram.yaml  │ ✅     │ 1m ago        │ 8.3KB             │
│ database.yaml  │ ✅     │ 10m ago       │ 5.1KB             │
└─────────────────────────────────────────────────────────────┘
```

### **Hot-Reload Status**
```
Hot-Reload System:
┌─────────────────────────────────────────────────────────────┐
│ Status: ✅ ACTIVE                                          │
│ Watched Files: 5                                           │
│ Last Reload: 1 minute ago                                  │
│ Auto-Reload: Enabled                                       │
└─────────────────────────────────────────────────────────────┘
```

### **Feature Flag Management**
```
Feature Flags (15 active):
┌─────────────────────────────────────────────────────────────┐
│ Feature Name      │ Status │ Rollout │ Users               │
├─────────────────────────────────────────────────────────────┤
│ debug_mode        │ ✅ ON  │ 100%    │ All                 │
│ new_ui            │ ✅ ON  │ 50%     │ 1,571               │
│ advanced_charts   │ ❌ OFF │ 0%      │ 0                    │
│ real_time_updates │ ✅ ON  │ 100%    │ All                 │
└─────────────────────────────────────────────────────────────┘
```

## 📱 **TELEGRAM INTEGRATION**

### **Bot Status Dashboard**
```
Telegram Bot Status:
┌─────────────────────────────────────────────────────────────┐
│ Bot Status: ✅ ACTIVE                                      │
│ Uptime: 12 hours                                           │
│ Commands Enabled: 15                                       │
│ Groups Connected: 5                                        │
│ Total Users: 2,750                                         │
└─────────────────────────────────────────────────────────────┘
```

### **Group Management**
```
Telegram Groups:
┌─────────────────────────────────────────────────────────────┐
│ Group Name        │ Members │ Type    │ Status             │
├─────────────────────────────────────────────────────────────┤
│ Main Trading      │ 2,750   │ Trading │ ✅ Active          │
│ VIP Lounge        │ 450     │ VIP     │ ✅ Active          │
│ Support           │ 100     │ Support │ ✅ Active          │
└─────────────────────────────────────────────────────────────┘
```

### **Message Management**
```
Recent Messages:
• View group messages in real-time
• Send broadcast messages
• Monitor user interactions
• Track command usage
```

## 🚨 **FRAUD MONITORING**

### **Fraud Dashboard**
```
Fraud Detection:
┌─────────────────────────────────────────────────────────────┐
│ High Risk: 25 customers    │ Medium Risk: 150 customers   │
│ Low Risk: 2,967 customers │ Flagged: 50 customers        │
└─────────────────────────────────────────────────────────────┘
```

### **Risk Management**
```
Risk Indicators:
• Duplicate accounts
• Velocity violations
• Suspicious patterns
• Geographic anomalies
• Device fingerprinting
```

### **Fraud Actions**
```
Available Actions:
• Flag customer for review
• Block suspicious activity
• Investigate patterns
• Generate reports
• Export risk data
```

## 📊 **REPORTING & ANALYTICS**

### **Report Generation**
```
Available Reports:
• Customer Summary Report
• Transaction Analysis
• Revenue Reports
• Risk Assessment
• Performance Metrics
• Custom Date Ranges
```

### **Export Options**
```
Export Formats:
• CSV: Spreadsheet analysis
• JSON: API integration
• PDF: Documentation
• Excel: Advanced analysis
```

### **Scheduled Reports**
```
Automation:
• Daily summaries
• Weekly performance
• Monthly analytics
• Custom schedules
• Email delivery
```

## 🔄 **REAL-TIME FEATURES**

### **Live Updates**
```
Real-Time Features:
• Live customer count
• Transaction feed
• System health updates
• Configuration changes
• Error notifications
• Performance alerts
```

### **WebSocket Integration**
```
WebSocket Status:
• Connection: ✅ Active
• Latency: 1ms
• Reconnection: Automatic
• Fallback: Server-Sent Events
```

## 🛠️ **TROUBLESHOOTING**

### **Common Issues**

#### **Dashboard Not Loading**
```
Troubleshooting Steps:
1. Check browser console for errors
2. Verify authentication token
3. Check server status
4. Clear browser cache
5. Try different browser
```

#### **Data Not Updating**
```
Solutions:
1. Check hot-reload status
2. Verify configuration files
3. Check server logs
4. Restart services if needed
5. Verify database connectivity
```

#### **Authentication Issues**
```
Resolution:
1. Check password validity
2. Verify JWT token expiration
3. Clear browser cookies
4. Check server authentication
5. Verify environment variables
```

### **Performance Optimization**
```
Best Practices:
• Use filters to limit data
• Export large datasets
• Enable caching
• Monitor resource usage
• Regular maintenance
```

## 📱 **MOBILE ACCESS**

### **Mobile Dashboard**
```
Mobile Features:
• Responsive design
• Touch-friendly interface
• Optimized for small screens
• Mobile-specific actions
• Offline capability
```

### **Mobile App**
```
Native Features:
• Push notifications
• Offline data
• Camera integration
• Biometric authentication
• Background sync
```

## 🔒 **SECURITY BEST PRACTICES**

### **Access Control**
```
Security Measures:
• Use strong passwords
• Enable 2FA if available
• Regular password rotation
• Monitor access logs
• Limit admin accounts
```

### **Data Protection**
```
Data Security:
• Encrypt sensitive data
• Regular backups
• Access logging
• Audit trails
• Compliance monitoring
```

## 📚 **ADDITIONAL RESOURCES**

### **Documentation**
- [API Reference](../api/API_ENDPOINTS_REFERENCE.md)
- [Configuration Guide](../development/CONFIGURATION_BEST_PRACTICES.md)
- [System Architecture](../architecture/SYSTEM_ARCHITECTURE.md)
- [Development Guide](../development/DEVELOPMENT.md)

### **Support**
- **Technical Issues**: Check system logs
- **Configuration**: Review YAML files
- **Performance**: Monitor metrics
- **Security**: Review access logs

---

**Last Updated:** $(date)
**Status:** ✅ User guide documented
**Priority:** HIGH - Essential for users
