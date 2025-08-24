/**
 * Notification History and Management Component
 * Provides comprehensive notification management interface
 */

class NotificationHistory {
    constructor(options = {}) {
        this.userId = options.userId;
        this.userType = options.userType || 'customer';
        this.apiBase = options.apiBase || '/api/notifications';
        this.container = options.container || document.body;
        
        this.notifications = [];
        this.filters = {
            type: 'all',
            status: 'all',
            dateRange: 'all',
            priority: 'all'
        };
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalPages = 1;
        
        this.isVisible = false;
        
        this.init();
    }
    
    async init() {
        this.createHistoryUI();
        this.setupEventListeners();
        await this.loadNotificationHistory();
    }
    
    createHistoryUI() {
        // Create main history modal
        this.historyModal = this.createElement(`
            <div class="notification-history-modal" id="notification-history-modal">
                <div class="modal-backdrop"></div>
                <div class="history-modal-content">
                    <div class="history-header">
                        <h2><i class="fas fa-history"></i> Notification History</h2>
                        <div class="history-actions">
                            <button class="btn btn-sm btn-outline" id="export-notifications">
                                <i class="fas fa-download"></i> Export
                            </button>
                            <button class="btn btn-sm btn-outline" id="clear-read-notifications">
                                <i class="fas fa-trash-alt"></i> Clear Read
                            </button>
                            <button class="modal-close" id="close-history">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="history-filters">
                        <div class="filter-group">
                            <label>Type:</label>
                            <select id="filter-type">
                                <option value="all">All Types</option>
                                <option value="transaction">Transactions</option>
                                <option value="balance_update">Balance Updates</option>
                                <option value="security_alert">Security Alerts</option>
                                <option value="system_update">System Updates</option>
                                <option value="member_request">Member Requests</option>
                                <option value="trade_signal">Trade Signals</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="promotion">Promotions</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label>Status:</label>
                            <select id="filter-status">
                                <option value="all">All</option>
                                <option value="unread">Unread</option>
                                <option value="read">Read</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label>Priority:</label>
                            <select id="filter-priority">
                                <option value="all">All Priorities</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label>Date:</label>
                            <select id="filter-date">
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>
                        
                        <div class="filter-group search-group">
                            <label>Search:</label>
                            <input type="text" id="search-notifications" placeholder="Search notifications...">
                        </div>
                        
                        <button class="btn btn-primary" id="apply-filters">Apply Filters</button>
                        <button class="btn btn-secondary" id="reset-filters">Reset</button>
                    </div>
                    
                    <div class="history-stats">
                        <div class="stat-item">
                            <span class="stat-value" id="total-notifications">0</span>
                            <span class="stat-label">Total</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="unread-notifications">0</span>
                            <span class="stat-label">Unread</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="high-priority-notifications">0</span>
                            <span class="stat-label">High Priority</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="this-week-notifications">0</span>
                            <span class="stat-label">This Week</span>
                        </div>
                    </div>
                    
                    <div class="history-content">
                        <div class="history-list" id="history-list">
                            <div class="loading">
                                <i class="fas fa-spinner fa-spin"></i>
                                Loading notification history...
                            </div>
                        </div>
                        
                        <div class="history-pagination" id="history-pagination">
                            <!-- Pagination will be inserted here -->
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        // Add to container
        this.container.appendChild(this.historyModal);
        
        // Add styles
        this.addHistoryStyles();
    }
    
    createElement(html) {
        const div = document.createElement('div');
        div.innerHTML = html.trim();
        return div.firstChild;
    }
    
    addHistoryStyles() {
        const styles = `
            .notification-history-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 2500;
                display: none;
            }
            
            .notification-history-modal.visible {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .history-modal-content {
                position: relative;
                background: white;
                border-radius: 12px;
                width: 95%;
                max-width: 1200px;
                height: 90%;
                max-height: 800px;
                overflow: hidden;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
            }
            
            .history-header {
                padding: 20px 25px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }
            
            .history-header h2 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
            }
            
            .history-actions {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .history-filters {
                padding: 20px 25px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                align-items: end;
                flex-shrink: 0;
            }
            
            .filter-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 120px;
            }
            
            .filter-group label {
                font-size: 12px;
                font-weight: 600;
                color: #555;
                text-transform: uppercase;
            }
            
            .filter-group select,
            .filter-group input {
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
            }
            
            .search-group {
                flex: 1;
                min-width: 200px;
            }
            
            .history-stats {
                padding: 15px 25px;
                background: white;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                gap: 30px;
                flex-shrink: 0;
            }
            
            .stat-item {
                text-align: center;
            }
            
            .stat-value {
                display: block;
                font-size: 24px;
                font-weight: 700;
                color: #333;
                line-height: 1;
            }
            
            .stat-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                font-weight: 600;
            }
            
