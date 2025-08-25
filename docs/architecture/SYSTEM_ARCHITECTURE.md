# System Architecture - Fantdev Trading Bot

## 🏗️ **OVERVIEW**

The Fantdev Trading Bot is a **production-ready, enterprise-grade** system with a robust architecture that supports real-time trading operations, customer management, and comprehensive monitoring.

## 🎯 **CORE PRINCIPLES**

- **Single Source of Truth**: One configuration system, one data source
- **Hot-Reload Capability**: Configuration changes apply instantly
- **Scalable Architecture**: Worker-based system for high performance
- **Security First**: JWT authentication with role-based access control

## 🏛️ **SYSTEM COMPONENTS**

### **1. Configuration Layer** ⚙️
```
config/
├── *.yaml                 # YAML configuration files
├── environments/          # Environment-specific overrides
└── env.config.ts         # Environment variables
```

**Key Features:**
- Environment variable interpolation: `${VAR:-default}`
- Hot-reload with file watching
- Environment-specific overrides
- Feature flag system
- Automatic caching

### **2. Server Layer** 🖥️
```
src/
├── admin-server.ts        # Main admin server (port 3000)
├── server/                # Server implementations
│   ├── admin/            # Admin portal server
│   ├── api/              # API routing
│   └── workers/          # Background workers
└── portal_server.py       # Python portal server
```

**Server Architecture:**
- **Bun-based TypeScript server** for admin portal
- **Python server** for legacy integrations
- **Worker threads** for background processing
- **WebSocket support** for real-time updates

### **3. Data Layer** 💾
```
data/
├── customer_database.json     # Customer records (3,142 customers)
├── customer_config.json       # Customer configuration
├── *.jsonl                   # Transaction logs
└── logs/                     # Application logs
```

**Data Management:**
- JSON-based storage for simplicity
- JSONL for high-volume transaction logs
- Automatic data reloading
- Backup and recovery systems

### **4. Authentication Layer** 🔐
```
src/
├── auth/                     # Authentication system
│   ├── index.ts             # Auth middleware
│   └── types.ts             # Auth type definitions
└── security/                 # Security utilities
    ├── security_engine.py    # Python security
    └── security_processor.py # Security processing
```

**Security Features:**
- JWT-based authentication
- Cookie-based sessions
- Role-based access control
- Rate limiting
- CSRF protection

### **5. Dashboard Layer** 📊
```
src/
├── static/dashboard/         # Dashboard assets
├── web/components/           # React components
└── client/admin-mobile/      # Mobile admin interface
```

**Dashboard Features:**
- Real-time customer data
- Configuration management
- System monitoring
- Transaction tracking
- User management

## 🔄 **DATA FLOW**

### **1. Configuration Flow**
```
YAML Files → Config Manager → Hot-Reload → Application
     ↓              ↓            ↓           ↓
  app.yaml    Interpolation   File Watch   Live Updates
  features.yaml  Environment   Caching     Feature Flags
  telegram.yaml  Variables    Validation   Config Changes
```

### **2. Request Flow**
```
Client Request → Authentication → Route Handler → Response
      ↓              ↓              ↓           ↓
   Dashboard    JWT Verify    API Logic    JSON/HTML
   API Call     Role Check    Data Access   Error Handling
   WebSocket    Rate Limit    Validation   Logging
```

### **3. Data Flow**
```
Database → Data Manager → API Endpoints → Dashboard
    ↓           ↓             ↓            ↓
  JSON Files  Reload      CRUD Ops     Real-time
  JSONL Logs  Caching     Validation   Updates
  Backups     Indexing    Filtering    Export
```

## 🚀 **PERFORMANCE FEATURES**

### **1. Caching Strategy**
- **Configuration Caching**: YAML configs cached in memory
- **Data Caching**: Customer data cached for fast access
- **Response Caching**: API responses cached where appropriate

### **2. Worker System**
- **Background Processing**: Non-blocking operations
- **Parallel Execution**: Multiple workers for heavy tasks
- **Queue Management**: Task queuing and prioritization

### **3. Hot-Reload System**
- **File Watching**: Automatic configuration reloading
- **Live Updates**: Dashboard updates without restart
- **State Management**: Preserved state during reloads

## 🔧 **CONFIGURATION MANAGEMENT**

