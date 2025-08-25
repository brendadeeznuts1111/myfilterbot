/**
 * Integration Hub - Centralized component integration system
 * Coordinates interactions between different modules and services
 */

class IntegrationHub {
  constructor() {
    this.modules = new Map();
    this.connections = new Map();
    this.eventChannels = new Map();
    this.dataFlows = new Map();
    this.init();
  }

  init() {
    this.setupModuleRegistry();
    this.setupConnectionManager();
    this.setupEventChannels();
    this.setupDataFlows();
    this.setupCrossModuleCommunication();
  }

  setupModuleRegistry() {
    // Register all available modules
    this.registerModule('navigation', {
      instance: new NavigationManager(),
      dependencies: [],
      capabilities: ['route_management', 'navigation_ui', 'history']
    });

    this.registerModule('connection', {
      instance: new ConnectionManager(),
      dependencies: ['navigation'],
      capabilities: ['data_sync', 'event_bus', 'websocket', 'api']
    });

    this.registerModule('component_library', {
      instance: new FantDevComponents(),
      dependencies: ['navigation', 'connection'],
      capabilities: ['ui_components', 'form_validation', 'modal_system']
    });

    this.registerModule('api_client', {
      instance: new EnhancedApiClient(),
      dependencies: ['connection'],
      capabilities: ['http_requests', 'authentication', 'caching']
    });

    this.registerModule('websocket_client', {
      instance: new WebSocketClient(),
      dependencies: ['connection'],
      capabilities: ['real_time', 'subscriptions', 'reconnection']
    });
  }

  setupConnectionManager() {
    // Manage connections between modules
    this.connectionManager = {
      create: (source, target, type = 'data') => {
        const connectionId = `${source}:${target}:${type}`;
        this.connections.set(connectionId, {
          source,
          target,
          type,
          established: true,
          metadata: { createdAt: Date.now() }
        });
        console.log(`Connection established: ${connectionId}`);
        return connectionId;
      },

      remove: (connectionId) => {
        this.connections.delete(connectionId);
        console.log(`Connection removed: ${connectionId}`);
      },

      list: () => Array.from(this.connections.values()),

      get: (connectionId) => this.connections.get(connectionId)
    };
  }

  setupEventChannels() {
    // Create dedicated event channels for different purposes
    this.eventChannels.set('ui', new EventTarget());
    this.eventChannels.set('data', new EventTarget());
    this.eventChannels.set('system', new EventTarget());
    this.eventChannels.set('user', new EventTarget());
  }

  setupDataFlows() {
    // Define data flow patterns between modules
    this.dataFlows.set('market_data', {
      source: 'websocket_client',
      target: ['component_library', 'connection'],
      pattern: 'push',
      frequency: 'real_time'
    });

    this.dataFlows.set('user_session', {
      source: 'api_client',
      target: ['navigation', 'connection'],
      pattern: 'pull',
      frequency: 'session_start'
    });

    this.dataFlows.set('ui_state', {
      source: 'component_library',
      target: ['connection'],
      pattern: 'bidirectional',
      frequency: 'on_change'
    });
  }

  setupCrossModuleCommunication() {
    // Enable communication between modules
    this.crossModuleCommunication = {
      send: (from, to, message) => {
        const toModule = this.modules.get(to);
        if (toModule && toModule.instance) {
          console.log(`Message from ${from} to ${to}:`, message);
          // Implement actual message passing logic
        }
      },

      broadcast: (from, channel, message) => {
        const eventChannel = this.eventChannels.get(channel);
        if (eventChannel) {
          eventChannel.dispatchEvent(new CustomEvent(from, { detail: message }));
        }
      },

      subscribe: (module, channel, callback) => {
        const eventChannel = this.eventChannels.get(channel);
        if (eventChannel) {
          eventChannel.addEventListener(module, callback);
          return () => eventChannel.removeEventListener(module, callback);
        }
      }
    };
  }

  registerModule(name, config) {
    this.modules.set(name, {
      ...config,
      registeredAt: Date.now(),
      status: 'active'
    });

    console.log(`Module registered: ${name}`);
    this.crossModuleCommunication.broadcast('system', 'system', {
      type: 'module_registered',
      module: name
    });
  }

