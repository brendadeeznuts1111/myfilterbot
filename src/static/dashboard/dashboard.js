/**
 * Unified Dashboard JavaScript
 * Combines functionality from both dashboard versions with Bun YAML support
 */

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
        this.apiBaseUrl = window.location.origin;
        this.wsUrl = `ws://${window.location.hostname}:3002`;
        
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupEventListeners();
        this.setupServerSentEvents();
        this.connectWebSocket();
        this.loadInitialData();
        this.startClock();
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
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
            const response = await fetch(`${this.apiBaseUrl}/api/admin/stats`);
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
            { id: 'telegram', url: '/api/bot/status', name: 'Telegram Bot' },
            { id: 'portal', url: '/health', port: 5000, name: 'Portal Server' },
            { id: 'admin', url: '/health', port: 3003, name: 'Admin Server' },
            { id: 'websocket', port: 3002, name: 'WebSocket Server', checkWs: true },
            { id: 'database', url: '/api/db/status', name: 'Database' },
            { id: 'redis', url: '/api/redis/status', name: 'Redis Cache' }
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
                const url = service.port ? 
                    `http://${window.location.hostname}:${service.port}${service.url || '/health'}` :
                    `${this.apiBaseUrl}${service.url}`;
                    
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
            const response = await fetch(`${this.apiBaseUrl}/api/yaml/${configName}`);
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
            const response = await fetch(`${this.apiBaseUrl}/api/yaml/${this.currentConfig}`, {
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
            const response = await fetch(`${this.apiBaseUrl}/api/yaml/validate`, {
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
            const response = await fetch(`${this.apiBaseUrl}/api/features`);
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
            const response = await fetch(`${this.apiBaseUrl}/api/features/${featureName}/toggle`, {
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
        fetch(`${this.apiBaseUrl}/api/hotreload/status`)
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
            const response = await fetch(`${this.apiBaseUrl}/api/services/start`, {
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
            const response = await fetch(`${this.apiBaseUrl}/api/services/stop`, {
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
            const response = await fetch(`${this.apiBaseUrl}/api/health/full`);
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
            const response = await fetch(`${this.apiBaseUrl}/api/export/all`);
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
        fetch(`${this.apiBaseUrl}/api/version`)
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
            fetch(`${this.apiBaseUrl}/api/system/stats`)
                .then(res => res.json())
                .then(data => {
                    document.getElementById('memory-usage').textContent = `${data.memory || 0} MB`;
                    document.getElementById('cpu-usage').textContent = `${data.cpu || 0}%`;
                })
                .catch(() => {});
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new UnifiedDashboard();
    
    // Initial log entry
    dashboard.addLog('Dashboard initialized', 'success');
    dashboard.addLog('Connecting to services...', 'info');
});