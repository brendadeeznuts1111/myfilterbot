/**
 * Connection Bootstrap - Initialization and setup for connection systems
 * Provides unified initialization and configuration for all connection components
 */

class ConnectionBootstrap {
  constructor() {
    this.systems = new Map();
    this.config = new Map();
    this.initialized = false;
    this.init();
  }

  init() {
    this.loadConfiguration();
    this.initializeSystems();
    this.setupIntegration();
    this.startMonitoring();
  }

  loadConfiguration() {
    // Load default configuration
    this.config.set('navigation', {
      enable: true,
      routes: {
        dashboard: '/dashboard/modern-optimized.html',
        admin: '/portals/admin-portal.html',
        customer: '/portals/customer-portal.html',
        miniapp: '/miniapp/index.html'
      },
      history: {
        maxEntries: 50,
        persist: true
      }
    });

    this.config.set('connection', {
      enable: true,
      websocket: {
        url: 'wss://api.fantdev.com/ws',
        autoConnect: true,
        reconnect: true,
        maxRetries: 5
      },
      api: {
        baseURL: 'https://api.fantdev.com',
        timeout: 10000,
        retries: 3
      }
    });

    this.config.set('integration', {
      enable: true,
      modules: [
        'navigation',
        'connection',
        'component_library',
        'api_client',
        'websocket_client'
      ],
      dataFlows: {
        market_data: {
          source: 'websocket_client',
          targets: ['component_library', 'connection'],
          pattern: 'push',
          frequency: 'real_time'
        },
        user_session: {
          source: 'api_client',
          targets: ['navigation', 'connection'],
          pattern: 'pull',
          frequency: 'session_start'
        }
      }
    });

    this.config.set('enhancement', {
      enable: true,
      strategies: {
        realtime: {
          priority: 1,
          latency: 'low',
          reliability: 'high'
        },
        batch: {
          priority: 2,
          latency: 'medium',
          reliability: 'medium'
        },
        lazy: {
          priority: 3,
          latency: 'high',
          reliability: 'low'
        }
      },
      errorHandlers: {
        retry: {
          maxRetries: 3,
          delay: 1000,
          backoff: 2
        },
        circuit_breaker: {
          threshold: 5,
          timeout: 30000
        }
      }
    });
  }

  initializeSystems() {
    // Initialize all connection systems
    if (this.config.get('navigation').enable) {
      this.systems.set('navigation', new NavigationManager());
    }

    if (this.config.get('connection').enable) {
      this.systems.set('connection', new ConnectionManager());
    }

    if (this.config.get('integration').enable) {
      this.systems.set('integration', new IntegrationHub());
    }

    if (this.config.get('enhancement').enable) {
      this.systems.set('enhancement', new ConnectionEnhancement());
    }

    // Initialize unified connector
    this.systems.set('unified', new UnifiedConnector());
  }

  setupIntegration() {
    // Setup integration between systems
    const unified = this.systems.get('unified');
    
    if (unified && this.systems.get('navigation')) {
      unified.navigationManager = this.systems.get('navigation');
    }

    if (unified && this.systems.get('connection')) {
      unified.connectionManager = this.systems.get('connection');
    }

    if (unified && this.systems.get('integration')) {
      unified.integrationHub = this.systems.get('integration');
    }

    if (unified && this.systems.get('enhancement')) {
      unified.enhancement = this.systems.get('enhancement');
    }

    // Setup cross-system communication
    this.setupCrossSystemCommunication();
  }

  setupCrossSystemCommunication() {
    const unified = this.systems.get('unified');
    
    if (!unified) return;

    // Setup navigation -> connection bridge
    if (this.systems.get('navigation') && this.systems.get('connection')) {
      const navigation = this.systems.get('navigation');
      const connection = this.systems.get('connection');
      
      navigation.addObserver((event, data) => {
        connection.syncData({
          key: 'navigation_state',
          value: data,
          source: 'navigation'
        });
      });
    }

    // Setup connection -> integration bridge
    if (this.systems.get('connection') && this.systems.get('integration')) {
      const connection = this.systems.get('connection');
      const integration = this.systems.get('integration');
      
      connection.eventBus.addEventListener('data:updated', (event) => {
        integration.crossModuleCommunication.broadcast(
          'connection_event',
          'system',
          event.detail
        );
      });
    }

    // Setup integration -> enhancement bridge
    if (this.systems.get('integration') && this.systems.get('enhancement')) {
      const integration = this.systems.get('integration');
      const enhancement = this.systems.get('enhancement');
      
      integration.modules.forEach((module, name) => {
        if (module.capabilities.includes('data_processing')) {
          // Setup data processing through enhancement
          console.log(`Setting up enhancement for module: ${name}`);
        }
      });
    }
  }

