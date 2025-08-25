import { getConfig, getRoute, getCacheHeaders, isFeatureEnabled } from '../../lib/apiConfig';
import type { ApiConfig, Route } from '../../lib/apiConfig';
import { onConfigChange } from '../../lib/apiConfigWatcher';
import jwt from 'jsonwebtoken';

// Cache current config for performance
let cachedConfig: ApiConfig | null = null;

// Update cache on config changes
onConfigChange((event) => {
  if (event.type === 'reload' && event.config) {
    cachedConfig = event.config;
    console.log('📝 Config middleware updated with new configuration');
  }
});

// Initialize cache
function initConfigCache() {
  if (!cachedConfig) {
    cachedConfig = getConfig();
  }
  return cachedConfig;
}

// CORS middleware factory
export function createCorsMiddleware() {
  return (req: Request): Headers => {
    const config = initConfigCache();
    const corsConfig = config.api.middleware.cors;
    const headers = new Headers();
    
    if (!corsConfig.enabled) return headers;
    
    const origin = req.headers.get('origin');
    
    // Check if origin is allowed
    if (corsConfig.origins.includes('*') || (origin && corsConfig.origins.includes(origin))) {
      headers.set('Access-Control-Allow-Origin', origin || '*');
    }
    
    if (corsConfig.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    headers.set('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
    headers.set('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
    headers.set('Access-Control-Expose-Headers', corsConfig.exposedHeaders.join(', '));
    headers.set('Access-Control-Max-Age', String(corsConfig.maxAge));
    
    return headers;
  };
}

// Rate limiting middleware
interface RateLimitStore {
  increment(key: string, window: number): Promise<number>;
}

class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetAt: number }>();
  
  async increment(key: string, window: number): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);
    
    if (!entry || entry.resetAt < now) {
      this.store.set(key, { count: 1, resetAt: now + window });
      return 1;
    }
    
    entry.count++;
    return entry.count;
  }
  
  // Clean up expired entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }
}

const rateLimitStore = new MemoryRateLimitStore();

// Cleanup every minute
setInterval(() => rateLimitStore.cleanup(), 60000);

export async function checkRateLimit(req: Request, route?: Route): Promise<{ allowed: boolean; headers: Headers }> {
  const config = initConfigCache();
  const headers = new Headers();
  
  if (!config.api.middleware.rateLimit.enabled) {
    return { allowed: true, headers };
  }
  
  // Use route-specific limits if available
  const limit = route?.rateLimit || config.api.middleware.rateLimit;
  const key = `${req.headers.get('x-forwarded-for') || 'unknown'}:${new URL(req.url).pathname}`;
  
  const count = await rateLimitStore.increment(key, limit.window);
  
  if (config.api.middleware.rateLimit.standardHeaders) {
    headers.set('X-RateLimit-Limit', String(limit.max));
    headers.set('X-RateLimit-Remaining', String(Math.max(0, limit.max - count)));
    headers.set('X-RateLimit-Reset', String(Date.now() + limit.window));
  }
  
  if (count > limit.max) {
    headers.set('Retry-After', String(Math.ceil(limit.window / 1000)));
    return { allowed: false, headers };
  }
  
  return { allowed: true, headers };
}

// JWT authentication middleware
export function verifyJWT(token: string): { valid: boolean; payload?: any; error?: string } {
  const config = initConfigCache();
  const jwtConfig = config.api.middleware.auth.jwt;
  
  if (!jwtConfig) {
    return { valid: false, error: 'JWT not configured' };
  }
  
  try {
    const payload = jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm as any],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
    
    return { valid: true, payload };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

// Authorization middleware
export function checkAuthorization(req: Request, route: Route): { authorized: boolean; reason?: string } {
  const config = initConfigCache();
  
  if (!config.api.middleware.auth.enabled || !route.roles) {
    return { authorized: true };
  }
  
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, reason: 'Missing authorization header' };
  }
  
  const token = authHeader.substring(7);
  const { valid, payload, error } = verifyJWT(token);
  
  if (!valid) {
    return { authorized: false, reason: error };
  }
  
  // Check roles
  const userRoles = payload.roles || [];
  const hasRequiredRole = route.roles.some(role => userRoles.includes(role));
  
  if (!hasRequiredRole) {
    return { authorized: false, reason: 'Insufficient permissions' };
  }
  
  // Check features
  if (route.features) {
    const missingFeatures = route.features.filter(f => !isFeatureEnabled(f));
    if (missingFeatures.length > 0) {
      return { authorized: false, reason: `Features not enabled: ${missingFeatures.join(', ')}` };
    }
  }
  
  return { authorized: true };
}

