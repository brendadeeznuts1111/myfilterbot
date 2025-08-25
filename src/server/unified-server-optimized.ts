/**
 * Optimized Unified Service Orchestrator
 * Performance-focused with caching, preloading, and connection pooling
 */

import { serve } from 'bun';
import { existsSync, readFileSync, writeFileSync, watch } from 'fs';
import { join } from 'path';
import { parse as parseYAML } from 'yaml';

// Cache store for configuration and data
class CacheStore {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private defaultTTL = 60000; // 1 minute default

  set(key: string, data: any, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(pattern?: string) {
    if (pattern) {
      const keys = Array.from(this.cache.keys());
      keys.forEach(key => {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      });
    } else {
      this.cache.clear();
    }
  }

  getStats() {
    const entries = Array.from(this.cache.entries());
    return {
      size: entries.length,
      totalBytes: JSON.stringify(entries).length,
      keys: entries.map(([key]) => key),
    };
  }
}

// Configuration manager with hot reload
class ConfigManager {
  private config: any = {};
  private cache = new CacheStore();
  private configPath: string;
  private watchers = new Map<string, any>();

  constructor() {
    this.configPath = join(process.cwd(), 'config');
    this.loadAllConfigs();
    this.setupWatchers();
  }

  private loadAllConfigs() {
    const configs = ['dashboard.yaml', 'services.yaml', 'features.yaml'];

    configs.forEach(filename => {
      const filepath = join(this.configPath, filename);
      if (existsSync(filepath)) {
        const content = readFileSync(filepath, 'utf-8');
        const parsed = parseYAML(content);
        const key = filename.replace('.yaml', '');
        this.config[key] = parsed;
        this.cache.set(`config:${key}`, parsed, 300000); // 5 min cache
      }
    });
  }

  private setupWatchers() {
    const configs = ['dashboard.yaml', 'services.yaml', 'features.yaml'];

    configs.forEach(filename => {
      const filepath = join(this.configPath, filename);
      if (existsSync(filepath)) {
        const watcher = watch(filepath, () => {
          console.log(`♻️ Reloading ${filename}...`);
          const content = readFileSync(filepath, 'utf-8');
          const parsed = parseYAML(content);
          const key = filename.replace('.yaml', '');
          this.config[key] = parsed;
          this.cache.clear(`config:${key}`);
          this.cache.set(`config:${key}`, parsed, 300000);
        });
        this.watchers.set(filename, watcher);
      }
    });
  }

  get(path: string): any {
    const cached = this.cache.get(`config:${path}`);
    if (cached) return cached;

    const keys = path.split('.');
    let value = this.config;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }

    if (value !== undefined) {
      this.cache.set(`config:${path}`, value, 60000);
    }

    return value;
  }

  getAll() {
    return this.config;
  }

  cleanup() {
    this.watchers.forEach(watcher => watcher.close());
    this.watchers.clear();
  }
}

// Connection pool for database connections
class ConnectionPool {
  private connections: any[] = [];
  private available: any[] = [];
  private maxConnections = 10;
  private minConnections = 2;

  async initialize() {
    // Pre-create minimum connections
    for (let i = 0; i < this.minConnections; i++) {
      const conn = await this.createConnection();
      this.connections.push(conn);
      this.available.push(conn);
    }
  }

  private async createConnection() {
    // Simulate database connection
    return {
      id: Math.random().toString(36).substr(2, 9),
      query: async (sql: string) => {
        // Simulate query execution
        await Bun.sleep(Math.random() * 10);
        return { rows: [] };
      },
      release: () => {
        if (!this.available.includes(this)) {
          this.available.push(this);
        }
      },
    };
  }

  async getConnection() {
    if (this.available.length > 0) {
      return this.available.pop();
    }

    if (this.connections.length < this.maxConnections) {
      const conn = await this.createConnection();
      this.connections.push(conn);
      return conn;
    }

    // Wait for available connection
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (this.available.length > 0) {
          clearInterval(checkInterval);
          resolve(this.available.pop());
        }
      }, 100);
    });
  }

  getStats() {
    return {
      total: this.connections.length,
      available: this.available.length,
      inUse: this.connections.length - this.available.length,
    };
  }

  async cleanup() {
    // Close all connections
    this.connections = [];
    this.available = [];
  }
}