            .history-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .history-list {
                flex: 1;
                overflow-y: auto;
                padding: 0;
            }
            
            .history-notification-item {
                padding: 20px 25px;
                border-bottom: 1px solid #f0f0f0;
                transition: all 0.2s ease;
                cursor: pointer;
                position: relative;
            }
            
            .history-notification-item:hover {
                background: #f8f9ff;
            }
            
            .history-notification-item.unread {
                background: linear-gradient(90deg, rgba(102, 126, 234, 0.05) 0%, transparent 100%);
                border-left: 3px solid #667eea;
            }
            
            .history-notification-item.critical {
                border-left: 3px solid #ef4444;
            }
            
            .history-notification-item.high {
                border-left: 3px solid #f59e0b;
            }
            
            .history-notification-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
            }
            
            .history-notification-title {
                font-weight: 600;
                color: #333;
                font-size: 16px;
                margin-bottom: 4px;
            }
            
            .history-notification-meta {
                display: flex;
                gap: 15px;
                align-items: center;
                font-size: 12px;
                color: #666;
            }
            
            .history-notification-message {
                color: #555;
                line-height: 1.5;
                margin-bottom: 12px;
            }
            
            .history-notification-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .notification-type-badge {
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 10px;
                text-transform: uppercase;
                font-weight: 600;
            }
            
            .priority-badge {
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 10px;
                text-transform: uppercase;
                font-weight: 600;
                color: white;
            }
            
            .priority-critical { background: #ef4444; }
            .priority-high { background: #f59e0b; }
            .priority-medium { background: #3b82f6; }
            .priority-low { background: #6b7280; }
            
            .notification-actions {
                display: flex;
                gap: 8px;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .history-notification-item:hover .notification-actions {
                opacity: 1;
            }
            
            .history-pagination {
                padding: 20px 25px;
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }
            
            .pagination-info {
                color: #666;
                font-size: 14px;
            }
            
            .pagination-controls {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .pagination-btn {
                padding: 8px 12px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
            }
            
            .pagination-btn:hover {
                background: #f8f9fa;
            }
            
            .pagination-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .pagination-btn.active {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }
            
            .empty-history {
                padding: 60px 40px;
                text-align: center;
                color: #888;
            }
            
            .empty-history i {
                font-size: 64px;
                margin-bottom: 20px;
                opacity: 0.3;
            }
            
            @media (max-width: 768px) {
                .history-modal-content {
                    width: 100%;
                    height: 100%;
                    border-radius: 0;
                }
                
                .history-filters {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .filter-group {
                    min-width: auto;
                }
                
                .history-stats {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .stat-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .stat-value {
                    font-size: 18px;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    
    setupEventListeners() {
        // Close modal
        document.getElementById('close-history').addEventListener('click', () => {
            this.hide();
        });
        
        // Backdrop click to close
        this.historyModal.querySelector('.modal-backdrop').addEventListener('click', () => {
            this.hide();
        });
        
        // Filter controls
        document.getElementById('apply-filters').addEventListener('click', () => {
            this.applyFilters();
        });
        
        document.getElementById('reset-filters').addEventListener('click', () => {
            this.resetFilters();
        });
        
        document.getElementById('search-notifications').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });
        
        // Export functionality
        document.getElementById('export-notifications').addEventListener('click', () => {
            this.exportNotifications();
        });
        
        // Clear read notifications
        document.getElementById('clear-read-notifications').addEventListener('click', () => {
            this.clearReadNotifications();
        });
        
        // Date range change
        document.getElementById('filter-date').addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                this.showCustomDatePicker();
            }
        });
    }
    
    async loadNotificationHistory() {
        try {
            const params = new URLSearchParams({
                limit: this.itemsPerPage * this.currentPage,
                ...this.buildFilterParams()
            });
            
            const response = await fetch(`${this.apiBase}/list?${params}`, {
                headers: {
                    'X-User-ID': this.userId,
                    'X-User-Type': this.userType,
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.notifications = result.data.notifications || [];
                this.updateHistoryUI();
                this.updateStats();
            } else {
                this.showEmptyHistory('Failed to load notification history');
            }
        } catch (error) {
            console.error('Error loading notification history:', error);
            this.showEmptyHistory('Error loading notification history');
        }
    }
    
    buildFilterParams() {
        const params = {};
        
        if (this.filters.type !== 'all') {
            params.type = this.filters.type;
        }
        
        if (this.filters.status === 'unread') {
            params.unread_only = 'true';
        } else if (this.filters.status === 'read') {
            params.read_only = 'true';
        }
        
        if (this.filters.priority !== 'all') {
            params.priority = this.filters.priority;
        }
        
        if (this.filters.dateRange !== 'all') {
            params.date_range = this.filters.dateRange;
        }
        
        const searchTerm = document.getElementById('search-notifications')?.value;
        if (searchTerm) {
            params.search = searchTerm;
        }
        
        return params;
    }
    
    updateHistoryUI() {
        const listContainer = document.getElementById('history-list');
        
        if (this.notifications.length === 0) {
            this.showEmptyHistory();
            return;
        }
        
        listContainer.innerHTML = this.notifications.map(notification => `
            <div class="history-notification-item ${!notification.read ? 'unread' : ''} ${notification.priority}" 
                 onclick="notificationHistory.viewNotificationDetails('${notification.id}')">
                <div class="history-notification-header">
                    <div>
                        <div class="history-notification-title">${notification.title}</div>
                        <div class="history-notification-meta">
                            <span><i class="fas fa-clock"></i> ${this.formatDateTime(notification.created_at)}</span>
                            <span class="notification-type-badge ${notification.type}">${this.formatType(notification.type)}</span>
                            <span class="priority-badge priority-${notification.priority}">${notification.priority}</span>
                            ${!notification.read ? '<span style="color: #667eea; font-weight: 600;"><i class="fas fa-circle" style="font-size: 6px;"></i> Unread</span>' : ''}
                        </div>
                    </div>
                    <div class="notification-actions">
                        ${!notification.read ? `<button class="btn btn-xs btn-primary" onclick="event.stopPropagation(); notificationHistory.markAsRead('${notification.id}')">Mark Read</button>` : ''}
                        <button class="btn btn-xs btn-outline" onclick="event.stopPropagation(); notificationHistory.deleteNotification('${notification.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="history-notification-message">${notification.message}</div>
                <div class="history-notification-footer">
                    <span class="notification-id">ID: ${notification.id}</span>
                    <span class="notification-channels">
                        ${notification.channels ? notification.channels.map(ch => `<i class="fas fa-${this.getChannelIcon(ch)}" title="${ch}"></i>`).join(' ') : ''}
                    </span>
                </div>
            </div>
        `).join('');
        
        this.updatePagination();
    }
    
    updateStats() {
        const stats = this.calculateStats();
        
        document.getElementById('total-notifications').textContent = stats.total;
        document.getElementById('unread-notifications').textContent = stats.unread;
        document.getElementById('high-priority-notifications').textContent = stats.highPriority;
        document.getElementById('this-week-notifications').textContent = stats.thisWeek;
    }
    
    calculateStats() {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        return {
            total: this.notifications.length,
            unread: this.notifications.filter(n => !n.read).length,
            highPriority: this.notifications.filter(n => n.priority === 'high' || n.priority === 'critical').length,
            thisWeek: this.notifications.filter(n => new Date(n.created_at) >= oneWeekAgo).length
        };
    }
    
    updatePagination() {
        const paginationContainer = document.getElementById('history-pagination');
        const totalItems = this.notifications.length;
        const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
        
        this.totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        paginationContainer.innerHTML = `
            <div class="pagination-info">
                Showing ${startItem}-${endItem} of ${totalItems} notifications
            </div>
            <div class="pagination-controls">
                <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
                        onclick="notificationHistory.changePage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                
                ${this.generatePageNumbers()}
                
                <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} 
                        onclick="notificationHistory.changePage(${this.currentPage + 1})">
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }
    
    generatePageNumbers() {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(this.totalPages, start + maxVisible - 1);
        
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        for (let i = start; i <= end; i++) {
            pages.push(`
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="notificationHistory.changePage(${i})">${i}</button>
            `);
        }
        
        return pages.join('');
    }
    
    showEmptyHistory(message = 'No notifications found') {
        const listContainer = document.getElementById('history-list');
        listContainer.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-inbox"></i>
                <h3>No Notifications</h3>
                <p>${message}</p>
                ${message.includes('Error') ? `
                    <button class="btn btn-primary" onclick="notificationHistory.loadNotificationHistory()">
                        <i class="fas fa-refresh"></i> Retry
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    applyFilters() {
        this.filters.type = document.getElementById('filter-type').value;
        this.filters.status = document.getElementById('filter-status').value;
        this.filters.priority = document.getElementById('filter-priority').value;
        this.filters.dateRange = document.getElementById('filter-date').value;
        
        this.currentPage = 1;
        this.loadNotificationHistory();
    }
    
    resetFilters() {
        this.filters = {
            type: 'all',
            status: 'all',
            dateRange: 'all',
            priority: 'all'
        };
        
        document.getElementById('filter-type').value = 'all';
        document.getElementById('filter-status').value = 'all';
        document.getElementById('filter-priority').value = 'all';
        document.getElementById('filter-date').value = 'all';
        document.getElementById('search-notifications').value = '';
        
        this.currentPage = 1;
        this.loadNotificationHistory();
    }
    
    changePage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadNotificationHistory();
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
                if (notification) {
                    notification.read = true;
                    this.updateHistoryUI();
                    this.updateStats();
                }
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }
    
    async deleteNotification(notificationId) {
        if (!confirm('Are you sure you want to delete this notification?')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'X-User-ID': this.userId,
                    'X-User-Type': this.userType,
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            if (response.ok) {
                // Remove from local state
                this.notifications = this.notifications.filter(n => n.id !== notificationId);
                this.updateHistoryUI();
                this.updateStats();
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            alert('Failed to delete notification');
        }
    }
    
    async clearReadNotifications() {
        if (!confirm('Are you sure you want to clear all read notifications?')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/clear-read`, {
                method: 'POST',
                headers: {
                    'X-User-ID': this.userId,
                    'X-User-Type': this.userType,
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            if (response.ok) {
                this.loadNotificationHistory();
                this.showToast('Read notifications cleared successfully', 'success');
            }
        } catch (error) {
            console.error('Error clearing read notifications:', error);
            this.showToast('Failed to clear read notifications', 'error');
        }
    }
    
    exportNotifications() {
        const format = prompt('Export format (csv/json):', 'csv');
        if (!format) return;
        
        const data = this.notifications.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            priority: n.priority,
            read: n.read,
            created_at: n.created_at,
            read_at: n.read_at
        }));
        
        let content, mimeType, filename;
        
        if (format.toLowerCase() === 'json') {
            content = JSON.stringify(data, null, 2);
            mimeType = 'application/json';
            filename = 'notifications.json';
        } else {
            // CSV format
            const headers = ['ID', 'Title', 'Message', 'Type', 'Priority', 'Status', 'Created', 'Read'];
            const rows = data.map(n => [
                n.id,
                `"${n.title}"`,
                `"${n.message.replace(/"/g, '""')}"`,
                n.type,
                n.priority,
                n.read ? 'Read' : 'Unread',
                n.created_at,
                n.read_at || ''
            ]);
            
            content = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
            mimeType = 'text/csv';
            filename = 'notifications.csv';
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        this.showToast(`Notifications exported as ${filename}`, 'success');
    }
    
    viewNotificationDetails(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;
        
        // Create detailed view modal
        const detailModal = document.createElement('div');
        detailModal.className = 'notification-detail-modal';
        detailModal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="detail-modal-content">
                <div class="detail-header">
                    <h3>${notification.title}</h3>
                    <button class="modal-close" onclick="this.closest('.notification-detail-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="detail-body">
                    <div class="detail-meta">
                        <div class="meta-item">
                            <strong>Type:</strong> 
                            <span class="notification-type-badge ${notification.type}">${this.formatType(notification.type)}</span>
                        </div>
                        <div class="meta-item">
                            <strong>Priority:</strong> 
                            <span class="priority-badge priority-${notification.priority}">${notification.priority}</span>
                        </div>
                        <div class="meta-item">
                            <strong>Status:</strong> 
                            ${notification.read ? '<span style="color: #22c55e;">Read</span>' : '<span style="color: #ef4444;">Unread</span>'}
                        </div>
                        <div class="meta-item">
                            <strong>Created:</strong> ${this.formatDateTime(notification.created_at)}
                        </div>
                        ${notification.read_at ? `
                            <div class="meta-item">
                                <strong>Read:</strong> ${this.formatDateTime(notification.read_at)}
                            </div>
                        ` : ''}
                    </div>
                    <div class="detail-message">
                        <h4>Message:</h4>
                        <p>${notification.message}</p>
                    </div>
                    ${notification.metadata && Object.keys(notification.metadata).length > 0 ? `
                        <div class="detail-metadata">
                            <h4>Additional Information:</h4>
                            <pre>${JSON.stringify(notification.metadata, null, 2)}</pre>
                        </div>
                    ` : ''}
                </div>
                <div class="detail-footer">
                    ${!notification.read ? `
                        <button class="btn btn-primary" onclick="notificationHistory.markAsRead('${notification.id}'); this.closest('.notification-detail-modal').remove();">
                            Mark as Read
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="this.closest('.notification-detail-modal').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(detailModal);
        detailModal.style.display = 'flex';
        detailModal.style.alignItems = 'center';
        detailModal.style.justifyContent = 'center';
    }
    
    show() {
        this.historyModal.classList.add('visible');
        this.isVisible = true;
        this.loadNotificationHistory();
    }
    
    hide() {
        this.historyModal.classList.remove('visible');
        this.isVisible = false;
    }
    
    // Utility methods
    formatDateTime(timestamp) {
        return new Date(timestamp).toLocaleString();
    }
    
    formatType(type) {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    getChannelIcon(channel) {
        const icons = {
            web: 'globe',
            email: 'envelope',
            telegram: 'paper-plane',
            push: 'bell',
            sms: 'mobile-alt'
        };
        return icons[channel] || 'question-circle';
    }
    
    showToast(message, type = 'info') {
        // Reuse toast functionality from NotificationSystem
        if (window.NotificationSystem) {
            const tempSystem = new window.NotificationSystem({ container: document.body });
            tempSystem.showToast(message, type);
        } else {
            alert(message);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationHistory;
}

// Global instance for easy access
window.NotificationHistory = NotificationHistory;