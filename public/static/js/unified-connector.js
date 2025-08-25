/**
 * Unified Connector - Master connection orchestrator
 * Coordinates all connection systems and provides unified interface
 */

class UnifiedConnector {
  constructor() {
    this.navigationManager = null;
    this.connectionManager = null;
    this.integrationHub = null;
    this.eventSystem = null;
    this.dataPipeline = null;
    this.init();
  }

  init() {
    this.initializeCoreSystems();
    this.setupEventBridges();
    this.setupDataPipelines();
    this.setupCommunicationProtocols();
    this.startMonitoring();
  }

  initializeCoreSystems() {
    // Initialize all core connection systems
    this.navigationManager = new NavigationManager();
    this.connectionManager = new ConnectionManager();
    this.integrationHub = new IntegrationHub();
    
    // Setup event system
    this.eventSystem = new EventTarget();
    
    // Setup data pipeline
    this.dataPipeline = {
      queue: [],
      processing: false,
      maxQueueSize: 100,
      processInterval: 100
    };
  }

  setupEventBridges() {
    // Create bridges between different event systems
    this.eventBridges = {
      navigationToConnection: (event) => {
        this.connectionManager.notifySubscribers('navigation_event', event.detail);
      },
      
      connectionToIntegration: (event) => {
        this.integrationHub.crossModuleCommunication.broadcast(
          'connection_event', 
          'system', 
          event.detail
        );
      },
      
      integrationToUI: (event) => {
        this.eventSystem.dispatchEvent(new CustomEvent('ui_update', {
          detail: event.detail
        }));
      }
    };

    // Setup event listeners
    this.navigationManager.addObserver(this.eventBridges.navigationToConnection);
    this.connectionManager.eventBus.addEventListener('data:updated', this.eventBridges.connectionToIntegration);
    this.integrationHub.eventChannels.get('system').addEventListener('module_registered', this.eventBridges.integrationToUI);
  }

