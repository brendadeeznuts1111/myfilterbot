import { serve } from 'bun';

const port = process.env.WS_PORT || 3002;

console.log(`🚀 WebSocket server starting on port ${port}`);

const server = serve({
  port,
  fetch(req, server) {
    const url = new URL(req.url);

    // Upgrade to WebSocket
    if (req.headers.get('upgrade') === 'websocket') {
      const success = server.upgrade(req);
      if (success) {
        return undefined;
      }
    }

    // CORS headers for regular requests
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'websocket',
          port,
          connections: 0,
        }),
        { headers }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'WebSocket upgrade required',
      }),
      {
        status: 400,
        headers,
      }
    );
  },

  websocket: {
    open(ws) {
      console.log('✅ WebSocket client connected');
      ws.send(
        JSON.stringify({
          type: 'connection',
          status: 'connected',
          timestamp: new Date().toISOString(),
        })
      );
    },

    message(ws, message) {
      console.log(`📨 Received: ${message}`);

      // Echo back with timestamp
      ws.send(
        JSON.stringify({
          type: 'echo',
          data: message,
          timestamp: new Date().toISOString(),
        })
      );

      // Broadcast to all clients
      ws.publish(
        'updates',
        JSON.stringify({
          type: 'broadcast',
          data: message,
          timestamp: new Date().toISOString(),
        })
      );
    },

    close(ws) {
      console.log('👋 WebSocket client disconnected');
    },

    error(ws, error) {
      console.error('❌ WebSocket error:', error);
    },
  },
});

console.log(`✅ WebSocket server running on ws://localhost:${port}`);
