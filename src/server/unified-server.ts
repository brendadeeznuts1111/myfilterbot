/**
 * Unified Service Orchestrator
 * Integrates all services into a single cohesive system
 */

import { serve } from 'bun';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Shared state store for all services
class SharedStateStore {
  private state = {
    customers: [] as any[],
    transactions: [] as any[],
    services: {
      bot: { status: 'running', health: 'healthy', lastCheck: new Date() },
      api: { status: 'running', health: 'healthy', lastCheck: new Date() },
      websocket: { status: 'running', health: 'healthy', connections: 0 },
    },
    featureFlags: {
      realTimeUpdates: true,
      enhancedAnalytics: true,
      webSocketCompression: true,
    },
    metrics: {
      totalCustomers: 0,
      activeTransactions: 0,
      dailyVolume: 0,
      profitToday: 0,
    },
  };

  private listeners = new Set<(event: any) => void>();

  // Get state
  getState() {
    return this.state;
  }

  // Update state and notify listeners
  updateState(path: string, value: any) {
    const keys = path.split('.');
    let obj = this.state as any;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;

    this.notifyListeners({
      type: 'stateUpdate',
      path,
      value,
      timestamp: new Date().toISOString(),
    });
  }

  // Subscribe to state changes
  subscribe(listener: (event: any) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners(event: any) {
    this.listeners.forEach(listener => listener(event));
  }

  // Load initial data
  async loadData() {
    // Load customers
    const customersPath = join(process.cwd(), 'cache', 'customer_stats.json');
    if (existsSync(customersPath)) {
      this.state.customers = JSON.parse(readFileSync(customersPath, 'utf-8'));
      this.state.metrics.totalCustomers = this.state.customers.length;
    }

    // Generate sample transactions
    this.state.transactions = Array.from({ length: 10 }, (_, i) => ({
      id: `tx_${i + 1}`,
      customer: `Customer ${Math.floor(Math.random() * 10) + 1}`,
      amount: Math.floor(Math.random() * 10000) + 100,
      type: ['buy', 'sell'][Math.floor(Math.random() * 2)],
      status: ['pending', 'completed', 'failed'][Math.floor(Math.random() * 3)],
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    }));

    this.state.metrics.activeTransactions = this.state.transactions.filter(
      t => t.status === 'pending'
    ).length;
    this.state.metrics.dailyVolume = this.state.transactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    this.state.metrics.profitToday = Math.floor(
      this.state.metrics.dailyVolume * 0.02
    );
  }
}

// WebSocket connection manager
class WebSocketManager {
  private connections = new Set<any>();
  private store: SharedStateStore;

  constructor(store: SharedStateStore) {
    this.store = store;

    // Subscribe to state changes
    store.subscribe(event => {
      this.broadcast(event);
    });
  }

  addConnection(ws: any) {
    this.connections.add(ws);
    this.store.updateState(
      'services.websocket.connections',
      this.connections.size
    );

    // Send initial state
    ws.send(
      JSON.stringify({
        type: 'initialState',
        data: this.store.getState(),
        timestamp: new Date().toISOString(),
      })
    );
  }

  removeConnection(ws: any) {
    this.connections.delete(ws);
    this.store.updateState(
      'services.websocket.connections',
      this.connections.size
    );
  }

  broadcast(data: any) {
    const message = JSON.stringify(data);
    this.connections.forEach(ws => {
      if (ws.readyState === 1) {
        // OPEN
        ws.send(message);
      }
    });
  }
}

// Main unified server
class UnifiedServer {
  private store = new SharedStateStore();
  private wsManager = new WebSocketManager(this.store);
  private dashboardHTML: string;

  constructor() {
    this.loadDashboard();
    this.store.loadData();
  }

