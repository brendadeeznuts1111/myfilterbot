/**
 * FantDev Trading Platform - WebSocket Client
 * 
 * Real-time WebSocket communication client with automatic reconnection,
 * message queuing, heartbeat monitoring, and typed event handling.
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message queuing when disconnected
 * - Heartbeat/ping-pong for connection monitoring
 * - Type-safe event subscription system
 * - Trading-specific message methods
 * - Promise-based request-response pattern
 * 
 * @version 2.0.0
 * @author FantDev Team
 */

/**
 * WebSocket Client class for real-time communication with the trading platform
 * 
 * @class WebSocketClient
 * @example
 * const ws = new WebSocketClient({
 *   url: 'wss://api.fantdev.com/ws',
 *   reconnectInterval: 5000,
 *   maxReconnectAttempts: 10,
 *   onConnect: () => console.log('Connected!'),
 *   onMessage: (msg) => console.log('Message:', msg)
 * });
 */
class WebSocketClient {
    /**
     * Create a new WebSocket client instance
     * 
     * @param {Object} options - Configuration options
     * @param {string} [options.url] - WebSocket URL (auto-generated if not provided)
     * @param {number} [options.reconnectInterval=5000] - Base reconnection interval in ms
     * @param {number} [options.maxReconnectAttempts=10] - Maximum number of reconnection attempts
     * @param {number} [options.heartbeatInterval=30000] - Heartbeat ping interval in ms
     * @param {boolean} [options.autoConnect=true] - Whether to connect automatically on creation
     * @param {Function} [options.onConnect] - Connection established callback
     * @param {Function} [options.onDisconnect] - Connection lost callback
     * @param {Function} [options.onError] - Error occurred callback
     * @param {Function} [options.onMessage] - Message received callback
     */
    constructor(options = {}) {
        // === CONNECTION CONFIGURATION ===
        this.url = options.url || this.getDefaultURL();
        this.reconnectInterval = options.reconnectInterval || 5000;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
        this.heartbeatInterval = options.heartbeatInterval || 30000;
        
        // === CONNECTION STATE ===
        /** @type {WebSocket|null} Active WebSocket connection */
        this.ws = null;
        /** @type {number} Current number of reconnection attempts */
        this.reconnectAttempts = 0;
        /** @type {boolean} Whether the connection is established and ready */
        this.isConnected = false;
        
        // === MESSAGE HANDLING ===
        /** @type {Array} Queue for messages sent while disconnected */
        this.messageQueue = [];
        /** @type {Map} Event subscribers by event name */
        this.subscribers = new Map();
        
        // === TIMERS ===
        /** @type {number|null} Heartbeat ping timer */
        this.heartbeatTimer = null;
        /** @type {number|null} Reconnection attempt timer */
        this.reconnectTimer = null;
        
        // === EVENT HANDLERS ===
        /** @type {Function} Called when connection is established */
        this.onConnect = options.onConnect || (() => {});
        /** @type {Function} Called when connection is lost */
        this.onDisconnect = options.onDisconnect || (() => {});
        /** @type {Function} Called when an error occurs */
        this.onError = options.onError || (() => {});
        /** @type {Function} Called when a message is received */
        this.onMessage = options.onMessage || (() => {});
        
        // === INITIALIZATION ===
        // Auto-connect if enabled (default behavior)
        if (options.autoConnect !== false) {
            this.connect();
        }
    }
    
