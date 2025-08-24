/**
 * Comprehensive Notification System Component
 * Handles real-time notifications, preferences, and history
 * Integrates with WebSocket for live updates
 */

class NotificationSystem {
    constructor(options = {}) {
        this.userId = options.userId;
        this.userType = options.userType || 'customer';
        this.apiBase = options.apiBase || '/api/notifications';
        this.socket = options.socket;
        this.container = options.container || document.body;
        
        this.notifications = [];
        this.preferences = null;
        this.isVisible = false;
        this.unreadCount = 0;
        
        this.init();
    }
    
    async init() {
        this.createNotificationUI();
        this.setupEventListeners();
        await this.loadNotifications();
        await this.loadPreferences();
        this.setupWebSocketHandlers();
        
        // Auto-refresh every 30 seconds
        setInterval(() => this.refreshNotifications(), 30000);
    }
    
    createNotificationUI() {
        // Create notification bell icon
        this.bellIcon = this.createElement(`
            <div class="notification-bell" id="notification-bell">
                <i class="fas fa-bell"></i>
                <span class="notification-badge" id="notification-badge">0</span>
            </div>
        `);
        
        // Create notification dropdown
        this.dropdown = this.createElement(`
            <div class="notification-dropdown" id="notification-dropdown">
                <div class="notification-header">
                    <h3>Notifications</h3>
                    <div class="notification-actions">
                        <button class="btn-mark-all-read" id="mark-all-read">
                            <i class="fas fa-check-double"></i> Mark All Read
                        </button>
                        <button class="btn-preferences" id="notification-preferences">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>
                <div class="notification-list" id="notification-list">
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        Loading notifications...
                    </div>
                </div>
                <div class="notification-footer">
                    <button class="btn-view-all" id="view-all-notifications">
                        View All Notifications
                    </button>
                </div>
            </div>
        `);
        
        // Create preferences modal
        this.preferencesModal = this.createElement(`
            <div class="notification-preferences-modal" id="preferences-modal">
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Notification Preferences</h3>
                        <button class="modal-close" id="close-preferences">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="preferences-body">
                        <!-- Preferences content will be loaded here -->
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="cancel-preferences">Cancel</button>
                        <button class="btn btn-primary" id="save-preferences">Save Preferences</button>
                    </div>
                </div>
            </div>
        `);
        
        // Add to container
        this.container.appendChild(this.bellIcon);
        this.container.appendChild(this.dropdown);
        this.container.appendChild(this.preferencesModal);
        
        // Add CSS styles
        this.addStyles();
    }
    
    createElement(html) {
        const div = document.createElement('div');
        div.innerHTML = html.trim();
        return div.firstChild;
    }
    
