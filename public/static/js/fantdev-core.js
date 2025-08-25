/**
 * FantDev Trading Platform - Enhanced Core JavaScript
 * Unified functionality for all portal pages with modern features
 * Version: 1.6.0 - Enhanced with PWA, performance optimizations, and advanced features
 */

class FantDevApp {
    constructor() {
        // Core state
        this.theme = localStorage.getItem('fantdev-theme') || 'light';
        this.notifications = [];
        this.userDropdownOpen = false;
        this.notificationPanelOpen = false;

        // Enhanced features
        this.isOnline = navigator.onLine;
        this.performanceMetrics = {};
        this.eventListeners = new Map();
        this.observers = new Map();
        this.cache = new Map();
        this.retryQueue = [];

        // Performance monitoring
        this.startTime = performance.now();

        this.init();
    }
    
    async init() {
        try {
            // Initialize core features
            this.setupTheme();
            this.setupEventListeners();
            this.setupPerformanceMonitoring();
            this.setupNetworkMonitoring();
            this.setupIntersectionObserver();

            // Load data
            await this.loadNotifications();

            // Initialize PWA features
            this.initializePWA();

            // Setup error handling
            this.setupErrorHandling();

            // Mark initialization complete
            this.performanceMetrics.initTime = performance.now() - this.startTime;
            this.dispatchEvent('appInitialized', { metrics: this.performanceMetrics });

            console.log(`FantDev App initialized in ${this.performanceMetrics.initTime.toFixed(2)}ms`);
        } catch (error) {
            console.error('Failed to initialize FantDev App:', error);
            this.handleError(error, 'initialization');
        }
    }
    