  startMonitoring() {
    // Start system monitoring
    this.monitoring = {
      interval: setInterval(() => {
        this.checkSystemHealth();
        this.logSystemStatus();
        this.optimizePerformance();
      }, 30000),
      
      metrics: {
        startTime: Date.now(),
        healthChecks: 0,
        errors: 0,
        lastOptimization: Date.now()
      }
    };
  }

  checkSystemHealth() {
    const health = {};
    
    this.systems.forEach((system, name) => {
      try {
        if (system && typeof system.getStatus === 'function') {
          health[name] = system.getStatus();
        } else if (system && system.constructor) {
          health[name] = {
            status: 'active',
            type: system.constructor.name,
            uptime: Date.now() - (system.registeredAt || Date.now())
          };
        } else {
          health[name] = { status: 'unknown' };
        }
      } catch (error) {
        health[name] = { status: 'error', error: error.message };
        this.monitoring.metrics.errors++;
      }
    });

    this.monitoring.metrics.healthChecks++;
    console.log('System Health Check:', health);
    
    return health;
  }

  logSystemStatus() {
    const status = {};
    
    this.systems.forEach((system, name) => {
      try {
        if (system && typeof system.getStatus === 'function') {
          status[name] = system.getStatus();
        } else {
          status[name] = { status: 'active' };
        }
      } catch (error) {
        status[name] = { status: 'error', error: error.message };
      }
    });

    console.log('System Status:', status);
  }

  optimizePerformance() {
    const now = Date.now();
    
    // Optimize every 5 minutes
    if (now - this.monitoring.metrics.lastOptimization < 300000) {
      return;
    }

    console.log('Optimizing system performance...');
    
    // Optimize connections
    if (this.systems.get('enhancement')) {
      this.systems.get('enhancement').getConnectionPool();
    }

    // Optimize data flows
    if (this.systems.get('integration')) {
      this.systems.get('integration').optimizeConnections();
    }

    this.monitoring.metrics.lastOptimization = now;
  }

  // Public API methods
  initialize() {
    if (this.initialized) {
      console.warn('Connection systems already initialized');
      return;
    }

    try {
      this.init();
      this.initialized = true;
      console.log('Connection systems initialized successfully');
    } catch (error) {
      console.error('Failed to initialize connection systems:', error);
      throw error;
    }
  }

  getSystem(name) {
    return this.systems.get(name);
  }

  getAllSystems() {
    return new Map(this.systems);
  }

  getStatus() {
    return {
      initialized: this.initialized,
      systems: Array.from(this.systems.keys()),
      config: new Map(this.config),
      metrics: {
        uptime: Date.now() - this.monitoring.startTime,
        healthChecks: this.monitoring.metrics.healthChecks,
        errors: this.monitoring.metrics.errors
      }
    };
  }

  updateConfig(system, updates) {
    if (this.config.has(system)) {
      this.config.set(system, { ...this.config.get(system), ...updates });
      console.log(`Configuration updated for system: ${system}`);
    } else {
      console.warn(`Unknown system: ${system}`);
    }
  }

  getConfig(system) {
    return this.config.get(system);
  }

  // Cleanup method
  destroy() {
    if (this.monitoring.interval) {
      clearInterval(this.monitoring.interval);
    }

    // Destroy all systems
    this.systems.forEach((system, name) => {
      try {
        if (system && typeof system.destroy === 'function') {
          system.destroy();
        }
      } catch (error) {
        console.error(`Error destroying system ${name}:`, error);
      }
    });

    this.systems.clear();
    this.config.clear();
    this.initialized = false;
    
    console.log('Connection systems destroyed');
  }
}

// Global bootstrap instance
window.ConnectionBootstrap = ConnectionBootstrap;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.connectionBootstrap = new ConnectionBootstrap();
    window.connectionBootstrap.initialize();
  });
} else {
  window.connectionBootstrap = new ConnectionBootstrap();
  window.connectionBootstrap.initialize();
}
