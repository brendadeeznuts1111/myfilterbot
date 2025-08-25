/**
 * Enhanced Bun Development Server for React App
 * Features: TypeScript transpilation, Hot-reloading, API proxy, WebSocket support
 */

import { serve, file } from "bun";
import { watch } from "fs";
import { join } from "path";

// Hot-reload WebSocket clients
const wsClients = new Set<WebSocket>();

// API server configuration
const API_SERVER_URL = 'http://localhost:3003';

// Hot-reload client script
const HOT_RELOAD_SCRIPT = `
<script>
(function() {
  console.log('🔥 Hot-reload enabled');
  const ws = new WebSocket('ws://localhost:3006/ws');
  
  ws.onopen = () => console.log('📡 Hot-reload connected');
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'reload') {
      console.log('🔄 Reloading page...');
      location.reload();
    }
  };
  ws.onclose = () => {
    console.log('❌ Hot-reload disconnected, attempting reconnect...');
    setTimeout(() => location.reload(), 1000);
  };
})();
</script>
`;

// File system watcher with Bun v1.2.21+ improvements
const watcher = watch("./src", { recursive: true }, (event, filename) => {
  // Skip vim swapfiles and temporary files (fixed in v1.2.21+)
  if (!filename || filename.includes('.swp') || filename.includes('.tmp') || filename.startsWith('.')) {
    return;
  }
  
  console.log(`📁 File changed: ${filename}`);
  
  // Debounce rapid changes (git branch switching fix)
  clearTimeout(watcher._debounceTimer);
  watcher._debounceTimer = setTimeout(() => {
    // Notify all connected WebSocket clients to reload
    const message = JSON.stringify({ type: 'reload', file: filename });
    wsClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          // Handle client abort gracefully (v1.2.21+ fix)
          console.log('Client disconnected during reload notification');
          wsClients.delete(ws);
        }
      }
    });
  }, 100);
});

const server = serve({
  port: 3006,
  development: true,
  
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;
    
    // Handle WebSocket upgrade for hot-reload
    if (pathname === '/ws' && req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      return new Response(null, { 
        status: 101,
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
        }
      });
    }
    
    // API proxy - forward requests to Bun API server
    if (pathname.startsWith('/api/')) {
      try {
        const proxyUrl = `${API_SERVER_URL}${pathname}${url.search}`;
        const response = await fetch(proxyUrl, {
          method: req.method,
          headers: req.headers,
          body: req.body
        });
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...Object.fromEntries(response.headers),
            'Access-Control-Allow-Origin': '*',
          }
        });
      } catch (error) {
        console.error('API proxy error:', error);
        return new Response(JSON.stringify({ error: 'API server unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Default to index.html for root path
    if (pathname === '/') pathname = '/index.html';
    
    // Serve from public directory first, then src
    let filePath = join(import.meta.dir, '..', 'public', pathname.slice(1));
    let fileObj = file(filePath);
    let exists = await fileObj.exists();

    if (!exists) {
      // If not found in public, try src
      filePath = join(import.meta.dir, pathname.slice(1));
      fileObj = file(filePath);
      exists = await fileObj.exists();
    }
    
    try {
      // fileObj and exists are already defined above
      
      if (!exists) {
        return new Response('Not found', { status: 404 });
      }
      
      // Set correct MIME types for different file types
      let contentType = 'application/octet-stream';
      
      if (pathname.endsWith('.html')) {
        contentType = 'text/html';
      } else if (pathname.endsWith('.tsx') || pathname.endsWith('.ts') || pathname.endsWith('.jsx') || pathname.endsWith('.js')) {
        contentType = 'application/javascript';
      } else if (pathname.endsWith('.css')) {
        contentType = 'text/css';
      } else if (pathname.endsWith('.json')) {
        contentType = 'application/json';
      } else if (pathname.endsWith('.svg')) {
        contentType = 'image/svg+xml';
      } else if (pathname.endsWith('.png')) {
        contentType = 'image/png';
      } else if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      }
      
      // For HTML files, inject hot-reload script
      if (pathname.endsWith('.html')) {
        let htmlContent = await fileObj.text();
        
        // Fix import.meta.url for HMR (v1.2.21+ improvement)
        htmlContent = htmlContent.replace(/import\.meta\.url/g, 'window.location.origin');
        
        // Inject hot-reload script before closing head tag
        if (htmlContent.includes('</head>')) {
          htmlContent = htmlContent.replace('</head>', `${HOT_RELOAD_SCRIPT}</head>`);
        }
        
        return new Response(htmlContent, {
          headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
            // Automatic ETag (v1.2.20+ feature)
            'ETag': `"${Bun.hash(htmlContent)}"`
          }
        });
      }
      
      // For TypeScript/JSX files, transpile them
      if (pathname.endsWith('.tsx') || pathname.endsWith('.jsx')) {
        try {
          const transpiled = await Bun.build({
            entrypoints: [filePath],
            target: 'browser',
            format: 'esm',
            minify: false,
            sourcemap: 'inline',
            define: {
              'process.env.NODE_ENV': '"development"'
            }
          });
          
          if (transpiled.outputs.length > 0) {
            const output = transpiled.outputs[0];
            const jsContent = await output.text();
            
            return new Response(jsContent, {
              headers: {
                'Content-Type': 'application/javascript',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
              }
            });
          }
        } catch (error) {
          console.error('Transpilation error:', error);
          
          // Return a more detailed error response
          const errorScript = `
            console.error('Transpilation Error:', ${JSON.stringify(error.message)});
            document.body.innerHTML = '<div style="color: red; font-family: monospace; padding: 20px; background: #ffe6e6; border: 1px solid red; margin: 20px;"><h3>Transpilation Error</h3><pre>' + ${JSON.stringify(error.message)} + '</pre></div>';
          `;
          
          return new Response(errorScript, {
            headers: { 'Content-Type': 'application/javascript' }
          });
        }
      }
      
      // For .ts files (non-JSX), also transpile
      if (pathname.endsWith('.ts') && !pathname.endsWith('.tsx')) {
        try {
          const transpiled = await Bun.build({
            entrypoints: [filePath],
            target: 'browser',
            format: 'esm',
            minify: false,
            sourcemap: 'inline',
            define: {
              'process.env.NODE_ENV': '"development"'
            }
          });
          
          if (transpiled.outputs.length > 0) {
            const output = transpiled.outputs[0];
            const jsContent = await output.text();
            
            return new Response(jsContent, {
              headers: {
                'Content-Type': 'application/javascript',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
              }
            });
          }
        } catch (error) {
          console.error('TypeScript transpilation error:', error);
          return new Response(`// TypeScript error: ${error.message}`, {
            headers: { 'Content-Type': 'application/javascript' }
          });
        }
      }
      
      // Serve other files as-is
      return new Response(fileObj, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      });
      
    } catch (error) {
      console.error('Server error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  },
  
  websocket: {
    open: (ws) => {
      wsClients.add(ws);
      console.log('🔌 WebSocket client connected for hot-reload');
    },
    close: (ws) => {
      wsClients.delete(ws);
      console.log('🔌 WebSocket client disconnected');
    }
  }
});

console.log(`🚀 React Dev Server running at http://localhost:${server.port}/`);
console.log(`📊 Test Dashboard: http://localhost:${server.port}/test-dashboard.html`);
console.log(`⚛️  React App: http://localhost:${server.port}/index.html`);
console.log(`🔧 Hot reload enabled for TypeScript/JSX files`);
