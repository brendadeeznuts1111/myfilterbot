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
    }

    async loadDashboardConfiguration() {
        try {
            const response = await fetch(`${API_BASE}/yaml/dashboard`);
            if (response.ok) {
                const data = await response.json();
                this.dashboardConfig = data.content || data;
                console.log('Dashboard configuration loaded:', this.dashboardConfig);
            } else {
                console.warn('Failed to load dashboard configuration, using defaults');
                this.dashboardConfig = { ui: { tabs: [] } };
            }
        } catch (error) {
            console.error('Error loading dashboard configuration:', error);
            this.dashboardConfig = { ui: { tabs: [] } };
        }
    }

    setupDynamicTabs() {
        const navContainer = document.getElementById('dashboard-nav');
        if (!navContainer || !this.dashboardConfig?.dashboard?.ui?.tabs) {
            console.warn('No navigation container or tab configuration found');
            return;
        }

        // Clear existing navigation
        navContainer.innerHTML = '';

        // Generate tabs from YAML configuration
        this.dashboardConfig.dashboard.ui.tabs.forEach(tab => {
            if (tab.enabled) {
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
        }
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
            }
        } catch (error) {
            this.addLog('Failed to load overview data: ' + error.message, 'error');
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
            const [agentsResponse, mastersResponse, commissionsResponse] = await Promise.all([
                fetch(`${API_BASE}/admin/agents`),
                fetch(`${API_BASE}/admin/masters`),
                fetch(`${API_BASE}/admin/commissions`)
            ]);

            const agentsData = await agentsResponse.json();
            const mastersData = await mastersResponse.json();
            const commissionsData = await commissionsResponse.json();

            this.updateAgentsDisplay(agentsData);
            this.updateMastersDisplay(mastersData);
            this.updateCommissionsDisplay(commissionsData);

            this.addLog('Agents data loaded', 'success');
        } catch (error) {
            this.addLog(`Failed to load agents data: ${error.message}`, 'error');
        }
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