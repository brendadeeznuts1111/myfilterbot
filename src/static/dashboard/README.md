# Dashboard Static Assets

This directory contains the static frontend assets for the Fantdev Trading Bot's unified dashboard interface - a real-time monitoring and management system.

## 📂 Directory Structure

```
src/static/dashboard/
├── components/
│   └── table.js              # DataTable component for data display
├── dashboard.js               # Main dashboard application logic
├── index.html                 # Dashboard HTML template
├── styles.css                 # Dashboard-specific styling
└── README.md                  # This documentation
```

## 🎯 Purpose

The dashboard provides real-time monitoring and management capabilities for:
- **Trading Bot Status**: Connection states, performance metrics
- **Customer Management**: User accounts, balances, transactions
- **System Monitoring**: Server health, database status, error tracking
- **Configuration Management**: YAML-based config editing with hot-reload
- **Real-time Updates**: WebSocket and SSE integration

## 🌐 Main Files Overview

### `index.html` - Dashboard Template
**Purpose**: Single-page dashboard interface with real-time updates

**Key Features**:
```html
<!-- Header with connection status -->
<header class="dashboard-header">
  <div class="connection-status">
    <span id="ws-status-dot" class="status-dot"></span>
    <span>WebSocket: <span id="ws-status">Connected</span></span>
  </div>
  <select id="environment-selector">
    <option value="development">Development</option>
    <option value="production">Production</option>
  </select>
</header>

<!-- Dynamic navigation tabs -->
<nav class="dashboard-nav" id="dashboard-nav">
  <!-- Tabs generated from YAML configuration -->
</nav>

<!-- Content sections -->
<main class="dashboard-content">
  <!-- Overview, monitoring, configuration tabs -->
</main>
```

**Dynamic Elements**:
- ✅ Real-time connection status indicator
- ✅ Environment selector (dev/prod)
- ✅ Auto-refresh controls with customizable intervals
- ✅ Dynamic tab generation from YAML config
- ✅ Responsive metric cards and data tables

### `dashboard.js` - Core Application Logic
**Purpose**: Main dashboard application class with real-time features

#### `UnifiedDashboard` Class

**Constructor Properties**:
```javascript
{
  currentTab: 'overview',           // Active tab
  currentConfig: 'app',             // Selected config file
  autoRefresh: false,               // Auto-refresh state
  wsConnection: null,               // WebSocket connection
  eventSource: null,                // Server-Sent Events
  dashboardConfig: null,            // YAML-loaded configuration
  apiBaseUrl: '/api'                // API endpoint base
}
```

**Core Methods**:

#### Configuration Management
```javascript
// Load dashboard configuration from YAML
await loadDashboardConfiguration()

// Setup dynamic tabs from config
setupDynamicTabs()

// Load and display YAML files with syntax highlighting
async loadYamlFile(fileName)

// Save YAML configuration with validation
async saveYamlFile(fileName, content)
```

#### Real-time Communication
```javascript
// WebSocket connection for live updates
connectWebSocket()
handleWebSocketMessage(event)

// Server-Sent Events for log streaming
setupServerSentEvents()
handleServerEvent(event)

// Auto-refresh system with configurable intervals
toggleAutoRefresh(enabled, interval = 30000)
```

#### Data Management
```javascript
// Load dashboard metrics and statistics
async loadMetrics()

// Refresh customer data from API
async refreshCustomerData()

// Update system status indicators
updateSystemStatus(data)

// Handle error display and notifications
showError(message, error)
showSuccess(message)
```

#### User Interface
```javascript
// Switch between dashboard tabs
switchTab(tabName)

// Toggle configuration sections
toggleConfigSection(sectionName)

// Update real-time clock display
startClock()

// Manage UI state and interactions
setupEventListeners()
```

### `styles.css` - Dashboard Styling
**Purpose**: Dark theme styling optimized for monitoring dashboards

