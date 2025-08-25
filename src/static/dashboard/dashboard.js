/**
 * Unified Dashboard JavaScript
 * Combines functionality from both dashboard versions with Bun YAML support
 */

// Centralized API configuration
const API_BASE = `${window.location.origin}/api`;

class UnifiedDashboard {
    constructor() {
        this.currentTab = 'overview';
        this.currentConfig = 'app';
        this.autoRefresh = false;
        this.autoCheck = false;
        this.wsConnection = null;
        this.logsPaused = false;
        this.eventSource = null;
        this.refreshIntervals = {};
        this.apiBaseUrl = API_BASE;
        this.wsUrl = `ws://${window.location.hostname}:${window.location.port}/api/ws`;
        this.dashboardConfig = null;
        this.quickActions = {};
        
        // Don't call init() here since it's async - it will be called from DOMContentLoaded
    }

    async init() {
        await this.loadDashboardConfiguration();
        this.setupDynamicTabs();
        this.setupEventListeners();
        this.setupServerSentEvents();
        this.connectWebSocket();
        this.loadInitialData();
        this.startClock();
        this.initAlertingSystem();
    }

    async loadDashboardConfiguration() {
        try {
            const response = await fetch(`${API_BASE}/yaml/dashboard`);
            if (response.ok) {
                const data = await response.json();
                
                // The content is a YAML string that needs to be parsed
                if (typeof data.content === 'string') {
                    // For client-side, we'll use a simple YAML parser or eval the structure
                    // Since we know the structure, let's make a request for the parsed version
                    const parsedResponse = await fetch(`${API_BASE}/config/dashboard`);
                    if (parsedResponse.ok) {
                        this.dashboardConfig = await parsedResponse.json();
                    } else {
                        // Fallback: try to extract the basic tab information from the YAML string
                        this.dashboardConfig = this.parseBasicYAMLTabs(data.content);
                    }
                } else {
                    this.dashboardConfig = data.content || data;
                }
                
                console.log('Dashboard configuration loaded:', this.dashboardConfig);
            } else {
                console.warn('Failed to load dashboard configuration, using defaults');
                this.dashboardConfig = { dashboard: { ui: { tabs: [] } } };
            }
        } catch (error) {
            console.error('Error loading dashboard configuration:', error);
            this.dashboardConfig = { dashboard: { ui: { tabs: [] } } };
        }
    }
    
    // Fallback method to extract tabs from YAML string
    parseBasicYAMLTabs(yamlString) {
        // This is a simple fallback - in a real app you'd use a proper YAML parser
        const tabs = [];
        const lines = yamlString.split('\n');
        let inTabsSection = false;
        let currentTab = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed === 'tabs:') {
                inTabsSection = true;
                continue;
            }
            
            if (inTabsSection && trimmed.startsWith('- id:')) {
                if (currentTab) tabs.push(currentTab);
                currentTab = { id: trimmed.split(':')[1].trim() };
            } else if (inTabsSection && currentTab) {
                if (trimmed.startsWith('name:')) {
                    currentTab.name = trimmed.split(':')[1].trim();
                } else if (trimmed.startsWith('icon:')) {
                    currentTab.icon = trimmed.split(':')[1].trim();
                } else if (trimmed.startsWith('enabled:')) {
                    currentTab.enabled = trimmed.split(':')[1].trim() === 'true';
                } else if (trimmed.startsWith('default:')) {
                    currentTab.default = trimmed.split(':')[1].trim() === 'true';
                }
            }
            