  getModule(name) {
    return this.modules.get(name);
  }

  getAvailableModules() {
    return Array.from(this.modules.keys());
  }

  getModuleCapabilities() {
    const capabilities = {};
    this.modules.forEach((module, name) => {
      capabilities[name] = module.capabilities;
    });
    return capabilities;
  }

  // Integration methods
  integrateModules(modules) {
    const integrationId = `integration_${Date.now()}`;
    
    modules.forEach(source => {
      modules.forEach(target => {
        if (source !== target) {
          this.connectionManager.create(source, target);
        }
      });
    });

    return integrationId;
  }

  createDataFlow(source, targets, options = {}) {
    const flowId = `flow_${Date.now()}`;
    this.dataFlows.set(flowId, {
      source,
      targets,
      ...options
    });

    // Establish connections
    targets.forEach(target => {
      this.connectionManager.create(source, target, 'data');
    });

    return flowId;
  }

  setupEventBridge(fromChannel, toChannel, filter = null) {
    const bridgeId = `bridge_${Date.now()}`;
    
    const bridge = (event) => {
      if (!filter || filter(event.detail)) {
        this.eventChannels.get(toChannel).dispatchEvent(
          new CustomEvent(fromChannel, { detail: event.detail })
        );
      }
    };

    this.eventChannels.get(fromChannel).addEventListener('message', bridge);
    
    return bridgeId;
  }

  // Monitoring and debugging
  getIntegrationStatus() {
    return {
      modules: this.modules.size,
      connections: this.connections.size,
      eventChannels: this.eventChannels.size,
      dataFlows: this.dataFlows.size,
      lastUpdate: Date.now()
    };
  }

  getModuleHealth() {
    const health = {};
    this.modules.forEach((module, name) => {
      health[name] = {
        status: module.status,
        dependencies: module.dependencies,
        capabilities: module.capabilities,
        uptime: Date.now() - module.registeredAt
      };
    });
    return health;
  }

  // Utility methods
  findModulesByCapability(capability) {
    return Array.from(this.modules.entries())
      .filter(([_, module]) => module.capabilities.includes(capability))
      .map(([name]) => name);
  }

  getDependenciesForModule(moduleName) {
    const module = this.modules.get(moduleName);
    return module ? module.dependencies : [];
  }

  resolveDependencyGraph() {
    const graph = {};
    this.modules.forEach((module, name) => {
      graph[name] = module.dependencies;
    });
    return graph;
  }

  // Performance optimization
  optimizeConnections() {
    // Analyze and optimize module connections
    console.log('Optimizing module connections...');
    
    // Remove unused connections
    this.connections.forEach((connection, id) => {
      const sourceModule = this.modules.get(connection.source);
      const targetModule = this.modules.get(connection.target);
      
      if (!sourceModule || !targetModule) {
        this.connectionManager.remove(id);
      }
    });

    // Optimize data flows
    this.dataFlows.forEach((flow, id) => {
      const sourceModule = this.modules.get(flow.source);
      if (!sourceModule) {
        this.dataFlows.delete(id);
      }
    });
  }

  // Error handling and recovery
  handleModuleError(moduleName, error) {
    console.error(`Module error in ${moduleName}:`, error);
    
    const module = this.modules.get(moduleName);
    if (module) {
      module.status = 'error';
      
      // Attempt recovery
      this.attemptModuleRecovery(moduleName);
    }
  }

  async attemptModuleRecovery(moduleName) {
    console.log(`Attempting recovery for module: ${moduleName}`);
    
    try {
      // Reinitialize module
      const moduleConfig = this.modules.get(moduleName);
      if (moduleConfig) {
        this.modules.delete(moduleName);
        this.registerModule(moduleName, moduleConfig);
      }
    } catch (error) {
      console.error(`Recovery failed for ${moduleName}:`, error);
    }
  }
}

// Global integration hub instance
window.IntegrationHub = IntegrationHub;
