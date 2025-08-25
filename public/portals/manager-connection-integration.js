/**
 * Manager Portal Connection Integration - Enhanced connection system for manager portal
 * Integrates the unified connection architecture with the manager portal interface
 */

class ManagerPortalConnectionIntegration {
  constructor() {
    this.bootstrap = null;
    this.currentUser = null;
    this.authToken = null;
    this.socket = null;
    this.reconnectInterval = null;
    this.connectionStatus = new Map();
    this.performanceMetrics = new Map();
    this.customerData = new Map();
    this.systemMetrics = new Map();
    this.alerts = [];
    this.init();
  }

  init() {
    this.initializeConnectionSystem();
    this.setupManagerPortalIntegration();
    this.setupPerformanceMonitoring();
    this.setupEventListeners();
    this.startHealthChecks();
  }

  initializeConnectionSystem() {
    // Initialize the connection bootstrap system
    if (typeof ConnectionBootstrap !== 'undefined') {
      this.bootstrap = new ConnectionBootstrap();
      this.bootstrap.initialize();
      
      // Setup system observers
      this.setupSystemObservers();
      
      console.log('Manager portal connection system initialized');
    } else {
      console.warn('ConnectionBootstrap not found, falling back to basic initialization');
      this.initializeFallback();
    }
  }

  setupSystemObservers() {
    if (!this.bootstrap) return;

    // Monitor navigation system
    const navigation = this.bootstrap.getSystem('navigation');
    if (navigation) {
      navigation.addObserver((event, data) => {
        this.handleNavigationEvent(event, data);
      });
    }

    // Monitor connection system
    const connection = this.bootstrap.getSystem('connection');
    if (connection) {
      connection.eventBus.addEventListener('data:updated', (event) => {
        this.handleConnectionUpdate(event);
      });
    }

    // Monitor integration hub
    const integration = this.bootstrap.getSystem('integration');
    if (integration) {
      integration.modules.forEach((module, name) => {
        if (module.capabilities.includes('manager_portal_integration')) {
          this.setupManagerModuleIntegration(name, module);
        }
      });
    }
  }

  setupManagerPortalIntegration() {
    // Enhanced manager portal integration
    this.setupEnhancedLogin();
    this.setupWebSocketIntegration();
    this.setupRealTimeUpdates();
    this.setupCustomerManagement();
    this.setupSystemMonitoring();
    this.setupAlertHandling();
  }