// Optimized shared state store
class OptimizedStateStore {
  private state: any;
  private cache = new CacheStore();
  private listeners = new Set<(event: any) => void>();
  private batchUpdates: any[] = [];
  private batchTimer: any = null;
  private pool: ConnectionPool;

  constructor(pool: ConnectionPool) {
    this.pool = pool;
    this.state = {
      customers: [],
      transactions: [],
      services: {},
      featureFlags: {},
      metrics: {},
    };
  }

  getState(path?: string) {
    if (!path) return this.state;

    const cached = this.cache.get(`state:${path}`);
    if (cached) return cached;

    const keys = path.split('.');
    let value = this.state;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }

    if (value !== undefined) {
      this.cache.set(`state:${path}`, value, 30000); // 30 sec cache
    }

    return value;
  }

  updateState(path: string, value: any, immediate = false) {
    if (immediate) {
      this.applyUpdate(path, value);
      this.notifyListeners([
        {
          type: 'stateUpdate',
          path,
          value,
          timestamp: new Date().toISOString(),
        },
      ]);
    } else {
      this.batchUpdates.push({ path, value });
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.flushBatch(), 100);
      }
    }
  }

  private applyUpdate(path: string, value: any) {
    const keys = path.split('.');
    let obj = this.state as any;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;

    // Clear related cache
    this.cache.clear(`state:${path}`);
  }

  private flushBatch() {
    const updates = [...this.batchUpdates];
    this.batchUpdates = [];
    this.batchTimer = null;

    const events: any[] = [];
    updates.forEach(({ path, value }) => {
      this.applyUpdate(path, value);
      events.push({
        type: 'stateUpdate',
        path,
        value,
        timestamp: new Date().toISOString(),
      });
    });

    if (events.length > 0) {
      this.notifyListeners(events);
    }
  }

  subscribe(listener: (event: any) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(events: any[]) {
    const batch = {
      type: 'batch',
      events,
      timestamp: new Date().toISOString(),
    };
    this.listeners.forEach(listener => listener(batch));
  }

  async loadData() {
    // Use connection pool for database queries
    const conn = await this.pool.getConnection();

    try {
      // Load customers with caching
      const cachedCustomers = this.cache.get('customers:all');
      if (cachedCustomers) {
        this.state.customers = cachedCustomers;
      } else {
        const customersPath = join(
          process.cwd(),
          'cache',
          'customer_stats.json'
        );
        if (existsSync(customersPath)) {
          const data = JSON.parse(readFileSync(customersPath, 'utf-8'));
          this.state.customers = data;
          this.cache.set('customers:all', data, 120000); // 2 min cache
        }
      }

      // Preload frequently accessed data
      await this.preloadCommonData();

      // Calculate metrics
      this.updateMetrics();
    } finally {
      conn.release();
    }
  }

  private async preloadCommonData() {
    // Preload data that's frequently accessed
    const preloadKeys = [
      'services.bot.status',
      'services.api.status',
      'metrics.totalCustomers',
      'metrics.dailyVolume',
    ];

    preloadKeys.forEach(key => {
      const value = this.getState(key);
      if (value !== undefined) {
        this.cache.set(`state:${key}`, value, 60000);
      }
    });
  }

  private updateMetrics() {
    this.state.metrics = {
      totalCustomers: this.state.customers.length,
      activeTransactions:
        this.state.transactions?.filter((t: any) => t.status === 'pending')
          .length || 0,
      dailyVolume:
        this.state.transactions?.reduce(
          (sum: number, t: any) => sum + (t.amount || 0),
          0
        ) || 0,
      profitToday: 0,
    };

    this.state.metrics.profitToday = Math.floor(
      this.state.metrics.dailyVolume * 0.02
    );

    // Cache metrics
    this.cache.set('state:metrics', this.state.metrics, 30000);
  }

  getCacheStats() {
    return this.cache.getStats();
  }
}

// Optimized WebSocket manager with compression
class OptimizedWebSocketManager {
  private connections = new Map<string, any>();
  private store: OptimizedStateStore;
  private compressionEnabled = true;
  private messageQueue = new Map<string, any[]>();
  private flushInterval: any;