    // Enhanced Performance Monitoring
    setupPerformanceMonitoring() {
        // Monitor Core Web Vitals
        if ('PerformanceObserver' in window) {
            // Largest Contentful Paint
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.performanceMetrics.lcp = entry.startTime;
                }
            }).observe({ entryTypes: ['largest-contentful-paint'] });

            // First Input Delay
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.performanceMetrics.fid = entry.processingStart - entry.startTime;
                }
            }).observe({ entryTypes: ['first-input'] });

            // Cumulative Layout Shift
            new PerformanceObserver((list) => {
                let clsValue = 0;
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                this.performanceMetrics.cls = clsValue;
            }).observe({ entryTypes: ['layout-shift'] });
        }
    }

    // Network Monitoring
    setupNetworkMonitoring() {
        // Online/offline detection
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showToast('Connection restored', 'success');
            this.processRetryQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showToast('Connection lost - working offline', 'warning');
        });

        // Network quality detection
        if ('connection' in navigator) {
            const connection = navigator.connection;
            this.performanceMetrics.networkType = connection.effectiveType;
            this.performanceMetrics.downlink = connection.downlink;

            connection.addEventListener('change', () => {
                this.performanceMetrics.networkType = connection.effectiveType;
                this.performanceMetrics.downlink = connection.downlink;
                this.optimizeForNetwork();
            });
        }
    }

    // Intersection Observer for lazy loading
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.observers.set('lazy', new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadLazyContent(entry.target);
                        this.observers.get('lazy').unobserve(entry.target);
                    }
                });
            }, { rootMargin: '50px' }));
        }
    }

    // PWA Initialization
    initializePWA() {
        // Service Worker registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                    this.setupPushNotifications(registration);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }

        // Install prompt handling
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });

        // App installed detection
        window.addEventListener('appinstalled', () => {
            this.showToast('App installed successfully!', 'success');
            this.deferredPrompt = null;
        });
    }

    // Enhanced Error Handling
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'javascript', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'promise');
            event.preventDefault();
        });
    }

    // Theme Management
    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeIcon();

        // System theme detection
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (!localStorage.getItem('fantdev-theme')) {
                    this.theme = e.matches ? 'dark' : 'light';
                    this.setupTheme();
                }
            });
        }
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
    
    // Enhanced Event Listeners
    setupEventListeners() {
        // Close dropdowns when clicking outside
        this.addEventListener(document, 'click', (e) => {
            if (!e.target.closest('.fantdev-user-profile') && !e.target.closest('.fantdev-user-dropdown')) {
                this.closeUserDropdown();
            }
            if (!e.target.closest('.fantdev-notification-btn') && !e.target.closest('.fantdev-notification-panel')) {
                this.closeNotificationPanel();
            }
        });

        // Mobile menu toggle
        this.addEventListener(document, 'click', (e) => {
            if (e.target.matches('.mobile-menu-toggle')) {
                this.toggleMobileMenu();
            }
        });

        // Form validation
        this.addEventListener(document, 'submit', (e) => {
            if (e.target.classList.contains('fantdev-form')) {
                this.handleFormSubmit(e);
            }
        });

        // Auto-save forms
        this.addEventListener(document, 'input', (e) => {
            if (e.target.hasAttribute('data-autosave')) {
                this.debounce(() => this.autoSave(e.target), 1000)();
            }
        });

        // Keyboard shortcuts
        this.addEventListener(document, 'keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Lazy loading observer
        this.addEventListener(document, 'DOMContentLoaded', () => {
            this.observeLazyElements();
        });

        // Page visibility for performance optimization
        this.addEventListener(document, 'visibilitychange', () => {
            if (document.hidden) {
                this.pauseNonEssentialTasks();
            } else {
                this.resumeNonEssentialTasks();
            }
        });
    }

    // Enhanced event listener management
    addEventListener(element, event, handler, options = {}) {
        const key = `${element.constructor.name}-${event}`;
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }
        this.eventListeners.get(key).push({ handler, options });
        element.addEventListener(event, handler, options);
    }

    removeEventListener(element, event, handler) {
        const key = `${element.constructor.name}-${event}`;
        if (this.eventListeners.has(key)) {
            const listeners = this.eventListeners.get(key);
            const index = listeners.findIndex(l => l.handler === handler);
            if (index > -1) {
                listeners.splice(index, 1);
                element.removeEventListener(event, handler);
            }
        }
    }

    // Custom event dispatcher
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(`fantdev:${eventName}`, { detail });
        document.dispatchEvent(event);
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

            // Animate hamburger icon
            const toggle = document.querySelector('.mobile-menu-toggle');
            if (toggle) {
                toggle.classList.toggle('active');
            }

            // Prevent body scroll when menu is open
            document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
        }
    }

    // Enhanced keyboard shortcuts
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.openSearch();
        }

        // Ctrl/Cmd + / for help
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            this.showHelp();
        }

        // Escape to close modals/dropdowns
        if (e.key === 'Escape') {
            this.closeAllDropdowns();
            this.closeAllModals();
        }

        // Alt + T for theme toggle
        if (e.altKey && e.key === 't') {
            e.preventDefault();
            this.toggleTheme();
        }
    }

    // Performance optimization methods
    pauseNonEssentialTasks() {
        // Pause animations, reduce polling frequency, etc.
        this.dispatchEvent('taskspaused');
    }

    resumeNonEssentialTasks() {
        // Resume normal operations
        this.dispatchEvent('tasksresumed');
    }

    // Lazy loading management
    observeLazyElements() {
        const lazyElements = document.querySelectorAll('[data-lazy]');
        if (this.observers.has('lazy')) {
            lazyElements.forEach(el => this.observers.get('lazy').observe(el));
        }
    }

    loadLazyContent(element) {
        const src = element.dataset.lazy;
        if (src) {
            if (element.tagName === 'IMG') {
                element.src = src;
            } else if (element.tagName === 'IFRAME') {
                element.src = src;
            }
            element.removeAttribute('data-lazy');
            element.classList.add('loaded');
        }
    }

    // Network optimization
    optimizeForNetwork() {
        const connection = navigator.connection;
        if (connection) {
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                // Reduce image quality, disable animations
                document.body.classList.add('slow-connection');
                this.dispatchEvent('slowconnection');
            } else {
                document.body.classList.remove('slow-connection');
                this.dispatchEvent('fastconnection');
            }
        }
    }

    // Retry queue for offline actions
    addToRetryQueue(action) {
        this.retryQueue.push({
            action,
            timestamp: Date.now(),
            attempts: 0
        });
    }

    async processRetryQueue() {
        const maxAttempts = 3;
        const retryDelay = 1000;

        for (let i = this.retryQueue.length - 1; i >= 0; i--) {
            const item = this.retryQueue[i];

            if (item.attempts >= maxAttempts) {
                this.retryQueue.splice(i, 1);
                continue;
            }

            try {
                await item.action();
                this.retryQueue.splice(i, 1);
                this.showToast('Offline action completed', 'success');
            } catch (error) {
                item.attempts++;
                if (item.attempts >= maxAttempts) {
                    this.retryQueue.splice(i, 1);
                    this.showToast('Failed to sync offline action', 'error');
                } else {
                    setTimeout(() => this.processRetryQueue(), retryDelay * item.attempts);
                }
            }
        }
    }

    // Enhanced error handling
    handleError(error, context = 'unknown', metadata = {}) {
        const errorInfo = {
            message: error.message || error,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...metadata
        };

        // Log to console
        console.error('FantDev Error:', errorInfo);

        // Send to error tracking service (if available)
        if (window.errorTracker) {
            window.errorTracker.captureException(error, errorInfo);
        }

        // Show user-friendly message
        if (context !== 'initialization') {
            this.showToast('Something went wrong. Please try again.', 'error');
        }

        // Dispatch error event
        this.dispatchEvent('error', errorInfo);
    }

    // PWA Install prompt
    showInstallPrompt() {
        if (this.deferredPrompt) {
            const installBanner = document.createElement('div');
            installBanner.className = 'install-banner';
            installBanner.innerHTML = `
                <div class="install-content">
                    <i class="fas fa-download"></i>
                    <span>Install FantDev Trading for a better experience</span>
                    <button class="install-btn">Install</button>
                    <button class="install-close">×</button>
                </div>
            `;

            document.body.appendChild(installBanner);

            installBanner.querySelector('.install-btn').addEventListener('click', () => {
                this.installApp();
            });

            installBanner.querySelector('.install-close').addEventListener('click', () => {
                installBanner.remove();
            });
        }
    }

    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                this.showToast('App will be installed shortly', 'success');
            }

            this.deferredPrompt = null;
            document.querySelector('.install-banner')?.remove();
        }
    }

    // Push notifications setup
    async setupPushNotifications(registration) {
        if ('PushManager' in window && 'Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // Subscribe to push notifications
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: this.urlBase64ToUint8Array(
                            'YOUR_VAPID_PUBLIC_KEY' // Replace with actual VAPID key
                        )
                    });

                    // Send subscription to server
                    await this.sendSubscriptionToServer(subscription);
                }
            } catch (error) {
                console.error('Push notification setup failed:', error);
            }
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async sendSubscriptionToServer(subscription) {
        // Send subscription to your server
        try {
            await this.apiRequest('/api/push-subscribe', {
                method: 'POST',
                body: JSON.stringify(subscription)
            });
        } catch (error) {
            console.error('Failed to send subscription to server:', error);
        }
    }

    // Helper methods
    openSearch() {
        const searchModal = document.getElementById('search-modal');
        if (searchModal) {
            this.showModal('search-modal');
            const searchInput = searchModal.querySelector('input[type="search"]');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }

    showHelp() {
        this.showModal('help-modal');
    }

    closeAllDropdowns() {
        this.closeUserDropdown();
        this.closeNotificationPanel();
    }

    closeAllModals() {
        document.querySelectorAll('.modal[style*="flex"]').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = '';
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
    
    // Enhanced API Utilities with caching and retry logic
    async apiRequest(endpoint, options = {}) {
        const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
        const useCache = options.cache !== false;
        const maxRetries = options.maxRetries || 3;
        const retryDelay = options.retryDelay || 1000;

        // Check cache first for GET requests
        if (useCache && (!options.method || options.method === 'GET')) {
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < (options.cacheTime || 300000)) {
                return cached.data;
            }
        }

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        const token = this.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const startTime = performance.now();
                const response = await fetch(endpoint, config);
                const endTime = performance.now();

                // Track API performance
                this.performanceMetrics.apiCalls = this.performanceMetrics.apiCalls || [];
                this.performanceMetrics.apiCalls.push({
                    endpoint,
                    duration: endTime - startTime,
                    status: response.status,
                    timestamp: Date.now()
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                let data;

                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }

                // Cache successful GET requests
                if (useCache && (!options.method || options.method === 'GET')) {
                    this.cache.set(cacheKey, {
                        data,
                        timestamp: Date.now()
                    });
                }

                return data;

            } catch (error) {
                lastError = error;

                // Don't retry on client errors (4xx)
                if (error.message.includes('HTTP 4')) {
                    break;
                }

                // If offline, add to retry queue
                if (!this.isOnline) {
                    this.addToRetryQueue(() => this.apiRequest(endpoint, options));
                    throw new Error('Request queued for when connection is restored');
                }

                // Wait before retry
                if (attempt < maxRetries) {
                    await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
                }
            }
        }

        console.error('API request failed after retries:', lastError);
        this.showToast(`Request failed: ${lastError.message}`, 'error');
        throw lastError;
    }

    // Enhanced caching with size limits
    setCacheItem(key, value, ttl = 300000) {
        // Implement LRU cache with size limit
        if (this.cache.size >= 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data: value,
            timestamp: Date.now(),
            ttl
        });
    }

    getCacheItem(key) {
        const item = this.cache.get(key);
        if (item && Date.now() - item.timestamp < item.ttl) {
            return item.data;
        }
        this.cache.delete(key);
        return null;
    }

    clearCache() {
        this.cache.clear();
        this.showToast('Cache cleared', 'info');
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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

    // Enhanced cleanup and memory management
    destroy() {
        // Remove all event listeners
        this.eventListeners.forEach((listeners, key) => {
            listeners.forEach(({ handler }) => {
                const [elementType, event] = key.split('-');
                if (elementType === 'Document') {
                    document.removeEventListener(event, handler);
                } else if (elementType === 'Window') {
                    window.removeEventListener(event, handler);
                }
            });
        });

        // Disconnect observers
        this.observers.forEach(observer => observer.disconnect());

        // Clear caches
        this.cache.clear();

        // Clear retry queue
        this.retryQueue = [];

        console.log('FantDev App destroyed and cleaned up');
    }

    // Performance reporting
    getPerformanceReport() {
        return {
            ...this.performanceMetrics,
            cacheSize: this.cache.size,
            retryQueueSize: this.retryQueue.length,
            isOnline: this.isOnline,
            theme: this.theme,
            notificationCount: this.notifications.length,
            unreadNotifications: this.notifications.filter(n => !n.read).length
        };
    }

    // Health check
    async healthCheck() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            checks: {}
        };

        try {
            // Check API connectivity
            health.checks.api = await this.apiRequest('/api/health', {
                cache: false,
                maxRetries: 1
            }).then(() => 'ok').catch(() => 'error');

            // Check local storage
            try {
                localStorage.setItem('health-check', 'test');
                localStorage.removeItem('health-check');
                health.checks.localStorage = 'ok';
            } catch {
                health.checks.localStorage = 'error';
            }

            // Check service worker
            health.checks.serviceWorker = 'serviceWorker' in navigator ? 'ok' : 'not-supported';

            // Check performance
            health.checks.performance = this.performanceMetrics.lcp < 2500 ? 'ok' : 'warning';

        } catch (error) {
            health.status = 'unhealthy';
            health.error = error.message;
        }

        return health;
    }
}

