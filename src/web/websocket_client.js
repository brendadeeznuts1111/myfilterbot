/**
 * WebSocket Client Library for Real-time Updates
 * Handles connection, authentication, and message handling
 */

class PortalWebSocket {
    constructor(config = {}) {
        this.config = {
            url: config.url || 'ws://localhost:5000',
            reconnectInterval: config.reconnectInterval || 5000,
            maxReconnectAttempts: config.maxReconnectAttempts || 10,
            debug: config.debug || false
        };
        
        this.socket = null;
        this.token = null;
        this.reconnectAttempts = 0;
        this.listeners = {};
        this.connected = false;
        this.authenticated = false;
    }
    
    /**
     * Connect to WebSocket server
     */
    connect(token) {
        this.token = token;
        
        // Load Socket.IO client
        if (typeof io === 'undefined') {
            console.error('Socket.IO client not loaded. Please include the Socket.IO client library.');
            return;
        }
        
        this.log('Connecting to WebSocket server...');
        
        this.socket = io(this.config.url, {
            transports: ['websocket'],
            upgrade: false
        });
        
        this.setupEventHandlers();
    }
    
    /**
     * Setup WebSocket event handlers
     */
    setupEventHandlers() {
        // Connection events
        this.socket.on('connect', () => {
            this.log('Connected to server');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.authenticate();
            this.emit('connected');
        });
        
        this.socket.on('disconnect', () => {
            this.log('Disconnected from server');
            this.connected = false;
            this.authenticated = false;
            this.emit('disconnected');
            this.attemptReconnect();
        });
        
        this.socket.on('connect_error', (error) => {
            this.log('Connection error:', error);
            this.emit('error', error);
        });
        
        // Authentication events
        this.socket.on('auth_success', (data) => {
            this.log('Authentication successful');
            this.authenticated = true;
            this.emit('authenticated', data);
            this.subscribeToUpdates();
        });
        
        this.socket.on('auth_error', (data) => {
            this.log('Authentication failed:', data.error);
            this.authenticated = false;
            this.emit('auth_error', data);
        });
        
        // Data events
        this.socket.on('initial_data', (data) => {
            this.log('Received initial data');
            this.emit('initial_data', data);
        });
        
        this.socket.on('balance_update', (data) => {
            this.log('Balance update:', data);
            this.emit('balance_update', data);
            this.updateUI('balance', data);
        });
        
        this.socket.on('transaction_update', (data) => {
            this.log('Transaction update:', data);
            this.emit('transaction_update', data);
            this.addTransactionToUI(data);
        });
        
        this.socket.on('member_approved', (data) => {
            this.log('Member approved:', data);
            this.emit('member_approved', data);
            this.showNotification('Member Approved', `${data.username} has been approved`);
        });
        
        this.socket.on('member_denied', (data) => {
            this.log('Member denied:', data);
            this.emit('member_denied', data);
            this.showNotification('Member Denied', `${data.username} has been denied`);
        });
        
        this.socket.on('new_transaction', (data) => {
            this.log('New transaction:', data);
            this.emit('new_transaction', data);
        });
        
        this.socket.on('customer_balance_update', (data) => {
            this.log('Customer balance update:', data);
            this.emit('customer_balance_update', data);
        });
    }
    
    /**
     * Authenticate with the server
     */
    authenticate() {
        if (!this.token) {
            this.log('No token available for authentication');
            return;
        }
        
        this.log('Authenticating...');
        this.socket.emit('authenticate', { token: this.token });
    }
    
    /**
     * Subscribe to real-time updates
     */
    subscribeToUpdates(type = 'all') {
        this.log('Subscribing to updates:', type);
        this.socket.emit('subscribe_updates', { type });
    }
    
    /**
     * Attempt to reconnect
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            this.log('Max reconnection attempts reached');
            this.emit('max_reconnect_attempts');
            return;
        }
        
        this.reconnectAttempts++;
        this.log(`Reconnecting in ${this.config.reconnectInterval}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            if (!this.connected) {
                this.connect(this.token);
            }
        }, this.config.reconnectInterval);
    }
    
    /**
     * Send a message to the server
     */
    send(event, data) {
        if (!this.connected) {
            this.log('Cannot send message: not connected');
            return false;
        }
        
        this.socket.emit(event, data);
        return true;
    }
    
    /**
     * Register an event listener
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    /**
     * Remove an event listener
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        
        const index = this.listeners[event].indexOf(callback);
        if (index > -1) {
            this.listeners[event].splice(index, 1);
        }
    }
    
    /**
     * Emit an event to local listeners
     */
    emit(event, data) {
        if (!this.listeners[event]) return;
        
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }
    
    /**
     * Disconnect from the server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connected = false;
        this.authenticated = false;
    }
    
    /**
     * Log a message (if debug is enabled)
     */
    log(...args) {
        if (this.config.debug) {
            console.log('[WebSocket]', ...args);
        }
    }
    