  constructor(store: OptimizedStateStore) {
    this.store = store;

    // Batch WebSocket messages
    this.flushInterval = setInterval(() => this.flushMessageQueues(), 50);

    // Subscribe to state changes
    store.subscribe(event => {
      this.queueBroadcast(event);
    });
  }

  addConnection(ws: any, id: string) {
    this.connections.set(id, ws);
    this.messageQueue.set(id, []);
    this.store.updateState(
      'services.websocket.connections',
      this.connections.size,
      true
    );

    // Send compressed initial state
    const initialState = {
      type: 'initialState',
      data: this.compressData(this.store.getState()),
      timestamp: new Date().toISOString(),
    };

    ws.send(JSON.stringify(initialState));
  }

  removeConnection(id: string) {
    this.connections.delete(id);
    this.messageQueue.delete(id);
    this.store.updateState(
      'services.websocket.connections',
      this.connections.size,
      true
    );
  }

  private compressData(data: any): any {
    if (!this.compressionEnabled) return data;

    // Simple compression: remove null/undefined values and minimize keys
    const compress = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(compress).filter(v => v !== undefined);
      }
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== null && value !== undefined) {
            result[key] = compress(value);
          }
        }
        return result;
      }
      return obj;
    };

    return compress(data);
  }

  private queueBroadcast(data: any) {
    this.connections.forEach((ws, id) => {
      if (ws.readyState === 1) {
        const queue = this.messageQueue.get(id) || [];
        queue.push(data);
        this.messageQueue.set(id, queue);
      }
    });
  }

  private flushMessageQueues() {
    this.messageQueue.forEach((queue, id) => {
      if (queue.length === 0) return;

      const ws = this.connections.get(id);
      if (!ws || ws.readyState !== 1) return;

      // Send batched messages
      const batch = {
        type: 'batch',
        messages: queue.map(msg => this.compressData(msg)),
        timestamp: new Date().toISOString(),
      };

      ws.send(JSON.stringify(batch));
      this.messageQueue.set(id, []);
    });
  }

  broadcast(data: any) {
    const message = JSON.stringify(this.compressData(data));
    this.connections.forEach(ws => {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    });
  }

  cleanup() {
    clearInterval(this.flushInterval);
    this.connections.clear();
    this.messageQueue.clear();
  }
}

// Response cache for API endpoints
class ResponseCache {
  private cache = new CacheStore();
  private hitRate = { hits: 0, misses: 0 };

  async get(key: string): Promise<Response | null> {
    const cached = this.cache.get(key);
    if (cached) {
      this.hitRate.hits++;
      return new Response(cached.body, {
        status: cached.status,
        headers: { ...cached.headers, 'X-Cache': 'HIT' },
      });
    }
    this.hitRate.misses++;
    return null;
  }

  async set(key: string, response: Response, ttl = 30000) {
    const body = await response.text();
    const cached = {
      body,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    };
    this.cache.set(key, cached, ttl);
  }

  getStats() {
    const total = this.hitRate.hits + this.hitRate.misses;
    return {
      hits: this.hitRate.hits,
      misses: this.hitRate.misses,
      hitRate:
        total > 0 ? ((this.hitRate.hits / total) * 100).toFixed(2) + '%' : '0%',
      cacheSize: this.cache.getStats().size,
    };
  }

  clear(pattern?: string) {
    this.cache.clear(pattern);
  }
}

// Main optimized unified server
class OptimizedUnifiedServer {
  private config: ConfigManager;
  private pool: ConnectionPool;
  private store: OptimizedStateStore;
  private wsManager: OptimizedWebSocketManager;
  private responseCache: ResponseCache;
  private dashboardHTML: string = '';

  constructor() {
    this.config = new ConfigManager();
    this.pool = new ConnectionPool();
    this.responseCache = new ResponseCache();
    this.store = new OptimizedStateStore(this.pool);
    this.wsManager = new OptimizedWebSocketManager(this.store);
  }

  async initialize() {
    console.log('⚡ Initializing optimized unified server...');

    // Initialize connection pool
    await this.pool.initialize();
    console.log('✅ Connection pool ready');

    // Load dashboard HTML
    await this.loadDashboard();
    console.log('✅ Dashboard loaded');

    // Preload data
    await this.store.loadData();
    console.log('✅ Data preloaded');

    // Initialize service status
    this.initializeServices();
    console.log('✅ Services initialized');
  }

