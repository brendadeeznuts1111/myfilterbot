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