    /**
     * Update UI elements with real-time data
     */
    updateUI(type, data) {
        switch(type) {
            case 'balance':
                const balanceEl = document.getElementById('currentBalance');
                if (balanceEl) {
                    balanceEl.textContent = `$${data.balance.toLocaleString()}`;
                    
                    // Add animation
                    balanceEl.classList.add('balance-updated');
                    setTimeout(() => {
                        balanceEl.classList.remove('balance-updated');
                    }, 1000);
                }
                
                const changeEl = document.getElementById('balanceChange');
                if (changeEl) {
                    changeEl.textContent = `${data.percentage >= 0 ? '+' : ''}${data.percentage}%`;
                    changeEl.className = data.change >= 0 ? 'change-positive' : 'change-negative';
                }
                break;
                
            case 'statistics':
                // Update statistics cards
                if (data.total_members !== undefined) {
                    const totalEl = document.getElementById('totalMembers');
                    if (totalEl) totalEl.textContent = data.total_members;
                }
                if (data.pending !== undefined) {
                    const pendingEl = document.getElementById('pendingCount');
                    if (pendingEl) pendingEl.textContent = data.pending;
                }
                break;
        }
    }
    
    /**
     * Add transaction to UI
     */
    addTransactionToUI(transaction) {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        const icon = {
            'deposit': '<i class="fas fa-arrow-down"></i>',
            'withdrawal': '<i class="fas fa-arrow-up"></i>',
            'trade': '<i class="fas fa-exchange-alt"></i>'
        }[transaction.type] || '<i class="fas fa-circle"></i>';
        
        const iconClass = {
            'deposit': 'icon-deposit',
            'withdrawal': 'icon-withdrawal',
            'trade': 'icon-trade'
        }[transaction.type] || '';
        
        const amountClass = transaction.amount >= 0 ? 'amount-positive' : 'amount-negative';
        const amountText = `${transaction.amount >= 0 ? '+' : ''}$${Math.abs(transaction.amount)}`;
        
        const newActivity = document.createElement('div');
        newActivity.className = 'activity-item new-activity';
        newActivity.innerHTML = `
            <div class="activity-icon ${iconClass}">
                ${icon}
            </div>
            <div class="activity-details">
                <div class="activity-description">${transaction.type}</div>
                <div class="activity-time">Just now</div>
            </div>
            <div class="activity-amount ${amountClass}">
                ${amountText}
            </div>
        `;
        
        // Add to top of list
        activityList.insertBefore(newActivity, activityList.firstChild);
        
        // Remove animation class after animation completes
        setTimeout(() => {
            newActivity.classList.remove('new-activity');
        }, 500);
        
        // Limit list to 10 items
        while (activityList.children.length > 10) {
            activityList.removeChild(activityList.lastChild);
        }
    }
    
    /**
     * Show notification
     */
    showNotification(title, message, type = 'info') {
        // Check if browser supports notifications
        if (!("Notification" in window)) {
            console.log('Browser does not support notifications');
            return;
        }
        
        // Request permission if not granted
        if (Notification.permission === "granted") {
            new Notification(title, {
                body: message,
                icon: '/favicon.ico',
                tag: 'portal-notification'
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification(title, {
                        body: message,
                        icon: '/favicon.ico',
                        tag: 'portal-notification'
                    });
                }
            });
        }
        
        // Also show in-app notification
        this.showInAppNotification(title, message, type);
    }
    
    /**
     * Show in-app notification
     */
    showInAppNotification(title, message, type = 'info') {
        const container = document.getElementById('notificationContainer') || this.createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <strong>${title}</strong>
                <button class="notification-close">&times;</button>
            </div>
            <div class="notification-body">${message}</div>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('notification-fade-out');
            setTimeout(() => {
                container.removeChild(notification);
            }, 300);
        }, 5000);
        
        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            container.removeChild(notification);
        });
    }
    
    /**
     * Create notification container
     */
    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 350px;
        `;
        document.body.appendChild(container);
        return container;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortalWebSocket;
}

// Add CSS for notifications and animations
const style = document.createElement('style');
style.textContent = `
    .notification {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 16px;
        margin-bottom: 10px;
        animation: slideIn 0.3s ease;
    }
    
    .notification-info {
        border-left: 4px solid #667eea;
    }
    
    .notification-success {
        border-left: 4px solid #48bb78;
    }
    
    .notification-error {
        border-left: 4px solid #f56565;
    }
    
    .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    
    .notification-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #999;
        padding: 0;
        width: 20px;
        height: 20px;
        line-height: 1;
    }
    
    .notification-body {
        font-size: 14px;
        color: #666;
    }
    
    .notification-fade-out {
        animation: slideOut 0.3s ease;
        opacity: 0;
    }
    
    .balance-updated {
        animation: pulse 0.5s ease;
    }
    
    .new-activity {
        animation: slideIn 0.5s ease;
        background: #f0f7ff;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);