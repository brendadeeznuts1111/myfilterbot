/**
 * Unified API Router for Bun Server
 * Integrates customer, notification, and security APIs
 * Provides high-performance routing with middleware support
 */

import { customerAPI } from './customer';
import { notificationAPI } from './notifications';
import { securityAPI } from './security';

interface RouteHandler {
  method: string;
  pattern: RegExp;
  handler: (req: Request, matches: RegExpMatchArray) => Promise<Response>;
  requiresAuth?: boolean;
  requiredPermissions?: string[];
}

class APIRouter {
  private routes: RouteHandler[] = [];
  private corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Customer-ID, X-User-ID, X-User-Type, X-Admin-ID, X-Admin-Permissions',
    'Content-Type': 'application/json',
  };

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Customer API Routes
    this.addRoute(
      'GET',
      /^\/api\/customer\/profile$/,
      customerAPI.getCustomerProfile.bind(customerAPI)
    );
    this.addRoute(
      'PUT',
      /^\/api\/customer\/profile$/,
      customerAPI.updateCustomerProfile.bind(customerAPI)
    );
    this.addRoute(
      'GET',
      /^\/api\/customer\/balance$/,
      customerAPI.getCustomerBalance.bind(customerAPI)
    );
    this.addRoute(
      'GET',
      /^\/api\/customer\/transactions$/,
      customerAPI.getTransactionHistory.bind(customerAPI)
    );
    this.addRoute(
      'POST',
      /^\/api\/customer\/withdraw$/,
      customerAPI.requestWithdrawal.bind(customerAPI)
    );
    this.addRoute(
      'GET',
      /^\/api\/customer\/analytics$/,
      customerAPI.getCustomerAnalytics.bind(customerAPI)
    );

    // Notification API Routes
    this.addRoute(
      'GET',
      /^\/api\/notifications$/,
      notificationAPI.getNotifications.bind(notificationAPI)
    );
    this.addRoute(
      'POST',
      /^\/api\/notifications\/(\w+)\/read$/,
      notificationAPI.markAsRead.bind(notificationAPI)
    );
    this.addRoute(
      'POST',
      /^\/api\/notifications\/mark-all-read$/,
      notificationAPI.markAllAsRead.bind(notificationAPI)
    );
    this.addRoute(
      'GET',
      /^\/api\/notifications\/preferences$/,
      notificationAPI.getPreferences.bind(notificationAPI)
    );
    this.addRoute(
      'PUT',
      /^\/api\/notifications\/preferences$/,
      notificationAPI.updatePreferences.bind(notificationAPI)
    );
    this.addRoute(
      'POST',
      /^\/api\/notifications\/send$/,
      notificationAPI.sendNotification.bind(notificationAPI)
    );

    // Security API Routes
    this.addRoute(
      'GET',
      /^\/api\/security\/status$/,
      securityAPI.getSecurityStatus.bind(securityAPI)
    );
    this.addRoute(
      'GET',
      /^\/api\/security\/events$/,
      securityAPI.getSecurityEvents.bind(securityAPI)
    );
    this.addRoute(
      'GET',
      /^\/api\/security\/rules$/,
      securityAPI.getSecurityRules.bind(securityAPI)
    );
    this.addRoute(
      'PUT',
      /^\/api\/security\/rules\/(\w+)$/,
      securityAPI.updateSecurityRule.bind(securityAPI)
    );
    this.addRoute(
      'GET',
      /^\/api\/security\/blocked-ips$/,
      securityAPI.getBlockedIPs.bind(securityAPI)
    );
    this.addRoute(
      'POST',
      /^\/api\/security\/block-ip$/,
      securityAPI.blockIP.bind(securityAPI)
    );
    this.addRoute(
      'DELETE',
      /^\/api\/security\/blocked-ips\/(.+)$/,
      securityAPI.unblockIP.bind(securityAPI)
    );
    this.addRoute(
      'POST',
      /^\/api\/security\/events$/,
      securityAPI.recordSecurityEvent.bind(securityAPI)
    );

    console.log(`✅ Initialized ${this.routes.length} API routes`);
  }

  private addRoute(
    method: string,
    pattern: RegExp,
    handler: (req: Request, matches?: RegExpMatchArray) => Promise<Response>,
    requiresAuth: boolean = true,
    requiredPermissions: string[] = []
  ) {
    this.routes.push({
      method,
      pattern,
      handler,
      requiresAuth,
      requiredPermissions,
    });
  }

  async handleRequest(req: Request): Promise<Response | null> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: this.corsHeaders,
      });
    }

    // Find matching route
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const matches = path.match(route.pattern);
      if (matches) {
        try {
          // Apply middleware
          const middlewareResponse = await this.applyMiddleware(req, route);
          if (middlewareResponse) {
            return middlewareResponse;
          }

          // Execute route handler
          const response = await route.handler(req, matches);

          // Add CORS headers to response
          const headers = new Headers();
          Object.entries(this.corsHeaders).forEach(([key, value]) => {
            headers.set(key, value);
          });

          // Preserve existing headers from response
          response.headers.forEach((value, key) => {
            if (!headers.has(key)) {
              headers.set(key, value);
            }
          });

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        } catch (error) {
          console.error(`API Error for ${method} ${path}:`, error);

          return new Response(
            JSON.stringify({
              error: 'Internal server error',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            }),
            {
              status: 500,
              headers: this.corsHeaders,
            }
          );
        }
      }
    }

    // Route not found
    return null;
  }

  private async applyMiddleware(
    req: Request,
    route: RouteHandler
  ): Promise<Response | null> {
    // Rate limiting middleware
    const rateLimitResponse = await this.rateLimitMiddleware(req);
    if (rateLimitResponse) return rateLimitResponse;

    // Security logging middleware
    await this.securityLoggingMiddleware(req);

    // Authentication middleware
    if (route.requiresAuth) {
      const authResponse = await this.authenticationMiddleware(
        req,
        route.requiredPermissions
      );
      if (authResponse) return authResponse;
    }

    return null;
  }

  private async rateLimitMiddleware(req: Request): Promise<Response | null> {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowSize = 60 * 1000; // 1 minute window
    const maxRequests = 100; // Max 100 requests per minute

    // Simple in-memory rate limiting (in production, use Redis)
    const key = `rate_limit_${ip}`;
    if (!this.rateLimitCache.has(key)) {
      this.rateLimitCache.set(key, { count: 0, resetTime: now + windowSize });
    }

    const rateLimitData = this.rateLimitCache.get(key)!;

    if (now > rateLimitData.resetTime) {
      // Reset the counter
      rateLimitData.count = 0;
      rateLimitData.resetTime = now + windowSize;
    }

    rateLimitData.count++;

    if (rateLimitData.count > maxRequests) {
      // Record security event for rate limit exceeded
      await securityAPI.recordSecurityEvent(
        new Request('http://localhost/api/security/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'rate_limit_exceeded',
            threat_level: 'medium',
            source_ip: ip,
            description: `Rate limit exceeded: ${rateLimitData.count} requests`,
            metadata: { requests: rateLimitData.count, window: windowSize },
          }),
        })
      );

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retry_after: Math.ceil((rateLimitData.resetTime - now) / 1000),
        }),
        {
          status: 429,
          headers: {
            ...this.corsHeaders,
            'Retry-After': String(
              Math.ceil((rateLimitData.resetTime - now) / 1000)
            ),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': String(
              Math.max(0, maxRequests - rateLimitData.count)
            ),
            'X-RateLimit-Reset': String(rateLimitData.resetTime),
          },
        }
      );
    }

    return null;
  }

  private async securityLoggingMiddleware(req: Request): Promise<void> {
    const suspicious = this.detectSuspiciousActivity(req);

    if (suspicious) {
      await securityAPI.recordSecurityEvent(
        new Request('http://localhost/api/security/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'suspicious_activity',
            threat_level: 'medium',
            source_ip: req.headers.get('x-forwarded-for') || 'unknown',
            user_agent: req.headers.get('user-agent'),
            description: suspicious.reason,
            metadata: suspicious.metadata,
          }),
        })
      );
    }
  }

  private detectSuspiciousActivity(
    req: Request
  ): { reason: string; metadata: any } | null {
    const userAgent = req.headers.get('user-agent') || '';
    const path = new URL(req.url).pathname;

    // Detect common attack patterns
    if (
      path.includes('..') ||
      path.includes('<script') ||
      path.includes('DROP TABLE')
    ) {
      return {
        reason: 'Potential path traversal or injection attack',
        metadata: { path, userAgent },
      };
    }

    // Detect bot-like behavior
    if (
      userAgent.length < 10 ||
      userAgent.includes('bot') ||
      userAgent.includes('crawler')
    ) {
      return {
        reason: 'Automated request detected',
        metadata: { userAgent, path },
      };
    }

    return null;
  }

  private async authenticationMiddleware(
    req: Request,
    requiredPermissions: string[] = []
  ): Promise<Response | null> {
    // Basic authentication check
    const userId =
      req.headers.get('X-User-ID') || req.headers.get('X-Customer-ID');
    const adminId = req.headers.get('X-Admin-ID');

    if (!userId && !adminId) {
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          message: 'Missing user ID or admin ID in headers',
        }),
        {
          status: 401,
          headers: this.corsHeaders,
        }
      );
    }

    // Check admin permissions if required
    if (requiredPermissions.length > 0 && adminId) {
      const permissions =
        req.headers.get('X-Admin-Permissions')?.split(',') || [];
      const hasRequiredPermissions = requiredPermissions.every(perm =>
        permissions.includes(perm)
      );

      if (!hasRequiredPermissions) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient permissions',
            message: `Required permissions: ${requiredPermissions.join(', ')}`,
            required: requiredPermissions,
            provided: permissions,
          }),
          {
            status: 403,
            headers: this.corsHeaders,
          }
        );
      }
    }

    return null;
  }

  // Simple in-memory cache for rate limiting (in production, use Redis)
  private rateLimitCache = new Map<
    string,
    { count: number; resetTime: number }
  >();

  // Health check endpoint
  async getHealthCheck(): Promise<Response> {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        customer_api: 'operational',
        notification_api: 'operational',
        security_api: 'operational',
      },
      routes: this.routes.length,
      uptime: process.uptime(),
    };

    return new Response(JSON.stringify(health), {
      headers: this.corsHeaders,
    });
  }

  // Get API documentation
  async getAPIDocumentation(): Promise<Response> {
    const documentation = {
      title: 'Fantdev Trading Bot API',
      version: '2.1.0',
      description:
        'High-performance TypeScript/Bun API for trading bot operations',
      base_url: '/api',
      endpoints: {
        customer: {
          'GET /customer/profile': 'Get customer profile information',
          'PUT /customer/profile': 'Update customer profile',
          'GET /customer/balance': 'Get current balance and P&L',
          'GET /customer/transactions': 'Get transaction history',
          'POST /customer/withdraw': 'Request withdrawal',
          'GET /customer/analytics': 'Get customer analytics',
        },
        notifications: {
          'GET /notifications': 'Get user notifications',
          'POST /notifications/{id}/read': 'Mark notification as read',
          'POST /notifications/mark-all-read': 'Mark all notifications as read',
          'GET /notifications/preferences': 'Get notification preferences',
          'PUT /notifications/preferences': 'Update notification preferences',
          'POST /notifications/send': 'Send notification (admin only)',
        },
        security: {
          'GET /security/status': 'Get security system status',
          'GET /security/events': 'Get security events',
          'GET /security/rules': 'Get security rules',
          'PUT /security/rules/{id}': 'Update security rule',
          'GET /security/blocked-ips': 'Get blocked IP addresses',
          'POST /security/block-ip': 'Block IP address',
          'DELETE /security/blocked-ips/{ip}': 'Unblock IP address',
        },
      },
      authentication: {
        type: 'Header-based',
        headers: {
          'X-Customer-ID': 'Customer identifier',
          'X-Admin-ID': 'Admin identifier',
          'X-Admin-Permissions': 'Comma-separated permissions',
        },
      },
      rate_limits: {
        window: '1 minute',
        max_requests: 100,
        headers: {
          'X-RateLimit-Limit': 'Maximum requests per window',
          'X-RateLimit-Remaining': 'Requests remaining',
          'X-RateLimit-Reset': 'Window reset timestamp',
        },
      },
    };

    return new Response(JSON.stringify(documentation, null, 2), {
      headers: {
        ...this.corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

// Export singleton instance
export const apiRouter = new APIRouter();
export type { RouteHandler };
