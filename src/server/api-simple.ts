import { serve } from 'bun';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const port = process.env.API_PORT || 3001;
const host = process.env.API_HOST || '0.0.0.0';

console.log(`🚀 API server starting`);
console.log(`📍 Host: ${host}:${port}`);

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

    // Health check
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'api',
          port,
          timestamp: new Date().toISOString(),
        }),
        { headers }
      );
    }

    // Mock API endpoints
    if (url.pathname === '/api/stats') {
      return new Response(
        JSON.stringify({
          totalCustomers: 42,
          activeTransactions: 7,
          dailyVolume: 150000,
          profitToday: 2500,
        }),
        { headers }
      );
    }

    if (url.pathname === '/api/agents') {
      return new Response(
        JSON.stringify({
          agents: [
            { id: 1, name: 'Agent Smith', status: 'active' },
            { id: 2, name: 'Agent Jones', status: 'active' },
          ],
        }),
        { headers }
      );
    }

    if (url.pathname === '/api/masters') {
      return new Response(
        JSON.stringify({
          masters: [
            { id: 1, name: 'Master Chief', level: 'senior' },
            { id: 2, name: 'Master Yoda', level: 'expert' },
          ],
        }),
        { headers }
      );
    }

    // Default 404
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers,
    });
  },
});

console.log(`✅ API server running on http://${host}:${port}`);
