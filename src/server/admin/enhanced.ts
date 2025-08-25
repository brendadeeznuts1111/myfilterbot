import { serve } from "bun";
import { execSync } from "child_process";
import { loadApiConfig, isFeatureEnabled } from "../../lib/apiConfig";
import { startConfigWatcher } from "../../lib/apiConfigWatcher";
import { 
  applyMiddleware, 
  createCorsMiddleware, 
  createSecurityHeaders, 
  createCacheHeaders,
  formatResponse,
  formatError,
  logRequest 
} from "../middleware/configMiddleware";

// Load configuration
const config = loadApiConfig();
const { server } = config.api;

console.log(`🚀 Enhanced Admin Server v${config.api.version}`);
console.log(`📍 Starting on ${server.host}:${server.port}`);
console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`⚡ Workers: ${server.workers}`);
console.log(`⏱️ Timeout: ${server.timeout}ms`);

// Start config watcher in development
if (process.env.NODE_ENV !== 'production') {
  startConfigWatcher();
  console.log('👁️ Config hot-reload enabled');
}

// Feature flags
const features = {
  v2Endpoints: isFeatureEnabled('v2Endpoints'),
  graphql: isFeatureEnabled('graphql'),
  websocket: isFeatureEnabled('websocket'),
  streaming: isFeatureEnabled('streaming'),
  batchRequests: isFeatureEnabled('batchRequests')
};

console.log('🎯 Active features:', Object.entries(features)
  .filter(([_, enabled]) => enabled)
  .map(([name]) => name)
  .join(', ') || 'none');

// Create server
const server = serve({
  port: server.port,
  hostname: server.host,
  
  async fetch(req) {
    const startTime = Bun.nanoseconds();
    const url = new URL(req.url);
    
    try {
      // Apply middleware
      const middlewareResponse = await applyMiddleware(req);
      if (middlewareResponse) {
        const duration = Math.round((Bun.nanoseconds() - startTime) / 1_000_000);
        logRequest(req, middlewareResponse, duration);
        return middlewareResponse;
      }
      
      // Route handlers
      let response: Response;
      
      switch (url.pathname) {
        case config.api.health.path:
          response = await handleHealth(req);
          break;
          
        case config.api.metrics.path:
          response = await handleMetrics(req);
          break;
          
        case config.api.documentation.path:
          response = await handleDocs(req);
          break;
          
        case '/api/config':
          response = await handleConfigEndpoint(req);
          break;
          
        case '/api/v2/status':
          if (features.v2Endpoints) {
            response = handleV2Status(req);
          } else {
            response = new Response('Not Found', { status: 404 });
          }
          break;
          
        default:
          // Check for API routes
          if (url.pathname.startsWith(config.api.basePath)) {
            response = await handleApiRoute(req);
          } else {
            response = new Response('Not Found', { status: 404 });
          }
      }
      
      // Add security headers
      const securityHeaders = createSecurityHeaders();
      securityHeaders.forEach((value, key) => {
        response.headers.set(key, value);
      });
      
      // Add CORS headers
      const corsHeaders = createCorsMiddleware()(req);
      corsHeaders.forEach((value, key) => {
        response.headers.set(key, value);
      });
      
      // Add cache headers
      const cacheHeaders = createCacheHeaders(url.pathname);
      cacheHeaders.forEach((value, key) => {
        response.headers.set(key, value);
      });
      
      // Log request
      const duration = Math.round((Bun.nanoseconds() - startTime) / 1_000_000);
      logRequest(req, response, duration);
      
      return response;
      
    } catch (error) {
      const duration = Math.round((Bun.nanoseconds() - startTime) / 1_000_000);
      const errorResponse = formatError(error);
      logRequest(req, errorResponse, duration);
      return errorResponse;
    }
  },
  
  error(error) {
    console.error('Server error:', error);
    return formatError({ message: 'Internal Server Error' }, 500);
  }
});

// Route handlers
async function handleHealth(req: Request): Promise<Response> {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || 
    execSync('git rev-parse HEAD').toString().trim();
  
  const healthData = formatResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.api.version,
    sha,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    features
  });
  
  return new Response(JSON.stringify(healthData, null, config.api.response.pretty ? 2 : 0), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleMetrics(req: Request): Promise<Response> {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    requests: {
      total: 0, // Would track this in production
      errors: 0,
      avgDuration: 0
    }
  };
  
  const response = formatResponse(metrics);
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleDocs(req: Request): Promise<Response> {
  const docs = {
    title: config.api.documentation.title,
    version: config.api.documentation.version,
    description: config.api.documentation.description,
    basePath: config.api.basePath,
    endpoints: [
      { path: config.api.health.path, method: 'GET', description: 'Health check' },
      { path: config.api.metrics.path, method: 'GET', description: 'Server metrics' },
      { path: '/api/config', method: 'GET', description: 'Configuration overview' }
    ]
  };
  
  const response = formatResponse(docs);
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleConfigEndpoint(req: Request): Promise<Response> {
  // Only show config overview, not secrets
  const configOverview = {
    name: config.api.name,
    version: config.api.version,
    environment: process.env.NODE_ENV || 'development',
    features,
    server: {
      host: config.api.server.host,
      port: config.api.server.port,
      workers: config.api.server.workers
    },
    middleware: {
      cors: config.api.middleware.cors.enabled,
      rateLimit: config.api.middleware.rateLimit.enabled,
      auth: config.api.middleware.auth.type
    }
  };
  
  const response = formatResponse(configOverview);
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

function handleV2Status(req: Request): Response {
  const status = formatResponse({
    message: 'V2 API is live',
    version: '2.0.0',
    features: ['enhanced-performance', 'streaming', 'batch-requests']
  });
  
  return new Response(JSON.stringify(status), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleApiRoute(req: Request): Promise<Response> {
  // This would integrate with your existing API routes
  // For now, return a placeholder
  const url = new URL(req.url);
  
  const response = formatResponse({
    message: 'API endpoint',
    path: url.pathname,
    method: req.method
  });
  
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
}

console.log(`✅ Server running at http://${server.hostname}:${server.port}`);
console.log(`📊 Metrics: http://${server.hostname}:${server.port}${config.api.metrics.path}`);
console.log(`📚 Docs: http://${server.hostname}:${server.port}${config.api.documentation.path}`);