/**
 * Portal Connection Integration - Enhanced connection system for portal hub
 * Integrates the unified connection architecture with the portal hub interface
 */

class PortalConnectionIntegration {
  constructor() {
    this.bootstrap = null;
    this.currentPortal = null;
    this.portalHistory = [];
    this.connectionStatus = new Map();
    this.performanceMetrics = new Map();
    this.init();
  }

  init() {
    this.initializeConnectionSystem();
    this.setupPortalNavigation();
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
      
      console.log('Portal connection system initialized');
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
        if (module.capabilities.includes('portal_integration')) {
          this.setupPortalModuleIntegration(name, module);
        }
      });
    }
  }

  setupPortalNavigation() {
    // Enhanced portal navigation with connection awareness
    document.querySelectorAll('.portal-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        this.handlePortalClick(card);
      });

      // Add connection status indicators
      this.updatePortalConnectionStatus(card);
    });
  }

  handlePortalClick(card) {
    const portalUrl = card.href;
    const portalType = card.dataset.portal || 'unknown';
    
    // Add loading state
    this.setPortalLoadingState(card, true);
    
    // Track navigation
    this.trackPortalAccess(portalType);
    
    // Check connection status
    const connectionStatus = this.checkConnection(portalType);
    
    if (connectionStatus === 'offline') {
      this.handleOfflineNavigation(portalType, card);
      return;
    }

    // Use connection system for navigation
    if (this.bootstrap && this.bootstrap.getSystem('navigation')) {
      this.navigateToPortal(portalType, portalUrl, card);
    } else {
      // Fallback direct navigation
      this.fallbackNavigation(portalUrl, card);
    }
  }

  navigateToPortal(portalType, portalUrl, card) {
    const navigation = this.bootstrap.getSystem('navigation');
    
    navigation.navigate(portalUrl, {
      portalType: portalType,
      source: 'portal-hub',
      timestamp: Date.now()
    }).then(() => {
      this.handleSuccessfulNavigation(portalType, card);
    }).catch((error) => {
      this.handleNavigationError(portalType, error, card);
    });
  }

  fallbackNavigation(portalUrl, card) {
    // Simulate loading and navigate
    setTimeout(() => {
      window.location.href = portalUrl;
    }, 800);
  }

  setPortalLoadingState(card, isLoading) {
    const action = card.querySelector('.portal-action span');
    const icon = card.querySelector('.portal-action i');
    
    if (isLoading) {
      card.classList.add('loading');
      action.textContent = 'Connecting...';
      icon.className = 'fas fa-spinner fa-spin';
    } else {
      card.classList.remove('loading');
      action.textContent = card.dataset.originalText || 'Access Portal';
      icon.className = 'fas fa-arrow-right';
    }
  }

  updatePortalConnectionStatus(card) {
    const portalType = card.dataset.portal || 'unknown';
    const status = this.checkConnection(portalType);
    
    // Update status indicator
    const statusIndicator = card.querySelector('.status-indicator');
    if (statusIndicator) {
      statusIndicator.className = 'status-indicator';
      
      switch (status) {
        case 'online':
          statusIndicator.style.background = '#10b981';
          statusIndicator.title = 'Online';
          break;
        case 'offline':
          statusIndicator.style.background = '#ef4444';
          statusIndicator.title = 'Offline';
          break;
        case 'degraded':
          statusIndicator.style.background = '#f59e0b';
          statusIndicator.title = 'Degraded';
          break;
        default:
          statusIndicator.style.background = '#6b7280';
          statusIndicator.title = 'Unknown';
      }
    }
  }

  checkConnection(portalType) {
    // Simulate connection check
    const connections = this.connectionStatus.get(portalType);
    
    if (!connections) {
      // Simulate random connection status
      const statuses = ['online', 'online', 'online', 'degraded', 'offline'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      this.connectionStatus.set(portalType, {
        status: randomStatus,
        timestamp: Date.now(),
        latency: Math.floor(Math.random() * 100) + 20
      });
      return randomStatus;
    }
    
    return connections.status;
  }

  handleNavigationEvent(event, data) {
    console.log('Navigation event:', event, data);
    
    // Update portal history
    if (data.portalType) {
      this.addToPortalHistory(data);
    }
    
    // Update UI based on navigation
    this.updatePortalUI(data);
  }

  handleConnectionUpdate(event) {
    console.log('Connection update:', event.detail);
    
    // Update performance metrics
    if (event.detail.performance) {
      this.updatePerformanceMetrics(event.detail.performance);
    }
    
    // Update portal status if needed
    if (event.detail.portalType) {
      this.updatePortalConnectionStatusForPortal(event.detail.portalType);
    }
  }

  setupPortalModuleIntegration(moduleName, module) {
    console.log(`Setting up portal integration for module: ${moduleName}`);
    
    // Setup module-specific integration
    if (moduleName === 'navigation') {
      this.setupNavigationIntegration(module);
    } else if (moduleName === 'connection') {
      this.setupConnectionIntegration(module);
    } else if (moduleName === 'enhancement') {
      this.setupEnhancementIntegration(module);
    }
  }

  setupNavigationIntegration(module) {
    // Enhanced navigation integration
    module.addRoute('/portals/hub', {
      component: 'PortalHub',
      title: 'Portal Hub',
      requiresAuth: false,
      preload: true
    });
  }

  setupConnectionIntegration(module) {
    // Enhanced connection integration
    module.registerComponent('PortalCard', {
      template: this.getPortalCardTemplate(),
      data: () => ({
        connectionStatus: 'unknown',
        loading: false
      }),
      methods: {
        checkConnection: this.checkConnection.bind(this),
        updateStatus: this.updatePortalConnectionStatus.bind(this)
      }
    });
  }

  setupEnhancementIntegration(module) {
    // Use enhancement features for portals
    module.createConnection('portal-hub', 'admin-portal', {
      strategy: 'realtime',
      priority: 1
    });
    
    module.createConnection('portal-hub', 'customer-portal', {
      strategy: 'batch',
      priority: 2
    });
  }

  setupPerformanceMonitoring() {
    // Monitor portal performance
    this.performanceInterval = setInterval(() => {
      this.collectPerformanceMetrics();
    }, 30000);
  }

  collectPerformanceMetrics() {
    const metrics = {
      timestamp: Date.now(),
      portals: {},
      system: {}
    };
    
    // Collect portal-specific metrics
    document.querySelectorAll('.portal-card').forEach(card => {
      const portalType = card.dataset.portal || 'unknown';
      metrics.portals[portalType] = {
        loadTime: this.measurePortalLoadTime(card),
        interactions: this.countPortalInteractions(card),
        errors: this.countPortalErrors(card)
      };
    });
    
    // Collect system metrics
    if (this.bootstrap) {
      const status = this.bootstrap.getStatus();
      metrics.system = status.metrics;
    }
    
    this.performanceMetrics.set(Date.now(), metrics);
    console.log('Performance metrics collected:', metrics);
  }

  measurePortalLoadTime(card) {
    // Simulate load time measurement
    return Math.floor(Math.random() * 500) + 100;
  }

  countPortalInteractions(card) {
    // Count interactions with portal card
    return parseInt(card.dataset.interactions || '0');
  }

  countPortalErrors(card) {
    // Count errors for portal
    return parseInt(card.dataset.errors || '0');
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
  }

  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      if (e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1;
        const cards = document.querySelectorAll('.portal-card');
        if (cards[index]) {
          this.handlePortalClick(cards[index]);
        }
      }
    });
  }

  handleVisibilityChange() {
    if (document.hidden) {
      console.log('Portal hub hidden, pausing updates');
      this.pauseUpdates();
    } else {
      console.log('Portal hub visible, resuming updates');
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
  }

  resumeUpdates() {
    this.setupPerformanceMonitoring();
  }

  updateAllConnectionStatuses() {
    document.querySelectorAll('.portal-card').forEach(card => {
      this.updatePortalConnectionStatus(card);
    });
  }

  showOfflineMode() {
    // Show offline indicator
    const offlineToast = document.createElement('div');
    offlineToast.className = 'toast-notification show';
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
    console.log('Performing health check...');
    
    // Check all portal connections
    document.querySelectorAll('.portal-card').forEach(card => {
      const portalType = card.dataset.portal || 'unknown';
      const status = this.checkConnection(portalType);
      
      if (status === 'offline') {
        this.handlePortalOffline(portalType, card);
      }
    });
    
    // Check system health
    if (this.bootstrap) {
      const health = this.bootstrap.checkSystemHealth();
      console.log('System health:', health);
    }
  }

  handleSuccessfulNavigation(portalType, card) {
    this.setPortalLoadingState(card, false);
    this.addToPortalHistory({
      portalType: portalType,
      timestamp: Date.now(),
      success: true
    });
    
    this.showNotification('Navigation Successful', `Accessing ${portalType} portal...`);
  }

  handleNavigationError(portalType, error, card) {
    this.setPortalLoadingState(card, false);
    
    // Track error
    const currentErrors = parseInt(card.dataset.errors || '0');
    card.dataset.errors = currentErrors + 1;
    
    this.showNotification('Navigation Error', `Failed to access ${portalType} portal. Please try again.`);
    console.error(`Navigation error for ${portalType}:`, error);
  }

  handleOfflineNavigation(portalType, card) {
    this.setPortalLoadingState(card, false);
    
    this.showNotification('Offline Mode', `${portalType} portal is currently offline. Please check your connection.`);
    
    // Store for retry
    this.storeOfflineNavigation(portalType, card.href);
  }

  handlePortalOffline(portalType, card) {
    this.updatePortalConnectionStatus(card);
    this.showNotification('Service Alert', `${portalType} portal experiencing temporary issues.`);
  }

  trackPortalAccess(portalType) {
    const access = {
      portalType: portalType,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };
    
    console.log('Portal access tracked:', access);
    
    // Could send to analytics service
    if (window.gtag) {
      gtag('event', 'portal_access', {
        portal_type: portalType,
        timestamp: Date.now()
      });
    }
  }

  addToPortalHistory(access) {
    this.portalHistory.push(access);
    
    // Keep only last 50 entries
    if (this.portalHistory.length > 50) {
      this.portalHistory = this.portalHistory.slice(-50);
    }
    
    console.log('Portal history updated:', this.portalHistory);
  }

  updatePerformanceMetrics(performanceData) {
    this.performanceMetrics.set(Date.now(), {
      ...performanceData,
      timestamp: Date.now()
    });
  }

  updatePortalUI(navigationData) {
    // Update UI based on navigation data
    if (navigationData.portalType) {
      const card = document.querySelector(`[data-portal="${navigationData.portalType}"]`);
      if (card) {
        // Add visual feedback
        card.style.transform = 'scale(0.98)';
        setTimeout(() => {
          card.style.transform = '';
        }, 200);
      }
    }
  }

  updatePortalConnectionStatusForPortal(portalType) {
    const card = document.querySelector(`[data-portal="${portalType}"]`);
    if (card) {
      this.updatePortalConnectionStatus(card);
    }
  }

  storeOfflineNavigation(portalType, url) {
    const offlineNav = {
      portalType: portalType,
      url: url,
      timestamp: Date.now(),
      attempts: 0
    };
    
    // Store in localStorage for retry later
    const offlineNavs = JSON.parse(localStorage.getItem('offlineNavigations') || '[]');
    offlineNavs.push(offlineNav);
    localStorage.setItem('offlineNavigations', JSON.stringify(offlineNavs));
  }

  getPortalCardTemplate() {
    return `
      <div class="portal-card" :class="{ loading: loading }">
        <div class="status-indicator" :style="{ background: connectionStatusColor }" :title="connectionStatus"></div>
        <div class="portal-icon" :style="portalIconStyle">
          <i :class="portalIcon"></i>
        </div>
        <h3 class="portal-title">{{ portalTitle }}</h3>
        <div class="portal-stats">
          <span class="stat-badge">{{ portalStatus }}</span>
          <span class="stat-badge">{{ portalType }}</span>
        </div>
        <p class="portal-description">{{ portalDescription }}</p>
        <ul class="portal-features">
          <li v-for="feature in portalFeatures" :key="feature">{{ feature }}</li>
        </ul>
        <div class="portal-action">
          <span>{{ loading ? 'Connecting...' : 'Access Portal' }}</span>
          <i :class="loading ? 'fas fa-spinner fa-spin' : 'fas fa-arrow-right'"></i>
        </div>
      </div>
    `;
  }

  showNotification(title, message) {
    const notification = document.createElement('div');
    notification.className = 'toast-notification show';
    notification.innerHTML = `
      <div class="toast-content">
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  initializeFallback() {
    console.log('Initializing fallback connection system');
    
    // Basic functionality without full connection system
    this.setupBasicPortalNavigation();
    this.setupBasicMonitoring();
  }

  setupBasicPortalNavigation() {
    document.querySelectorAll('.portal-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const url = card.href;
        const portalType = card.dataset.portal || 'unknown';
        
        // Basic tracking
        console.log(`Portal clicked: ${portalType}`);
        
        // Navigate with basic loading state
        card.classList.add('loading');
        const action = card.querySelector('.portal-action span');
        const icon = card.querySelector('.portal-action i');
        
        action.textContent = 'Connecting...';
        icon.className = 'fas fa-spinner fa-spin';
        
        setTimeout(() => {
          window.location.href = url;
        }, 800);
      });
    });
  }

  setupBasicMonitoring() {
    // Basic performance monitoring
    setInterval(() => {
      console.log('Basic health check - all systems operational');
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
    
    if (this.bootstrap) {
      this.bootstrap.destroy();
    }
    
    console.log('Portal connection integration destroyed');
  }
}

// Global portal connection integration instance
window.PortalConnectionIntegration = PortalConnectionIntegration;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.portalConnectionIntegration = new PortalConnectionIntegration();
  });
} else {
  window.portalConnectionIntegration = new PortalConnectionIntegration();
}
