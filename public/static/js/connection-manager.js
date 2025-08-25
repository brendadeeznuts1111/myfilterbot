/**
 * Connection Manager - Centralized component communication system
 * Manages data synchronization, event propagation, and state sharing
 */

class ConnectionManager {
  constructor() {
    this.components = new Map();
    this.eventBus = new EventTarget();
    this.dataStore = new Map();
    this.subscribers = new Map();
    this.init();
  }

  init() {
    this.setupEventSystem();
    this.setupDataSynchronization();
    this.setupWebSocketIntegration();
    this.setupAPIIntegration();
  }

  setupEventSystem() {
    // Global event system for component communication
    this.eventBus.addEventListener('component:register', (e) => {
      this.registerComponent(e.detail);
    });

    this.eventBus.addEventListener('component:unregister', (e) => {
      this.unregisterComponent(e.detail);
    });

    this.eventBus.addEventListener('data:sync', (e) => {
      this.syncData(e.detail);
    });

    this.eventBus.addEventListener('event:broadcast', (e) => {
      this.broadcastEvent(e.detail);
    });
  }

  setupDataSynchronization() {
    // Real-time data synchronization between components
    setInterval(() => {
      this.checkDataUpdates();
    }, 1000);
  }

  setupWebSocketIntegration() {
    // WebSocket integration for real-time updates
    if (window.WebSocketClient) {
      this.wsClient = new WebSocketClient({
        url: 'wss://api.fantdev.com/ws',
        autoConnect: true
      });

      this.wsClient.on('message', (data) => {
        this.handleWebSocketMessage(data);
      });
    }
  }

  setupAPIIntegration() {
    // API integration for data fetching
    if (window.EnhancedApiClient) {
      this.apiClient = new EnhancedApiClient({
        baseURL: 'https://api.fantdev.com',
        timeout: 10000
      });
    }
  }

  registerComponent(component) {
    const { id, type, data } = component;
    this.components.set(id, {
      id,
      type,
      data,
      registeredAt: Date.now(),
      lastUpdate: Date.now()
    });

    console.log(`Component registered: ${id} (${type})`);
    this.notifySubscribers('component:registered', component);
  }

  unregisterComponent(componentId) {
    const component = this.components.get(componentId);
    if (component) {
      this.components.delete(componentId);
      console.log(`Component unregistered: ${componentId}`);
      this.notifySubscribers('component:unregistered', { id: componentId });
    }
  }

  syncData(data) {
    const { key, value, source, timestamp } = data;
    
    // Store data with metadata
    this.dataStore.set(key, {
      value,
      source,
      timestamp: timestamp || Date.now(),
      lastUpdated: Date.now()
    });

    // Notify subscribers
    this.notifySubscribers('data:updated', { key, value, source });
  }

  getData(key) {
    return this.dataStore.get(key)?.value;
  }

  subscribeToData(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  notifySubscribers(event, data) {
    this.eventBus.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  broadcastEvent(event) {
    const { type, data, target } = event;
    
    if (target) {
      // Send to specific component
      const component = this.components.get(target);
      if (component) {
        this.notifyComponent(component, type, data);
      }
    } else {
      // Broadcast to all components
      this.components.forEach(component => {
        this.notifyComponent(component, type, data);
      });
    }
  }

  notifyComponent(component, type, data) {
    // Simulate component notification
    console.log(`Notifying component ${component.id}: ${type}`, data);
  }

  handleWebSocketMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'market_update':
        this.syncData({
          key: 'market_data',
          value: payload,
          source: 'websocket'
        });
        break;
      
      case 'notification':
        this.syncData({
          key: 'notifications',
          value: payload,
          source: 'websocket'
        });
        break;
      
      default:
        console.log('Unhandled WebSocket message:', data);
    }
  }

  checkDataUpdates() {
    // Check for stale data and refresh if needed
    const now = Date.now();
    this.dataStore.forEach((data, key) => {
      if (now - data.lastUpdated > 30000) { // 30 seconds
        this.refreshData(key);
      }
    });
  }

  async refreshData(key) {
    try {
      let response;
      
      switch (key) {
        case 'market_data':
          response = await this.apiClient.get('/api/market/data');
          break;
        
        case 'notifications':
          response = await this.apiClient.get('/api/notifications');
          break;
        
        default:
          return;
      }
      
      this.syncData({
        key,
        value: response.data,
        source: 'api_refresh'
      });
    } catch (error) {
      console.error(`Failed to refresh data for ${key}:`, error);
    }
  }

  getConnectedComponents() {
    return Array.from(this.components.values());
  }

  getDataStore() {
    return new Map(this.dataStore);
  }

  // Utility methods
  createConnection(componentA, componentB, type = 'data') {
    // Create connection between two components
    console.log(`Creating ${type} connection: ${componentA} <-> ${componentB}`);
  }

  removeConnection(componentA, componentB) {
    // Remove connection between components
    console.log(`Removing connection: ${componentA} <-> ${componentB}`);
  }

  getConnectionStatus() {
    return {
      components: this.components.size,
      dataEntries: this.dataStore.size,
      subscribers: Array.from(this.subscribers.values()).reduce((sum, set) => sum + set.size, 0),
      lastUpdate: Date.now()
    };
  }
}

// Global connection manager instance
window.ConnectionManager = ConnectionManager;