  private async loadDashboard() {
    // Always use the optimized dashboard for better performance
    this.dashboardHTML = this.createOptimizedDashboard();

    // Also save it to disk for reference
    const dashboardPath = join(
      process.cwd(),
      'public/dashboard/unified-optimized.html'
    );
    writeFileSync(dashboardPath, this.dashboardHTML);
  }

  private createOptimizedDashboard(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Optimized Unified Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 15px;
            transition: transform 0.3s;
        }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-value { font-size: 2.5rem; font-weight: bold; }
        .stat-label { opacity: 0.8; margin-top: 5px; }
        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .service-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        .service-card:hover {
            background: rgba(255,255,255,0.2);
            transform: scale(1.05);
        }
        .service-status {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-left: 10px;
        }
        .status-running { background: #4caf50; }
        .status-stopped { background: #f44336; }
        .status-warning { background: #ff9800; }
        .log-container {
            background: rgba(0,0,0,0.3);
            padding: 20px;
            border-radius: 15px;
            height: 400px;
            overflow-y: auto;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 0.9rem;
        }
        .log-entry { 
            padding: 5px 0; 
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .cache-stats {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,0.7);
            padding: 15px;
            border-radius: 10px;
            font-size: 0.85rem;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        .updating { animation: pulse 1s infinite; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Optimized Unified Dashboard</h1>
            <p>Real-time monitoring with caching and performance optimizations</p>
            <p>WebSocket: <span id="ws-status">Connecting...</span></p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" data-metric="totalCustomers">0</div>
                <div class="stat-label">Total Customers</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" data-metric="activeTransactions">0</div>
                <div class="stat-label">Active Transactions</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" data-metric="dailyVolume">$0</div>
                <div class="stat-label">Daily Volume</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" data-metric="profitToday">$0</div>
                <div class="stat-label">Profit Today</div>
            </div>
        </div>

        <h2>Services</h2>
        <div class="services-grid" id="services-grid"></div>

        <h2>Live Activity Log</h2>
        <div class="log-container" id="log-container"></div>

        <div class="cache-stats" id="cache-stats">
            <strong>Cache Performance</strong><br>
            Hit Rate: <span id="cache-hit-rate">0%</span><br>
            Response Cache: <span id="response-cache-size">0</span> items<br>
            State Cache: <span id="state-cache-size">0</span> items<br>
            Pool Connections: <span id="pool-stats">0/0</span>
        </div>
    </div>

    <script>
        let ws = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 10;

        function connectWebSocket() {
            ws = new WebSocket('ws://localhost:3006/ws');
            
            ws.onopen = () => {
                console.log('✅ WebSocket connected');
                document.getElementById('ws-status').textContent = 'Connected';
                document.getElementById('ws-status').style.color = '#4caf50';
                reconnectAttempts = 0;
                
                // Request initial stats
                ws.send(JSON.stringify({ type: 'getStats' }));
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            };
            
            ws.onclose = () => {
                document.getElementById('ws-status').textContent = 'Disconnected';
                document.getElementById('ws-status').style.color = '#f44336';
                
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    setTimeout(connectWebSocket, 3000);
                }
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                addLogEntry('WebSocket error: ' + error.message, 'error');
            };
        }

        function handleWebSocketMessage(data) {
            if (data.type === 'batch') {
                data.messages?.forEach(handleMessage);
            } else {
                handleMessage(data);
            }
        }

        function handleMessage(data) {
            switch (data.type) {
                case 'initialState':
                    updateDashboard(data.data);
                    break;
                case 'stateUpdate':
                    updateMetric(data.path, data.value);
                    break;
                case 'stats':
                    updateStats(data.data);
                    break;
                default:
                    addLogEntry(JSON.stringify(data));
            }
        }

        function updateDashboard(state) {
            // Update metrics
            if (state.metrics) {
                Object.keys(state.metrics).forEach(key => {
                    updateMetric('metrics.' + key, state.metrics[key]);
                });
            }
            
            // Update services
            if (state.services) {
                const grid = document.getElementById('services-grid');
                grid.innerHTML = '';
                Object.keys(state.services).forEach(key => {
                    const service = state.services[key];
                    const card = document.createElement('div');
                    card.className = 'service-card';
                    card.innerHTML = \`
                        <div>\${key}</div>
                        <span class="service-status status-\${service.status}"></span>
                    \`;
                    grid.appendChild(card);
                });
            }
        }

        function updateMetric(path, value) {
            const parts = path.split('.');
            if (parts[0] === 'metrics') {
                const element = document.querySelector('[data-metric="' + parts[1] + '"]');
                if (element) {
                    element.classList.add('updating');
                    if (typeof value === 'number' && (parts[1].includes('Volume') || parts[1].includes('profit'))) {
                        element.textContent = '$' + value.toLocaleString();
                    } else {
                        element.textContent = value.toLocaleString();
                    }
                    setTimeout(() => element.classList.remove('updating'), 500);
                }
            }
        }

        function updateStats(stats) {
            if (stats.cache) {
                document.getElementById('cache-hit-rate').textContent = stats.cache.hitRate || '0%';
                document.getElementById('response-cache-size').textContent = stats.cache.responseCache || '0';
                document.getElementById('state-cache-size').textContent = stats.cache.stateCache || '0';
            }
            if (stats.pool) {
                document.getElementById('pool-stats').textContent = 
                    \`\${stats.pool.inUse}\/\${stats.pool.total}\`;
            }
        }

        function addLogEntry(message, type = 'info') {
            const container = document.getElementById('log-container');
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            const timestamp = new Date().toLocaleTimeString();
            entry.textContent = \`[\${timestamp}] \${message}\`;
            container.appendChild(entry);
            container.scrollTop = container.scrollHeight;
            
            // Keep only last 100 entries
            while (container.children.length > 100) {
                container.removeChild(container.firstChild);
            }
        }

        // Periodic stats update
        setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'getStats' }));
            }
        }, 5000);

        // Start connection
        connectWebSocket();
        
        // Add initial log entry
        addLogEntry('Dashboard initialized with optimizations enabled');
    </script>
</body>
</html>`;
  }

  private initializeServices() {
    const services = {
      bot: { status: 'running', health: 'healthy', lastCheck: new Date() },
      api: { status: 'running', health: 'healthy', lastCheck: new Date() },
      websocket: { status: 'running', health: 'healthy', connections: 0 },
      cache: { status: 'running', health: 'healthy', lastCheck: new Date() },
      pool: { status: 'running', health: 'healthy', lastCheck: new Date() },
    };

    Object.keys(services).forEach(key => {
      this.store.updateState(`services.${key}`, services[key], true);
    });
  }

  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const cacheKey = `${req.method}:${url.pathname}${url.search}`;

    // Check response cache for GET requests
    if (req.method === 'GET' && !url.pathname.startsWith('/ws')) {
      const cached = await this.responseCache.get(cacheKey);
      if (cached) return cached;
    }

    // CORS headers with compression
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Encoding': 'gzip',
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // WebSocket upgrade
    if (url.pathname === '/ws' && req.headers.get('upgrade') === 'websocket') {
      return new Response('WebSocket endpoint', { status: 426 });
    }

    let response: Response;

    // Route handlers
    switch (url.pathname) {
      case '/':
      case '/unified':
      case '/dashboard':
        response = new Response(this.dashboardHTML, {
          headers: { ...headers, 'Content-Type': 'text/html' },
        });
        break;

      case '/health':
        response = Response.json(
          {
            status: 'ok',
            service: 'unified-optimized',
            services: this.store.getState('services'),
            performance: {
              cache: this.responseCache.getStats(),
              pool: this.pool.getStats(),
              stateCache: this.store.getCacheStats(),
            },
            timestamp: new Date().toISOString(),
          },
          { headers: { ...headers, 'Content-Type': 'application/json' } }
        );
        break;

      case '/api/stats':
        response = Response.json(
          {
            cache: {
              ...this.responseCache.getStats(),
              responseCache: this.responseCache.getStats().cacheSize,
              stateCache: this.store.getCacheStats().size,
            },
            pool: this.pool.getStats(),
            timestamp: new Date().toISOString(),
          },
          { headers: { ...headers, 'Content-Type': 'application/json' } }
        );
        break;

      default:
        if (url.pathname.startsWith('/api/')) {
          response = await this.handleAPI(req, url, headers);
        } else {
          response = new Response('Not found', { status: 404, headers });
        }
    }

    // Cache successful GET responses
    if (req.method === 'GET' && response.status === 200) {
      await this.responseCache.set(cacheKey, response.clone());
    }

    return response;
  }

  private async handleAPI(
    req: Request,
    url: URL,
    headers: any
  ): Promise<Response> {
    const endpoint = url.pathname.substring(5); // Remove /api/

    switch (endpoint) {
      case 'state':
        return Response.json(this.store.getState(), {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });

      case 'customers':
        return Response.json(this.store.getState('customers'), {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });

      case 'transactions':
        if (req.method === 'POST') {
          const transaction = await req.json();
          const transactions = this.store.getState('transactions') || [];
          transactions.push({
            ...transaction,
            id: `tx_${Date.now()}`,
            timestamp: new Date().toISOString(),
          });
          this.store.updateState('transactions', transactions);

          // Clear related cache
          this.responseCache.clear('transactions');

          return Response.json(
            { success: true },
            {
              headers: { ...headers, 'Content-Type': 'application/json' },
            }
          );
        }
        return Response.json(this.store.getState('transactions'), {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });

      case 'metrics':
        return Response.json(this.store.getState('metrics'), {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });

      case 'config':
        return Response.json(this.config.getAll(), {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });

      case 'cache/clear':
        if (req.method === 'POST') {
          const { pattern } = (await req.json()) as any;
          this.responseCache.clear(pattern);
          return Response.json(
            { success: true, message: 'Cache cleared' },
            {
              headers: { ...headers, 'Content-Type': 'application/json' },
            }
          );
        }
        break;
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  handleWebSocket(ws: any) {
    const id = Math.random().toString(36).substr(2, 9);
    this.wsManager.addConnection(ws, id);

    ws.on('close', () => {
      this.wsManager.removeConnection(id);
    });

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'ping':
            ws.send(
              JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString(),
              })
            );
            break;

          case 'getStats':
            ws.send(
              JSON.stringify({
                type: 'stats',
                data: {
                  cache: {
                    ...this.responseCache.getStats(),
                    responseCache: this.responseCache.getStats().cacheSize,
                    stateCache: this.store.getCacheStats().size,
                  },
                  pool: this.pool.getStats(),
                },
                timestamp: new Date().toISOString(),
              })
            );
            break;

          case 'updateState':
            this.store.updateState(data.path, data.value);
            break;

          case 'getState':
            ws.send(
              JSON.stringify({
                type: 'state',
                data: this.store.getState(data.path),
                timestamp: new Date().toISOString(),
              })
            );
            break;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
  }

  async cleanup() {
    console.log('🧹 Cleaning up server resources...');
    this.config.cleanup();
    this.wsManager.cleanup();
    await this.pool.cleanup();
  }
}

// Create and start optimized server
const server = new OptimizedUnifiedServer();

// Initialize server
await server.initialize();

// Start server
const bunServer = serve({
  port: 3006,
  fetch: req => server.handleRequest(req),
  websocket: {
    open(ws) {
      console.log('✅ WebSocket client connected');
      server.handleWebSocket(ws);
    },
    message(ws, message) {
      ws.emit('message', message);
    },
    close(ws) {
      ws.emit('close');
    },
  },
});

console.log('⚡ Optimized Unified Server running on http://localhost:3006');
console.log('📊 Dashboard: http://localhost:3006/unified');
console.log('🔌 WebSocket: ws://localhost:3006/ws');
console.log('🔗 API: http://localhost:3006/api/*');
console.log('💾 Response caching enabled');
console.log('🔄 Configuration hot-reload enabled');
console.log('🏊 Connection pooling active');
console.log('\n✨ Performance optimizations active!');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await server.cleanup();
  process.exit(0);
});

// Simulate activity for demonstration
setInterval(() => {
  const metrics = [
    'totalCustomers',
    'activeTransactions',
    'dailyVolume',
    'profitToday',
  ];
  const metric = metrics[Math.floor(Math.random() * metrics.length)];
  const current = server['store'].getState(`metrics.${metric}`) || 0;
  const change = Math.floor(Math.random() * 100) - 50;

  server['store'].updateState(
    `metrics.${metric}`,
    Math.max(0, current + change)
  );
}, 10000);

export { server };
