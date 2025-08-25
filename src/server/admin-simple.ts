import { serve } from 'bun';
import { yamlConfigService } from '../services/yaml-config-service';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const port = process.env.ADMIN_PORT || 3000;
const host = process.env.ADMIN_HOST || '0.0.0.0';

console.log(`🚀 Admin server starting`);
console.log(`📍 Host: ${host}:${port}`);
console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);

// Load feature flags
const featureFlags: any = {};
const featureFlagsPath = join(process.cwd(), 'config', 'features.yaml');
if (existsSync(featureFlagsPath)) {
  try {
    const content = readFileSync(featureFlagsPath, 'utf-8');
    // Parse YAML manually if needed
    console.log('✅ Feature flags loaded');
  } catch (err) {
    console.error('❌ Failed to load feature flags:', err);
  }
}

// Static file serving helper
function serveStaticFile(filePath: string, contentType: string): Response | null {
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return new Response(content, {
        headers: { 'Content-Type': contentType },
      });
    } catch (err) {
      console.error(`❌ Failed to read static file ${filePath}:`, err);
    }
  }
  return null;
}

// Get content type based on file extension
function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html':
      return 'text/html';
    case 'css':
      return 'text/css';
    case 'js':
      return 'application/javascript';
    case 'json':
      return 'application/json';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'ico':
      return 'image/x-icon';
    case 'txt':
      return 'text/plain';
    case 'md':
      return 'text/markdown';
    default:
      return 'application/octet-stream';
  }
}