**Design System**:
```css
:root {
  /* Dark theme color palette */
  --bg-primary: #0f1419;        /* Main background */
  --bg-secondary: #1a1f2e;      /* Secondary surfaces */
  --bg-card: #22293a;           /* Card backgrounds */
  --text-primary: #e1e8ed;      /* Primary text */
  --text-secondary: #8899a6;    /* Secondary text */
  
  /* Status colors */
  --accent-green: #00d084;      /* Success/online */
  --accent-red: #ff4458;        /* Error/offline */
  --accent-yellow: #ffcc00;     /* Warning */
  --accent-blue: #1da1f2;       /* Info/links */
}
```

**Key Component Styles**:

#### Layout System
- **Flexbox-based layout** with responsive design
- **Header**: Fixed top navigation with status indicators
- **Tabs**: Horizontal navigation with active states
- **Content**: Scrollable main content area
- **Cards**: Metric display containers with shadows

#### Real-time Elements
```css
/* Connection status indicators */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.status-dot.online { background: var(--accent-green); }
.status-dot.offline { background: var(--accent-red); }

/* Auto-updating metrics */
.metric-card {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 1.5rem;
  transition: transform 0.2s ease;
}
```

#### Interactive Components
- **Buttons**: Consistent styling with hover states
- **Forms**: Styled inputs and selects
- **Tables**: Striped rows with sorting indicators  
- **Code blocks**: Syntax-highlighted YAML display

### `components/table.js` - DataTable Component
**Purpose**: Reusable table component with advanced features

#### `DataTable` Class Features

**Configuration**:
```javascript
const tableConfig = {
  cols: [                           // Column definitions
    { key: 'name', title: 'Name', sortable: true },
    { key: 'balance', title: 'Balance', type: 'currency' },
    { key: 'status', title: 'Status', type: 'badge' }
  ],
  api: '/api/customers',            // Data endpoint
  pageSize: 50,                     // Items per page
  sortable: true,                   // Enable sorting
  filterable: true,                 // Enable filtering
  paginated: true                   // Enable pagination
};
```

**Core Functionality**:
```javascript
// Render table with controls
render()

// Load data from API
async loadData(query = {})

// Apply client-side filtering
filterData(searchTerm)

// Handle column sorting
sortByColumn(columnKey, direction)

// Navigate between pages
goToPage(pageNumber)

// Update table content in real-time
updateData(newData)
```

**Event Handling**:
- Search input with debounced filtering
- Column header click for sorting
- Pagination controls
- Row selection and actions
- Real-time data updates via WebSocket

## 🔄 Real-time Features

### WebSocket Integration
```javascript
// Connect to WebSocket for live updates
this.wsUrl = `ws://${window.location.hostname}:${window.location.port}/api/ws`;
this.wsConnection = new WebSocket(this.wsUrl);

// Handle incoming messages
this.wsConnection.onmessage = (event) => {
  const data = JSON.parse(event.data);
  this.handleRealtimeUpdate(data);
};
```

**Supported Message Types**:
- `metrics_update`: Dashboard metrics refresh
- `customer_update`: Customer data changes  
- `system_status`: Server health updates
- `config_reload`: Configuration file changes
- `error_alert`: System error notifications

### Server-Sent Events (SSE)
```javascript
// Stream logs and events from server
this.eventSource = new EventSource(`${API_BASE}/events`);
this.eventSource.onmessage = (event) => {
  const logEntry = JSON.parse(event.data);
  this.appendLogEntry(logEntry);
};
```

## 🎛️ Dashboard Configuration

### YAML-Based Configuration
The dashboard dynamically loads its layout from YAML configuration files:

```yaml
# config/dashboard.yaml
dashboard:
  title: "Fantdev Trading Bot Dashboard"
  tabs:
    - id: overview
      title: Overview  
      icon: fas fa-chart-line
      metrics:
        - active_users
        - total_balance
        - transactions_today
    - id: customers
      title: Customers
      icon: fas fa-users
      table:
        endpoint: /api/customers
        columns: [name, balance, status, last_active]
    - id: system
      title: System
      icon: fas fa-server
      monitoring:
        - memory_usage
        - cpu_usage
        - database_connections