### **1. YAML Configuration System**
```typescript
// ✅ CORRECT: Use existing system
import { getConfig } from '@/utils/yaml-config';

const appConfig = await getConfig('app.yaml');
const featuresConfig = await getConfig('features.yaml');
```

### **2. Environment Variables**
```typescript
// ✅ CORRECT: Centralized environment config
import { ENV } from '@/config/env.config';

const PORT = ENV.PORT;
const JWT_SECRET = ENV.JWT_SECRET;
```

### **3. Feature Flags**
```typescript
// ✅ CORRECT: Use feature flag system
import { isFeatureEnabled } from '@/utils/yaml-config';

const isDebugMode = await isFeatureEnabled('debug_mode');
const isNewUI = await isFeatureEnabled('new_ui', userId);
```

## 🛡️ **SECURITY ARCHITECTURE**

### **1. Authentication Flow**
```
Login → Password Check → JWT Generation → Cookie Set
  ↓           ↓              ↓            ↓
Username   Hash Verify    Token Sign    HttpOnly
Password   Rate Limit    Expiration    Secure
2FA        Logging       Refresh       SameSite
```

### **2. Authorization Matrix**
```
Role          → Permissions
Admin         → Full access to all endpoints
Manager       → Customer management, reporting
Agent         → Customer view, basic operations
Viewer        → Read-only access
```

### **3. Security Measures**
- **JWT Tokens**: Secure, time-limited authentication
- **Rate Limiting**: Prevents abuse and DDoS
- **Input Validation**: All inputs sanitized and validated
- **CSRF Protection**: Cross-site request forgery prevention
- **Secure Headers**: Security headers on all responses

## 📊 **MONITORING & OBSERVABILITY**

### **1. Health Checks**
```
/health                    → Basic system health
/api/health               → Detailed health status
/api/admin/health/*       → Service-specific health
```

### **2. Logging System**
- **Structured Logging**: JSON format for easy parsing
- **Log Levels**: Debug, Info, Warn, Error
- **Log Rotation**: Automatic log file management
- **Performance Metrics**: Request timing, memory usage

### **3. Metrics Collection**
- **Request Counts**: API endpoint usage
- **Response Times**: Performance monitoring
- **Error Rates**: System reliability tracking
- **Resource Usage**: Memory, CPU, disk monitoring

## 🔄 **DEPLOYMENT ARCHITECTURE**

### **1. Development Environment**
```
Local Development → Hot-Reload → Live Testing
      ↓               ↓            ↓
   Source Code    File Watch    Browser
   YAML Configs   Auto-Reload   Dashboard
   Environment    Config Sync   API Calls
```

### **2. Production Environment**
```
Source Code → Build → Deploy → Monitor
     ↓         ↓       ↓        ↓
  Git Repo   Bundle   Server   Health
  Configs    Assets   Process  Metrics
  Secrets    Tests    Load Bal  Alerts
```

## 📈 **SCALABILITY FEATURES**

### **1. Horizontal Scaling**
- **Stateless Design**: No server-side session storage
- **Load Balancing**: Multiple server instances
- **Database Sharding**: Customer data distribution
- **CDN Integration**: Static asset delivery

### **2. Vertical Scaling**
- **Worker Threads**: Background task processing
- **Memory Optimization**: Efficient data structures
- **Connection Pooling**: Database connection management
- **Caching Layers**: Multi-level caching strategy

## 🎯 **BEST PRACTICES**

### **1. Configuration Management**
- ✅ Use existing YAML system
- ✅ Use environment variables for secrets
- ✅ Use feature flags for conditional functionality
- ❌ Don't create new config systems
- ❌ Don't hardcode values

### **2. Development Workflow**
- ✅ Use hot-reload for development
- ✅ Test configuration changes
- ✅ Validate environment setup
- ❌ Don't restart server unnecessarily
- ❌ Don't ignore configuration errors

### **3. Security Practices**
- ✅ Use JWT tokens for authentication
- ✅ Implement rate limiting
- ✅ Validate all inputs
- ❌ Don't expose sensitive data
- ❌ Don't skip authentication checks

---

**Last Updated:** $(date)
**Status:** ✅ Architecture documented
**Priority:** HIGH - Critical system understanding
