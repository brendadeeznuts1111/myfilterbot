/**
 * FantDev Trading Platform - Core JavaScript
 * Unified functionality for all portal pages
 */

class FantDevApp {
    constructor() {
        this.theme = localStorage.getItem('fantdev-theme') || 'light';
        this.notifications = [];
        this.userDropdownOpen = false;
        this.notificationPanelOpen = false;
        
        this.init();
    }
    
    init() {
        this.setupTheme();
        this.setupEventListeners();
        this.loadNotifications();
    }
    
    // Theme Management
    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeIcon();
    }
    
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('fantdev-theme', this.theme);
        this.updateThemeIcon();
        
        // Animate theme transition
        document.body.style.transition = 'background-color 0.3s ease-in-out, color 0.3s ease-in-out';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
        
        // Update charts if they exist
        this.updateChartsTheme();
        
        // Dispatch theme change event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: this.theme } }));
        
        this.showToast('Theme switched to ' + this.theme + ' mode', 'info');
    }
    
    updateThemeIcon() {
        const icon = document.getElementById('theme-icon');
        if (icon) {
            // Update icon based on current theme
            icon.className = this.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            icon.title = this.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
        }
    }
    
    // Event Listeners
    setupEventListeners() {
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.fantdev-user-profile') && !e.target.closest('.fantdev-user-dropdown')) {
                this.closeUserDropdown();
            }
            if (!e.target.closest('.fantdev-notification-btn') && !e.target.closest('.fantdev-notification-panel')) {
                this.closeNotificationPanel();
            }
        });
        
        // Mobile menu toggle
        document.addEventListener('click', (e) => {
            if (e.target.matches('.mobile-menu-toggle')) {
                this.toggleMobileMenu();
            }
        });
        
        // Form validation
        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('fantdev-form')) {
                this.handleFormSubmit(e);
            }
        });
        
        // Auto-save forms
        document.addEventListener('input', (e) => {
            if (e.target.hasAttribute('data-autosave')) {
                this.debounce(() => this.autoSave(e.target), 1000)();
            }
        });
    }
    
    // Navigation
    toggleUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            this.userDropdownOpen = !this.userDropdownOpen;
            dropdown.style.display = this.userDropdownOpen ? 'block' : 'none';
        }
    }
    
    closeUserDropdown() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown && this.userDropdownOpen) {
            this.userDropdownOpen = false;
            dropdown.style.display = 'none';
        }
    }
    
    toggleMobileMenu() {
        const mobileNav = document.getElementById('mobile-nav');
        if (mobileNav) {
            mobileNav.classList.toggle('active');
        }
    }
    
    // Notifications
    async loadNotifications() {
        try {
            // In production, this would fetch from API
            // For now, we'll use mock data
            this.notifications = [
                {
                    id: 1,
                    title: 'New customer registered',
                    message: 'BB1052 has registered successfully',
                    type: 'info',
                    timestamp: new Date(Date.now() - 300000).toISOString(),
                    read: false
                },
                {
                    id: 2,
                    title: 'Large withdrawal detected',
                    message: 'Customer BB1045 withdrew $5,000',
                    type: 'warning',
                    timestamp: new Date(Date.now() - 600000).toISOString(),
                    read: false
                },
                {
                    id: 3,
                    title: 'System maintenance completed',
                    message: 'All systems are now operational',
                    type: 'success',
                    timestamp: new Date(Date.now() - 1800000).toISOString(),
                    read: true
                }
            ];
            
            this.updateNotificationBadge();
            this.renderNotifications();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    updateNotificationBadge() {
        const badge = document.getElementById('notification-count');
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    renderNotifications() {
        const list = document.getElementById('notification-list');
        if (!list) return;
        
        if (this.notifications.length === 0) {
            list.innerHTML = '<div class="fantdev-notification-empty">No notifications</div>';
            return;
        }
        
        list.innerHTML = this.notifications.map(notification => `
            <div class="fantdev-notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
                <div class="fantdev-notification-icon fantdev-notification-${notification.type}">
                    <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="fantdev-notification-content">
                    <div class="fantdev-notification-title">${notification.title}</div>
                    <div class="fantdev-notification-message">${notification.message}</div>
                    <div class="fantdev-notification-time">${this.formatTimeAgo(notification.timestamp)}</div>
                </div>
                ${!notification.read ? '<div class="fantdev-notification-dot"></div>' : ''}
            </div>
        `).join('');
        
        // Add click listeners
        list.querySelectorAll('.fantdev-notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                this.markNotificationRead(id);
            });
        });
    }
    
    getNotificationIcon(type) {
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-exclamation-circle'
        };
        return icons[type] || 'fa-bell';
    }
    
    toggleNotifications() {
        const panel = document.getElementById('notification-panel');
        if (panel) {
            this.notificationPanelOpen = !this.notificationPanelOpen;
            panel.classList.toggle('active');
        }
    }
    
    closeNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        if (panel && this.notificationPanelOpen) {
            this.notificationPanelOpen = false;
            panel.classList.remove('active');
        }
    }
    
    markNotificationRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
            notification.read = true;
            this.updateNotificationBadge();
            this.renderNotifications();
        }
    }
    
    markAllRead() {
        this.notifications.forEach(n => n.read = true);
        this.updateNotificationBadge();
        this.renderNotifications();
        this.showToast('All notifications marked as read', 'success');
    }
    
    // Loading State Management
    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }
    
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    showNotification(message, type = 'info') {
        this.showToast(message, type);
    }
    
    getToken() {
        // This would get the auth token from cookies or localStorage
        return localStorage.getItem('fantdev-token') || '';
    }
    
    // Toast Messages
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `fantdev-toast fantdev-toast-${type}`;
        toast.innerHTML = `
            <div class="fantdev-toast-icon">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
            </div>
            <div class="fantdev-toast-content">
                <div class="fantdev-toast-message">${message}</div>
            </div>
            <button class="fantdev-toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }
    
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fantdev-toast-container';
        document.body.appendChild(container);
        return container;
    }
    
    // API Utilities
    async apiRequest(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await fetch(endpoint, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error('API request failed:', error);
            this.showToast(`Request failed: ${error.message}`, 'error');
            throw error;
        }
    }
    
    // Form Handling
    handleFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        
        // Basic validation
        const invalidFields = this.validateForm(form);
        if (invalidFields.length > 0) {
            this.showValidationErrors(invalidFields);
            return false;
        }
        
        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="fantdev-loading"></div> Processing...';
            
            // Reset after 3 seconds (or when actual submission completes)
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }, 3000);
        }
        
        return true;
    }
    
    validateForm(form) {
        const invalidFields = [];
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                invalidFields.push({
                    field: field,
                    message: 'This field is required'
                });
            }
        });
        
        // Email validation
        const emailFields = form.querySelectorAll('input[type="email"]');
        emailFields.forEach(field => {
            if (field.value && !this.isValidEmail(field.value)) {
                invalidFields.push({
                    field: field,
                    message: 'Please enter a valid email address'
                });
            }
        });
        
        return invalidFields;
    }
    
    showValidationErrors(invalidFields) {
        // Clear previous errors
        document.querySelectorAll('.fantdev-field-error').forEach(error => error.remove());
        
        invalidFields.forEach(({ field, message }) => {
            field.classList.add('fantdev-input-error');
            
            const error = document.createElement('div');
            error.className = 'fantdev-field-error';
            error.textContent = message;
            field.parentNode.appendChild(error);
        });
        
        // Focus first invalid field
        if (invalidFields.length > 0) {
            invalidFields[0].field.focus();
        }
    }
    
    autoSave(field) {
        const formData = new FormData(field.form);
        const data = Object.fromEntries(formData.entries());
        
        localStorage.setItem('fantdev-autosave-' + field.form.id, JSON.stringify(data));
        
        // Show save indicator
        this.showSaveIndicator(field);
    }
    
    showSaveIndicator(field) {
        let indicator = field.parentNode.querySelector('.fantdev-save-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'fantdev-save-indicator';
            field.parentNode.appendChild(indicator);
        }
        
        indicator.textContent = 'Saving...';
        indicator.style.opacity = '1';
        
        setTimeout(() => {
            indicator.textContent = 'Saved';
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 1000);
        }, 500);
    }
    
    // Utility Functions
    formatTimeAgo(timestamp) {
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
    
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }
    
    formatNumber(number, decimals = 0) {
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: decimals,
            minimumFractionDigits: decimals
        }).format(number);
    }
    
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Data Management
    async loadCustomerData(customerId) {
        try {
            const data = await this.apiRequest(`/api/customer/${customerId}`);
            return data;
        } catch (error) {
            console.error('Error loading customer data:', error);
            return null;
        }
    }
    
    async loadStats() {
        try {
            const stats = await this.apiRequest('/api/stats');
            return stats;
        } catch (error) {
            console.error('Error loading stats:', error);
            return null;
        }
    }
    
    // Chart Utilities (if Chart.js is available)
    createChart(ctx, config) {
        if (typeof Chart !== 'undefined') {
            // Apply theme-aware colors
            const themeColors = this.getChartColors();
            
            return new Chart(ctx, {
                ...config,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: config.options?.plugins?.legend?.display !== false,
                            labels: {
                                color: themeColors.text
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: themeColors.text
                            },
                            grid: {
                                color: themeColors.grid
                            }
                        },
                        y: {
                            ticks: {
                                color: themeColors.text
                            },
                            grid: {
                                color: themeColors.grid
                            }
                        },
                        ...config.options?.scales
                    },
                    ...config.options
                }
            });
        } else {
            console.warn('Chart.js not loaded');
            return null;
        }
    }
    
    getChartColors() {
        const computedStyle = getComputedStyle(document.documentElement);
        return {
            grid: computedStyle.getPropertyValue('--chart-grid').trim(),
            text: computedStyle.getPropertyValue('--chart-text').trim(),
            line1: computedStyle.getPropertyValue('--chart-line-1').trim(),
            line2: computedStyle.getPropertyValue('--chart-line-2').trim(),
            line3: computedStyle.getPropertyValue('--chart-line-3').trim(),
            area1: computedStyle.getPropertyValue('--chart-area-1').trim(),
            area2: computedStyle.getPropertyValue('--chart-area-2').trim(),
            area3: computedStyle.getPropertyValue('--chart-area-3').trim()
        };
    }
    
    updateChartsTheme() {
        // Update all Chart.js instances with new theme colors
        if (typeof Chart !== 'undefined' && Chart.instances) {
            const themeColors = this.getChartColors();
            
            Object.values(Chart.instances).forEach(chart => {
                if (chart && chart.options) {
                    // Update legend colors
                    if (chart.options.plugins?.legend?.labels) {
                        chart.options.plugins.legend.labels.color = themeColors.text;
                    }
                    
                    // Update scales colors
                    if (chart.options.scales) {
                        Object.values(chart.options.scales).forEach(scale => {
                            if (scale.ticks) scale.ticks.color = themeColors.text;
                            if (scale.grid) scale.grid.color = themeColors.grid;
                        });
                    }
                    
                    // Update dataset colors if using theme variables
                    chart.data.datasets.forEach((dataset, index) => {
                        if (dataset.borderColor && typeof dataset.borderColor === 'string') {
                            dataset.borderColor = themeColors[`line${index + 1}`] || themeColors.line1;
                        }
                        if (dataset.backgroundColor && typeof dataset.backgroundColor === 'string') {
                            dataset.backgroundColor = themeColors[`area${index + 1}`] || themeColors.area1;
                        }
                    });
                    
                    chart.update('none'); // Update without animation
                }
            });
        }
    }
    
    // Modal Management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Focus trap
            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    // Export functionality
    exportData(data, filename, format = 'json') {
        let content, mimeType, extension;
        
        switch (format) {
            case 'csv':
                content = this.jsonToCsv(data);
                mimeType = 'text/csv';
                extension = 'csv';
                break;
            case 'json':
            default:
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
                extension = 'json';
                break;
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        this.showToast(`${filename}.${extension} downloaded successfully`, 'success');
    }
    
    jsonToCsv(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    JSON.stringify(row[header] || '')
                ).join(',')
            )
        ].join('\n');
        
        return csvContent;
    }
}

// Global functions for template compatibility
window.toggleTheme = () => app.toggleTheme();
window.toggleNotifications = () => app.toggleNotifications();
window.toggleUserMenu = () => app.toggleUserMenu();
window.markAllRead = () => app.markAllRead();
window.updateThemeIcon = () => app.updateThemeIcon();
window.loadNotifications = () => app.loadNotifications();

// Initialize app when DOM is ready
let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new FantDevApp();
    });
} else {
    app = new FantDevApp();
}