// Security headers middleware
export function createSecurityHeaders(): Headers {
  const config = initConfigCache();
  const headers = new Headers();
  
  if (!config.api.middleware.security.enabled) {
    return headers;
  }
  
  const securityHeaders = config.api.middleware.security.headers;
  
  for (const [key, value] of Object.entries(securityHeaders)) {
    if (value !== false) {
      headers.set(key, String(value));
    }
  }
  
  return headers;
}

// Cache headers middleware
export function createCacheHeaders(pathname: string): Headers {
  const config = initConfigCache();
  const headers = new Headers();
  
  if (!config.api.cache.enabled) {
    headers.set('Cache-Control', 'no-cache');
    return headers;
  }
  
  const cacheType = getCacheHeaders(pathname);
  const ttl = config.api.cache.ttl;
  
  switch (cacheType) {
    case 'public':
      headers.set('Cache-Control', `public, max-age=${ttl.static}`);
      break;
    case 'private':
      headers.set('Cache-Control', `private, max-age=${ttl.user}`);
      break;
    case 'no-store':
      headers.set('Cache-Control', 'no-store');
      break;
    default:
      headers.set('Cache-Control', `public, max-age=${ttl.default}`);
  }
  
  return headers;
}

// Response formatter
export function formatResponse(data: any, meta?: any): any {
  const config = initConfigCache();
  const responseConfig = config.api.response;
  
  if (!responseConfig.envelope) {
    return data;
  }
  
  const response: any = {
    [responseConfig.successKey]: true,
    [responseConfig.dataKey]: data
  };
  
  if (meta) {
    response[responseConfig.metaKey] = meta;
  }
  
  return response;
}

// Error formatter
export function formatError(error: any, statusCode: number = 500): Response {
  const config = initConfigCache();
  const responseConfig = config.api.response;
  const errorConfig = config.api.middleware.errorHandling;
  
  const errorData: any = {
    [responseConfig.successKey]: false,
    [responseConfig.errorKey]: {
      message: error.message || errorConfig.fallbackMessage,
      code: error.code || statusCode
    }
  };
  
  if (errorConfig.exposeDetails) {
    errorData[responseConfig.errorKey].details = error.details;
  }
  
  if (errorConfig.exposeStack && error.stack) {
    errorData[responseConfig.errorKey].stack = error.stack.split('\n');
  }
  
  const body = responseConfig.pretty 
    ? JSON.stringify(errorData, null, 2)
    : JSON.stringify(errorData);
  
  return new Response(body, {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Main middleware composer
export async function applyMiddleware(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const route = getRoute(url.pathname, req.method);
  
  // Apply CORS
  if (req.method === 'OPTIONS') {
    const corsHeaders = createCorsMiddleware()(req);
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  // Check rate limit
  const { allowed, headers: rateLimitHeaders } = await checkRateLimit(req, route);
  if (!allowed) {
    const config = initConfigCache();
    return new Response(config.api.middleware.rateLimit.message, {
      status: 429,
      headers: rateLimitHeaders
    });
  }
  
  // Check authorization for protected routes
  if (route && route.roles) {
    const { authorized, reason } = checkAuthorization(req, route);
    if (!authorized) {
      return formatError({ message: reason }, 401);
    }
  }
  
  return null; // Continue to route handler
}

// Logging middleware
export function logRequest(req: Request, res: Response, duration: number) {
  const config = initConfigCache();
  const loggingConfig = config.api.middleware.logging;
  
  if (!loggingConfig.enabled || !loggingConfig.requestLogging) {
    return;
  }
  
  const url = new URL(req.url);
  
  // Skip paths
  if (loggingConfig.skipPaths.some(path => url.pathname.startsWith(path))) {
    return;
  }
  
  const log = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: url.pathname,
    status: res.status,
    duration: `${duration}ms`,
    ip: req.headers.get('x-forwarded-for') || 'unknown'
  };
  
  if (loggingConfig.format === 'json') {
    console.log(JSON.stringify(log));
  } else {
    console.log(`[${log.timestamp}] ${log.method} ${log.path} ${log.status} ${log.duration}`);
  }
}