  setupEnhancedLogin() {
    // Enhanced login with connection awareness
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleEnhancedLogin();
      });
    }

    // Auto-login with connection check
    this.checkSavedSession();
  }

  handleEnhancedLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('loginError');
    const successDiv = document.getElementById('loginSuccess');

    // Clear messages
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    // Disable button
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    // Use connection system for login
    if (this.bootstrap && this.bootstrap.getSystem('connection')) {
      this.authenticateWithConnectionSystem(username, password);
    } else {
      this.fallbackLogin(username, password);
    }
  }

  authenticateWithConnectionSystem(username, password) {
    const connection = this.bootstrap.getSystem('connection');
    
    connection.authenticate({
      username: username,
      password: password,
      role: 'manager'
    }).then((response) => {
      if (response.success) {
        this.handleSuccessfulAuthentication(response);
      } else {
        this.handleAuthenticationError(response);
      }
    }).catch((error) => {
      this.handleAuthenticationError(error);
    });
  }

  fallbackLogin(username, password) {
    // Fallback to direct API call
    const API_BASE = window.location.origin + '/api';
    
    fetch(`${API_BASE}/manager/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        this.handleSuccessfulAuthentication(data);
      } else {
        this.handleAuthenticationError(data);
      }
    })
    .catch(error => {
      this.handleAuthenticationError(error);
    });
  }

  handleSuccessfulAuthentication(data) {
    this.currentUser = data.user;
    this.authToken = data.token;
    
    // Store authentication
    localStorage.setItem('managerUsername', this.currentUser.username);
    localStorage.setItem('authToken', this.authToken);
    
    // Show success
    const successDiv = document.getElementById('loginSuccess');
    successDiv.textContent = 'Login successful! Loading dashboard...';
    successDiv.style.display = 'block';
    
    // Initialize WebSocket
    this.initializeWebSocket();
    
    // Show dashboard
    setTimeout(() => {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('dashboardScreen').style.display = 'block';
      this.loadDashboard();
    }, 1000);
  }

  handleAuthenticationError(error) {
    const errorDiv = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    
    errorDiv.textContent = error.error || 'Invalid credentials';
    errorDiv.style.display = 'block';
    
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    
    console.error('Authentication error:', error);
  }

  checkSavedSession() {
    const savedUsername = localStorage.getItem('managerUsername');
    const savedToken = localStorage.getItem('authToken');
    
    if (savedUsername && savedToken) {
      this.currentUser = { username: savedUsername };
      this.authToken = savedToken;
      
      // Verify token with connection system
      if (this.bootstrap && this.bootstrap.getSystem('connection')) {
        this.verifyTokenWithConnectionSystem();
      } else {
        this.verifyTokenWithAPI();
      }
    }
  }

  verifyTokenWithConnectionSystem() {
    const connection = this.bootstrap.getSystem('connection');
    
    connection.verifyToken(this.authToken).then((isValid) => {
      if (isValid) {
        this.showDashboard();
      } else {
        this.clearSavedSession();
      }
    }).catch(() => {
      this.clearSavedSession();
    });
  }

  verifyTokenWithAPI() {
    const API_BASE = window.location.origin + '/api';
    
    fetch(`${API_BASE}/manager/profile`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'ngrok-skip-browser-warning': 'true'
      }
    })
    .then(response => {
      if (response.ok) {
        this.showDashboard();
      } else {
        this.clearSavedSession();
      }
    })
    .catch(() => {
      this.clearSavedSession();
    });
  }

  showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'block';
    this.initializeWebSocket();
    this.loadDashboard();
  }

  clearSavedSession() {
    localStorage.removeItem('managerUsername');
    localStorage.removeItem('authToken');
    this.currentUser = null;
    this.authToken = null;
  }

  setupWebSocketIntegration() {
    // Enhanced WebSocket integration with connection system
    if (this.bootstrap && this.bootstrap.getSystem('connection')) {
      const connection = this.bootstrap.getSystem('connection');
      
      // Use connection system's WebSocket manager
      this.socket = connection.getWebSocketManager();
      
      if (this.socket) {
        this.setupWebSocketHandlers();
      }
    } else {
      this.setupDirectWebSocket();
    }
  }

  setupDirectWebSocket() {
    // Fallback direct WebSocket setup
    if (this.authToken) {
      this.socket = io(window.location.origin, {
        transports: ['websocket', 'polling']
      });
      
      this.setupWebSocketHandlers();
    }
  }

  setupWebSocketHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.updateConnectionStatus(true);
      this.authenticateWebSocket();
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.updateConnectionStatus(false);
      this.attemptReconnect();
    });

    this.socket.on('auth_success', (data) => {
      console.log('Authenticated:', data.message);
      this.subscribeToUpdates();
    });

    this.socket.on('customer_update', (data) => {
      this.handleCustomerUpdate(data);
    });

    this.socket.on('system_alert', (data) => {
      this.handleSystemAlert(data);
    });

    this.socket.on('performance_update', (data) => {
      this.handlePerformanceUpdate(data);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleWebSocketError(error);
    });
  }

  authenticateWebSocket() {
    if (this.socket && this.authToken) {
      this.socket.emit('authenticate', { 
        token: this.authToken,
        role: 'manager'
      });
    }
  }

  subscribeToUpdates() {
    if (this.socket) {
      this.socket.emit('subscribe_updates', { 
        type: 'all',
        role: 'manager'
      });
    }
  }

  setupRealTimeUpdates() {
    // Enhanced real-time update handling
    this.setupCustomerUpdateHandler();
    this.setupSystemAlertHandler();
    this.setupPerformanceUpdateHandler();
  }

  setupCustomerUpdateHandler() {
    // Listen for customer updates
    if (this.bootstrap) {
      const connection = this.bootstrap.getSystem('connection');
      if (connection) {
        connection.eventBus.addEventListener('customer:updated', (event) => {
          this.handleCustomerUpdate(event.detail);
        });
      }
    }
  }

  setupSystemAlertHandler() {
    // Listen for system alerts
    if (this.bootstrap) {
      const connection = this.bootstrap.getSystem('connection');
      if (connection) {
        connection.eventBus.addEventListener('system:alert', (event) => {
          this.handleSystemAlert(event.detail);
        });
      }
    }
  }

  setupPerformanceUpdateHandler() {
    // Listen for performance updates
    if (this.bootstrap) {
      const connection = this.bootstrap.getSystem('connection');
      if (connection) {
        connection.eventBus.addEventListener('performance:updated', (event) => {
          this.handlePerformanceUpdate(event.detail);
        });
      }
    }
  }

  handleCustomerUpdate(customerData) {
    // Update customer data
    this.customerData.set(customerData.customer_id, customerData);
    
    // Update UI
    this.updateCustomerUI(customerData);
    
    // Show notification for important updates
    if (customerData.balance > 10000 || customerData.weekly_pnl > 1000) {
      this.showCustomerNotification(customerData);
    }
  }

  handleSystemAlert(alert) {
    // Add to alerts
    this.alerts.unshift({
      ...alert,
      timestamp: Date.now(),
      id: Date.now()
    });
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }
    
    // Update UI
    this.updateAlertsUI();
    
    // Show notification
    this.showSystemAlertNotification(alert);
  }

  handlePerformanceUpdate(performanceData) {
    // Update performance metrics
    this.performanceMetrics.set(Date.now(), {
      ...performanceData,
      timestamp: Date.now()
    });
    
    // Update performance UI
    this.updatePerformanceUI(performanceData);
  }

  updateCustomerUI(customerData) {
    // Update customer-specific UI elements
    const customerCards = document.querySelectorAll('.customer-card');
    customerCards.forEach(card => {
      const customerId = card.dataset.customerId;
      if (customerId === customerData.customer_id) {
        // Update balance
        const balanceEl = card.querySelector('.customer-balance');
        if (balanceEl) {
          balanceEl.textContent = `$${customerData.balance.toLocaleString()}`;
        }
        
        // Update status
        const statusEl = card.querySelector('.customer-status');
        if (statusEl) {
          statusEl.textContent = customerData.active ? 'Active' : 'Inactive';
          statusEl.className = customerData.active ? 'status-active' : 'status-inactive';
        }
        
        // Update P&L
        const pnlEl = card.querySelector('.customer-pnl');
        if (pnlEl) {
          pnlEl.textContent = `${customerData.weekly_pnl >= 0 ? '+' : ''}$${Math.abs(customerData.weekly_pnl).toLocaleString()}`;
          pnlEl.className = customerData.weekly_pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
        }
      }
    });
  }

  updateAlertsUI() {
    const alertsList = document.getElementById('alertsList');
    if (!alertsList) return;
    
    if (this.alerts.length === 0) {
      alertsList.innerHTML = '<div class="no-alerts">No active alerts</div>';
      return;
    }
    
    alertsList.innerHTML = this.alerts.map(alert => {
      const time = new Date(alert.timestamp).toLocaleString();
      const priorityClass = alert.priority === 'high' ? 'alert-high' : 
                           alert.priority === 'medium' ? 'alert-medium' : 'alert-low';
      
      return `
        <div class="alert-item ${priorityClass}">
          <div class="alert-header">
            <span class="alert-type">${alert.type}</span>
            <span class="alert-time">${time}</span>
          </div>
          <div class="alert-message">${alert.message}</div>
          <div class="alert-actions">
            <button class="btn-small" onclick="managerPortalIntegration.resolveAlert(${alert.id})">
              Resolve
            </button>
            <button class="btn-small btn-secondary" onclick="managerPortalIntegration.acknowledgeAlert(${alert.id})">
              Acknowledge
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  updatePerformanceUI(performanceData) {
    // Update performance indicators
    const performanceCards = document.querySelectorAll('.performance-card');
    performanceCards.forEach(card => {
      const metric = card.dataset.metric;
      const valueEl = card.querySelector('.metric-value');
      
      if (valueEl && performanceData[metric]) {
        valueEl.textContent = this.formatMetricValue(metric, performanceData[metric]);
      }
    });
  }

  formatMetricValue(metric, value) {
    switch (metric) {
      case 'activeUsers':
        return value.toLocaleString();
      case 'transactionRate':
        return `${value}/min`;
      case 'systemLoad':
        return `${value}%`;
      case 'responseTime':
        return `${value}ms`;
      default:
        return value;
    }
  }

  showCustomerNotification(customerData) {
    const message = customerData.balance > 10000 ? 
      `High balance alert: $${customerData.balance.toLocaleString()}` :
      `High P&L alert: $${customerData.weekly_pnl.toLocaleString()}`;
    
    this.showNotification('Customer Alert', message, 'warning');
  }

  showSystemAlertNotification(alert) {
    this.showNotification('System Alert', alert.message, alert.priority);
  }

  setupCustomerManagement() {
    // Enhanced customer management
    this.setupCustomerSearch();
    this.setupCustomerFilters();
    this.setupCustomerActions();
    this.setupCustomerAnalytics();
  }

  setupCustomerSearch() {
    // Enhanced customer search with real-time results
    const searchInput = document.getElementById('customerSearch');
    if (searchInput) {
      let searchTimeout;
      
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        searchTimeout = setTimeout(() => {
          this.performCustomerSearch(query);
        }, 300);
      });
    }
  }

  setupCustomerFilters() {
    // Enhanced customer filtering
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyCustomerFilter(btn.dataset.filter);
      });
    });
  }

  setupCustomerActions() {
    // Enhanced customer actions
    const actionButtons = document.querySelectorAll('.customer-action');
    actionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleCustomerAction(btn.dataset.action, btn.dataset.customerId);
      });
    });
  }

  setupCustomerAnalytics() {
    // Enhanced customer analytics
    this.customerAnalytics = {
      totalCustomers: 0,
      activeCustomers: 0,
      totalVolume: 0,
      averageBalance: 0,
      topCustomers: [],
      customerGrowth: []
    };
  }

  setupSystemMonitoring() {
    // Enhanced system monitoring
    this.setupSystemHealth();
    this.setupResourceMonitoring();
    this.setupSecurityMonitoring();
    this.setupPerformanceMonitoring();
  }

  setupSystemHealth() {
    // Monitor system health
    this.systemHealth = {
      status: 'healthy',
      uptime: 0,
      lastCheck: Date.now(),
      issues: []
    };
    
    // Check health every 5 minutes
    setInterval(() => {
      this.checkSystemHealth();
    }, 300000);
  }

  setupResourceMonitoring() {
    // Monitor system resources
    this.resourceMonitoring = {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0
    };
    
    // Update every 30 seconds
    setInterval(() => {
      this.updateResourceMetrics();
    }, 30000);
  }

  setupSecurityMonitoring() {
    // Monitor security events
    this.securityMonitoring = {
      failedLogins: 0,
      suspiciousActivity: 0,
      blockedIPs: [],
      lastSecurityEvent: null
    };
    
    // Listen for security events
    if (this.bootstrap) {
      const connection = this.bootstrap.getSystem('connection');
      if (connection) {
        connection.eventBus.addEventListener('security:incident', (event) => {
          this.handleSecurityIncident(event.detail);
        });
      }
    }
  }

  setupAlertHandling() {
    // Enhanced alert handling
    this.setupAlertPrioritization();
    this.setupAlertEscalation();
    this.setupAlertResolution();
  }

  setupAlertPrioritization() {
    // Prioritize alerts based on severity
    this.alertPriorities = {
      critical: { level: 1, responseTime: 5 },
      high: { level: 2, responseTime: 15 },
      medium: { level: 3, responseTime: 30 },
      low: { level: 4, responseTime: 60 }
    };
  }

  setupAlertEscalation() {
    // Setup alert escalation
    this.alertEscalation = {
      unresolvedTimeouts: {},
      escalationRules: []
    };
  }

  setupAlertResolution() {
    // Setup alert resolution
    this.alertResolution = {
      resolved: [],
      acknowledged: [],
      pending: []
    };
  }

  performCustomerSearch(query) {
    // Perform customer search with connection system
    if (this.bootstrap && this.bootstrap.getSystem('connection')) {
      const connection = this.bootstrap.getSystem('connection');
      
      connection.searchCustomers(query).then((results) => {
        this.updateCustomerSearchResults(results);
      }).catch((error) => {
        console.error('Search failed:', error);
      });
    } else {
      // Fallback search
      this.performFallbackCustomerSearch(query);
    }
  }

  updateCustomerSearchResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;
    
    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="no-results">No customers found</div>';
      return;
    }
    
    resultsContainer.innerHTML = results.map(customer => {
      return `
        <div class="search-result" data-customer-id="${customer.customer_id}">
          <div class="customer-info">
            <div class="customer-name">${customer.name || customer.customer_id}</div>
            <div class="customer-details">
              <span>Balance: $${customer.balance.toLocaleString()}</span>
              <span>Status: ${customer.active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
          <div class="customer-actions">
            <button class="btn-small" onclick="managerPortalIntegration.viewCustomer('${customer.customer_id}')">
              View
            </button>
            <button class="btn-small btn-secondary" onclick="managerPortalIntegration.contactCustomer('${customer.customer_id}')">
              Contact
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  applyCustomerFilter(filter) {
    // Apply customer filter
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    // Filter customers
    this.filterCustomers(filter);
  }

  filterCustomers(filter) {
    const customerCards = document.querySelectorAll('.customer-card');
    customerCards.forEach(card => {
      const customerId = card.dataset.customerId;
      const customer = this.customerData.get(customerId);
      
      if (this.shouldShowCustomer(customer, filter)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  shouldShowCustomer(customer, filter) {
    switch (filter) {
      case 'active':
        return customer && customer.active;
      case 'inactive':
        return customer && !customer.active;
      case 'high-balance':
        return customer && customer.balance > 10000;
      case 'high-pnl':
        return customer && Math.abs(customer.weekly_pnl) > 1000;
      default:
        return true;
    }
  }

  handleCustomerAction(action, customerId) {
    // Handle customer action
    switch (action) {
      case 'view':
        this.viewCustomer(customerId);
        break;
      case 'contact':
        this.contactCustomer(customerId);
        break;
      case 'suspend':
        this.suspendCustomer(customerId);
        break;
      case 'activate':
        this.activateCustomer(customerId);
        break;
    }
  }

  viewCustomer(customerId) {
    // View customer details
    const customer = this.customerData.get(customerId);
    if (customer) {
      this.showCustomerDetails(customer);
    }
  }

  contactCustomer(customerId) {
    // Contact customer
    this.showNotification('Contact', `Opening contact interface for customer ${customerId}`, 'info');
  }

  suspendCustomer(customerId) {
    // Suspend customer
    if (confirm(`Are you sure you want to suspend customer ${customerId}?`)) {
      this.performCustomerAction(customerId, 'suspend');
    }
  }

  activateCustomer(customerId) {
    // Activate customer
    this.performCustomerAction(customerId, 'activate');
  }

  performCustomerAction(customerId, action) {
    // Perform customer action via connection system
    if (this.bootstrap && this.bootstrap.getSystem('connection')) {
      const connection = this.bootstrap.getSystem('connection');
      
      connection.performCustomerAction(customerId, action).then((result) => {
        if (result.success) {
          this.showNotification('Success', `Customer ${action}ed successfully`, 'success');
          this.updateCustomerData(customerId);
        } else {
          this.showNotification('Error', result.error, 'error');
        }
      }).catch((error) => {
        this.showNotification('Error', `Failed to ${action} customer`, 'error');
      });
    } else {
      // Fallback action
      this.performFallbackCustomerAction(customerId, action);
    }
  }

  updateCustomerData(customerId) {
    // Refresh customer data
    if (this.bootstrap && this.bootstrap.getSystem('connection')) {
      const connection = this.bootstrap.getSystem('connection');
      
      connection.fetchCustomerData(customerId).then((data) => {
        this.customerData.set(customerId, data);
        this.updateCustomerUI(data);
      });
    }
  }

  checkSystemHealth() {
    // Check system health
    if (this.bootstrap) {
      const health = this.bootstrap.checkSystemHealth();
      this.systemHealth = {
        ...health,
        lastCheck: Date.now()
      };
      
      // Update UI
      this.updateSystemHealthUI(health);
      
      // Check for issues
      if (health.status !== 'healthy') {
        this.handleSystemIssue(health);
      }
    }
  }

  updateResourceMetrics() {
    // Update resource metrics
    if (this.bootstrap) {
      const metrics = this.bootstrap.getResourceMetrics();
      this.resourceMonitoring = {
        ...metrics,
        lastUpdate: Date.now()
      };
      
      // Update UI
      this.updateResourceMetricsUI(metrics);
    }
  }

  handleSecurityIncident(incident) {
    // Handle security incident
    this.securityMonitoring.failedLogins++;
    this.securityMonitoring.lastSecurityEvent = incident;
    
    // Show notification
    this.showNotification('Security Alert', 
      `Security incident detected: ${incident.type}`, 'error');
    
    // Log incident
    console.log('Security incident:', incident);
  }

  resolveAlert(alertId) {
    // Resolve alert
    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex !== -1) {
      const alert = this.alerts[alertIndex];
      this.alerts.splice(alertIndex, 1);
      this.alertResolution.resolved.push(alert);
      
      // Update UI
      this.updateAlertsUI();
      
      // Show notification
      this.showNotification('Alert Resolved', `Alert ${alert.id} has been resolved`, 'success');
    }
  }

  acknowledgeAlert(alertId) {
    // Acknowledge alert
    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex !== -1) {
      const alert = this.alerts[alertIndex];
      this.alerts.splice(alertIndex, 1);
      this.alertResolution.acknowledged.push(alert);
      
      // Update UI
      this.updateAlertsUI();
      
      // Show notification
      this.showNotification('Alert Acknowledged', `Alert ${alert.id} has been acknowledged`, 'info');
    }
  }

  showCustomerDetails(customer) {
    // Show customer details modal
    const modal = document.getElementById('customerDetailsModal');
    if (modal) {
      modal.style.display = 'block';
      
      // Populate modal with customer data
      modal.innerHTML = `
        <div class="modal-header">
          <h2>Customer Details</h2>
          <button class="close-btn" onclick="managerPortalIntegration.closeCustomerDetails()">×</button>
        </div>
        <div class="modal-body">
          <div class="customer-info">
            <div class="info-row">
              <span class="label">Customer ID:</span>
              <span class="value">${customer.customer_id}</span>
            </div>
            <div class="info-row">
              <span class="label">Name:</span>
              <span class="value">${customer.name || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Email:</span>
              <span class="value">${customer.email || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Balance:</span>
              <span class="value">$${customer.balance.toLocaleString()}</span>
            </div>
            <div class="info-row">
              <span class="label">Weekly P&L:</span>
              <span class="value ${customer.weekly_pnl >= 0 ? 'positive' : 'negative'}">
                ${customer.weekly_pnl >= 0 ? '+' : ''}$${Math.abs(customer.weekly_pnl).toLocaleString()}
              </span>
            </div>
            <div class="info-row">
              <span class="label">Status:</span>
              <span class="value ${customer.active ? 'active' : 'inactive'}">
                ${customer.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div class="info-row">
              <span class="label">Registered:</span>
              <span class="value">${customer.registered ? 'Yes' : 'No'}</span>
            </div>
            <div class="info-row">
              <span class="label">Last Login:</span>
              <span class="value">${customer.last_login ? new Date(customer.last_login).toLocaleString() : 'Never'}</span>
            </div>
          </div>
          <div class="customer-actions">
            <button class="btn" onclick="managerPortalIntegration.contactCustomer('${customer.customer_id}')">
              Contact Customer
            </button>
            <button class="btn btn-secondary" onclick="managerPortalIntegration.viewCustomerHistory('${customer.customer_id}')">
              View History
            </button>
            ${customer.active ? 
              `<button class="btn btn-danger" onclick="managerPortalIntegration.suspendCustomer('${customer.customer_id}')">
                Suspend Customer
              </button>` :
              `<button class="btn btn-success" onclick="managerPortalIntegration.activateCustomer('${customer.customer_id}')">
                Activate Customer
              </button>`
            }
          </div>
        </div>
      `;
    }
  }

  closeCustomerDetails() {
    // Close customer details modal
    const modal = document.getElementById('customerDetailsModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  viewCustomerHistory(customerId) {
    // View customer history
    this.showNotification('History', `Loading history for customer ${customerId}`, 'info');
  }

  updateSystemHealthUI(health) {
    // Update system health UI
    const healthIndicator = document.getElementById('systemHealth');
    if (healthIndicator) {
      healthIndicator.className = `health-status ${health.status}`;
      healthIndicator.textContent = health.status.charAt(0).toUpperCase() + health.status.slice(1);
    }
  }

  updateResourceMetricsUI(metrics) {
    // Update resource metrics UI
    const cpuEl = document.getElementById('cpuUsage');
    const memoryEl = document.getElementById('memoryUsage');
    const diskEl = document.getElementById('diskUsage');
    const networkEl = document.getElementById('networkUsage');
    
    if (cpuEl) cpuEl.textContent = `${metrics.cpu}%`;
    if (memoryEl) memoryEl.textContent = `${metrics.memory}%`;
    if (diskEl) diskEl.textContent = `${metrics.disk}%`;
    if (networkEl) networkEl.textContent = `${metrics.network}%`;
  }

  handleSystemIssue(health) {
    // Handle system issue
    this.showNotification('System Issue', 
      `System health is ${health.status}: ${health.issues.join(', ')}`, 'error');
    
    // Escalate if necessary
    if (health.status === 'critical') {
      this.escalateSystemIssue(health);
    }
  }

  escalateSystemIssue(health) {
    // Escalate system issue
    this.showNotification('Critical System Issue', 
      'System issue has been escalated to senior administrators', 'error');
    
    // Send escalation notification
    if (this.bootstrap) {
      const connection = this.bootstrap.getSystem('connection');
      if (connection) {
        connection.escalateIssue({
          type: 'system',
          severity: 'critical',
          message: health.issues.join(', '),
          timestamp: Date.now()
        });
      }
    }
  }

  setupEventListeners() {
    // Setup global event listeners
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
    
    window.addEventListener('online', () => {
      this.handleOnlineStatus();
    });
    
    window.addEventListener('offline', () => {
      this.handleOfflineStatus();
    });
    
    // Setup keyboard navigation
    this.setupKeyboardNavigation();
    
    // Setup logout handler
    this.setupLogoutHandler();
    
    // Setup modal handlers
    this.setupModalHandlers();
  }

  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Keyboard shortcuts
      if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        this.refreshAllData();
      }
      
      if (e.key === 'a' && e.ctrlKey) {
        e.preventDefault();
        this.showAlertsPanel();
      }
      
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  setupLogoutHandler() {
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.handleLogout();
      });
    }
  }

  setupModalHandlers() {
    // Setup modal close handlers
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
      }
    });
    
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('close-btn')) {
        e.target.closest('.modal').style.display = 'none';
      }
    });
  }

  handleVisibilityChange() {
    if (document.hidden) {
      console.log('Manager portal hidden, pausing updates');
      this.pauseUpdates();
    } else {
      console.log('Manager portal visible, resuming updates');
      this.resumeUpdates();
    }
  }

  handleOnlineStatus() {
    console.log('Browser online, updating connection status');
    this.updateAllConnectionStatuses();
  }

  handleOfflineStatus() {
    console.log('Browser offline, showing offline mode');
    this.showOfflineMode();
  }

  pauseUpdates() {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  resumeUpdates() {
    this.setupPerformanceMonitoring();
    
    if (this.authToken) {
      this.initializeWebSocket();
    }
  }

  updateAllConnectionStatuses() {
    // Update all connection status indicators
    this.updateConnectionStatus(this.socket && this.socket.connected);
  }

  showOfflineMode() {
    // Show offline indicator
    const offlineToast = document.createElement('div');
    offlineToast.className = 'toast-notification show notification-info';
    offlineToast.innerHTML = `
      <div class="toast-content">
        <strong>You're Offline</strong>
        <p>Some features may be limited. Check your connection.</p>
      </div>
    `;
    
    document.body.appendChild(offlineToast);
    
    setTimeout(() => {
      offlineToast.classList.remove('show');
      setTimeout(() => offlineToast.remove(), 300);
    }, 5000);
  }

  startHealthChecks() {
    // Start periodic health checks
    this.healthInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000);
  }

  performHealthCheck() {
    console.log('Performing manager portal health check...');
    
    // Check WebSocket connection
    if (this.socket && !this.socket.connected) {
      this.attemptReconnect();
    }
    
    // Check authentication
    if (this.authToken) {
      this.checkAuthentication();
    }
    
    // Check data freshness
    this.checkDataFreshness();
    
    // Check system health
    if (this.bootstrap) {
      const health = this.bootstrap.checkSystemHealth();
      console.log('System health:', health);
    }
  }

  checkAuthentication() {
    if (!this.authToken) return;
    
    // Verify token is still valid
    const API_BASE = window.location.origin + '/api';
    
    fetch(`${API_BASE}/manager/profile`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'ngrok-skip-browser-warning': 'true'
      }
    })
    .then(response => {
      if (!response.ok) {
        this.handleAuthenticationFailure();
      }
    })
    .catch(() => {
      this.handleAuthenticationFailure();
    });
  }

  handleAuthenticationFailure() {
    console.log('Authentication check failed');
    this.showNotification('Session Expired', 'Please login again', 'error');
    this.handleLogout();
  }

  checkDataFreshness() {
    // Check if data is fresh
    const lastUpdate = localStorage.getItem('lastDataUpdate');
    if (lastUpdate) {
      const timeSinceUpdate = Date.now() - parseInt(lastUpdate);
      if (timeSinceUpdate > 300000) { // 5 minutes
        this.refreshAllData();
      }
    }
  }

  attemptReconnect() {
    if (this.reconnectInterval) return;
    
    let attempts = 0;
    this.reconnectInterval = setInterval(() => {
      attempts++;
      console.log(`Reconnection attempt ${attempts}...`);
      
      if (this.socket && !this.socket.connected && this.authToken) {
        this.socket.connect();
      } else if (attempts > 5) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
        console.log('Max reconnection attempts reached');
      }
    }, 3000);
  }

  handleLogout() {
    // Clear saved session
    localStorage.removeItem('managerUsername');
    localStorage.removeItem('authToken');
    this.currentUser = null;
    this.authToken = null;
    
    // Disconnect WebSocket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Clear reconnect interval
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    // Clear analytics
    this.clearAnalytics();
    
    // Show login screen
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardScreen').style.display = 'none';
    document.getElementById('loginForm').reset();
  }

  clearAnalytics() {
    // Clear analytics data
    this.customerData.clear();
    this.performanceMetrics.clear();
    this.alerts = [];
    this.securityMonitoring = {
      failedLogins: 0,
      suspiciousActivity: 0,
      blockedIPs: [],
      lastSecurityEvent: null
    };
    
    console.log('Analytics data cleared');
  }

  loadDashboard() {
    if (!this.currentUser) return;
    
    // Update user info
    document.getElementById('userName').textContent = this.currentUser.username;
    document.getElementById('userRole').textContent = 'Manager';
    
    // Use connection system to load dashboard
    if (this.bootstrap && this.bootstrap.getSystem('connection')) {
      this.loadDashboardWithConnectionSystem();
    } else {
      this.loadDashboardWithAPI();
    }
  }

  loadDashboardWithConnectionSystem() {
    const connection = this.bootstrap.getSystem('connection');
    
    connection.fetchManagerDashboard().then((data) => {
      this.updateDashboard(data);
    }).catch((error) => {
      console.error('Error loading dashboard:', error);
      this.showNotification('Error', 'Failed to load dashboard data', 'error');
    });
  }

  loadDashboardWithAPI() {
    const API_BASE = window.location.origin + '/api';
    
    fetch(`${API_BASE}/manager/dashboard`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'ngrok-skip-browser-warning': 'true'
      }
    })
    .then(response => {
      if (!response.ok) {
        if (response.status === 401) {
          this.handleLogout();
          return;
        }
        throw new Error('Failed to fetch data');
      }
      return response.json();
    })
    .then(data => {
      this.updateDashboard(data);
    })
    .catch(error => {
      console.error('Error loading dashboard:', error);
      this.showNotification('Error', 'Failed to load dashboard data', 'error');
    });
  }

  updateDashboard(data) {
    const customers = data.customers || [];
    const statistics = data.statistics || {};
    const alerts = data.alerts || [];
    
    // Update customer count
    document.getElementById('totalCustomers').textContent = customers.length;
    document.getElementById('activeCustomers').textContent = statistics.active_customers || 0;
    
    // Update system metrics
    document.getElementById('totalVolume').textContent = `$${statistics.total_volume?.toLocaleString() || 0}`;
    document.getElementById('avgBalance').textContent = `$${statistics.average_balance?.toLocaleString() || 0}`;
    document.getElementById('transactionRate').textContent = `${statistics.transaction_rate || 0}/min`;
    
    // Update alerts
    this.alerts = alerts.map(alert => ({
      ...alert,
      timestamp: Date.now(),
      id: Date.now() + Math.random()
    }));
    
    this.updateAlertsUI();
    
    // Update customer cards
    this.updateCustomerCards(customers);
    
    // Store last update time
    localStorage.setItem('lastDataUpdate', Date.now().toString());
  }

  updateCustomerCards(customers) {
    const customersGrid = document.getElementById('customersGrid');
    if (!customersGrid) return;
    
    if (customers.length === 0) {
      customersGrid.innerHTML = '<div class="no-customers">No customers found</div>';
      return;
    }
    
    customersGrid.innerHTML = customers.map(customer => {
      const statusClass = customer.active ? 'status-active' : 'status-inactive';
      const pnlClass = customer.weekly_pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
      
      return `
        <div class="customer-card" data-customer-id="${customer.customer_id}">
          <div class="customer-header">
            <div class="customer-id">${customer.customer_id}</div>
            <div class="customer-status ${statusClass}">${customer.active ? 'Active' : 'Inactive'}</div>
          </div>
          <div class="customer-info">
            <div class="customer-balance">$${customer.balance?.toLocaleString() || 0}</div>
            <div class="customer-pnl ${pnlClass}">
              ${customer.weekly_pnl >= 0 ? '+' : ''}$${Math.abs(customer.weekly_pnl || 0).toLocaleString()}
            </div>
          </div>
          <div class="customer-actions">
            <button class="btn-small" onclick="managerPortalIntegration.viewCustomer('${customer.customer_id}')">
              View
            </button>
            <button class="btn-small btn-secondary" onclick="managerPortalIntegration.contactCustomer('${customer.customer_id}')">
              Contact
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    if (statusEl) {
      if (connected) {
        statusEl.className = 'connection-status status-connected';
        statusEl.innerHTML = '<i class="fas fa-circle"></i> <span>Connected</span>';
      } else {
        statusEl.className = 'connection-status status-disconnected';
        statusEl.innerHTML = '<i class="fas fa-circle"></i> <span>Disconnected</span>';
      }
    }
  }

  showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px; color: #333;">${title}</div>
      <div style="color: #666; font-size: 14px;">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  refreshAllData() {
    this.showNotification('Refresh', 'Refreshing all data...', 'info');
    this.loadDashboard();
  }

  showAlertsPanel() {
    this.showNotification('Alerts', 'Alerts panel opened', 'info');
  }

  closeAllModals() {
    // Close any open modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.style.display = 'none';
    });
  }

  setupManagerModuleIntegration(moduleName, module) {
    console.log(`Setting up manager portal integration for module: ${moduleName}`);
    
    // Setup module-specific integration
    if (moduleName === 'navigation') {
      this.setupManagerNavigationIntegration(module);
    } else if (moduleName === 'connection') {
      this.setupManagerConnectionIntegration(module);
    } else if (moduleName === 'enhancement') {
      this.setupManagerEnhancementIntegration(module);
    }
  }

  setupManagerNavigationIntegration(module) {
    // Enhanced navigation integration for manager portal
    module.addRoute('/manager', {
      component: 'ManagerPortal',
      title: 'Manager Dashboard',
      requiresAuth: true,
      preload: true,
      guard: (to) => {
        return this.checkManagerAuthentication();
      }
    });
  }

  setupManagerConnectionIntegration(module) {
    // Enhanced connection integration for manager portal
    module.registerComponent('ManagerDashboard', {
      template: this.getManagerDashboardTemplate(),
      data: () => ({
        currentUser: null,
        customers: [],
        statistics: {},
        alerts: [],
        connectionStatus: 'unknown'
      }),
      methods: {
        loadManagerData: this.loadManagerData.bind(this),
        updateConnectionStatus: this.updateConnectionStatus.bind(this)
      }
    });
  }

  setupManagerEnhancementIntegration(module) {
    // Use enhancement features for manager portal
    module.createConnection('manager-portal', 'customer-system', {
      strategy: 'realtime',
      priority: 1
    });
    
    module.createConnection('manager-portal', 'alert-system', {
      strategy: 'realtime',
      priority: 1
    });
    
    module.createConnection('manager-portal', 'analytics-system', {
      strategy: 'batch',
      priority: 2
    });
  }

  checkManagerAuthentication() {
    return this.currentUser && this.authToken;
  }

  loadManagerData() {
    if (this.currentUser) {
      this.loadDashboard();
    }
  }

  getManagerDashboardTemplate() {
    return '<div class="manager-dashboard"><div class="dashboard-header"><h1>Manager Dashboard</h1><div class="connection-status" :class="connectionStatus"><i class="fas fa-circle"></i><span>{{ connectionStatus }}</span></div></div><div class="stats-grid"><div class="stat-card"><div class="stat-header"><div class="stat-title"><i class="fas fa-users"></i>Total Customers</div><div class="stat-icon icon-blue"><i class="fas fa-users"></i></div></div><div class="stat-value">' + (customers.length || 0) + '</div><div class="stat-change"><i class="fas fa-arrow-up"></i><span>' + (statistics.active_customers || 0) + ' active</span></div></div><div class="stat-card"><div class="stat-header"><div class="stat-title"><i class="fas fa-chart-line"></i>Total Volume</div><div class="stat-icon icon-green"><i class="fas fa-chart-line"></i></div></div><div class="stat-value">$' + (statistics.total_volume?.toLocaleString() || 0) + '</div><div class="stat-change"><i class="fas fa-arrow-up"></i><span>' + (statistics.transaction_rate || 0) + '/min</span></div></div><div class="stat-card"><div class="stat-header"><div class="stat-title"><i class="fas fa-exclamation-triangle"></i>Active Alerts</div><div class="stat-icon icon-red"><i class="fas fa-exclamation-triangle"></i></div></div><div class="stat-value">' + (alerts.length || 0) + '</div><div class="stat-change"><i class="fas fa-arrow-down"></i><span>' + (statistics.resolved_alerts || 0) + ' resolved</span></div></div></div><div class="customers-section"><h2>Customer Overview</h2><div class="customers-grid"><div v-for="customer in customers" :key="customer.customer_id" class="customer-card"><div class="customer-header"><div class="customer-id">{{ customer.customer_id }}</div><div class="customer-status" :class="customer.active ? \'status-active\' : \'status-inactive\'">{{ customer.active ? \'Active\' : \'Inactive\' }}</div></div><div class="customer-info"><div class="customer-balance">${{ customer.balance?.toLocaleString() || 0 }}</div><div class="customer-pnl" :class="customer.weekly_pnl >= 0 ? \'pnl-positive\' : \'pnl-negative\'">{{ customer.weekly_pnl >= 0 ? \'+\' : \'\' }}${{ Math.abs(customer.weekly_pnl || 0).toLocaleString() }}</div></div><div class="customer-actions"><button class="btn-small" @click="viewCustomer(customer.customer_id)">View</button><button class="btn-small btn-secondary" @click="contactCustomer(customer.customer_id)">Contact</button></div></div></div></div><div class="alerts-section"><h2>System Alerts</h2><div class="alerts-list"><div v-for="alert in alerts" :key="alert.id" class="alert-item" :class="alert.priority"><div class="alert-header"><span class="alert-type">{{ alert.type }}</span><span class="alert-time">{{ new Date(alert.timestamp).toLocaleString() }}</span></div><div class="alert-message">{{ alert.message }}</div><div class="alert-actions"><button class="btn-small" @click="resolveAlert(alert.id)">Resolve</button><button class="btn-small btn-secondary" @click="acknowledgeAlert(alert.id)">Acknowledge</button></div></div></div></div></div></div>';
  }

  initializeFallback() {
    console.log('Initializing fallback connection system for manager portal');
    
    // Basic functionality without full connection system
    this.setupBasicManagerPortalIntegration();
    this.setupBasicMonitoring();
  }

  setupBasicManagerPortalIntegration() {
    // Basic login handling
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleBasicLogin();
      });
    }
    
    // Basic WebSocket setup
    if (this.authToken) {
      this.setupDirectWebSocket();
    }
  }

  handleBasicLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Basic login logic
    this.fallbackLogin(username, password);
  }

  setupBasicMonitoring() {
    // Basic performance monitoring
    setInterval(() => {
      console.log('Basic health check - manager portal operational');
    }, 30000);
  }

  // Cleanup method
  destroy() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }
    
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.bootstrap) {
      this.bootstrap.destroy();
    }
    
    console.log('Manager portal connection integration destroyed');
  }
}

// Global manager portal connection integration instance
window.ManagerPortalConnectionIntegration = ManagerPortalConnectionIntegration;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.managerPortalIntegration = new ManagerPortalConnectionIntegration();
  });
} else {
  window.managerPortalIntegration = new ManagerPortalConnectionIntegration();
}
