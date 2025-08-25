import { serve } from 'bun';
import { server as serverConfig } from '../../../config/app.yaml';
import { yamlConfigService } from '../../services/yaml-config-service';

// Get admin server configuration from YAML
const adminConfig = serverConfig.admin;
const port = parseInt(process.env.ADMIN_PORT || adminConfig?.port || '3008');

console.log(`🚀 Admin Mobile Dev Server starting with YAML config`);
console.log(`📍 Port: ${port}`);
console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);

const server = serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Serve the admin mobile interface
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = await Bun.file('src/client/admin-mobile/index.html').text();
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Serve TypeScript files
    if (url.pathname.endsWith('.tsx') || url.pathname.endsWith('.ts')) {
      const filePath = 'src/client/admin-mobile' + url.pathname;
      try {
        const transpiled = await Bun.build({
          entrypoints: [filePath],
          target: 'browser',
          format: 'esm',
          minify: false,
          sourcemap: 'inline',
          define: {
            'process.env.NODE_ENV': '"development"',
            'CONFIG.API_URL': JSON.stringify(serverConfig.api ? `http://${serverConfig.api.host}:${serverConfig.api.port}` : 'http://localhost:3001'),
            'CONFIG.WS_URL': JSON.stringify(serverConfig.websocket ? `ws://${serverConfig.websocket.host || 'localhost'}:${serverConfig.websocket.port}` : 'ws://localhost:3002')
          }
        });
        
        if (transpiled.outputs.length > 0) {
          const output = transpiled.outputs[0];
          const jsContent = await output.text();
          return new Response(jsContent, {
            headers: { 'Content-Type': 'application/javascript' }
          });
        }
      } catch (error) {
        return new Response(`// Error: ${error}`, {
          headers: { 'Content-Type': 'application/javascript' }
        });
      }
    }
    
    // Serve CSS files
    if (url.pathname.endsWith('.css')) {
      const css = await Bun.file('src/client/admin-mobile' + url.pathname).text();
      return new Response(css, {
        headers: { 'Content-Type': 'text/css' }
      });
    }
    
    // Serve component files
    if (url.pathname.startsWith('/components/') || url.pathname.startsWith('/pages/') || url.pathname.startsWith('/hooks/')) {
      const filePath = 'src/client/admin-mobile' + url.pathname;
      try {
        const transpiled = await Bun.build({
          entrypoints: [filePath],
          target: 'browser',
          format: 'esm',
          minify: false,
          sourcemap: 'inline'
        });
        
        if (transpiled.outputs.length > 0) {
          const output = transpiled.outputs[0];
          const jsContent = await output.text();
          return new Response(jsContent, {
            headers: { 'Content-Type': 'application/javascript' }
          });
        }
      } catch (error) {
        return new Response(`// Error: ${error}`, {
          headers: { 'Content-Type': 'application/javascript' }
        });
      }
    }
    
    // Default response
    return new Response('Admin Mobile Interface - Use / to access the app');
  }
});

console.log('✅ Admin mobile interface ready at http://localhost:3008');

// Auto-start if this file is run directly
if (import.meta.main) {
  server;
}
