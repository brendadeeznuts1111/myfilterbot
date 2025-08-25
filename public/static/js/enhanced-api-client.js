/**
 * Enhanced API Client for FantDev Trading Platform
 * Centralized API communication with error handling, caching, and retry logic
 * Version: 2.0.0
 */

class EnhancedApiClient {
    /**
     * Initialize the API client
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        // === CONFIGURATION ===
        this.baseURL = config.baseURL || this._getDefaultBaseURL();
        this.timeout = config.timeout || 10000;
        this.retryAttempts = config.retryAttempts || 3;
        this.retryDelay = config.retryDelay || 1000;
        
        // === AUTHENTICATION ===
        this.authToken = null;
        this.refreshToken = null;
        this.tokenExpiryTime = null;
        
        // === CACHING ===
        this.cache = new Map();
        this.cacheTimeout = config.cacheTimeout || 5 * 60 * 1000; // 5 minutes
        
        // === REQUEST MANAGEMENT ===
        this.pendingRequests = new Map();
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        this.rateLimitReset = null;
        this.rateLimitRemaining = null;
        
        // === EVENT HANDLING ===
        this.eventListeners = new Map();
        
        // === INITIALIZATION ===
        this._initialize();
    }
    
    /**
     * Initialize the API client
     * @private
     */
    _initialize() {
        this._setupEventListeners();
        this._loadStoredTokens();
        this._startTokenRefreshTimer();
        
        this._log('API Client initialized');
    }
    
    /**
     * Get default base URL based on environment
     * @private
     * @returns {string} Base URL
     */
    _getDefaultBaseURL() {
        const { hostname, protocol, port } = window.location;
        
        if (hostname === 'localhost') {
            return `${protocol}//${hostname}:3001/api`;
        }
        
        return `${protocol}//${hostname}/api`;
    }
    