    /**
     * Generate default WebSocket URL based on current page location
     * Automatically uses secure WebSocket (wss://) for HTTPS pages
     * 
     * @returns {string} WebSocket URL
     * @private
     */
    getDefaultURL() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port || (protocol === 'wss:' ? 443 : 80);
        return `${protocol}//${host}:${port}/ws`;
    }
    
    /**
     * Establish WebSocket connection to the server
     * 
     * Features:
     * - Prevents multiple concurrent connections
     * - Sets up all event handlers (open, close, error, message)
     * - Automatically starts heartbeat monitoring
     * - Processes queued messages on successful connection
     * - Emits connection events to subscribers
     * 
     * @returns {Promise<void>} Resolves when connection is established
     * @throws {Error} If connection fails or WebSocket creation fails
     * 
     * @example
     * await ws.connect();
     * console.log('Connected to trading platform');
     */
    connect() {
        // Prevent multiple connections
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            try {
                console.log(`Connecting to WebSocket: ${this.url}`);
                this.ws = new WebSocket(this.url);
                
                this.ws.onopen = (event) => {
                    console.log('WebSocket connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    // Start heartbeat
                    this.startHeartbeat();
                    
                    // Process queued messages
                    this.processMessageQueue();
                    
                    // Call handler
                    this.onConnect(event);
                    
                    // Notify subscribers
                    this.emit('connected', event);
                    
                    resolve();
                };
                
                this.ws.onclose = (event) => {
                    console.log('WebSocket disconnected', event.code, event.reason);
                    this.isConnected = false;
                    
                    // Stop heartbeat
                    this.stopHeartbeat();
                    
                    // Call handler
                    this.onDisconnect(event);
                    
                    // Notify subscribers
                    this.emit('disconnected', event);
                    
                    // Attempt reconnection
                    if (!event.wasClean) {
                        this.scheduleReconnect();
                    }
                };
                
                this.ws.onerror = (event) => {
                    console.error('WebSocket error:', event);
                    
                    // Call handler
                    this.onError(event);
                    
                    // Notify subscribers
                    this.emit('error', event);
                    
                    reject(event);
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('Failed to parse WebSocket message:', error);
                        this.emit('error', { type: 'parse_error', data: event.data, error });
                    }
                };
                
            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                reject(error);
            }
        });
    }
    
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        
        this.isConnected = false;
        this.stopHeartbeat();
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('max_reconnect_failed');
            return;
        }
        
        if (this.reconnectTimer) {
            return; // Already scheduled
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
        
        console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch(error => {
                console.error('Reconnection failed:', error);
            });
        }, delay);
    }
    
    startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected) {
                this.send('ping', { timestamp: Date.now() });
            }
        }, this.heartbeatInterval);
    }
    
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    
    send(type, data = {}, options = {}) {
        const message = {
            type,
            data,
            timestamp: Date.now(),
            id: this.generateMessageId()
        };
        
        if (!this.isConnected) {
            if (options.queue !== false) {
                console.log('WebSocket not connected, queueing message:', type);
                this.messageQueue.push(message);
                return Promise.resolve();
            } else {
                return Promise.reject(new Error('WebSocket not connected'));
            }
        }
        
        try {
            this.ws.send(JSON.stringify(message));
            
            if (options.expectResponse) {
                return this.waitForResponse(message.id, options.timeout || 10000);
            }
            
            return Promise.resolve();
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            return Promise.reject(error);
        }
    }
    
    waitForResponse(messageId, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.off(`response:${messageId}`);
                reject(new Error('Response timeout'));
            }, timeout);
            
            this.once(`response:${messageId}`, (data) => {
                clearTimeout(timer);
                resolve(data);
            });
        });
    }
    
    processMessageQueue() {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            try {
                this.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Failed to send queued message:', error);
                this.messageQueue.unshift(message); // Put it back
                break;
            }
        }
    }
    
    handleMessage(message) {
        // Handle system messages
        switch (message.type) {
            case 'pong':
                // Heartbeat response
                this.emit('pong', message.data);
                return;
                
            case 'response':
                // Response to a previous message
                this.emit(`response:${message.responseId}`, message.data);
                return;
                
            case 'error':
                // Server error
                console.error('Server error:', message.data);
                this.emit('server_error', message.data);
                break;
        }
        
        // Call general handler
        this.onMessage(message);
        
        // Notify type-specific subscribers
        this.emit(message.type, message.data);
        
        // Notify all subscribers
        this.emit('message', message);
    }
    
    // Event subscription methods
    on(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event).push(callback);
        
        return () => this.off(event, callback);
    }
    
    once(event, callback) {
        const wrapper = (...args) => {
            callback(...args);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
    
    off(event, callback) {
        if (!callback) {
            // Remove all listeners for this event
            this.subscribers.delete(event);
            return;
        }
        
        const callbacks = this.subscribers.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
                if (callbacks.length === 0) {
                    this.subscribers.delete(event);
                }
            }
        }
    }
    
    emit(event, ...args) {
        const callbacks = this.subscribers.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }
    
    // Utility methods
    generateMessageId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getState() {
        return {
            url: this.url,
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length,
            readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED
        };
    }
    
    // ========================================================================
    // TYPED MESSAGE METHODS
    // ========================================================================
    
    /**
     * Subscribe to a specific channel for pub/sub messaging
     * 
     * @param {string} channel - Channel name to subscribe to
     * @param {Function} callback - Function called when channel messages arrive
     * @returns {Function} Unsubscribe function
     * 
     * @example
     * const unsubscribe = ws.subscribe('prices', (data) => {
     *   console.log('Price update:', data);
     * });
     * // Later: unsubscribe();
     */
    subscribe(channel, callback) {
        return this.on(`channel:${channel}`, callback);
    }
    
    /**
     * Unsubscribe from a specific channel
     * 
     * @param {string} channel - Channel name to unsubscribe from
     * @param {Function} [callback] - Specific callback to remove (optional)
     */
    unsubscribe(channel, callback) {
        this.off(`channel:${channel}`, callback);
    }
    
    /**
     * Publish data to a channel (broadcast to all subscribers)
     * 
     * @param {string} channel - Channel name to publish to
     * @param {*} data - Data to broadcast to channel subscribers
     * @returns {Promise<void>} Resolves when message is sent
     */
    publish(channel, data) {
        return this.send('publish', { channel, data });
    }
    
    /**
     * Send a request and wait for a response (RPC pattern)
     * 
     * @param {string} method - Remote method name to call
     * @param {Object} [params={}] - Parameters to send with the request
     * @returns {Promise<*>} Resolves with the server's response data
     * 
     * @example
     * const userInfo = await ws.request('getUserInfo', { userId: 123 });
     * console.log('User:', userInfo);
     */
    request(method, params = {}) {
        return this.send('request', { method, params }, { expectResponse: true });
    }
    
    // ========================================================================
    // AUTHENTICATION
    // ========================================================================
    
    /**
     * Authenticate with the WebSocket server using a JWT token
     * 
     * @param {string} token - JWT authentication token
     * @returns {Promise<Object>} Resolves with authentication response
     * @throws {Error} If authentication fails
     * 
     * @example
     * try {
     *   const authResult = await ws.authenticate('your-jwt-token');
     *   console.log('Authenticated as:', authResult.user);
     * } catch (error) {
     *   console.error('Authentication failed:', error);
     * }
     */
    authenticate(token) {
        return this.send('auth', { token }, { expectResponse: true });
    }
    
    // ========================================================================
    // TRADING PLATFORM REAL-TIME SUBSCRIPTIONS
    // ========================================================================
    
    /**
     * Subscribe to real-time market data for a trading symbol
     * 
     * @param {string} symbol - Trading symbol (e.g., 'BTCUSD', 'ETHUSD')
     * @param {Function} callback - Called with market data updates
     * @returns {Function} Unsubscribe function
     * 
     * @example
     * const unsubscribe = ws.subscribeToMarket('BTCUSD', (marketData) => {
     *   console.log(`${marketData.symbol}: $${marketData.price}`);
     * });
     */
    subscribeToMarket(symbol, callback) {
        this.send('subscribe', { type: 'market', symbol });
        return this.on(`market:${symbol}`, callback);
    }
    
    /**
     * Subscribe to real-time order updates (fills, cancellations, etc.)
     * 
     * @param {Function} callback - Called with order status updates
     * @returns {Function} Unsubscribe function
     * 
     * @example
     * ws.subscribeToOrders((order) => {
     *   console.log(`Order ${order.id} is now ${order.status}`);
     * });
     */
    subscribeToOrders(callback) {
        this.send('subscribe', { type: 'orders' });
        return this.on('orders', callback);
    }
    
    /**
     * Subscribe to real-time account balance updates
     * 
     * @param {Function} callback - Called with balance changes
     * @returns {Function} Unsubscribe function
     * 
     * @example
     * ws.subscribeToBalance((balance) => {
     *   console.log('New balance:', balance);
     * });
     */
    subscribeToBalance(callback) {
        this.send('subscribe', { type: 'balance' });
        return this.on('balance', callback);
    }
    
    /**
     * Subscribe to real-time platform notifications
     * 
     * @param {Function} callback - Called with new notifications
     * @returns {Function} Unsubscribe function
     * 
     * @example
     * ws.subscribeToNotifications((notification) => {
     *   alert(`${notification.type}: ${notification.message}`);
     * });
     */
    subscribeToNotifications(callback) {
        this.send('subscribe', { type: 'notifications' });
        return this.on('notification', callback);
    }
}

// ============================================================================
// MODULE EXPORTS & GLOBAL REGISTRATION
// ============================================================================

/**
 * Export WebSocketClient for different module systems
 * 
 * Usage Examples:
 * 
 * // ES6 Modules (if using a bundler)
 * import { WebSocketClient } from './websocket-client.js';
 * 
 * // CommonJS (Node.js)
 * const { WebSocketClient } = require('./websocket-client.js');
 * 
 * // Browser Global
 * const ws = new window.WebSocketClient(options);
 * 
 * // AMD/RequireJS
 * define(['websocket-client'], function(WebSocketClient) { ... });
 */

// CommonJS export (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketClient;
}

// AMD export (RequireJS)
if (typeof define === 'function' && define.amd) {
    define([], function() {
        return WebSocketClient;
    });
}

// Global browser export
if (typeof window !== 'undefined') {
    window.WebSocketClient = WebSocketClient;
}

// ES6 Module export (for bundlers that support it)
if (typeof exports !== 'undefined') {
    exports.WebSocketClient = WebSocketClient;
}