// Enhanced global functions for template compatibility
window.toggleTheme = () => app?.toggleTheme();
window.toggleNotifications = () => app?.toggleNotifications();
window.toggleUserMenu = () => app?.toggleUserMenu();
window.markAllRead = () => app?.markAllRead();
window.updateThemeIcon = () => app?.updateThemeIcon();
window.loadNotifications = () => app?.loadNotifications();
window.showToast = (message, type, duration) => app?.showToast(message, type, duration);
window.showModal = (modalId) => app?.showModal(modalId);
window.hideModal = (modalId) => app?.hideModal(modalId);
window.exportData = (data, filename, format) => app?.exportData(data, filename, format);
window.clearCache = () => app?.clearCache();
window.getPerformanceMetrics = () => app?.performanceMetrics;

// Enhanced initialization with error handling and performance monitoring
let app;

async function initializeApp() {
    try {
        const initStart = performance.now();
        app = new FantDevApp();

        // Wait for app to fully initialize
        await app.init();

        const initTime = performance.now() - initStart;
        console.log(`✅ FantDev App fully initialized in ${initTime.toFixed(2)}ms`);

        // Dispatch global ready event
        window.dispatchEvent(new CustomEvent('fantdev:ready', {
            detail: {
                app,
                initTime,
                version: '1.6.0'
            }
        }));

        // Optional: Run health check in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            setTimeout(async () => {
                const health = await app.healthCheck();
                console.log('🏥 Health Check:', health);
            }, 2000);
        }

    } catch (error) {
        console.error('❌ Failed to initialize FantDev App:', error);

        // Show fallback error message
        document.body.insertAdjacentHTML('beforeend', `
            <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px; border-radius: 8px; z-index: 10000;">
                <strong>Initialization Error</strong><br>
                Please refresh the page. If the problem persists, contact support.
            </div>
        `);
    }
}

// Initialize based on document state
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (app && typeof app.destroy === 'function') {
        app.destroy();
    }
});

// Export for global access
window.FantDevApp = FantDevApp;
window.fantdevApp = app;