    /**
     * Setup event listeners for network status
     * @private
     */
    _setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this._processQueue();
            this._emit('network-status-change', { online: true });
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this._emit('network-status-change', { online: false });
        });
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this._validateTokenExpiry();
            }
        });
    }
    
    /**
     * Load stored authentication tokens
     * @private
     */
    _loadStoredTokens() {
        try {
            const stored = localStorage.getItem('fantdev_auth_tokens');
            if (stored) {
                const tokens = JSON.parse(stored);
                this.authToken = tokens.authToken;
                this.refreshToken = tokens.refreshToken;
                this.tokenExpiryTime = new Date(tokens.expiryTime);
                
                this._log('Stored tokens loaded');
            }
        } catch (error) {
            this._logError('Failed to load stored tokens:', error);
        }
    }
    
    /**
     * Store authentication tokens
     * @private
     */
    _storeTokens() {
        try {
            const tokens = {
                authToken: this.authToken,
                refreshToken: this.refreshToken,
                expiryTime: this.tokenExpiryTime?.toISOString()
            };
            
            localStorage.setItem('fantdev_auth_tokens', JSON.stringify(tokens));
        } catch (error) {
            this._logError('Failed to store tokens:', error);
        }
    }
    
    /**
     * Start token refresh timer
     * @private
     */
    _startTokenRefreshTimer() {
        setInterval(() => {
            this._validateTokenExpiry();
        }, 60000); // Check every minute
    }
    
    /**
     * Validate token expiry and refresh if needed
     * @private
     */
    async _validateTokenExpiry() {
        if (!this.authToken || !this.tokenExpiryTime) return;
        
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
        
        if (this.tokenExpiryTime <= fiveMinutesFromNow) {
            try {
                await this.refreshAuthToken();
                this._log('Token refreshed automatically');
            } catch (error) {
                this._logError('Auto token refresh failed:', error);
                this._emit('auth-expired');
            }
        }
    }
    
    // === AUTHENTICATION METHODS ===
    
    /**
     * Authenticate with credentials
     * @public
     * @param {Object} credentials - Login credentials
     * @returns {Promise<Object>} Authentication response
     */
    async authenticate(credentials) {
        try {
            const response = await this._makeRequest('POST', '/auth/login', {
                body: credentials,
                skipAuth: true
            });
            
            if (response.success) {
                this.authToken = response.data.token;
                this.refreshToken = response.data.refreshToken;
                this.tokenExpiryTime = new Date(response.data.expiryTime);
                
                this._storeTokens();
                this._emit('authenticated', response.data);
                
                this._log('Authentication successful');
            }
            
            return response;
            
        } catch (error) {
            this._logError('Authentication failed:', error);
            this._emit('auth-failed', error);
            throw error;
        }
    }
    
    /**
     * Refresh authentication token
     * @public
     * @returns {Promise<Object>} Refresh response
     */
    async refreshAuthToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }
        
        try {
            const response = await this._makeRequest('POST', '/auth/refresh', {
                body: { refreshToken: this.refreshToken },
                skipAuth: true
            });
            
            if (response.success) {
                this.authToken = response.data.token;
                this.refreshToken = response.data.refreshToken;
                this.tokenExpiryTime = new Date(response.data.expiryTime);
                
                this._storeTokens();
                this._emit('token-refreshed', response.data);
                
                this._log('Token refreshed successfully');
            }
            
            return response;
            
        } catch (error) {
            this._logError('Token refresh failed:', error);
            this.clearAuth();
            throw error;
        }
    }
    
    /**
     * Logout and clear authentication
     * @public
     */
    async logout() {
        try {
            if (this.authToken) {
                await this._makeRequest('POST', '/auth/logout');
            }
        } catch (error) {
            this._logError('Logout request failed:', error);
        } finally {
            this.clearAuth();
            this._emit('logged-out');
        }
    }
    
    /**
     * Clear authentication data
     * @public
     */
    clearAuth() {
        this.authToken = null;
        this.refreshToken = null;
        this.tokenExpiryTime = null;
        
        try {
            localStorage.removeItem('fantdev_auth_tokens');
        } catch (error) {
            this._logError('Failed to clear stored tokens:', error);
        }
        
        this._log('Authentication cleared');
    }
    
    // === HTTP METHODS ===
    
    /**
     * Make GET request
     * @public
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async get(endpoint, options = {}) {
        return this._makeRequest('GET', endpoint, options);
    }
    
    /**
     * Make POST request
     * @public
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async post(endpoint, data = {}, options = {}) {
        return this._makeRequest('POST', endpoint, {
            ...options,
            body: data
        });
    }
    
    /**
     * Make PUT request
     * @public
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async put(endpoint, data = {}, options = {}) {
        return this._makeRequest('PUT', endpoint, {
            ...options,
            body: data
        });
    }
    
    /**
     * Make PATCH request
     * @public
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async patch(endpoint, data = {}, options = {}) {
        return this._makeRequest('PATCH', endpoint, {
            ...options,
            body: data
        });
    }
    
    /**
     * Make DELETE request
     * @public
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async delete(endpoint, options = {}) {
        return this._makeRequest('DELETE', endpoint, options);
    }
    
    // === SPECIALIZED API METHODS ===
    
    /**
     * Get user profile
     * @public
     * @returns {Promise<Object>} User profile data
     */
    async getUserProfile() {
        return this._makeRequest('GET', '/user/profile', {
            cache: true
        });
    }
    
    /**
     * Get account balance
     * @public
     * @returns {Promise<Object>} Balance data
     */
    async getBalance() {
        return this._makeRequest('GET', '/account/balance');
    }
    
    /**
     * Get transaction history
     * @public
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Transaction history
     */
    async getTransactions(params = {}) {
        const query = new URLSearchParams(params).toString();
        const endpoint = `/transactions${query ? '?' + query : ''}`;
        
        return this._makeRequest('GET', endpoint, {
            cache: params.cache !== false
        });
    }
    
    /**
     * Create new transaction
     * @public
     * @param {Object} transaction - Transaction data
     * @returns {Promise<Object>} Created transaction
     */
    async createTransaction(transaction) {
        return this._makeRequest('POST', '/transactions', {
            body: transaction
        });
    }
    
    /**
     * Get dashboard statistics
     * @public
     * @returns {Promise<Object>} Dashboard stats
     */
    async getDashboardStats() {
        return this._makeRequest('GET', '/dashboard/stats', {
            cache: true,
            cacheTimeout: 30000 // 30 seconds
        });
    }
    
    /**
     * Upload file
     * @public
     * @param {string} endpoint - Upload endpoint
     * @param {File} file - File to upload
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} Upload response
     */
    async uploadFile(endpoint, file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        if (options.metadata) {
            Object.entries(options.metadata).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }
        
        return this._makeRequest('POST', endpoint, {
            body: formData,
            skipContentType: true,
            onProgress: options.onProgress
        });
    }
    
    // === CORE REQUEST METHODS ===
    
    /**
     * Make HTTP request with full feature support
     * @private
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async _makeRequest(method, endpoint, options = {}) {
        const requestId = this._generateRequestId();
        const cacheKey = `${method}:${endpoint}:${JSON.stringify(options.params || {})}`;
        
        try {
            // Check cache first (for GET requests)
            if (method === 'GET' && options.cache && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                const cacheAge = Date.now() - cached.timestamp;
                const maxAge = options.cacheTimeout || this.cacheTimeout;
                
                if (cacheAge < maxAge) {
                    this._log(`Cache hit for ${endpoint}`);
                    return cached.data;
                }
            }
            
            // Check for duplicate requests
            if (this.pendingRequests.has(cacheKey)) {
                this._log(`Duplicate request detected for ${endpoint}, waiting for existing`);
                return await this.pendingRequests.get(cacheKey);
            }
            
            // Create request promise
            const requestPromise = this._executeRequest(method, endpoint, options, requestId);
            
            // Store pending request
            this.pendingRequests.set(cacheKey, requestPromise);
            
            // Execute request
            const response = await requestPromise;
            
            // Cache successful GET responses
            if (method === 'GET' && options.cache && response.success) {
                this.cache.set(cacheKey, {
                    data: response,
                    timestamp: Date.now()
                });
            }
            
            return response;
            
        } catch (error) {
            this._logError(`Request failed for ${endpoint}:`, error);
            
            // Handle offline scenarios
            if (!this.isOnline && method === 'GET') {
                return this._handleOfflineRequest(cacheKey);
            }
            
            throw error;
            
        } finally {
            // Clean up pending request
            this.pendingRequests.delete(cacheKey);
        }
    }
    
    /**
     * Execute the actual HTTP request
     * @private
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint  
     * @param {Object} options - Request options
     * @param {string} requestId - Unique request ID
     * @returns {Promise<Object>} Response data
     */
    async _executeRequest(method, endpoint, options, requestId) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = await this._buildHeaders(options);
        const body = this._buildBody(options.body, headers);
        
        const fetchOptions = {
            method,
            headers,
            body,
            signal: this._createAbortSignal(options.timeout || this.timeout)
        };
        
        // Add credentials for same-origin requests
        if (url.startsWith(window.location.origin)) {
            fetchOptions.credentials = 'same-origin';
        }
        
        let attempt = 0;
        let lastError;
        
        while (attempt < this.retryAttempts) {
            try {
                this._log(`Making ${method} request to ${endpoint} (attempt ${attempt + 1})`);
                
                const response = await fetch(url, fetchOptions);
                
                // Handle rate limiting
                if (response.status === 429) {
                    await this._handleRateLimit(response);
                    attempt++;
                    continue;
                }
                
                // Update rate limit headers
                this._updateRateLimitInfo(response);
                
                // Handle authentication errors
                if (response.status === 401 && !options.skipAuth && this.refreshToken) {
                    try {
                        await this.refreshAuthToken();
                        // Retry with new token
                        headers['Authorization'] = `Bearer ${this.authToken}`;
                        attempt++;
                        continue;
                    } catch (refreshError) {
                        this._logError('Token refresh failed during request:', refreshError);
                        throw new ApiError('Authentication failed', 401, refreshError);
                    }
                }
                
                // Parse response
                const result = await this._parseResponse(response, options);
                
                // Emit request completed event
                this._emit('request-completed', {
                    method,
                    endpoint,
                    status: response.status,
                    requestId
                });
                
                return result;
                
            } catch (error) {
                lastError = error;
                attempt++;
                
                // Don't retry certain errors
                if (!this._shouldRetry(error, attempt)) {
                    break;
                }
                
                // Wait before retrying
                if (attempt < this.retryAttempts) {
                    const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    await this._delay(delay);
                }
            }
        }
        
        // All retry attempts failed
        this._emit('request-failed', {
            method,
            endpoint,
            error: lastError,
            attempts: attempt,
            requestId
        });
        
        throw lastError;
    }
    
    /**
     * Build request headers
     * @private
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Headers object
     */
    async _buildHeaders(options) {
        const headers = {
            'X-Requested-With': 'XMLHttpRequest',
            'X-Client-Version': '2.0.0',
            ...options.headers
        };
        
        // Add authentication header
        if (this.authToken && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        // Add content type for JSON requests
        if (options.body && !options.skipContentType && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        
        // Add CSRF token if available
        const csrfToken = this._getCSRFToken();
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }
        
        return headers;
    }
    
    /**
     * Build request body
     * @private
     * @param {*} body - Request body
     * @param {Object} headers - Request headers
     * @returns {*} Processed body
     */
    _buildBody(body, headers) {
        if (!body) return null;
        
        if (body instanceof FormData) {
            return body;
        }
        
        if (headers['Content-Type'] === 'application/json') {
            return JSON.stringify(body);
        }
        
        return body;
    }
    
    /**
     * Parse response based on content type
     * @private
     * @param {Response} response - Fetch response
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Parsed response
     */
    async _parseResponse(response, options) {
        const contentType = response.headers.get('Content-Type') || '';
        
        let data;
        
        if (contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (error) {
                data = { message: 'Invalid JSON response' };
            }
        } else if (contentType.includes('text/')) {
            data = await response.text();
        } else {
            data = await response.blob();
        }
        
        // Handle non-success status codes
        if (!response.ok) {
            const error = new ApiError(
                data.message || `HTTP ${response.status}`,
                response.status,
                data
            );
            
            throw error;
        }
        
        return {
            success: true,
            data,
            status: response.status,
            headers: this._parseHeaders(response.headers)
        };
    }
    
    /**
     * Parse response headers
     * @private
     * @param {Headers} headers - Response headers
     * @returns {Object} Parsed headers object
     */
    _parseHeaders(headers) {
        const parsed = {};
        
        for (const [key, value] of headers.entries()) {
            parsed[key] = value;
        }
        
        return parsed;
    }
    
    // === UTILITY METHODS ===
    
    /**
     * Create abort signal with timeout
     * @private
     * @param {number} timeout - Timeout in milliseconds
     * @returns {AbortSignal} Abort signal
     */
    _createAbortSignal(timeout) {
        const controller = new AbortController();
        
        setTimeout(() => {
            controller.abort();
        }, timeout);
        
        return controller.signal;
    }
    
    /**
     * Handle rate limiting
     * @private
     * @param {Response} response - Response with rate limit
     */
    async _handleRateLimit(response) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
        
        this._log(`Rate limited, waiting ${delay}ms`);
        this._emit('rate-limited', { retryAfter: delay });
        
        await this._delay(delay);
    }
    
    /**
     * Update rate limit information
     * @private
     * @param {Response} response - HTTP response
     */
    _updateRateLimitInfo(response) {
        this.rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        this.rateLimitReset = response.headers.get('X-RateLimit-Reset');
        
        if (this.rateLimitRemaining !== null) {
            this._emit('rate-limit-update', {
                remaining: this.rateLimitRemaining,
                reset: this.rateLimitReset
            });
        }
    }
    
    /**
     * Check if request should be retried
     * @private
     * @param {Error} error - Request error
     * @param {number} attempt - Current attempt number
     * @returns {boolean} Whether to retry
     */
    _shouldRetry(error, attempt) {
        // Don't retry if we've reached max attempts
        if (attempt >= this.retryAttempts) {
            return false;
        }
        
        // Don't retry client errors (4xx)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
        }
        
        // Don't retry authentication errors
        if (error instanceof ApiError && error.status === 401) {
            return false;
        }
        
        // Retry network errors and server errors
        return true;
    }
    
    /**
     * Handle offline request
     * @private
     * @param {string} cacheKey - Cache key
     * @returns {Object} Cached response or offline error
     */
    _handleOfflineRequest(cacheKey) {
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            this._log('Returning cached data for offline request');
            
            return {
                ...cached.data,
                fromCache: true,
                offline: true
            };
        }
        
        throw new ApiError('No internet connection and no cached data available', 0);
    }
    
    /**
     * Process queued requests when coming online
     * @private
     */
    _processQueue() {
        if (this.requestQueue.length === 0) return;
        
        this._log(`Processing ${this.requestQueue.length} queued requests`);
        
        const queue = [...this.requestQueue];
        this.requestQueue = [];
        
        queue.forEach(async (queuedRequest) => {
            try {
                await queuedRequest.execute();
            } catch (error) {
                this._logError('Queued request failed:', error);
            }
        });
    }
    
    /**
     * Get CSRF token from meta tag or cookie
     * @private
     * @returns {string|null} CSRF token
     */
    _getCSRFToken() {
        // Try meta tag first
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
            return metaToken.getAttribute('content');
        }
        
        // Try cookie
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        if (match) {
            return decodeURIComponent(match[1]);
        }
        
        return null;
    }
    
    /**
     * Generate unique request ID
     * @private
     * @returns {string} Request ID
     */
    _generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Delay execution
     * @private
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // === EVENT SYSTEM ===
    
    /**
     * Add event listener
     * @public
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        
        this.eventListeners.get(event).push(callback);
        
        return () => this.off(event, callback);
    }
    
    /**
     * Remove event listener
     * @public
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event
     * @private
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    _emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this._logError(`Event listener error for ${event}:`, error);
                }
            });
        }
    }
    
    // === CACHE MANAGEMENT ===
    
    /**
     * Clear cache
     * @public
     * @param {string} pattern - Optional pattern to match cache keys
     */
    clearCache(pattern) {
        if (pattern) {
            const regex = new RegExp(pattern);
            for (const [key] of this.cache) {
                if (regex.test(key)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
        
        this._log(`Cache cleared${pattern ? ` (pattern: ${pattern})` : ''}`);
    }
    
    /**
     * Get cache statistics
     * @public
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
    
    // === STATUS AND DIAGNOSTICS ===
    
    /**
     * Get client status
     * @public
     * @returns {Object} Client status
     */
    getStatus() {
        return {
            baseURL: this.baseURL,
            isAuthenticated: !!this.authToken,
            tokenExpiry: this.tokenExpiryTime?.toISOString(),
            isOnline: this.isOnline,
            pendingRequests: this.pendingRequests.size,
            cacheSize: this.cache.size,
            rateLimitRemaining: this.rateLimitRemaining,
            rateLimitReset: this.rateLimitReset
        };
    }
    
    // === LOGGING ===
    
    /**
     * Log info message
     * @private
     * @param {string} message - Log message
     * @param {...any} args - Additional arguments
     */
    _log(message, ...args) {
        console.info(`[API Client] ${message}`, ...args);
    }
    
    /**
     * Log error message
     * @private
     * @param {string} message - Log message
     * @param {...any} args - Additional arguments
     */
    _logError(message, ...args) {
        console.error(`[API Client] ${message}`, ...args);
    }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(message, status = 0, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnhancedApiClient, ApiError };
}

// Make available globally
window.EnhancedApiClient = EnhancedApiClient;
window.ApiError = ApiError;