    addStyles() {
        const styles = `
            .notification-bell {
                position: relative;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                transition: all 0.3s ease;
                color: #667eea;
            }
            
            .notification-bell:hover {
                background: rgba(102, 126, 234, 0.1);
            }
            
            .notification-badge {
                position: absolute;
                top: 0;
                right: 0;
                background: #ef4444;
                color: white;
                border-radius: 50%;
                padding: 2px 6px;
                font-size: 12px;
                font-weight: 600;
                min-width: 18px;
                text-align: center;
                display: none;
            }
            
            .notification-badge.visible {
                display: block;
            }
            
            .notification-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                width: 400px;
                max-height: 600px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                border: 1px solid rgba(0, 0, 0, 0.1);
                z-index: 1000;
                display: none;
                overflow: hidden;
            }
            
            .notification-dropdown.visible {
                display: block;
                animation: notificationSlideIn 0.3s ease;
            }
            
            @keyframes notificationSlideIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .notification-header {
                padding: 15px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .notification-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }
            
            .notification-actions {
                display: flex;
                gap: 8px;
            }
            
            .notification-actions button {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                padding: 6px 8px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
            }
            
            .notification-actions button:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .notification-list {
                max-height: 400px;
                overflow-y: auto;
            }
            
            .notification-item {
                padding: 15px 20px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
            }
            
            .notification-item:hover {
                background: #f8f9ff;
            }
            
            .notification-item.unread {
                background: linear-gradient(90deg, rgba(102, 126, 234, 0.05) 0%, transparent 100%);
                border-left: 3px solid #667eea;
            }
            
            .notification-item.unread::before {
                content: '';
                position: absolute;
                left: 8px;
                top: 50%;
                transform: translateY(-50%);
                width: 6px;
                height: 6px;
                background: #667eea;
                border-radius: 50%;
            }
            
            .notification-content {
                margin-left: 15px;
            }
            
            .notification-title {
                font-weight: 600;
                color: #333;
                margin-bottom: 4px;
                font-size: 14px;
            }
            
            .notification-message {
                color: #666;
                font-size: 13px;
                line-height: 1.4;
                margin-bottom: 8px;
            }
            
            .notification-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: #888;
            }
            
            .notification-type {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 10px;
                text-transform: uppercase;
                font-weight: 600;
            }
            
            .notification-type.transaction { background: #dcfce7; color: #166534; }
            .notification-type.security_alert { background: #fef2f2; color: #dc2626; }
            .notification-type.system_update { background: #dbeafe; color: #1d4ed8; }
            .notification-type.member_request { background: #fef3c7; color: #d97706; }
            
            .notification-footer {
                padding: 15px 20px;
                background: #f8f9fa;
                text-align: center;
            }
            
            .btn-view-all {
                background: transparent;
                border: 1px solid #667eea;
                color: #667eea;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
            }
            
            .btn-view-all:hover {
                background: #667eea;
                color: white;
            }
            
            .notification-preferences-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 2000;
                display: none;
            }
            
            .notification-preferences-modal.visible {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
            }
            
            .modal-content {
                position: relative;
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 600px;
                max-height: 80%;
                overflow: hidden;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
            }
            
            .modal-header {
                padding: 20px 25px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .modal-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
            
            .modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            
            .modal-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .modal-body {
                padding: 25px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .modal-footer {
                padding: 20px 25px;
                background: #f8f9fa;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            
            .btn {
                padding: 10px 20px;
                border-radius: 6px;
                border: none;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s ease;
            }
            
            .btn-primary {
                background: #667eea;
                color: white;
            }
            
            .btn-primary:hover {
                background: #5a6fd8;
            }
            
            .btn-secondary {
                background: #e5e7eb;
                color: #374151;
            }
            
            .btn-secondary:hover {
                background: #d1d5db;
            }
            
            .loading {
                padding: 30px;
                text-align: center;
                color: #666;
            }
            
            .empty-state {
                padding: 40px 20px;
                text-align: center;
                color: #888;
            }
            
            .empty-state i {
                font-size: 48px;
                margin-bottom: 15px;
                opacity: 0.3;
            }
            
            @media (max-width: 768px) {
                .notification-dropdown {
                    width: 320px;
                    right: -100px;
                }
                
                .modal-content {
                    width: 95%;
                    margin: 20px;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    
    setupEventListeners() {
        // Bell icon click
        this.bellIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });
        
        // Mark all as read
        document.getElementById('mark-all-read').addEventListener('click', () => {
            this.markAllAsRead();
        });
        
        // Preferences button
        document.getElementById('notification-preferences').addEventListener('click', () => {
            this.showPreferences();
        });
        
        // Close preferences modal
        document.getElementById('close-preferences').addEventListener('click', () => {
            this.hidePreferences();
        });
        
        document.getElementById('cancel-preferences').addEventListener('click', () => {
            this.hidePreferences();
        });
        
        document.getElementById('save-preferences').addEventListener('click', () => {
            this.savePreferences();
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.dropdown.contains(e.target) && !this.bellIcon.contains(e.target)) {
                this.hideDropdown();
            }
        });
        
        // Close modal when clicking backdrop
        this.preferencesModal.querySelector('.modal-backdrop').addEventListener('click', () => {
            this.hidePreferences();
        });
    }
    
    setupWebSocketHandlers() {
        if (!this.socket) return;
        
        // Join notifications room
        this.socket.emit('join_notifications', {
            user_id: this.userId,
            user_type: this.userType
        });
        
        // Handle new notifications
        this.socket.on('notification', (data) => {
            this.handleNewNotification(data);
        });
        
        // Handle notification status updates
        this.socket.on('notification_status', (data) => {
            console.log('Notification status:', data);
        });
    }
    
    async loadNotifications() {
        try {
            const response = await fetch(`${this.apiBase}/list?limit=20`, {
                headers: {
                    'X-User-ID': this.userId,
                    'X-User-Type': this.userType,
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.notifications = result.data.notifications;
                this.unreadCount = result.data.unread_count;
                this.updateUI();
            } else {
                console.error('Failed to load notifications');
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.showEmptyState();
        }
    }
    
    async loadPreferences() {
        try {
            const response = await fetch(`${this.apiBase}/preferences`, {
                headers: {
                    'X-User-ID': this.userId,
                    'X-User-Type': this.userType,
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.preferences = result.data;
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }
    
    updateUI() {
        this.updateBadge();
        this.renderNotifications();
    }
    
    updateBadge() {
        const badge = document.getElementById('notification-badge');
        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            badge.classList.add('visible');
        } else {
            badge.classList.remove('visible');
        }
    }
    
    renderNotifications() {
        const listContainer = document.getElementById('notification-list');
        
        if (this.notifications.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                </div>
            `;
            return;
        }
        