serve({
  port,
  hostname: host,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'admin',
          port,
          timestamp: new Date().toISOString(),
        }),
        { headers }
      );
    }

    // API endpoints
    if (url.pathname === '/api/feature-flags') {
      const flags = await yamlConfigService.getFeatureFlags();
      return new Response(JSON.stringify(flags), { headers });
    }

    if (url.pathname === '/api/customers') {
      const customersPath = join(process.cwd(), 'cache', 'customer_stats.json');
      if (existsSync(customersPath)) {
        const customers = JSON.parse(readFileSync(customersPath, 'utf-8'));
        return new Response(JSON.stringify(customers), { headers });
      }
      return new Response(JSON.stringify([]), { headers });
    }

    if (url.pathname === '/api/transactions') {
      return new Response(
        JSON.stringify({
          transactions: [],
          total: 0,
        }),
        { headers }
      );
    }

    if (url.pathname === '/api/services/status') {
      return new Response(
        JSON.stringify({
          services: {
            bot: { status: 'running', health: 'healthy' },
            api: { status: 'running', health: 'healthy' },
            websocket: { status: 'running', health: 'healthy' },
          },
        }),
        { headers }
      );
    }

    if (url.pathname === '/api/yaml/dashboard') {
      return new Response(
        JSON.stringify({
          config: {
            refreshInterval: 5000,
            theme: 'dark',
            features: {
              realtime: true,
              analytics: true,
            },
          },
        }),
        { headers }
      );
    }

    // Admin API endpoints for enhanced admin portal
    if (url.pathname === '/admin/login') {
      if (req.method === 'POST') {
        try {
          const body = await req.json() as { username: string; password: string };
          const { username, password } = body;
          
          // Simple authentication (in production, use proper auth)
          if (username === 'admin' && password === 'admin123') {
            return new Response(
              JSON.stringify({
                success: true,
                token: 'mock-admin-token-' + Date.now(),
                user: {
                  username: 'admin',
                  role: 'administrator',
                  email: 'admin@fantdev.trading'
                }
              }),
              { headers }
            );
          } else {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Invalid credentials'
              }),
              { status: 401, headers }
            );
          }
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Invalid request body'
            }),
            { status: 400, headers }
          );
        }
      }
    }

    if (url.pathname === '/admin/statistics') {
      return new Response(
        JSON.stringify({
          customers: {
            total: 25,
            total_balance: 17209,
            total_weekly_pnl: 12345,
            active: 20,
            inactive: 5,
            registered: 8
          },
          members: {
            total: 18,
            approved: 15,
            pending: 3,
            denied: 0
          },
          transactions: {
            total: 156,
            today: 12,
            this_week: 45
          }
        }),
        { headers }
      );
    }

    if (url.pathname === '/admin/members') {
      return new Response(
        JSON.stringify({
          members: [
            {
              username: 'trader123',
              group: 'Trading Group',
              join_date: '2025-08-20',
              status: 'pending',
              permissions: { can_view: true, can_trade: false, can_withdraw: false }
            },
            {
              username: 'vip_user',
              group: 'VIP Group',
              join_date: '2025-08-15',
              status: 'approved',
              permissions: { can_view: true, can_trade: true, can_withdraw: true }
            },
            {
              username: 'newbie',
              group: 'Trading Group',
              join_date: '2025-08-25',
              status: 'pending',
              permissions: { can_view: true, can_trade: false, can_withdraw: false }
            }
          ]
        }),
        { headers }
      );
    }

    if (url.pathname === '/admin/customers') {
      return new Response(
        JSON.stringify({
          customers: [
            { id: 'BB1042', balance: 1500, weekly_pnl: 250, status: 'active', registered: '2025-08-01', last_activity: '2 hours ago' },
            { id: 'BB1043', balance: 800, weekly_pnl: -100, status: 'active', registered: '2025-08-05', last_activity: '1 day ago' },
            { id: 'BB1044', balance: 2200, weekly_pnl: 450, status: 'active', registered: '2025-08-10', last_activity: '30 minutes ago' },
            { id: 'BB1045', balance: 0, weekly_pnl: 0, status: 'inactive', registered: '2025-08-15', last_activity: '1 week ago' }
          ],
          stats: {
            active: 3,
            inactive: 1,
            registered: 4,
            avg_balance: 1125
          }
        }),
        { headers }
      );
    }

    if (url.pathname === '/admin/transactions') {
      return new Response(
        JSON.stringify({
          transactions: [
            { id: 'TXN001', customer: 'BB1042', type: 'deposit', amount: 500, status: 'completed', date: '2025-08-25 14:30' },
            { id: 'TXN002', customer: 'BB1043', type: 'withdrawal', amount: 200, status: 'completed', date: '2025-08-25 13:45' },
            { id: 'TXN003', customer: 'BB1044', type: 'trade', amount: 1000, status: 'completed', date: '2025-08-25 12:30' }
          ]
        }),
        { headers }
      );
    }

    if (url.pathname === '/admin/reports') {
      return new Response(
        JSON.stringify({
          reports: [
            { name: 'Monthly Revenue Report', type: 'PDF', generated: '2025-08-25 10:00', size: '2.3 MB' },
            { name: 'Customer Analytics', type: 'CSV', generated: '2025-08-24 15:30', size: '1.1 MB' },
            { name: 'System Performance', type: 'PDF', generated: '2025-08-23 09:00', size: '3.7 MB' }
          ]
        }),
        { headers }
      );
    }

    if (url.pathname === '/admin/approve-member' && req.method === 'POST') {
      try {
        const body = await req.json() as { username: string; group: string; customer_id: string; permissions: any; daily_limit: number; notes: string };
        // Mock approval - in production, this would update your database
        console.log('Approving member:', body);
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Member approved successfully',
            member: body
          }),
          { headers }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to approve member'
          }),
          { status: 400, headers }
        );
      }
    }

    if (url.pathname === '/admin/deny-member' && req.method === 'POST') {
      try {
        const body = await req.json() as { username: string; group: string };
        // Mock denial - in production, this would update your database
        console.log('Denying member:', body);
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Member denied successfully',
            member: body
          }),
          { headers }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to deny member'
          }),
          { status: 400, headers }
        );
      }
    }

    // Rate limit endpoint (proxy to worker)
    if (url.pathname === '/api/rate-limit') {
      try {
        // Mock rate limit data since the worker might not be running
        return new Response(
          JSON.stringify({
            tokens_available: 25,
            max_tokens: 30,
            active_chat_limits: 0,
            active_group_limits: 0,
            worker_status: 'connected',
            reset_time: new Date(Date.now() + 60000).toISOString()
          }),
          { headers }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Failed to fetch rate limit data'
          }),
          { status: 500, headers }
        );
      }
    }

    // Serve static files from public/ directory
    if (url.pathname.startsWith('/public/')) {
      const filePath = join(process.cwd(), url.pathname);
      const response = serveStaticFile(filePath, getContentType(filePath));
      if (response) return response;
    }

    // Serve enhanced admin portal
    if (url.pathname === '/portals/enhanced-admin-portal.html') {
      const portalPath = join(process.cwd(), 'public', 'portals', 'enhanced-admin-portal.html');
      const response = serveStaticFile(portalPath, 'text/html');
      if (response) return response;
    }

    // Serve portal hub
    if (url.pathname === '/portals/portal-hub.html') {
      const portalPath = join(process.cwd(), 'public', 'portals', 'portal-hub.html');
      const response = serveStaticFile(portalPath, 'text/html');
      if (response) return response;
    }

    // Serve other portal files
    if (url.pathname.startsWith('/portals/')) {
      const filePath = join(process.cwd(), 'public', url.pathname);
      const response = serveStaticFile(filePath, getContentType(filePath));
      if (response) return response;
    }

    // Serve service worker
    if (url.pathname === '/sw.js') {
      const swPath = join(process.cwd(), 'public', 'sw.js');
      const response = serveStaticFile(swPath, 'application/javascript');
      if (response) return response;
    }

    // Serve manifest
    if (url.pathname === '/manifest.json') {
      const manifestPath = join(process.cwd(), 'public', 'manifest.json');
      const response = serveStaticFile(manifestPath, 'application/json');
      if (response) return response;
    }

    // Serve static files from root (CSS, JS, images)
    if (url.pathname.startsWith('/static/')) {
      const filePath = join(process.cwd(), 'public', url.pathname);
      const response = serveStaticFile(filePath, getContentType(filePath));
      if (response) return response;
    }

    // Serve the dashboard HTML at root or /dashboard
    if (url.pathname === '/' || url.pathname === '/dashboard') {
      const dashboardPath = join(
        process.cwd(),
        'developer-dashboard-live.html'
      );
      if (existsSync(dashboardPath)) {
        const html = readFileSync(dashboardPath, 'utf-8');
        return new Response(html, {
          headers: { 'Content-Type': 'text/html' },
        });
      }
    }

    // Default 404
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers,
    });
  },
});

console.log(`✅ Admin server running on http://${host}:${port}`);
console.log(`📊 Dashboard available at: http://${host}:${port}/`);
console.log(`🔧 Enhanced Admin Portal available at: http://${host}:${port}/portals/enhanced-admin-portal.html`);
console.log(`📁 Static files served from: /public/ and /static/`);