  setupDataPipelines() {
    // Create unified data processing pipeline
    this.dataPipeline = {
      queue: [],
      processing: false,
      maxQueueSize: 100,
      processInterval: 100,
      
      add: (data) => {
        if (this.dataPipeline.queue.length < this.dataPipeline.maxQueueSize) {
          this.dataPipeline.queue.push({
            ...data,
            timestamp: Date.now(),
            id: `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          });
          this.processQueue();
        }
      },
      
      process: async () => {
        if (this.dataPipeline.processing || this.dataPipeline.queue.length === 0) {
          return;
        }
        
        this.dataPipeline.processing = true;
        
        while (this.dataPipeline.queue.length > 0) {
          const data = this.dataPipeline.queue.shift();
          await this.processDataItem(data);
        }
        
        this.dataPipeline.processing = false;
      },
      
      processDataItem: async (data) => {
        const { type, source, target, payload } = data;
        
        switch (type) {
          case 'navigation':
            await this.handleNavigationData(source, target, payload);
            break;
          
          case 'connection':
            await this.handleConnectionData(source, target, payload);
            break;
          
          case 'integration':
            await this.handleIntegrationData(source, target, payload);
            break;
          
          default:
            console.warn('Unknown data type:', type);
        }
      },
      
      handleNavigationData: async (source, target, payload) => {
        // Process navigation data through all systems
        this.connectionManager.syncData({
          key: 'navigation_state',
          value: payload,
          source: 'navigation'
        });
        
        this.integrationHub.crossModuleCommunication.broadcast(
          'navigation_data',
          'data',
          payload
        );
      },
      
      handleConnectionData: async (source, target, payload) => {
        // Process connection data
        this.connectionManager.syncData({
          key: 'connection_state',
          value: payload,
          source: 'connection'
        });
        
        this.integrationHub.crossModuleCommunication.broadcast(
          'connection_data',
          'system',
          payload
        );
      },
      
      handleIntegrationData: async (source, target, payload) => {
        // Process integration data
        this.integrationHub.modules.forEach((module, name) => {
          if (module.capabilities.includes('data_processing')) {
            // Process through module
            console.log(`Processing data through module: ${name}`);
          }
        });
      }
    };
  }

  setupCommunicationProtocols() {
    // Define communication protocols between systems
    this.protocols = {
      // Navigation protocols
      navigation: {
        route_change: (data) => {
          this.dataPipeline.add({
            type: 'navigation',
            source: 'navigation_manager',
            target: 'all',
            payload: data
          });
        },
        
        history_update: (data) => {
          this.dataPipeline.add({
            type: 'navigation',
            source: 'navigation_manager',
            target: 'connection_manager',
            payload: data
          });
        }
      },
      
      // Connection protocols
      connection: {
        data_sync: (data) => {
          this.dataPipeline.add({
            type: 'connection',
            source: 'connection_manager',
            target: 'integration_hub',
            payload: data
          });
        },
        
        event_broadcast: (data) => {
          this.dataPipeline.add({
            type: 'connection',
            source: 'connection_manager',
            target: 'all',
            payload: data
          });
        }
      },
      
      // Integration protocols
      integration: {
        module_register: (data) => {
          this.dataPipeline.add({
            type: 'integration',
            source: 'integration_hub',
            target: 'all',
            payload: data
          });
        },
        
        data_flow: (data) => {
          this.dataPipeline.add({
            type: 'integration',
            source: 'integration_hub',
            target: 'connection_manager',
            payload: data
          });
        }
      }
    };
  }

  startMonitoring() {
    // Start system monitoring
    this.monitoring = {
      interval: setInterval(() => {
        this.checkSystemHealth();
        this.optimizePerformance();
      }, 30000),
      
      metrics: {
        startTime: Date.now(),
        dataProcessed: 0,
        errors: 0,
        lastCheck: Date.now()
      }
    };
  }

  checkSystemHealth() {
    // Check health of all connected systems
    const health = {
      navigation: this.navigationManager ? 'active' : 'inactive',
      connection: this.connectionManager ? 'active' : 'inactive',
      integration: this.integrationHub ? 'active' : 'inactive',
      dataPipeline: this.dataPipeline.processing ? 'processing' : 'idle'
    };
    
    // Log health status
    console.log('System Health Check:', health);
    
    // Check for issues
    Object.entries(health).forEach(([system, status]) => {
      if (status === 'inactive') {
        console.warn(`System ${system} is inactive`);
      }
    });
  }

  optimizePerformance() {
    // Optimize performance based on usage patterns
    const status = this.getIntegrationStatus();
    
    // Optimize data pipeline
    if (status.dataQueue > 50) {
      this.dataPipeline.processInterval = 50; // Process faster
    } else if (status.dataQueue < 10) {
      this.dataPipeline.processInterval = 200; // Process slower
    }
    
    // Optimize connections
    this.integrationHub.optimizeConnections();
  }

  // Public API methods
  connect(source, target, type = 'data') {
    // Create connection between systems
    if (this.integrationHub) {
      return this.integrationHub.connectionManager.create(source, target, type);
    }
    return null;
  }

  send(source, target, message) {
    // Send message between systems
    if (this.integrationHub) {
      this.integrationHub.crossModuleCommunication.send(source, target, message);
    }
  }

  broadcast(source, channel, message) {
    // Broadcast message to all systems
    if (this.integrationHub) {
      this.integrationHub.crossModuleCommunication.broadcast(source, channel, message);
    }
  }

  subscribe(channel, callback) {
    // Subscribe to system events
    if (this.integrationHub) {
      return this.integrationHub.crossModuleCommunication.subscribe('unified', channel, callback);
    }
    return null;
  }

  getStatus() {
    // Get unified system status
    return {
      navigation: this.navigationManager?.getCurrentRoute(),
      connection: this.connectionManager?.getConnectionStatus(),
      integration: this.integrationHub?.getIntegrationStatus(),
      dataPipeline: {
        queueSize: this.dataPipeline.queue.length,
        processing: this.dataPipeline.processing,
        processInterval: this.dataPipeline.processInterval
      },
      monitoring: {
        uptime: Date.now() - this.monitoring.startTime,
        dataProcessed: this.monitoring.metrics.dataProcessed,
        errors: this.monitoring.metrics.errors
      }
    };
  }

  getIntegrationStatus() {
    // Get detailed integration status
    if (this.integrationHub) {
      return {
        modules: this.integrationHub.getAvailableModules(),
        connections: this.integrationHub.connectionManager.list(),
        dataFlows: Array.from(this.integrationHub.dataFlows.entries()),
        health: this.integrationHub.getModuleHealth()
      };
    }
    return null;
  }

  // Error handling
  handleError(error, context) {
    console.error('Unified Connector Error:', error, context);
    
    this.monitoring.metrics.errors++;
    
    // Attempt recovery
    if (this.integrationHub) {
      this.integrationHub.handleModuleError('unified_connector', error);
    }
  }

  // Cleanup
  destroy() {
    // Clean up all systems
    if (this.monitoring.interval) {
      clearInterval(this.monitoring.interval);
    }
    
    if (this.dataPipeline) {
      this.dataPipeline.queue = [];
      this.dataPipeline.processing = false;
    }
    
    console.log('Unified Connector destroyed');
  }
}

// Global unified connector instance
window.UnifiedConnector = UnifiedConnector;
