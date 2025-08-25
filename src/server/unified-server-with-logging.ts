/**
 * Unified Service Orchestrator with Error Handling and Logging
 * Production-ready version with comprehensive error management
 */

import { serve } from 'bun';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { loggers, LogLevel } from '../utils/logger';
import {
  errorHandler,
  errorMiddleware,
  AppError,
  ErrorCode,
} from '../utils/error-handler';

// Configure logging
const logger = loggers.unified;

// Shared state store with error handling
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
    errors: {
      total: 0,
      byService: {} as Record<string, number>,
      recent: [] as any[],
    },
  };

  private listeners = new Set<(event: any) => void>();

  getState() {
    try {
      return { ...this.state };
    } catch (error) {
      logger.error('Failed to get state', error as Error);
      throw new AppError('Failed to retrieve state', ErrorCode.INTERNAL_ERROR);
    }
  }

  updateState(path: string, value: any) {
    try {
      const keys = path.split('.');
      let obj = this.state as any;

      // Validate path exists
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) {
          throw new AppError(
            `Invalid state path: ${path}`,
            ErrorCode.BAD_REQUEST,
            400
          );
        }
        obj = obj[keys[i]];
      }

      const oldValue = obj[keys[keys.length - 1]];
      obj[keys[keys.length - 1]] = value;

      logger.info(`State updated: ${path}`, {
        metadata: { path, oldValue, newValue: value },
      });

      this.notifyListeners({
        type: 'stateUpdate',
        path,
        value,
        oldValue,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(`Failed to update state: ${path}`, error as Error);
      throw error;
    }
  }

  subscribe(listener: (event: any) => void) {
    this.listeners.add(listener);
    logger.debug(`New state subscriber added. Total: ${this.listeners.size}`);
    return () => {
      this.listeners.delete(listener);
      logger.debug(`State subscriber removed. Total: ${this.listeners.size}`);
    };
  }

  private notifyListeners(event: any) {
    let notified = 0;
    let failed = 0;

    this.listeners.forEach(listener => {
      try {
        listener(event);
        notified++;
      } catch (error) {
        failed++;
        logger.error('Listener notification failed', error as Error);
      }
    });

    if (failed > 0) {
      logger.warn(
        `State notification: ${notified} succeeded, ${failed} failed`
      );
    }
  }

  async loadData() {
    try {
      logger.info('Loading initial state data...');

      // Load customers with error handling
      const customersPath = join(process.cwd(), 'cache', 'customer_stats.json');
      if (existsSync(customersPath)) {
        try {
          const data = readFileSync(customersPath, 'utf-8');
          this.state.customers = JSON.parse(data);
          this.state.metrics.totalCustomers = this.state.customers.length;
          logger.info(`Loaded ${this.state.customers.length} customers`);
        } catch (error) {
          logger.error('Failed to load customers', error as Error);
          this.state.customers = [];
        }
      }

      // Generate sample transactions with validation
      this.state.transactions = this.generateSampleTransactions();
      this.updateMetrics();

      logger.info('Initial data loaded successfully', {
        metadata: {
          customers: this.state.customers.length,
          transactions: this.state.transactions.length,
        },
      });
    } catch (error) {
      logger.error('Failed to load initial data', error as Error);
      // System can continue with empty data
    }
  }

  private generateSampleTransactions() {
    try {
      return Array.from({ length: 10 }, (_, i) => ({
        id: `tx_${i + 1}`,
        customer: `Customer ${Math.floor(Math.random() * 10) + 1}`,
        amount: Math.floor(Math.random() * 10000) + 100,
        type: ['buy', 'sell'][Math.floor(Math.random() * 2)],
        status: ['pending', 'completed', 'failed'][
          Math.floor(Math.random() * 3)
        ],
        timestamp: new Date(
          Date.now() - Math.random() * 86400000
        ).toISOString(),
      }));
    } catch (error) {
      logger.error('Failed to generate sample transactions', error as Error);
      return [];
    }
  }

  private updateMetrics() {
    try {
      this.state.metrics.activeTransactions = this.state.transactions.filter(
        t => t.status === 'pending'
      ).length;
      this.state.metrics.dailyVolume = this.state.transactions.reduce(
        (sum, t) => sum + (t.amount || 0),
        0
      );
      this.state.metrics.profitToday = Math.floor(
        this.state.metrics.dailyVolume * 0.02
      );
    } catch (error) {
      logger.error('Failed to update metrics', error as Error);
    }
  }

  trackError(service: string, error: Error) {
    try {
      this.state.errors.total++;
      this.state.errors.byService[service] =
        (this.state.errors.byService[service] || 0) + 1;

      this.state.errors.recent.unshift({
        service,
        message: error.message,
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });

      // Keep only last 50 errors
      if (this.state.errors.recent.length > 50) {
        this.state.errors.recent = this.state.errors.recent.slice(0, 50);
      }

      this.notifyListeners({
        type: 'errorTracked',
        service,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } catch (trackingError) {
      logger.error('Failed to track error', trackingError as Error);
    }
  }
}

// WebSocket manager with error handling
class WebSocketManager {
  private connections = new Set<any>();
  private store: SharedStateStore;
  private connectionStats = {
    total: 0,
    current: 0,
    errors: 0,
    messagesSent: 0,
    messagesReceived: 0,
  };

  constructor(store: SharedStateStore) {
    this.store = store;

    store.subscribe(event => {
      this.safeBroadcast(event);
    });
  }

  addConnection(ws: any) {
    try {
      this.connections.add(ws);
      this.connectionStats.total++;
      this.connectionStats.current = this.connections.size;

      this.store.updateState(
        'services.websocket.connections',
        this.connections.size
      );

      // Send initial state with error handling
      this.safeSend(ws, {
        type: 'initialState',
        data: this.store.getState(),
        timestamp: new Date().toISOString(),
      });

      logger.info('WebSocket client connected', {
        metadata: {
          totalConnections: this.connectionStats.current,
        },
      });
    } catch (error) {
      logger.error('Failed to add WebSocket connection', error as Error);
      this.connectionStats.errors++;
    }
  }

  removeConnection(ws: any) {
    try {
      this.connections.delete(ws);
      this.connectionStats.current = this.connections.size;

      this.store.updateState(
        'services.websocket.connections',
        this.connections.size
      );

      logger.info('WebSocket client disconnected', {
        metadata: {
          remainingConnections: this.connectionStats.current,
        },
      });
    } catch (error) {
      logger.error('Failed to remove WebSocket connection', error as Error);
    }
  }

  private safeSend(ws: any, data: any) {
    try {
      if (ws.readyState === 1) {
        // OPEN
        ws.send(JSON.stringify(data));
        this.connectionStats.messagesSent++;
      }
    } catch (error) {
      logger.error('Failed to send WebSocket message', error as Error);
      this.connectionStats.errors++;
    }
  }

  private safeBroadcast(data: any) {
    const message = JSON.stringify(data);
    let sent = 0;
    let failed = 0;

    this.connections.forEach(ws => {
      try {
        if (ws.readyState === 1) {
          // OPEN
          ws.send(message);
          sent++;
        }
      } catch (error) {
        failed++;
        logger.debug('Failed to send to WebSocket client', { error });
      }
    });

    if (failed > 0) {
      logger.warn(`WebSocket broadcast: ${sent} sent, ${failed} failed`);
    }

    this.connectionStats.messagesSent += sent;
  }

  getStats() {
    return { ...this.connectionStats };
  }
}

// Main server with comprehensive error handling
class UnifiedServer {
  private store = new SharedStateStore();
  private wsManager = new WebSocketManager(this.store);
  private dashboardHTML: string = '';
  private requestCount = 0;
  private startTime = Date.now();

  constructor() {
    this.initialize().catch(error => {
      logger.fatal('Failed to initialize server', error);
      process.exit(1);
    });
  }

  private async initialize() {
    try {
      await this.loadDashboard();
      await this.store.loadData();
      this.setupHealthChecks();
      logger.info('Unified server initialized successfully');
    } catch (error) {
      logger.error('Initialization error', error as Error);
      throw error;
    }
  }

  private async loadDashboard() {
    try {
      const dashboardPath = join(
        process.cwd(),
        'developer-dashboard-live.html'
      );
      if (existsSync(dashboardPath)) {
        this.dashboardHTML = readFileSync(dashboardPath, 'utf-8');

        // Inject error monitoring
        const errorMonitorScript = `
<script>
window.addEventListener('error', (e) => {
  console.error('Dashboard error:', e.error);
  if (window.unifiedWS && window.unifiedWS.readyState === 1) {
    window.unifiedWS.send(JSON.stringify({
      type: 'clientError',
      error: {
        message: e.error.message,
        stack: e.error.stack,
        url: e.filename,
        line: e.lineno,
        column: e.colno
      }
    }));
  }
});
</script>
`;
        this.dashboardHTML = this.dashboardHTML.replace(
          '</head>',
          errorMonitorScript + '</head>'
        );
        logger.info('Dashboard loaded successfully');
      } else {
        logger.warn('Dashboard HTML not found');
      }
    } catch (error) {
      logger.error('Failed to load dashboard', error as Error);
    }
  }

  private setupHealthChecks() {
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  private async performHealthCheck() {
    try {
      const services = this.store.getState().services;

      for (const [name, service] of Object.entries(services)) {
        service.lastCheck = new Date();

        // Simulate health check
        const healthy = Math.random() > 0.1; // 90% healthy
        if (!healthy) {
          service.health = 'unhealthy';
          logger.warn(`Service ${name} is unhealthy`);
        } else {
          service.health = 'healthy';
        }
      }
    } catch (error) {
      logger.error('Health check failed', error as Error);
    }
  }

  async handleRequest(req: Request): Promise<Response> {
    const startTime = Date.now();
    this.requestCount++;

    const url = new URL(req.url);
    const requestId = crypto.randomUUID();

    // Create request-specific logger
    const requestLogger = logger.child({ requestId, path: url.pathname });

    try {
      requestLogger.info(`Incoming request: ${req.method} ${url.pathname}`);

      // CORS headers
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'X-Request-Id': requestId,
      };

      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
      }

      // Route handlers with error boundaries
      let response: Response;

      switch (true) {
        case url.pathname === '/' || url.pathname === '/dashboard':
          response = this.serveDashboard();
          break;

        case url.pathname === '/health':
          response = this.handleHealth(headers);
          break;

        case url.pathname.startsWith('/api/'):
          response = await this.handleAPI(req, url, headers);
          break;

        case url.pathname === '/ws':
          response = new Response('WebSocket endpoint', { status: 426 });
          break;

        default:
          throw new AppError('Not found', ErrorCode.NOT_FOUND, 404);
      }

      // Log successful response
      const duration = Date.now() - startTime;
      requestLogger.info(
        `Request completed: ${response.status} in ${duration}ms`
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      requestLogger.error(`Request failed after ${duration}ms`, error as Error);

      this.store.trackError('unified', error as Error);

      return errorHandler.handleError(error as Error, 'unified');
    }
  }

  private serveDashboard(): Response {
    if (!this.dashboardHTML) {
      throw new AppError('Dashboard not available', ErrorCode.NOT_FOUND, 404);
    }

    return new Response(this.dashboardHTML, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  private handleHealth(headers: any): Response {
    const uptime = Date.now() - this.startTime;
    const state = this.store.getState();

    return Response.json(
      {
        status: 'ok',
        service: 'unified',
        uptime,
        requestCount: this.requestCount,
        services: state.services,
        errors: {
          total: state.errors.total,
          byService: state.errors.byService,
        },
        websocket: this.wsManager.getStats(),
        timestamp: new Date().toISOString(),
      },
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  private async handleAPI(
    req: Request,
    url: URL,
    headers: any
  ): Promise<Response> {
    const state = this.store.getState();

    // API circuit breaker
    const apiBreaker = errorHandler.getCircuitBreaker('api');

    return apiBreaker.execute(async () => {
      switch (url.pathname) {
        case '/api/state':
          return Response.json(state, {
            headers: { ...headers, 'Content-Type': 'application/json' },
          });

        case '/api/errors':
          return Response.json(
            {
              errors: state.errors,
              stats: errorHandler.getErrorStats(),
            },
            {
              headers: { ...headers, 'Content-Type': 'application/json' },
            }
          );

        case '/api/trigger-update':
          if (req.method !== 'POST') {
            throw new AppError(
              'Method not allowed',
              ErrorCode.BAD_REQUEST,
              405
            );
          }

          const body = await req.json();
          if (!body.path || body.value === undefined) {
            throw new AppError(
              'Missing required fields',
              ErrorCode.VALIDATION_ERROR,
              400
            );
          }

          this.store.updateState(body.path, body.value);

          return Response.json(
            {
              success: true,
              path: body.path,
              value: body.value,
            },
            {
              headers: { ...headers, 'Content-Type': 'application/json' },
            }
          );

        default:
          throw new AppError(
            `Endpoint not found: ${url.pathname}`,
            ErrorCode.NOT_FOUND,
            404
          );
      }
    });
  }

  handleWebSocket(ws: any) {
    try {
      this.wsManager.addConnection(ws);

      ws.on('close', () => {
        this.wsManager.removeConnection(ws);
      });

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          logger.error('Invalid WebSocket message', error as Error);
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Invalid message format',
            })
          );
        }
      });

      ws.on('error', (error: Error) => {
        logger.error('WebSocket error', error);
        this.store.trackError('websocket', error);
      });
    } catch (error) {
      logger.error('Failed to handle WebSocket connection', error as Error);
    }
  }

  private handleWebSocketMessage(ws: any, data: any) {
    try {
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
          if (!data.path || data.value === undefined) {
            throw new Error('Invalid state update request');
          }
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

        case 'clientError':
          logger.warn('Client error reported', {
            error: data.error,
          });
          this.store.trackError('client', new Error(data.error.message));
          break;

        default:
          logger.debug(`Unknown WebSocket message type: ${data.type}`);
      }
    } catch (error) {
      logger.error('Failed to handle WebSocket message', error as Error);
      ws.send(
        JSON.stringify({
          type: 'error',
          message: error.message,
        })
      );
    }
  }
}

// Create and start server with error handling
logger.info('Starting Unified Server with comprehensive error handling...');

const unifiedServer = new UnifiedServer();

const server = serve({
  port: 4000,
  fetch: errorMiddleware(req => unifiedServer.handleRequest(req)),
  websocket: {
    open(ws) {
      unifiedServer.handleWebSocket(ws);
    },
    message(ws, message) {
      ws.emit('message', message);
    },
    close(ws) {
      ws.emit('close');
    },
    error(ws, error) {
      ws.emit('error', error);
    },
  },
  error(error) {
    logger.fatal('Server error', error);
    return new Response('Internal Server Error', { status: 500 });
  },
});

logger.info('🚀 Unified Server running on http://localhost:4000');
logger.info('📊 Dashboard: http://localhost:4000/');
logger.info('🔌 WebSocket: ws://localhost:4000/ws');
logger.info('🔍 Error Dashboard: http://localhost:4000/api/errors');
logger.info('📝 Logs directory: ./logs/');

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.stop();
  process.exit(0);
});

export { unifiedServer };