  private loadDashboard() {
    const dashboardPath = join(process.cwd(), 'developer-dashboard-live.html');
    if (existsSync(dashboardPath)) {
      this.dashboardHTML = readFileSync(dashboardPath, 'utf-8');

      // Inject WebSocket auto-connect script
      const wsScript = `
<script>
// Auto-connect to WebSocket
window.addEventListener('DOMContentLoaded', () => {
  const ws = new WebSocket('ws://localhost:4000/ws');
  
  ws.onopen = () => {
    console.log('✅ WebSocket connected to unified server');
    document.getElementById('ws-status').textContent = 'Connected';
    document.getElementById('ws-status').style.color = '#00d084';
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('📨 Received:', data);
    
    // Update UI based on message type
    if (data.type === 'stateUpdate') {
      // Update relevant UI elements
      if (data.path.startsWith('metrics.')) {
        updateMetrics(data);
      }
    }
  };
  
  ws.onclose = () => {
    document.getElementById('ws-status').textContent = 'Disconnected';
    document.getElementById('ws-status').style.color = '#ff4458';
    // Auto-reconnect after 3 seconds
    setTimeout(() => location.reload(), 3000);
  };
  
  // Make WebSocket available globally
  window.unifiedWS = ws;
});

function updateMetrics(data) {
  // Update metrics display
  const metricElement = document.querySelector('[data-metric="' + data.path.split('.')[1] + '"]');
  if (metricElement) {
    metricElement.textContent = data.value;
  }
}
</script>
`;

      // Inject before closing body tag
      this.dashboardHTML = this.dashboardHTML.replace(
        '</body>',
        wsScript + '</body>'
      );
    }
  }

  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // WebSocket upgrade
    if (url.pathname === '/ws' && req.headers.get('upgrade') === 'websocket') {
      return new Response('WebSocket endpoint', { status: 426 });
    }

    // Dashboard
    if (url.pathname === '/' || url.pathname === '/dashboard') {
      return new Response(this.dashboardHTML, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Health check
    if (url.pathname === '/health') {
      return Response.json(
        {
          status: 'ok',
          service: 'unified',
          services: this.store.getState().services,
          timestamp: new Date().toISOString(),
        },
        { headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // API Endpoints
    if (url.pathname.startsWith('/api/')) {
      return this.handleAPI(req, url, headers);
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleAPI(
    req: Request,
    url: URL,
    headers: any
  ): Promise<Response> {
    const state = this.store.getState();

    switch (url.pathname) {
      case '/api/state':
        return Response.json(state, {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });

      case '/api/customers':
        return Response.json(state.customers, {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });

      case '/api/transactions':
        if (req.method === 'POST') {
          const transaction = await req.json();
          state.transactions.push({
            ...transaction,
            id: `tx_${Date.now()}`,
            timestamp: new Date().toISOString(),
          });
          this.store.updateState('transactions', state.transactions);
          this.store.updateState(
            'metrics.activeTransactions',
            state.transactions.filter(t => t.status === 'pending').length
          );
          return Response.json(
            { success: true },
            { headers: { ...headers, 'Content-Type': 'application/json' } }
          );
        }
        return Response.json(state.transactions, {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });

      case '/api/metrics':
        return Response.json(state.metrics, {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });

      case '/api/feature-flags':
        return Response.json(state.featureFlags, {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });

      case '/api/services/status':
        return Response.json(state.services, {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });

      case '/api/trigger-update':
        // Trigger a state update to test real-time updates
        if (req.method === 'POST') {
          const { path, value } = (await req.json()) as any;
          this.store.updateState(path, value);
          return Response.json(
            { success: true },
            { headers: { ...headers, 'Content-Type': 'application/json' } }
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
    this.wsManager.addConnection(ws);

    ws.on('close', () => {
      this.wsManager.removeConnection(ws);
    });

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);

        // Handle different message types
        switch (data.type) {
          case 'ping':
            ws.send(
              JSON.stringify({
                type: 'pong',
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
                data: this.store.getState(),
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
}

// Create and start unified server
const unifiedServer = new UnifiedServer();

const server = serve({
  port: 4000,
  fetch: req => unifiedServer.handleRequest(req),
  websocket: {
    open(ws) {
      console.log('✅ WebSocket client connected');
      unifiedServer.handleWebSocket(ws);
    },
    message(ws, message) {
      ws.emit('message', message);
    },
    close(ws) {
      ws.emit('close');
    },
  },
});

console.log('🚀 Unified Server running on http://localhost:4000');
console.log('📊 Dashboard: http://localhost:4000/');
console.log('🔌 WebSocket: ws://localhost:4000/ws');
console.log('🔗 API: http://localhost:4000/api/*');
console.log('\n✨ All services integrated into a single unified system!');

// Simulate some activity
setInterval(() => {
  const state = unifiedServer['store'].getState();

  // Update random metric
  const metrics = [
    'totalCustomers',
    'activeTransactions',
    'dailyVolume',
    'profitToday',
  ];
  const metric = metrics[Math.floor(Math.random() * metrics.length)];
  const currentValue = state.metrics[metric];
  const change = Math.floor(Math.random() * 100) - 50;

  unifiedServer['store'].updateState(
    `metrics.${metric}`,
    Math.max(0, currentValue + change)
  );
}, 5000);

export { unifiedServer };