        listContainer.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${!notification.read ? 'unread' : ''}" 
                 onclick="notificationSystem.markAsRead('${notification.id}')">
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-meta">
                        <span class="notification-time">${this.formatTime(notification.created_at)}</span>
                        <span class="notification-type ${notification.type}">${notification.type.replace('_', ' ')}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    showEmptyState() {
        const listContainer = document.getElementById('notification-list');
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to load notifications</p>
                <button onclick="notificationSystem.refreshNotifications()" class="btn btn-primary" style="margin-top: 10px;">
                    <i class="fas fa-refresh"></i> Retry
                </button>
            </div>
        `;
    }
    
    toggleDropdown() {
        if (this.isVisible) {
            this.hideDropdown();
        } else {
            this.showDropdown();
        }
    }
    
    showDropdown() {
        this.dropdown.classList.add('visible');
        this.isVisible = true;
    }
    
    hideDropdown() {
        this.dropdown.classList.remove('visible');
        this.isVisible = false;
    }
    
    showPreferences() {
        this.preferencesModal.classList.add('visible');
        this.renderPreferences();
    }
    
    hidePreferences() {
        this.preferencesModal.classList.remove('visible');
    }
    
    renderPreferences() {
        const body = document.getElementById('preferences-body');
        if (!this.preferences) {
            body.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading preferences...</div>';
            return;
        }
        
        body.innerHTML = `
            <div class="preference-section">
                <h4>Notification Channels</h4>
                <p>Choose how you'd like to receive different types of notifications:</p>
                
                ${Object.entries(this.preferences.channels).map(([type, channels]) => `
                    <div class="preference-item">
                        <label class="preference-label">${type.replace('_', ' ').toUpperCase()}</label>
                        <div class="channel-options">
                            ${['web', 'email', 'telegram', 'push', 'sms'].map(channel => `
                                <label class="checkbox-label">
                                    <input type="checkbox" 
                                           data-type="${type}" 
                                           data-channel="${channel}"
                                           ${channels.includes(channel) ? 'checked' : ''}>
                                    <span>${channel.charAt(0).toUpperCase() + channel.slice(1)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="preference-section">
                <h4>Quiet Hours</h4>
                <p>Set times when you don't want to receive notifications:</p>
                <div class="quiet-hours">
                    <label>
                        Start: <input type="time" id="quiet-start" value="${this.preferences.quiet_hours.start || '22:00'}">
                    </label>
                    <label>
                        End: <input type="time" id="quiet-end" value="${this.preferences.quiet_hours.end || '08:00'}">
                    </label>
                </div>
            </div>
            
            <div class="preference-section">
                <label class="checkbox-label">
                    <input type="checkbox" id="notifications-enabled" ${this.preferences.enabled ? 'checked' : ''}>
                    <span>Enable notifications</span>
                </label>
            </div>
        `;
        
        // Add styles for preferences
        const preferenceStyles = `
            <style>
                .preference-section { margin-bottom: 25px; }
                .preference-section h4 { color: #333; margin-bottom: 8px; }
                .preference-section p { color: #666; font-size: 14px; margin-bottom: 15px; }
                .preference-item { margin-bottom: 20px; }
                .preference-label { display: block; font-weight: 600; margin-bottom: 8px; color: #555; }
                .channel-options { display: flex; flex-wrap: wrap; gap: 15px; }
                .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .checkbox-label input[type="checkbox"] { margin: 0; }
                .quiet-hours { display: flex; gap: 20px; }
                .quiet-hours label { display: flex; align-items: center; gap: 8px; }
                .quiet-hours input[type="time"] { padding: 6px; border: 1px solid #ddd; border-radius: 4px; }
            </style>
        `;
        
        body.insertAdjacentHTML('beforebegin', preferenceStyles);
    }
    
    async savePreferences() {
        // Collect form data
        const channels = {};
        const checkboxes = this.preferencesModal.querySelectorAll('input[type="checkbox"][data-type]');
        
        checkboxes.forEach(cb => {
            const type = cb.dataset.type;
            const channel = cb.dataset.channel;
            
            if (!channels[type]) channels[type] = [];
            if (cb.checked) channels[type].push(channel);
        });
        
        const quietStart = document.getElementById('quiet-start').value;
        const quietEnd = document.getElementById('quiet-end').value;
        const enabled = document.getElementById('notifications-enabled').checked;
        
        const preferences = {
            channels,
            quiet_hours: { start: quietStart, end: quietEnd },
            frequency_limits: this.preferences.frequency_limits,
            enabled
        };
        
        try {
            const response = await fetch(`${this.apiBase}/preferences`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': this.userId,
                    'X-User-Type': this.userType,
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(preferences)
            });
            
            if (response.ok) {
                this.showToast('Preferences saved successfully', 'success');
                this.hidePreferences();
                await this.loadPreferences();
            } else {
                this.showToast('Failed to save preferences', 'error');
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            this.showToast('Error saving preferences', 'error');
        }
    }
    
    async markAsRead(notificationId) {
        try {
            const response = await fetch(`${this.apiBase}/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'X-User-ID': this.userId,
                    'X-User-Type': this.userType,
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            if (response.ok) {
                // Update local state
                const notification = this.notifications.find(n => n.id === notificationId);
                if (notification && !notification.read) {
                    notification.read = true;
                    this.unreadCount = Math.max(0, this.unreadCount - 1);
                    this.updateUI();
                }
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }
    
    async markAllAsRead() {
        try {
            const response = await fetch(`${this.apiBase}/mark-all-read`, {
                method: 'POST',
                headers: {
                    'X-User-ID': this.userId,
                    'X-User-Type': this.userType,
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            if (response.ok) {
                // Update local state
                this.notifications.forEach(n => n.read = true);
                this.unreadCount = 0;
                this.updateUI();
                this.showToast('All notifications marked as read', 'success');
            } else {
                this.showToast('Failed to mark all as read', 'error');
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
            this.showToast('Error marking notifications as read', 'error');
        }
    }
    
    async refreshNotifications() {
        await this.loadNotifications();
        this.showToast('Notifications refreshed', 'success');
    }
    
    handleNewNotification(data) {
        // Add new notification to the beginning of the list
        this.notifications.unshift(data);
        
        // Limit to 50 notifications in memory
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
        
        // Update unread count
        if (!data.read) {
            this.unreadCount++;
        }
        
        this.updateUI();
        
        // Show toast for new notification
        this.showToast(data.title, 'info', data.message);
        
        // Auto-expand dropdown if it's already visible
        if (this.isVisible) {
            this.renderNotifications();
        }
    }
    
    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return time.toLocaleDateString();
    }
    
    showToast(title, type = 'info', message = '') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `notification-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close">&times;</button>
        `;
        
        // Add toast styles if not already added
        if (!document.querySelector('#toast-styles')) {
            const toastStyles = document.createElement('style');
            toastStyles.id = 'toast-styles';
            toastStyles.textContent = `
                .notification-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    border-left: 4px solid #667eea;
                    padding: 15px;
                    max-width: 350px;
                    z-index: 3000;
                    animation: toastSlideIn 0.3s ease;
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                }
                .toast-success { border-left-color: #10b981; }
                .toast-error { border-left-color: #ef4444; }
                .toast-warning { border-left-color: #f59e0b; }
                .toast-info { border-left-color: #667eea; }
                .toast-content { flex: 1; }
                .toast-title { font-weight: 600; margin-bottom: 4px; }
                .toast-message { font-size: 13px; color: #666; }
                .toast-close { background: none; border: none; font-size: 18px; color: #999; cursor: pointer; }
                @keyframes toastSlideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(toastStyles);
        }
        
        // Add to page
        document.body.appendChild(toast);
        
        // Close button handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.style.animation = 'toastSlideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'toastSlideIn 0.3s ease reverse';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }
    
    // Public API methods
    createTestNotification() {
        fetch(`${this.apiBase}/test`, {
            method: 'POST',
            headers: {
                'X-User-ID': this.userId,
                'X-User-Type': this.userType,
                'ngrok-skip-browser-warning': 'true'
            }
        }).then(response => {
            if (response.ok) {
                this.showToast('Test notification created', 'success');
                setTimeout(() => this.refreshNotifications(), 1000);
            } else {
                this.showToast('Failed to create test notification', 'error');
            }
        }).catch(error => {
            console.error('Error creating test notification:', error);
            this.showToast('Error creating test notification', 'error');
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}

// Global instance for easy access
window.NotificationSystem = NotificationSystem;