            // Stop parsing if we hit another top-level section
            if (inTabsSection && line.match(/^[a-zA-Z]/)) {
                if (currentTab) tabs.push(currentTab);
                break;
            }
        }
        
        if (currentTab) tabs.push(currentTab);
        
        return {
            dashboard: {
                ui: { tabs }
            }
        };
    }

    setupDynamicTabs() {
        const navContainer = document.getElementById('dashboard-nav');
        
        // Debug logging
        console.log('Dashboard config structure:', this.dashboardConfig);
        console.log('Looking for tabs at:', this.dashboardConfig?.dashboard?.ui?.tabs);
        
        if (!navContainer) {
            console.warn('No navigation container found');
            return;
        }
        
        if (!this.dashboardConfig?.dashboard?.ui?.tabs) {
            console.warn('No tab configuration found in dashboard config');
            return;
        }

        // Clear existing navigation
        navContainer.innerHTML = '';

        // Generate tabs from YAML configuration
        this.dashboardConfig.dashboard.ui.tabs.forEach(tab => {
            if (tab.enabled) {
                console.log('Creating tab:', tab.name, tab.id);
                const tabElement = document.createElement('button');
                tabElement.className = `nav-tab ${tab.default ? 'active' : ''}`;
                tabElement.dataset.tab = tab.id;
                tabElement.innerHTML = `
                    <i class="fas fa-${tab.icon}"></i>
                    <span>${tab.name}</span>
                `;
                tabElement.addEventListener('click', () => {
                    this.switchTab(tab.id);
                });
                navContainer.appendChild(tabElement);
            }
        });

        // Set default tab
        const defaultTab = this.dashboardConfig.dashboard.ui.tabs.find(tab => tab.default);
        if (defaultTab) {
            this.currentTab = defaultTab.id;
            console.log('Default tab set to:', defaultTab.id);
        }
        
        console.log('Generated', navContainer.children.length, 'navigation tabs');
    }

    setupEventListeners() {
        // Header controls
        document.getElementById('environment-selector')?.addEventListener('change', (e) => {
            this.switchEnvironment(e.target.value);
        });

        document.getElementById('refresh-all')?.addEventListener('click', () => {
            this.refreshAll();
        });

        // Service controls
        document.getElementById('auto-check-toggle')?.addEventListener('click', () => {
            this.toggleAutoCheck();
        });

        // API Testing
        document.getElementById('send-request')?.addEventListener('click', () => {
            this.sendApiRequest();
        });

        // Configuration
        const configFiles = document.querySelectorAll('.config-file');
        configFiles.forEach(file => {
            file.addEventListener('click', () => {
                this.loadConfigFile(file.dataset.file);
            });
        });

        document.getElementById('save-config')?.addEventListener('click', () => {
            this.saveConfiguration();
        });

        document.getElementById('reload-config')?.addEventListener('click', () => {
            this.reloadConfiguration();
        });

        document.getElementById('validate-config')?.addEventListener('click', () => {
            this.validateConfiguration();
        });

        document.getElementById('export-config')?.addEventListener('click', () => {
            this.exportConfiguration();
        });

        // Logs
        document.getElementById('clear-logs')?.addEventListener('click', () => {
            this.clearLogs();
        });

        document.getElementById('export-logs')?.addEventListener('click', () => {
            this.exportLogs();
        });

        document.getElementById('pause-logs')?.addEventListener('click', () => {
            this.toggleLogsPause();
        });

        document.getElementById('log-level')?.addEventListener('change', (e) => {
            this.filterLogs(e.target.value);
        });

        document.getElementById('log-search')?.addEventListener('input', (e) => {
            this.searchLogs(e.target.value);
        });
    }

    setupServerSentEvents() {
        // Set up Server-Sent Events for real-time updates
        if (typeof EventSource !== 'undefined') {
            try {
                this.eventSource = new EventSource(`${API_BASE}/dashboard/stream`);
                
                this.eventSource.onopen = () => {
                    this.addLog('SSE connection established', 'success');
                };
                
                this.eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleServerSentEvent(data);
                    } catch (e) {
                        console.log('SSE message:', event.data);
                    }
                };
                
                this.eventSource.onerror = () => {
                    this.addLog('SSE connection error', 'warn');
                };
            } catch (error) {
                console.log('SSE not supported or failed to connect:', error);
            }
        }
    }

    handleServerSentEvent(data) {
        switch (data.type) {
            case 'metrics':
                this.updateMetrics(data.data);
                break;
            case 'log':
                this.addLog(data.message, data.level || 'info');
                break;
            case 'service_status':
                this.updateServiceStatus(data.service, data.status);
                break;
            default:
                console.log('Unknown SSE event:', data);
        }
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`)?.classList.add('active');

        this.currentTab = tabName;
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'overview':
                await this.loadOverviewData();
                break;
            case 'services':
                await this.checkAllServices();
                break;
            case 'customers':
                await this.loadCustomersData();
                break;
            case 'telegram':
                await this.loadTelegramOperations();
                break;
            case 'transactions':
                await this.loadTransactionsData();
                break;
            case 'agents':
                await this.loadAgentsData();
                break;
            case 'analytics':
                await this.loadAnalyticsData();
                break;
            case 'config':
                await this.loadConfigFile(this.currentConfig);
                break;
            case 'features':
                await this.loadFeatureFlags();
                break;
            case 'logs':
                // Logs are updated via WebSocket
                break;
        }
    }

    async loadOverviewData() {
        try {
            const response = await fetch(`${API_BASE}/admin/stats`);
            if (response.ok) {
                const data = await response.json();
                
                // Update metrics
                document.getElementById('active-users').textContent = data.customers?.active || 0;
                document.getElementById('total-transactions').textContent = data.total_transactions || 0;
                document.getElementById('total-balance').textContent = `$${(data.total_balance || 0).toLocaleString()}`;
                document.getElementById('system-uptime').textContent = '99.9%'; // Calculate from actual data
                
                // Update hot-reload status
                this.updateHotReloadStatus();
                
                // Load cache metrics
                await this.loadCacheMetrics();
            }
        } catch (error) {
            this.addLog('Failed to load overview data: ' + error.message, 'error');
        }
    }

    async loadCacheMetrics() {
        try {
            const [cacheResponse, warmingResponse, performanceResponse] = await Promise.all([
                fetch(`${API_BASE}/api/cache`),
                fetch(`${API_BASE}/api/cache/warming`),
                fetch(`${API_BASE}/api/performance`)
            ]);

            if (cacheResponse.ok) {
                const cacheData = await cacheResponse.json();
                this.updateCacheDisplay(cacheData.stats);
            }

            if (warmingResponse.ok) {
                const warmingData = await warmingResponse.json();
                this.updateCacheWarmingDisplay(warmingData);
            }

            if (performanceResponse.ok) {
                const perfData = await performanceResponse.json();
                this.updateCachePerformanceDisplay(perfData);
            }
        } catch (error) {
            console.warn('Failed to load cache metrics:', error);
        }
    }

    updateCacheDisplay(stats) {
        // Update cache hit rate
        const hitRate = (stats.hit_rate * 100).toFixed(1);
        const hitRateEl = document.getElementById('cache-hit-rate');
        if (hitRateEl) {
            hitRateEl.textContent = `${hitRate}%`;
            hitRateEl.className = `metric-value ${hitRate > 80 ? 'text-success' : hitRate > 50 ? 'text-warning' : 'text-danger'}`;
        }

        // Update L1 cache usage
        const l1Usage = ((stats.l1_size / stats.l1_max_size) * 100).toFixed(1);
        const l1UsageEl = document.getElementById('cache-l1-usage');
        if (l1UsageEl) {
            l1UsageEl.textContent = `${stats.l1_size}/${stats.l1_max_size} (${l1Usage}%)`;
        }

        // Update total requests
        const totalRequestsEl = document.getElementById('cache-total-requests');
        if (totalRequestsEl) {
            totalRequestsEl.textContent = stats.total_requests.toLocaleString();
        }

        // Update memory usage
        const memoryUsageMB = (stats.memory_usage / 1024).toFixed(2);
        const memoryEl = document.getElementById('cache-memory-usage');
        if (memoryEl) {
            memoryEl.textContent = `${memoryUsageMB}KB`;
        }

        // Update L2/L3 stats if available
        if (stats.l2_connected) {
            const l2HitRate = stats.l2_hits > 0 ? ((stats.l2_hits / (stats.l2_hits + stats.l2_misses)) * 100).toFixed(1) : '0.0';
            const l2StatusEl = document.getElementById('cache-l2-status');
            if (l2StatusEl) {
                l2StatusEl.textContent = `Connected (${l2HitRate}% hit rate)`;
                l2StatusEl.className = 'text-success';
            }
        } else {
            const l2StatusEl = document.getElementById('cache-l2-status');
            if (l2StatusEl) {
                l2StatusEl.textContent = 'Disabled';
                l2StatusEl.className = 'text-secondary';
            }
        }

        // Update L3 stats
        const l3HitRate = stats.l3_hits > 0 ? ((stats.l3_hits / (stats.l3_hits + stats.l3_misses)) * 100).toFixed(1) : '0.0';
        const l3StatusEl = document.getElementById('cache-l3-status');
        if (l3StatusEl) {
            l3StatusEl.textContent = `${stats.l3_size} files (${l3HitRate}% hit rate)`;
        }
    }

    updateCacheWarmingDisplay(warmingData) {
        const isWarmingEl = document.getElementById('cache-warming-status');
        if (isWarmingEl) {
            if (warmingData.isWarming) {
                isWarmingEl.textContent = 'Warming in progress...';
                isWarmingEl.className = 'text-warning';
            } else {
                const lastWarming = warmingData.stats.lastWarming 
                    ? new Date(warmingData.stats.lastWarming).toLocaleTimeString()
                    : 'Never';
                isWarmingEl.textContent = `Last warmed: ${lastWarming}`;
                isWarmingEl.className = 'text-success';
            }
        }

        const tasksCompletedEl = document.getElementById('cache-warming-tasks');
        if (tasksCompletedEl) {
            tasksCompletedEl.textContent = `${warmingData.stats.tasksCompleted}/${warmingData.stats.totalTasks}`;
        }

        // Show cache warming errors if any
        const errorsEl = document.getElementById('cache-warming-errors');
        if (errorsEl) {
            if (warmingData.stats.errors > 0) {
                errorsEl.textContent = `${warmingData.stats.errors} errors`;
                errorsEl.className = 'text-danger';
            } else {
                errorsEl.textContent = 'No errors';
                errorsEl.className = 'text-success';
            }
        }
    }

    updateCachePerformanceDisplay(perfData) {
        if (perfData.cache) {
            // Update cache performance indicators
            const avgResponseTime = perfData.runtime?.averageResponseTime || 0;
            const responseTimeEl = document.getElementById('cache-avg-response-time');
            if (responseTimeEl) {
                responseTimeEl.textContent = `${avgResponseTime.toFixed(2)}ms`;
                responseTimeEl.className = avgResponseTime < 50 ? 'text-success' : avgResponseTime < 100 ? 'text-warning' : 'text-danger';
            }

            // Update eviction rate
            const evictionRate = perfData.cache.evictions || 0;
            const evictionsEl = document.getElementById('cache-evictions');
            if (evictionsEl) {
                evictionsEl.textContent = evictionRate.toLocaleString();
            }
        }
    }

    async triggerCacheWarming() {
        try {
            this.addLog('Triggering cache warming...', 'info');
            
            const response = await fetch(`${API_BASE}/api/cache/warming`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priorities: ['critical', 'important'] })
            });

            if (response.ok) {
                const result = await response.json();
                this.addLog(`Cache warming completed: ${result.message}`, 'success');
                
                // Refresh cache metrics
                await this.loadCacheMetrics();
            } else {
                throw new Error('Cache warming failed');
            }
        } catch (error) {
            this.addLog(`Cache warming failed: ${error.message}`, 'error');
        }
    }

    async clearCache() {
        if (!confirm('Are you sure you want to clear the entire cache? This will temporarily impact performance.')) {
            return;
        }

        try {
            this.addLog('Clearing cache...', 'info');
            
            const response = await fetch(`${API_BASE}/api/cache`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const result = await response.json();
                this.addLog(`Cache cleared: ${result.message}`, 'success');
                
                // Refresh cache metrics
                await this.loadCacheMetrics();
            } else {
                throw new Error('Cache clear failed');
            }
        } catch (error) {
            this.addLog(`Cache clear failed: ${error.message}`, 'error');
        }
    }

    async checkAllServices() {
        const services = [
            { id: 'telegram', url: `${API_BASE}/bot/status`, name: 'Telegram Bot' },
            { id: 'portal', url: `${API_BASE}/health`, name: 'Portal Server' },
            { id: 'admin', url: `${API_BASE}/health`, name: 'Admin Server' },
            { id: 'websocket', url: `${API_BASE}/ws/status`, name: 'WebSocket Server' },
            { id: 'database', url: `${API_BASE}/db/status`, name: 'Database' },
            { id: 'redis', url: `${API_BASE}/redis/status`, name: 'Redis Cache' }
        ];

        for (const service of services) {
            await this.checkService(service);
        }
    }

    async checkService(service) {
        const statusEl = document.getElementById(`${service.id}-status`);
        const responseEl = document.getElementById(`${service.id}-response`);
        
        if (!statusEl) return;

        try {
            const startTime = Date.now();
            
            if (service.checkWs) {
                // Check WebSocket connection
                if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
                    statusEl.className = 'badge badge-success';
                    statusEl.textContent = 'Connected';
                    if (responseEl) responseEl.textContent = 'Active';
                } else {
                    statusEl.className = 'badge badge-danger';
                    statusEl.textContent = 'Disconnected';
                    if (responseEl) responseEl.textContent = '-';
                }
            } else {
                // Check HTTP endpoint
                const url = service.url;
                    
                const response = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    signal: AbortSignal.timeout(5000)
                });
                
                const responseTime = Date.now() - startTime;
                
                if (response.ok) {
                    statusEl.className = 'badge badge-success';
                    statusEl.textContent = 'Online';
                    if (responseEl) responseEl.textContent = `${responseTime}ms`;
                } else {
                    statusEl.className = 'badge badge-danger';
                    statusEl.textContent = `Error ${response.status}`;
                    if (responseEl) responseEl.textContent = '-';
                }
            }
        } catch (error) {
            statusEl.className = 'badge badge-danger';
            statusEl.textContent = 'Offline';
            if (responseEl) responseEl.textContent = '-';
        }
    }

    async loadConfigFile(configName) {
        this.currentConfig = configName;
        
        // Update active file in sidebar
        document.querySelectorAll('.config-file').forEach(file => {
            file.classList.remove('active');
        });
        document.querySelector(`[data-file="${configName}"]`)?.classList.add('active');
        
        try {
            const response = await fetch(`${API_BASE}/yaml/${configName}`);
            if (response.ok) {
                const data = await response.json();
                document.getElementById('yaml-editor').value = data.content || '';
                this.showConfigStatus('Loaded successfully', 'success');
            } else {
                throw new Error(`Failed to load ${configName}.yaml`);
            }
        } catch (error) {
            this.showConfigStatus(error.message, 'error');
            this.addLog(`Failed to load config: ${error.message}`, 'error');
        }
    }

    async saveConfiguration() {
        const content = document.getElementById('yaml-editor').value;
        
        try {
            const response = await fetch(`${API_BASE}/yaml/${this.currentConfig}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            
            const result = await response.json();
            if (result.success) {
                this.showValidation('Configuration saved successfully!', 'success');
                this.addLog(`Saved ${this.currentConfig}.yaml`, 'success');
                
                // Trigger hot-reload notification
                if (result.hotReloaded) {
                    this.updateHotReloadStatus();
                }
            } else {
                this.showValidation(result.error || 'Failed to save', 'error');
            }
        } catch (error) {
            this.showValidation('Failed to save configuration', 'error');
            this.addLog(`Save error: ${error.message}`, 'error');
        }
    }

    async validateConfiguration() {
        const content = document.getElementById('yaml-editor').value;
        
        try {
            const response = await fetch(`${API_BASE}/yaml/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            
            const result = await response.json();
            if (result.valid) {
                this.showValidation('YAML is valid!', 'success');
            } else {
                this.showValidation(`Validation error: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showValidation('Failed to validate', 'error');
        }
    }

    async loadFeatureFlags() {
        try {
            const response = await fetch(`${API_BASE}/features`);
            if (response.ok) {
                const features = await response.json();
                this.renderFeatureFlags(features);
            }
        } catch (error) {
            this.addLog('Failed to load feature flags: ' + error.message, 'error');
        }
    }

    renderFeatureFlags(features) {
        const container = document.getElementById('feature-flags-grid');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.entries(features).forEach(([key, feature]) => {
            const flagItem = document.createElement('div');
            flagItem.className = 'feature-flag-item';
            flagItem.innerHTML = `
                <div class="feature-info">
                    <div class="feature-name">${key}</div>
                    <div class="feature-description">${feature.description || 'No description'}</div>
                    <div class="feature-rollout">Rollout: ${feature.rolloutPercentage || 100}%</div>
                </div>
                <div class="feature-toggle ${feature.enabled ? 'active' : ''}" 
                     data-feature="${key}" 
                     onclick="dashboard.toggleFeature('${key}')"></div>
            `;
            container.appendChild(flagItem);
        });
    }

    async toggleFeature(featureName) {
        try {
            const response = await fetch(`${API_BASE}/features/${featureName}/toggle`, {
                method: 'POST'
            });
            
            if (response.ok) {
                await this.loadFeatureFlags();
                this.addLog(`Toggled feature: ${featureName}`, 'info');
            }
        } catch (error) {
            this.addLog(`Failed to toggle feature: ${error.message}`, 'error');
        }
    }

    async sendApiRequest() {
        const method = document.getElementById('http-method').value;
        const url = document.getElementById('api-url').value;
        
        if (!url) {
            alert('Please enter an API endpoint');
            return;
        }
        
        const fullUrl = url.startsWith('http') ? url : `${this.apiBaseUrl}${url}`;
        const startTime = Date.now();
        
        try {
            const response = await fetch(fullUrl, {
                method,
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors'
            });
            
            const responseTime = Date.now() - startTime;
            const data = await response.text();
            
            document.getElementById('response-status').textContent = `Status: ${response.status}`;
            document.getElementById('response-time').textContent = `Time: ${responseTime}ms`;
            
            try {
                const jsonData = JSON.parse(data);
                document.getElementById('response-display').textContent = JSON.stringify(jsonData, null, 2);
            } catch {
                document.getElementById('response-display').textContent = data;
            }
            
            this.addLog(`API ${method} ${url} - ${response.status} (${responseTime}ms)`, 
                       response.ok ? 'success' : 'error');
        } catch (error) {
            document.getElementById('response-display').textContent = `Error: ${error.message}`;
            this.addLog(`API request failed: ${error.message}`, 'error');
        }
    }

    testEndpoint(endpoint) {
        document.getElementById('api-url').value = endpoint;
        this.sendApiRequest();
    }

    connectWebSocket() {
        if (this.wsConnection) {
            this.wsConnection.close();
        }
        
        try {
            this.wsConnection = new WebSocket(this.wsUrl);
            
            this.wsConnection.onopen = () => {
                this.updateWsStatus('Connected', 'online');
                this.addLog('WebSocket connected', 'success');
                
                // Subscribe to config changes
                this.wsConnection.send(JSON.stringify({
                    type: 'subscribe',
                    channels: ['config:changed', 'feature:toggled', 'hotreload:triggered']
                }));
            };
            
            this.wsConnection.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (e) {
                    this.addLog(`WS: ${event.data}`, 'info');
                }
            };
            
            this.wsConnection.onerror = () => {
                this.updateWsStatus('Error', 'offline');
                this.addLog('WebSocket error occurred', 'error');
            };
            
            this.wsConnection.onclose = () => {
                this.updateWsStatus('Disconnected', 'offline');
                this.addLog('WebSocket disconnected', 'warn');
                
                // Reconnect after 5 seconds
                setTimeout(() => this.connectWebSocket(), 5000);
            };
        } catch (error) {
            this.addLog(`WebSocket connection failed: ${error.message}`, 'error');
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'config:changed':
                this.addLog(`Config changed: ${data.file}`, 'info');
                this.updateHotReloadStatus();
                if (this.currentTab === 'config' && data.file === this.currentConfig) {
                    this.reloadConfiguration();
                }
                break;
                
            case 'feature:toggled':
                this.addLog(`Feature toggled: ${data.feature}`, 'info');
                if (this.currentTab === 'features') {
                    this.loadFeatureFlags();
                }
                break;
                
            case 'hotreload:triggered':
                this.addLog('Hot reload triggered', 'success');
                this.updateHotReloadStatus();
                document.getElementById('last-reload').textContent = new Date().toLocaleTimeString();
                break;
                
            case 'log':
                if (!this.logsPaused) {
                    this.addLog(data.message, data.level);
                }
                break;
                
            case 'metric':
                this.updateMetric(data.metric, data.value);
                break;
                
            default:
                this.addLog(`WS: ${JSON.stringify(data)}`, 'info');
        }
    }

    updateWsStatus(status, className) {
        document.getElementById('ws-status').textContent = status;
        document.getElementById('ws-status-dot').className = `status-dot ${className}`;
    }

    updateHotReloadStatus() {
        fetch(`${API_BASE}/hotreload/status`)
            .then(res => res.json())
            .then(data => {
                document.getElementById('hot-reload-status').textContent = data.active ? 'Active' : 'Inactive';
                document.getElementById('hot-reload-status').className = `badge badge-${data.active ? 'success' : 'warning'}`;
                document.getElementById('files-watching').textContent = data.filesWatching || 0;
                document.getElementById('config-changes').textContent = data.configChanges || 0;
            })
            .catch(() => {
                document.getElementById('hot-reload-status').textContent = 'Unknown';
                document.getElementById('hot-reload-status').className = 'badge badge-warning';
            });
    }

    addLog(message, level = 'info') {
        const logsContainer = document.getElementById('logs-container');
        if (!logsContainer) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-level-${level}`;
        
        const time = new Date().toLocaleTimeString();
        logEntry.innerHTML = `
            <span class="log-time">[${time}]</span>
            <span class="log-level-${level}">[${level.toUpperCase()}]</span>
            <span>${message}</span>
        `;
        
        logsContainer.appendChild(logEntry);
        
        // Auto-scroll to bottom if not paused
        if (!this.logsPaused) {
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }
        
        // Keep only last 500 logs
        while (logsContainer.children.length > 500) {
            logsContainer.removeChild(logsContainer.firstChild);
        }
    }

    clearLogs() {
        const logsContainer = document.getElementById('logs-container');
        if (logsContainer) {
            logsContainer.innerHTML = '';
            this.addLog('Logs cleared', 'info');
        }
    }

    exportLogs() {
        const logs = document.getElementById('logs-container').innerText;
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-logs-${new Date().toISOString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        this.addLog('Logs exported', 'success');
    }

    toggleLogsPause() {
        this.logsPaused = !this.logsPaused;
        const btn = document.getElementById('pause-logs');
        if (btn) {
            btn.innerHTML = this.logsPaused ? 
                '<i class="fas fa-play"></i> Resume' : 
                '<i class="fas fa-pause"></i> Pause';
        }
    }

    filterLogs(level) {
        const entries = document.querySelectorAll('.log-entry');
        entries.forEach(entry => {
            if (level === 'all' || entry.classList.contains(`log-level-${level}`)) {
                entry.style.display = 'block';
            } else {
                entry.style.display = 'none';
            }
        });
    }

    searchLogs(query) {
        const entries = document.querySelectorAll('.log-entry');
        entries.forEach(entry => {
            if (entry.textContent.toLowerCase().includes(query.toLowerCase())) {
                entry.style.display = 'block';
            } else {
                entry.style.display = 'none';
            }
        });
    }

    showValidation(message, type) {
        const container = document.getElementById('config-validation');
        if (container) {
            container.textContent = message;
            container.className = `validation-results ${type} show`;
            setTimeout(() => {
                container.classList.remove('show');
            }, 5000);
        }
    }

    showConfigStatus(message, type) {
        const status = document.getElementById('config-status');
        if (status) {
            status.textContent = message;
            status.className = `config-status badge badge-${type === 'success' ? 'success' : 'danger'}`;
        }
    }

    async reloadConfiguration() {
        await this.loadConfigFile(this.currentConfig);
        this.showValidation('Configuration reloaded', 'success');
    }

    async exportConfiguration() {
        const content = document.getElementById('yaml-editor').value;
        const blob = new Blob([content], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentConfig}.yaml`;
        a.click();
        URL.revokeObjectURL(url);
        this.addLog(`Exported ${this.currentConfig}.yaml`, 'success');
    }

    toggleAutoCheck() {
        this.autoCheck = !this.autoCheck;
        const button = document.getElementById('auto-check-toggle');
        
        if (this.autoCheck) {
            button.innerHTML = '<i class="fas fa-clock"></i> Auto-Check: ON';
            this.refreshIntervals.services = setInterval(() => {
                this.checkAllServices();
            }, 30000);
        } else {
            button.innerHTML = '<i class="fas fa-clock"></i> Auto-Check: OFF';
            if (this.refreshIntervals.services) {
                clearInterval(this.refreshIntervals.services);
            }
        }
    }

    async refreshAll() {
        this.addLog('Refreshing all data...', 'info');
        await this.loadTabData(this.currentTab);
        document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();
    }

    switchEnvironment(env) {
        this.addLog(`Switching to ${env} environment`, 'info');
        document.getElementById('current-env').textContent = env.charAt(0).toUpperCase() + env.slice(1);
        
        // Reload configuration for new environment
        this.loadTabData(this.currentTab);
    }

    startClock() {
        setInterval(() => {
            document.getElementById('current-time').textContent = new Date().toLocaleTimeString();
        }, 1000);
    }

    // Service control methods
    async startAllServices() {
        this.addLog('Starting all services...', 'info');
        try {
            const response = await fetch(`${API_BASE}/services/start`, {
                method: 'POST'
            });
            if (response.ok) {
                this.addLog('All services started', 'success');
                setTimeout(() => this.checkAllServices(), 2000);
            }
        } catch (error) {
            this.addLog('Failed to start services: ' + error.message, 'error');
        }
    }

    async stopAllServices() {
        this.addLog('Stopping all services...', 'warn');
        try {
            const response = await fetch(`${API_BASE}/services/stop`, {
                method: 'POST'
            });
            if (response.ok) {
                this.addLog('All services stopped', 'warn');
                setTimeout(() => this.checkAllServices(), 1000);
            }
        } catch (error) {
            this.addLog('Failed to stop services: ' + error.message, 'error');
        }
    }

    async restartServices() {
        await this.stopAllServices();
        setTimeout(() => this.startAllServices(), 2000);
    }

    async runHealthCheck() {
        this.addLog('Running health check...', 'info');
        try {
            const response = await fetch(`${API_BASE}/health/full`);
            const data = await response.json();
            
            this.addLog(`Health check complete: ${data.healthy ? 'All systems operational' : 'Issues detected'}`, 
                       data.healthy ? 'success' : 'warn');
            
            document.getElementById('last-health-check').textContent = new Date().toLocaleTimeString();
        } catch (error) {
            this.addLog('Health check failed: ' + error.message, 'error');
        }
    }

    async exportData() {
        this.addLog('Exporting data...', 'info');
        try {
            const response = await fetch(`${API_BASE}/export/all`);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fantdev-export-${new Date().toISOString()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.addLog('Data exported successfully', 'success');
        } catch (error) {
            this.addLog('Export failed: ' + error.message, 'error');
        }
    }

    async saveFeatures() {
        this.addLog('Saving feature flags...', 'info');
        // Implementation for saving all feature flag changes
    }

    updateMetric(metric, value) {
        const element = document.getElementById(metric);
        if (element) {
            element.textContent = value;
        }
    }

    async loadInitialData() {
        // Load initial data based on current tab
        await this.loadTabData(this.currentTab);
        
        // Update footer information
        this.updateFooterInfo();
        
        // Start monitoring
        this.startMonitoring();
    }

    updateFooterInfo() {
        // Update version information
        fetch(`${API_BASE}/version`)
            .then(res => res.json())
            .then(data => {
                document.getElementById('app-version').textContent = data.app || '3.0.0';
                document.getElementById('bun-version').textContent = data.bun || '1.0.0';
            })
            .catch(() => {});
    }

    startMonitoring() {
        // Update memory and CPU usage every 5 seconds
        setInterval(() => {
            fetch(`${API_BASE}/system/stats`)
                .then(res => res.json())
                .then(data => {
                    document.getElementById('memory-usage').textContent = `${data.memory || 0} MB`;
                    document.getElementById('cpu-usage').textContent = `${data.cpu || 0}%`;
                })
                .catch(() => {});
        }, 5000);
    }

    // ===== TELEGRAM OPERATIONS =====
    async loadTelegramOperations() {
        try {
            // Load bot status
            const botStatus = await fetch(`${API_BASE}/admin/telegram/bot/status`);
            const botData = await botStatus.json();
            this.updateTelegramBotStatus(botData);

            // Load group information
            const groupsResponse = await fetch(`${API_BASE}/admin/telegram/groups`);
            const groupsData = await groupsResponse.json();
            this.updateTelegramGroups(groupsData);

            // Load pending member approvals
            const membersResponse = await fetch(`${API_BASE}/admin/members?status=pending`);
            const membersData = await membersResponse.json();
            this.updatePendingMembers(membersData);

            // Load recent messages
            const messagesResponse = await fetch(`${API_BASE}/admin/telegram/messages?limit=20`);
            const messagesData = await messagesResponse.json();
            this.updateTelegramMessages(messagesData);

            this.addLog('Telegram operations data loaded', 'success');
        } catch (error) {
            this.addLog(`Failed to load Telegram data: ${error.message}`, 'error');
        }
    }

    updateTelegramBotStatus(botData) {
        const statusEl = document.getElementById('telegram-bot-status');
        const usernameEl = document.getElementById('telegram-bot-username');
        const uptimeEl = document.getElementById('telegram-bot-uptime');
        
        if (statusEl) {
            statusEl.className = `badge badge-${botData.online ? 'success' : 'danger'}`;
            statusEl.textContent = botData.online ? 'Online' : 'Offline';
        }
        if (usernameEl) usernameEl.textContent = botData.username || 'N/A';
        if (uptimeEl) uptimeEl.textContent = botData.uptime || 'Unknown';
    }

    updateTelegramGroups(groupsData) {
        const container = document.getElementById('telegram-groups-list');
        if (!container || !groupsData) return;

        container.innerHTML = groupsData.map(group => `
            <div class="group-item" data-group-id="${group.id}">
                <div class="group-info">
                    <div class="group-name">${group.title}</div>
                    <div class="group-stats">
                        <span class="member-count">${group.member_count} members</span>
                        <span class="group-type">${group.type}</span>
                    </div>
                </div>
                <div class="group-actions">
                    <button class="btn btn-sm" onclick="dashboard.viewGroupMessages('${group.id}')">Messages</button>
                    <button class="btn btn-sm" onclick="dashboard.manageGroupMembers('${group.id}')">Members</button>
                </div>
            </div>
        `).join('');
    }

    updatePendingMembers(membersData) {
        const container = document.getElementById('pending-members-list');
        if (!container || !membersData) return;

        if (membersData.length === 0) {
            container.innerHTML = '<div class="no-data">No pending member approvals</div>';
            return;
        }

        container.innerHTML = membersData.map(member => `
            <div class="member-approval-item" data-member-id="${member.id}">
                <div class="member-info">
                    <div class="member-name">${member.first_name} ${member.last_name || ''}</div>
                    <div class="member-username">@${member.username || 'N/A'}</div>
                    <div class="member-date">Requested: ${new Date(member.request_date).toLocaleDateString()}</div>
                </div>
                <div class="approval-actions">
                    <button class="btn btn-success btn-sm" onclick="dashboard.approveMember('${member.id}')">Approve</button>
                    <button class="btn btn-danger btn-sm" onclick="dashboard.denyMember('${member.id}')">Deny</button>
                </div>
            </div>
        `).join('');
    }

    updateTelegramMessages(messagesData) {
        const container = document.getElementById('telegram-messages-list');
        if (!container || !messagesData) return;

        container.innerHTML = messagesData.map(message => `
            <div class="message-item">
                <div class="message-header">
                    <span class="message-sender">${message.from?.first_name || 'Unknown'}</span>
                    <span class="message-time">${new Date(message.date * 1000).toLocaleTimeString()}</span>
                </div>
                <div class="message-text">${message.text || '[Media/Sticker/Other]'}</div>
                <div class="message-meta">
                    <span class="chat-title">${message.chat?.title || 'Private'}</span>
                </div>
            </div>
        `).join('');
    }

    async sendTelegramMessage(chatId, message) {
        try {
            const response = await fetch(`${API_BASE}/admin/telegram/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: message })
            });
            
            if (response.ok) {
                this.addLog(`Message sent to chat ${chatId}`, 'success');
                return true;
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            this.addLog(`Failed to send message: ${error.message}`, 'error');
            return false;
        }
    }

    async approveMember(memberId) {
        try {
            const response = await fetch(`${API_BASE}/admin/members/${memberId}/approve`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.addLog(`Member ${memberId} approved`, 'success');
                await this.loadTelegramOperations(); // Refresh the data
            } else {
                throw new Error('Failed to approve member');
            }
        } catch (error) {
            this.addLog(`Failed to approve member: ${error.message}`, 'error');
        }
    }

    async denyMember(memberId) {
        try {
            const response = await fetch(`${API_BASE}/admin/members/${memberId}/deny`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.addLog(`Member ${memberId} denied`, 'success');
                await this.loadTelegramOperations(); // Refresh the data
            } else {
                throw new Error('Failed to deny member');
            }
        } catch (error) {
            this.addLog(`Failed to deny member: ${error.message}`, 'error');
        }
    }

    async viewGroupMessages(groupId) {
        try {
            const response = await fetch(`${API_BASE}/admin/telegram/group/${groupId}`);
            const messages = await response.json();
            
            // You could open a modal or update a section with group messages
            this.addLog(`Loaded ${messages.length} messages from group ${groupId}`, 'info');
        } catch (error) {
            this.addLog(`Failed to load group messages: ${error.message}`, 'error');
        }
    }

    async manageGroupMembers(groupId) {
        try {
            const response = await fetch(`${API_BASE}/admin/telegram/group/${groupId}/members`);
            const members = await response.json();
            
            this.addLog(`Loaded ${members.length} members from group ${groupId}`, 'info');
        } catch (error) {
            this.addLog(`Failed to load group members: ${error.message}`, 'error');
        }
    }

    // ===== TRANSACTIONS DATA =====
    async loadTransactionsData() {
        try {
            const response = await fetch(`${API_BASE}/admin/transactions`);
            const data = await response.json();
            this.updateTransactionsDisplay(data);

            // Load transaction summary
            const summaryResponse = await fetch(`${API_BASE}/admin/transactions/summary`);
            const summaryData = await summaryResponse.json();
            this.updateTransactionsSummary(summaryData);

            this.addLog('Transaction data loaded', 'success');
        } catch (error) {
            this.addLog(`Failed to load transaction data: ${error.message}`, 'error');
        }
    }

    updateTransactionsDisplay(transactions) {
        const container = document.getElementById('transactions-list');
        if (!container || !transactions) return;

        container.innerHTML = transactions.map(tx => `
            <div class="transaction-item" data-tx-id="${tx.id}">
                <div class="transaction-info">
                    <div class="transaction-type">${tx.type}</div>
                    <div class="transaction-amount">$${tx.amount.toLocaleString()}</div>
                    <div class="transaction-customer">Customer: ${tx.customer_id}</div>
                    <div class="transaction-date">${new Date(tx.timestamp).toLocaleDateString()}</div>
                </div>
                <div class="transaction-status">
                    <span class="badge badge-${tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}">
                        ${tx.status}
                    </span>
                </div>
            </div>
        `).join('');
    }

    updateTransactionsSummary(summary) {
        document.getElementById('total-transactions-count').textContent = summary.total_count || 0;
        document.getElementById('total-volume').textContent = `$${(summary.total_volume || 0).toLocaleString()}`;
        document.getElementById('pending-transactions').textContent = summary.pending_count || 0;
        document.getElementById('failed-transactions').textContent = summary.failed_count || 0;
    }

    // ===== AGENTS DATA =====
    async loadAgentsData() {
        try {
            const [agentsResponse, mastersResponse, commissionsResponse, statsResponse] = await Promise.all([
                fetch(`${API_BASE}/admin/agents`),
                fetch(`${API_BASE}/admin/masters`),
                fetch(`${API_BASE}/admin/commissions`),
                fetch(`${API_BASE}/admin/stats`)
            ]);

            const agentsData = await agentsResponse.json();
            const mastersData = await mastersResponse.json();
            const commissionsData = await commissionsResponse.json();
            const statsData = await statsResponse.json();

            // Store customer-agent integration data
            this.customerAgentData = {
                customers: statsData.customers || {},
                agents: statsData.agents || {},
                customersByAgent: statsData.customers?.byAgent || {}
            };

            this.updateAgentsDisplay(agentsData);
            this.updateMastersDisplay(mastersData);
            this.updateCommissionsDisplay(commissionsData);
            this.updateAgentCustomerIntegration();

            this.addLog(`Agents data loaded: ${statsData.agents?.total || 0} agents, ${statsData.customers?.total || 0} customers`, 'success');
        } catch (error) {
            this.addLog(`Failed to load agents data: ${error.message}`, 'error');
        }
    }

    updateAgentCustomerIntegration() {
        // Update agent-customer distribution display
        const integrationContainer = document.getElementById('agent-customer-integration');
        if (!integrationContainer || !this.customerAgentData) return;

        const { customersByAgent, agents } = this.customerAgentData;
        
        let integrationHTML = '<h4>Customer-Agent Distribution</h4>';
        
        if (customersByAgent && Object.keys(customersByAgent).length > 0) {
            integrationHTML += '<div class="agent-distribution-grid">';
            
            Object.entries(customersByAgent).forEach(([agentId, count]) => {
                const agent = agents.list?.find(a => a.id === agentId);
                const agentName = agent ? agent.name : agentId;
                
                integrationHTML += `
                    <div class="agent-distribution-item">
                        <div class="agent-name">${agentName}</div>
                        <div class="agent-id">${agentId}</div>
                        <div class="customer-count">${count} customers</div>
                        <div class="agent-percentage">${((count / this.customerAgentData.customers.total) * 100).toFixed(1)}%</div>
                    </div>
                `;
            });
            
            integrationHTML += '</div>';
            
            // Add summary stats
            const totalAssigned = Object.values(customersByAgent).reduce((sum, count) => sum + count, 0);
            const unassigned = this.customerAgentData.customers.total - totalAssigned;
            
            integrationHTML += `
                <div class="integration-summary">
                    <div class="summary-stat">
                        <label>Total Customers:</label>
                        <span>${this.customerAgentData.customers.total}</span>
                    </div>
                    <div class="summary-stat">
                        <label>Assigned to Agents:</label>
                        <span>${totalAssigned}</span>
                    </div>
                    <div class="summary-stat ${unassigned > 0 ? 'warning' : 'success'}">
                        <label>Unassigned:</label>
                        <span>${unassigned}</span>
                    </div>
                </div>
            `;
        } else {
            integrationHTML += '<div class="no-data">No customer-agent relationships found</div>';
        }

        integrationContainer.innerHTML = integrationHTML;
    }

    updateAgentsDisplay(agents) {
        const container = document.getElementById('agents-list');
        if (!container || !agents) return;

        container.innerHTML = agents.map(agent => `
            <div class="agent-item" data-agent-id="${agent.id}">
                <div class="agent-info">
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-code">${agent.code}</div>
                    <div class="agent-customers">${agent.customers?.length || 0} customers</div>
                </div>
                <div class="agent-performance">
                    <div class="monthly-volume">$${(agent.monthly_volume || 0).toLocaleString()}</div>
                    <div class="commission-rate">${((agent.commission_rate || 0) * 100).toFixed(2)}%</div>
                </div>
            </div>
        `).join('');
    }

    updateMastersDisplay(masters) {
        const container = document.getElementById('masters-list');
        if (!container || !masters) return;

        container.innerHTML = masters.map(master => `
            <div class="master-item" data-master-id="${master.id}">
                <div class="master-info">
                    <div class="master-name">${master.name}</div>
                    <div class="master-agents">${master.agents?.length || 0} agents</div>
                </div>
                <div class="master-performance">
                    <div class="total-volume">$${(master.total_volume || 0).toLocaleString()}</div>
                    <div class="commission-rate">${((master.commission_rate || 0) * 100).toFixed(2)}%</div>
                </div>
            </div>
        `).join('');
    }

    updateCommissionsDisplay(commissions) {
        const container = document.getElementById('commissions-summary');
        if (!container || !commissions) return;

        document.getElementById('total-commissions').textContent = `$${(commissions.total || 0).toLocaleString()}`;
        document.getElementById('agent-commissions').textContent = `$${(commissions.agents || 0).toLocaleString()}`;
        document.getElementById('master-commissions').textContent = `$${(commissions.masters || 0).toLocaleString()}`;
    }

    // ===== ANALYTICS DATA =====
    async loadAnalyticsData() {
        try {
            const metricsResponse = await fetch(`${API_BASE}/admin/metrics`);
            const metricsData = await metricsResponse.json();
            this.updateAnalyticsDisplay(metricsData);

            this.addLog('Analytics data loaded', 'success');
        } catch (error) {
            this.addLog(`Failed to load analytics data: ${error.message}`, 'error');
        }
    }

    updateAnalyticsDisplay(metrics) {
        // Update key performance indicators
        document.getElementById('revenue-today').textContent = `$${(metrics.revenue_today || 0).toLocaleString()}`;
        document.getElementById('new-customers-today').textContent = metrics.new_customers_today || 0;
        document.getElementById('active-sessions').textContent = metrics.active_sessions || 0;
        document.getElementById('avg-response-time').textContent = `${metrics.avg_response_time || 0}ms`;
    }

    // ===== CUSTOMERS MANAGEMENT =====
    async loadCustomersData() {
        try {
            // Load customer statistics
            const statsResponse = await fetch(`${API_BASE}/admin/stats`);
            const statsData = await statsResponse.json();
            this.updateCustomerSummary(statsData);

            // Load customer list
            const customersResponse = await fetch(`${API_BASE}/admin/customers?page=1&limit=50`);
            const customersData = await customersResponse.json();
            this.updateCustomersTable(customersData);

            // Load agents for filter dropdown
            const agentsResponse = await fetch(`${API_BASE}/admin/agents`);
            const agentsData = await agentsResponse.json();
            this.populateAgentFilter(agentsData);

            this.addLog('Customer data loaded', 'success');
        } catch (error) {
            this.addLog(`Failed to load customer data: ${error.message}`, 'error');
        }
    }

    updateCustomerSummary(stats) {
        document.getElementById('total-customers').textContent = stats.customers?.total || 0;
        document.getElementById('active-customers').textContent = stats.customers?.active || 0;
        
        // Calculate VIP customers (those with balance > $10,000 as an example)
        const vipThreshold = 10000;
        document.getElementById('vip-customers').textContent = 'Loading...';
        
        document.getElementById('customers-total-balance').textContent = `$${(stats.customers?.total_balance || 0).toLocaleString()}`;
        
        // Update the summary change indicators
        const totalChange = document.querySelector('#total-customers').parentElement.querySelector('.summary-change');
        if (totalChange) {
            const weeklyGrowth = Math.floor(Math.random() * 50) + 10; // Mock data
            totalChange.textContent = `+${weeklyGrowth} this week`;
        }
    }

    updateCustomersTable(customersData) {
        const tbody = document.getElementById('customers-table-body');
        if (!tbody || !customersData) return;

        const customers = customersData.customers || customersData;
        if (!Array.isArray(customers)) {
            tbody.innerHTML = '<tr><td colspan="9">No customers found</td></tr>';
            return;
        }

        tbody.innerHTML = customers.map(customer => {
            const customerId = customer.customer_id || customer.id;
            const customerName = this.parseCustomerName(customer.name || customer.telegram_username);
            const status = customer.active ? 'active' : 'inactive';
            const lastActive = customer.last_activity || customer.last_active;
            const agent = this.getAssignedAgent(customerId);
            const recentTransactions = this.getRecentTransactionCount(customerId);
            
            return `
            <tr data-customer-id="${customerId}" class="customer-row" data-transactions="${recentTransactions}">
                <td>${customerId}</td>
                <td class="customer-name">
                    <div class="name-primary">${customerName}</div>
                    <div class="name-secondary">${customer.telegram_username || ''}</div>
                </td>
                <td>${customer.telegram_username || 'N/A'}</td>
                <td class="agent-cell">${agent}</td>
                <td class="balance-cell">$${(customer.balance || 0).toLocaleString()}</td>
                <td>
                    <span class="badge badge-${this.getStatusClass(status)}">
                        ${status}
                    </span>
                </td>
                <td>${lastActive ? new Date(lastActive).toLocaleDateString() : 'Never'}</td>
                <td class="transactions-cell">
                    <span class="transaction-count" onclick="dashboard.viewCustomerTransactions('${customerId}')" title="Click to view transactions">
                        ${recentTransactions}
                    </span>
                </td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-info" onclick="dashboard.viewCustomerDetails('${customerId}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="dashboard.editCustomer('${customerId}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="dashboard.adjustCustomerBalance('${customerId}')" title="Adjust Balance">
                        <i class="fas fa-dollar-sign"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="dashboard.customerTransactionHistory('${customerId}')" title="Transactions">
                        <i class="fas fa-history"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');

        // Update pagination info
        const total = customersData.total || customers.length;
        const showing = customers.length;
        document.getElementById('customers-count-info').textContent = `Showing ${showing} of ${total} customers`;
    }

    getStatusClass(status) {
        switch(status?.toLowerCase()) {
            case 'active': return 'success';
            case 'vip': return 'info';
            case 'suspended': return 'danger';
            case 'inactive': return 'warning';
            default: return 'secondary';
        }
    }

    parseCustomerName(nameOrUsername) {
        if (!nameOrUsername) return 'Unknown Customer';
        
        // If it starts with @@, it's a telegram username - extract the name part
        if (nameOrUsername.startsWith('@@')) {
            const cleanUsername = nameOrUsername.substring(2);
            // Convert username like "patricia_jackson79" to "Patricia Jackson"
            const nameParts = cleanUsername.replace(/\d+$/, '').split('_');
            return nameParts.map(part => 
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join(' ');
        }
        
        // Otherwise return as-is with proper capitalization
        return nameOrUsername.split(' ').map(part => 
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join(' ');
    }

    getAssignedAgent(customerId) {
        // Load agent data from the agents configuration
        if (!this.agentAssignments) {
            this.loadAgentAssignments();
        }
        
        const assignment = this.agentAssignments?.get(customerId);
        return assignment ? `${assignment.name} (${assignment.code})` : 'Unassigned';
    }

    getRecentTransactionCount(customerId) {
        // Get transaction count from cached data or return loading state
        if (!this.transactionCounts) {
            this.loadTransactionCounts();
            return 'Loading...';
        }
        
        const count = this.transactionCounts?.get(customerId) || 0;
        return count > 0 ? count : '0';
    }

    async loadAgentAssignments() {
        try {
            const response = await fetch(`${API_BASE}/config/agents`);
            if (response.ok) {
                const agentsConfig = await response.json();
                this.agentAssignments = new Map();
                
                // Build customer -> agent mapping
                agentsConfig.agents?.list?.forEach(agent => {
                    if (agent.customers) {
                        agent.customers.forEach(customerId => {
                            this.agentAssignments.set(customerId.toString(), {
                                name: agent.name,
                                code: agent.code,
                                id: agent.id
                            });
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load agent assignments:', error);
            this.agentAssignments = new Map();
        }
    }

    async loadTransactionCounts() {
        try {
            const response = await fetch(`${API_BASE}/admin/transactions/summary`);
            if (response.ok) {
                const summary = await response.json();
                this.transactionCounts = new Map();
                
                // Mock transaction counts per customer - in real implementation, 
                // this would come from the transaction service
                const mockCounts = {};
                for (let i = 1; i <= 3142; i++) {
                    const customerId = `BB${i.toString().padStart(4, '0')}`;
                    mockCounts[customerId] = Math.floor(Math.random() * 50) + 1;
                }
                
                Object.entries(mockCounts).forEach(([customerId, count]) => {
                    this.transactionCounts.set(customerId, count);
                });
            }
        } catch (error) {
            console.error('Failed to load transaction counts:', error);
            this.transactionCounts = new Map();
        }
    }

    populateAgentFilter(agents) {
        const select = document.getElementById('customer-agent-filter');
        if (!select || !agents) return;

        // Keep the "All Agents" option and add agents
        const agentOptions = agents.map(agent => 
            `<option value="${agent.id}">${agent.name} (${agent.code})</option>`
        ).join('');
        
        select.innerHTML = '<option value="all">All Agents</option>' + agentOptions;
    }

    async refreshCustomerData() {
        this.addLog('Refreshing customer data...', 'info');
        await this.loadCustomersData();
    }

    async viewCustomerTransactions(customerId) {
        try {
            this.addLog(`Loading transactions for customer ${customerId}...`, 'info');
            const response = await fetch(`${API_BASE}/admin/transactions?customer=${customerId}`);
            
            if (response.ok) {
                const transactions = await response.json();
                this.showTransactionModal(customerId, transactions);
            } else {
                this.addLog(`Failed to load transactions for ${customerId}`, 'error');
            }
        } catch (error) {
            console.error('Error loading customer transactions:', error);
            this.addLog('Error loading customer transactions', 'error');
        }
    }

    showTransactionModal(customerId, transactions) {
        const modal = document.createElement('div');
        modal.className = 'transaction-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Transactions for Customer ${customerId}</h3>
                    <button class="close-modal" onclick="this.closest('.transaction-modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="transaction-summary">
                        <div class="summary-item">
                            <span>Total Transactions:</span>
                            <span>${transactions.length}</span>
                        </div>
                        <div class="summary-item">
                            <span>Total Volume:</span>
                            <span>$${transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="transactions-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${transactions.slice(0, 20).map(tx => `
                                    <tr>
                                        <td>${tx.id}</td>
                                        <td class="transaction-type-${tx.type}">${tx.type}</td>
                                        <td>$${(tx.amount || 0).toLocaleString()}</td>
                                        <td><span class="badge badge-${tx.status === 'completed' ? 'success' : 'warning'}">${tx.status}</span></td>
                                        <td>${new Date(tx.timestamp).toLocaleDateString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add click-outside-to-close functionality
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async exportCustomers() {
        try {
            this.addLog('Exporting customer data...', 'info');
            const response = await fetch(`${API_BASE}/admin/export/customers`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                this.addLog('Customer data exported successfully', 'success');
            } else {
                throw new Error('Export failed');
            }
        } catch (error) {
            this.addLog(`Export failed: ${error.message}`, 'error');
        }
    }

    async syncCustomerBalances() {
        if (!confirm('This will sync all customer balances with the trading system. Continue?')) {
            return;
        }

        try {
            this.addLog('Syncing customer balances...', 'info');
            const response = await fetch(`${API_BASE}/admin/sync-balances`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                this.addLog(`Balance sync completed: ${result.updated} customers updated`, 'success');
                await this.refreshCustomerData();
            } else {
                throw new Error('Sync failed');
            }
        } catch (error) {
            this.addLog(`Balance sync failed: ${error.message}`, 'error');
        }
    }

    async viewCustomerDetails(customerId) {
        try {
            const response = await fetch(`${API_BASE}/admin/customers/${customerId}`);
            if (response.ok) {
                const customer = await response.json();
                this.showCustomerModal(customer);
            } else {
                throw new Error('Customer not found');
            }
        } catch (error) {
            this.addLog(`Failed to load customer details: ${error.message}`, 'error');
        }
    }

    showCustomerModal(customer) {
        // Create and show customer details modal
        const modalContent = `
            <div class="customer-details">
                <h3>Customer Details</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Customer ID:</label>
                        <span>${customer.customer_id || customer.id}</span>
                    </div>
                    <div class="detail-item">
                        <label>Name:</label>
                        <span>${customer.name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Telegram:</label>
                        <span>${customer.telegram_username || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Phone:</label>
                        <span>${customer.phone || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Balance:</label>
                        <span class="balance-amount">$${(customer.balance || 0).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <label>Weekly P&L:</label>
                        <span class="pnl-amount ${customer.weekly_pnl >= 0 ? 'positive' : 'negative'}">
                            ${customer.weekly_pnl >= 0 ? '+' : ''}$${(customer.weekly_pnl || 0).toLocaleString()}
                        </span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="badge badge-${this.getStatusClass(customer.active ? 'active' : 'inactive')}">${customer.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Group Chat:</label>
                        <span>${customer.group_chat_id || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Keywords:</label>
                        <span>${customer.keywords ? customer.keywords.join(', ') : 'None'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Last Active:</label>
                        <span>${customer.last_activity ? new Date(customer.last_activity).toLocaleString() : 'Never'}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Simple modal implementation (you could enhance this)
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 500px; width: 90%;">
                ${modalContent}
                <div style="margin-top: 20px; text-align: right;">
                    <button class="btn btn-secondary" onclick="document.body.removeChild(this.closest('div'))">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async editCustomer(customerId) {
        this.addLog(`Edit customer ${customerId} - Feature coming soon`, 'info');
    }

    async adjustCustomerBalance(customerId) {
        const amount = prompt('Enter balance adjustment amount (use negative for deduction):');
        if (!amount) return;

        const adjustment = parseFloat(amount);
        if (isNaN(adjustment)) {
            alert('Invalid amount entered');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/admin/customers/${customerId}/balance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adjustment })
            });

            if (response.ok) {
                this.addLog(`Balance adjusted by $${adjustment} for customer ${customerId}`, 'success');
                await this.refreshCustomerData();
            } else {
                throw new Error('Balance adjustment failed');
            }
        } catch (error) {
            this.addLog(`Balance adjustment failed: ${error.message}`, 'error');
        }
    }

    async customerTransactionHistory(customerId) {
        try {
            const response = await fetch(`${API_BASE}/admin/customers/${customerId}/transactions`);
            if (response.ok) {
                const transactions = await response.json();
                this.showTransactionHistoryModal(customerId, transactions);
            } else {
                throw new Error('Failed to load transactions');
            }
        } catch (error) {
            this.addLog(`Failed to load transaction history: ${error.message}`, 'error');
        }
    }

    showTransactionHistoryModal(customerId, transactions) {
        const transactionRows = transactions.map(tx => `
            <tr>
                <td>${tx.id}</td>
                <td>${tx.type}</td>
                <td>$${tx.amount.toLocaleString()}</td>
                <td><span class="badge badge-${tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}">${tx.status}</span></td>
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
            </tr>
        `).join('');

        const modalContent = `
            <div class="transaction-history">
                <h3>Transaction History - Customer ${customerId}</h3>
                <table class="table">
                    <thead>
                        <tr><th>ID</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr>
                    </thead>
                    <tbody>${transactionRows}</tbody>
                </table>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">
                ${modalContent}
                <div style="margin-top: 20px; text-align: right;">
                    <button class="btn btn-secondary" onclick="document.body.removeChild(this.closest('div'))">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async addNewCustomer() {
        this.addLog('Add new customer - Feature coming soon', 'info');
        // This would open a form to add a new customer
    }

    resetCustomerFilters() {
        document.getElementById('customer-search').value = '';
        document.getElementById('customer-status-filter').value = 'all';
        document.getElementById('customer-agent-filter').value = 'all';
        this.refreshCustomerData();
    }

    loadCustomersPage(direction) {
        this.addLog(`Loading ${direction} page - Feature coming soon`, 'info');
        // This would implement pagination
    }

    // ===== QUICK ACTIONS =====
    async executeQuickAction(actionId) {
        const action = this.dashboardConfig?.dashboard?.quickActions?.find(a => a.id === actionId);
        if (!action) {
            this.addLog(`Quick action ${actionId} not found`, 'error');
            return;
        }

        if (action.confirmRequired && !confirm(`Execute ${action.name}?`)) {
            return;
        }

        try {
            this.addLog(`Executing: ${action.name}`, 'info');
            
            const response = await fetch(action.action, {
                method: action.method || 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const result = await response.json();
                this.addLog(`${action.name} completed successfully`, 'success');
                
                // If it returns data, you might want to display it
                if (result && typeof result === 'object') {
                    console.log(`${action.name} result:`, result);
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.addLog(`${action.name} failed: ${error.message}`, 'error');
        }
    }

    // === TELEGRAM BOT MANAGEMENT METHODS ===
    
    async refreshTelegramData() {
        this.addLog('Refreshing Telegram data...', 'info');
        await this.checkBotStatus();
        await this.loadBotDashboardStats();
    }

    async checkBotStatus() {
        try {
            const response = await fetch(`${API_BASE}/admin/telegram/bot/status`);
            const data = await response.json();
            
            if (response.ok) {
                document.getElementById('bot-status-value').textContent = data.status || 'Unknown';
                document.getElementById('bot-commands').textContent = data.commands_enabled || 0;
                this.addLog(`Bot status: ${data.status}`, 'success');
            } else {
                document.getElementById('bot-status-value').textContent = 'Error';
                this.addLog('Failed to get bot status', 'error');
            }
        } catch (error) {
            document.getElementById('bot-status-value').textContent = 'Offline';
            this.addLog(`Bot status check failed: ${error.message}`, 'error');
        }
    }

    async loadBotDashboardStats() {
        try {
            const response = await fetch(`${API_BASE}/admin/telegram/bot/dashboard/stats`);
            const data = await response.json();
            
            if (response.ok && data.bot) {
                document.getElementById('bot-name').textContent = data.bot.name || 'Firesupportcs_bot';
                document.getElementById('bot-username').textContent = data.bot.username || '@Firesupportcs_bot';
                document.getElementById('bot-dashboard-status').textContent = 'Connected';
                this.addLog('Bot dashboard stats loaded', 'success');
            } else {
                document.getElementById('bot-dashboard-status').textContent = 'Unavailable';
                this.addLog('Bot dashboard unavailable', 'warning');
            }
        } catch (error) {
            document.getElementById('bot-dashboard-status').textContent = 'Error';
            this.addLog(`Dashboard stats failed: ${error.message}`, 'error');
        }
    }

    async testBotAPI() {
        this.addLog('Testing bot API...', 'info');
        try {
            const response = await fetch(`${API_BASE}/admin/telegram/bot/dashboard/test`);
            const data = await response.json();
            
            if (response.ok && data.ok) {
                this.addLog('✅ Bot API test successful', 'success');
                this.showNotification('Bot API test passed!', 'success');
            } else {
                this.addLog(`❌ Bot API test failed: ${data.error || 'Unknown error'}`, 'error');
                this.showNotification('Bot API test failed!', 'error');
            }
        } catch (error) {
            this.addLog(`❌ Bot API test error: ${error.message}`, 'error');
            this.showNotification('Bot API test error!', 'error');
        }
    }

    async startTelegramBot() {
        this.addLog('Starting Telegram bot...', 'info');
        this.showNotification('Starting bot service...', 'info');
        // This would typically call a start endpoint
        setTimeout(() => {
            this.checkBotStatus();
        }, 2000);
    }

    async stopTelegramBot() {
        this.addLog('Stopping Telegram bot...', 'info');
        this.showNotification('Stopping bot service...', 'warning');
        // This would typically call a stop endpoint
        setTimeout(() => {
            this.checkBotStatus();
        }, 2000);
    }

    async loadTelegramGroups() {
        try {
            const response = await fetch(`${API_BASE}/admin/telegram/groups`);
            const data = await response.json();
            
            const groupsList = document.getElementById('telegram-groups');
            if (response.ok && Array.isArray(data)) {
                groupsList.innerHTML = data.map(group => `
                    <div class="group-item">
                        <strong>${group.title || 'Unnamed Group'}</strong>
                        <span class="group-members">${group.member_count || 0} members</span>
                    </div>
                `).join('');
                this.addLog(`Loaded ${data.length} Telegram groups`, 'success');
            } else {
                groupsList.innerHTML = '<div class="error">Failed to load groups</div>';
                this.addLog('Failed to load Telegram groups', 'error');
            }
        } catch (error) {
            this.addLog(`Groups loading error: ${error.message}`, 'error');
        }
    }

    async showPendingMembers() {
        try {
            const response = await fetch(`${API_BASE}/admin/members?status=pending`);
            const data = await response.json();
            
            const pendingList = document.getElementById('pending-members');
            if (response.ok && Array.isArray(data)) {
                pendingList.innerHTML = data.map(member => `
                    <div class="member-item">
                        <strong>${member.first_name || 'Unknown'} ${member.last_name || ''}</strong>
                        <span class="member-username">@${member.username || 'no_username'}</span>
                        <div class="member-actions">
                            <button class="btn btn-sm btn-success" onclick="dashboard.approveMember(${member.id})">
                                Approve
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="dashboard.denyMember(${member.id})">
                                Deny
                            </button>
                        </div>
                    </div>
                `).join('');
                this.addLog(`Found ${data.length} pending members`, 'info');
            } else {
                pendingList.innerHTML = '<div class="info">No pending members</div>';
            }
        } catch (error) {
            this.addLog(`Pending members error: ${error.message}`, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.className = `notification ${type} show`;

        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // === AGENT CONFIGURATION MANAGEMENT ===
    
    async refreshAgentData() {
        this.addLog('Refreshing agent data...', 'info');
        await this.loadAgentsData();
        await this.loadAgentConfigStatus();
    }

    async loadAgentConfigStatus() {
        try {
            const response = await fetch(`${API_BASE}/yaml/agents`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Parse the YAML content to get counts
                    const configContent = data.content;
                    const agentMatches = configContent.match(/- id: A\d+/g) || [];
                    const masterMatches = configContent.match(/- id: M\d+/g) || [];
                    
                    document.getElementById('config-file-status').textContent = 'Loaded';
                    document.getElementById('config-agent-count').textContent = agentMatches.length;
                    document.getElementById('config-master-count').textContent = masterMatches.length;
                    
                    this.addLog('Agent config status loaded', 'success');
                } else {
                    document.getElementById('config-file-status').textContent = 'Error';
                    this.addLog('Failed to load agent config', 'error');
                }
            }
        } catch (error) {
            document.getElementById('config-file-status').textContent = 'Error';
            this.addLog(`Config status error: ${error.message}`, 'error');
        }
    }

    async editAgentConfig() {
        try {
            const response = await fetch(`${API_BASE}/yaml/agents`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    document.getElementById('agent-config-editor').value = data.content;
                    document.getElementById('config-editor-modal').style.display = 'block';
                    document.getElementById('config-validation').innerHTML = '<div class="success">Configuration loaded successfully</div>';
                } else {
                    this.addLog(`Failed to load config: ${data.error}`, 'error');
                }
            }
        } catch (error) {
            this.addLog(`Config load error: ${error.message}`, 'error');
        }
    }

    closeConfigEditor() {
        document.getElementById('config-editor-modal').style.display = 'none';
    }

    async validateAgentConfig() {
        const content = document.getElementById('agent-config-editor').value;
        const validationDiv = document.getElementById('config-validation');
        
        try {
            // Basic YAML validation - check for common issues
            const lines = content.split('\n');
            let errors = [];
            let warnings = [];

            // Check for proper indentation
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.trim() && !line.match(/^[\s]*[a-zA-Z_-]+:/) && !line.match(/^[\s]*-/)) {
                    if (!line.match(/^[\s]*#/)) { // Skip comments
                        warnings.push(`Line ${i + 1}: Possible indentation issue`);
                    }
                }
            }

            // Check for required sections
            if (!content.includes('agents:')) {
                errors.push('Missing required "agents:" section');
            }
            if (!content.includes('masters:')) {
                errors.push('Missing required "masters:" section');
            }
            if (!content.includes('commission:')) {
                errors.push('Missing required "commission:" section');
            }

            // Display validation results
            if (errors.length === 0 && warnings.length === 0) {
                validationDiv.innerHTML = '<div class="success"><i class="fas fa-check"></i> Configuration is valid</div>';
                this.showNotification('Configuration validation passed', 'success');
            } else {
                let html = '';
                if (errors.length > 0) {
                    html += '<div class="error"><strong>Errors:</strong><ul>';
                    errors.forEach(error => html += `<li>${error}</li>`);
                    html += '</ul></div>';
                }
                if (warnings.length > 0) {
                    html += '<div class="warning"><strong>Warnings:</strong><ul>';
                    warnings.forEach(warning => html += `<li>${warning}</li>`);
                    html += '</ul></div>';
                }
                validationDiv.innerHTML = html;
                this.showNotification(`Validation found ${errors.length} errors, ${warnings.length} warnings`, errors.length > 0 ? 'error' : 'warning');
            }

            this.addLog(`Config validation: ${errors.length} errors, ${warnings.length} warnings`, errors.length > 0 ? 'error' : 'warning');
            
        } catch (error) {
            validationDiv.innerHTML = `<div class="error">Validation error: ${error.message}</div>`;
            this.addLog(`Validation error: ${error.message}`, 'error');
        }
    }

    async saveAgentConfig() {
        const content = document.getElementById('agent-config-editor').value;
        
        try {
            this.addLog('Saving agent configuration...', 'info');
            
            const response = await fetch(`${API_BASE}/yaml/agents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            const result = await response.json();
            
            if (result.success) {
                this.addLog('Agent configuration saved successfully', 'success');
                this.showNotification('Configuration saved successfully!', 'success');
                this.closeConfigEditor();
                
                // Refresh agent data
                await this.loadAgentsData();
                await this.loadAgentConfigStatus();
            } else {
                this.addLog(`Failed to save config: ${result.error}`, 'error');
                this.showNotification(`Save failed: ${result.error}`, 'error');
                document.getElementById('config-validation').innerHTML = `<div class="error">Save error: ${result.error}</div>`;
            }
            
        } catch (error) {
            this.addLog(`Config save error: ${error.message}`, 'error');
            this.showNotification(`Save error: ${error.message}`, 'error');
        }
    }

    async reloadAgentConfig() {
        this.addLog('Reloading agent configuration...', 'info');
        await this.loadAgentConfigStatus();
        await this.loadAgentsData();
        this.showNotification('Agent configuration reloaded', 'success');
    }

    async calculateCommissions() {
        try {
            this.addLog('Calculating commissions...', 'info');
            const response = await fetch(`${API_BASE}/admin/commissions/calculate`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                this.addLog('Commission calculation completed', 'success');
                this.showNotification('Commissions calculated successfully', 'success');
                
                // Refresh commission data
                await this.loadAgentsData();
            } else {
                throw new Error('Commission calculation failed');
            }
        } catch (error) {
            this.addLog(`Commission calculation error: ${error.message}`, 'error');
            this.showNotification('Commission calculation failed', 'error');
        }
    }
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', async () => {
    dashboard = new UnifiedDashboard();
    
    // Wait for initialization to complete
    await dashboard.init();
    
    // Initial log entry
    dashboard.addLog('Dashboard initialized', 'success');
    dashboard.addLog('Connecting to services...', 'info');
});