```

### Hot Reload Support
- Configuration changes trigger automatic UI updates
- No page refresh required for layout changes
- Real-time validation of YAML syntax
- Rollback capabilities for invalid configs

## 🔌 API Integration

### Dashboard Endpoints
The dashboard integrates with these API endpoints:

#### Configuration Management
```javascript
GET  /api/yaml/list                    // List available YAML files
GET  /api/yaml/{filename}              // Get YAML file content
POST /api/yaml/{filename}              // Save YAML file
POST /api/yaml/validate                // Validate YAML syntax
```

#### Data Endpoints  
```javascript
GET  /api/dashboard/overview           // Dashboard metrics
GET  /api/customers                    // Customer data
GET  /api/system/stats                 // System statistics
GET  /api/features                     // Feature flags
POST /api/features/{flag}/toggle       // Toggle feature flag
```

#### Real-time Communication
```javascript
WS   /api/ws                          // WebSocket connection
GET  /api/events                      // Server-Sent Events
GET  /api/hotreload/status            // Hot reload status
```

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile-first responsive design */
@media (max-width: 768px) {
  .dashboard-header { flex-direction: column; }
  .metrics-grid { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .dashboard-nav { overflow-x: auto; }
  .metric-card { padding: 1rem; }
}
```

### Mobile Optimizations
- ✅ Touch-friendly interface elements
- ✅ Collapsible navigation for small screens
- ✅ Responsive data tables with horizontal scroll
- ✅ Optimized metric cards for mobile viewing

## ⚡ Performance Features

### Client-side Optimizations
- **Debounced search**: 300ms delay to reduce API calls
- **Virtual scrolling**: For large data sets
- **Lazy loading**: Load tabs on demand
- **Connection pooling**: Reuse WebSocket connections
- **Local caching**: Cache configuration and static data

### Real-time Efficiency
```javascript
// Throttled updates to prevent UI flooding
const throttledUpdate = throttle((data) => {
  this.updateMetrics(data);
}, 1000);

// Selective updates based on active tab
if (this.currentTab === 'overview') {
  this.updateOverviewMetrics(data.metrics);
}
```

## 🛠️ Development Workflow

### Local Development
1. **Start development server**: `bun run dev:server`
2. **Access dashboard**: `http://localhost:55254/dashboard/`
3. **Enable hot reload**: Automatic file watching
4. **Debug mode**: Console logging enabled

### Testing Real-time Features
```javascript
// Test WebSocket connection
const dashboard = new UnifiedDashboard();
await dashboard.init();

// Simulate real-time update
dashboard.handleRealtimeUpdate({
  type: 'metrics_update',
  data: { active_users: 42, total_balance: 15000 }
});
```

## 🔒 Security Considerations

### Authentication
- Dashboard requires valid JWT authentication
- Session management with automatic renewal
- Role-based access control for different sections

### Data Protection
- **HTTPS required** in production
- **WebSocket security** with origin validation
- **CSRF protection** for configuration changes
- **Input sanitization** for all user inputs

## 📊 Monitoring & Analytics

### Built-in Metrics
The dashboard automatically tracks:
- **User engagement**: Page views, time spent, clicks
- **Performance**: Load times, API response times
- **Errors**: JavaScript errors, API failures
- **Real-time stats**: WebSocket connection health

### Custom Events
```javascript
// Track custom dashboard events
dashboard.trackEvent('config_saved', {
  filename: 'app.yaml',
  timestamp: Date.now()
});
```

---

*Last Updated: August 2025 | Version: 2.1.0*
*Dashboard Architecture: Real-time WebSocket + SSE with YAML-based configuration*