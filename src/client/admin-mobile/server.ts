import { serve } from 'bun';
import { file } from 'bun';
import { join } from 'path';

export function startAdminMobileServer(port: number = 3007) {
  const server = serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      let pathname = url.pathname;

      // Default to index.html for root path
      if (pathname === '/') pathname = '/index.html';

      // Serve static files from admin-mobile directory
      const filePath = join(import.meta.dir, pathname.slice(1));
      const fileObj = file(filePath);
      const exists = await fileObj.exists();

      if (!exists) {
        return new Response('Not found', { status: 404 });
      }

      // Set correct MIME types
      let contentType = 'application/octet-stream';
      if (pathname.endsWith('.html')) contentType = 'text/html';
      else if (pathname.endsWith('.tsx') || pathname.endsWith('.ts') || pathname.endsWith('.jsx') || pathname.endsWith('.js')) {
        contentType = 'application/javascript';
      } else if (pathname.endsWith('.css')) contentType = 'text/css';
      else if (pathname.endsWith('.json')) contentType = 'application/json';
      else if (pathname.endsWith('.svg')) contentType = 'image/svg+xml';

      // For TypeScript/JSX files, transpile them
      if (pathname.endsWith('.tsx') || pathname.endsWith('.jsx') || pathname.endsWith('.ts')) {
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
              headers: { 'Content-Type': 'application/javascript' }
            });
          }
        } catch (error) {
          console.error('Transpilation error:', error);
          return new Response(`// Error: ${error}`, {
            headers: { 'Content-Type': 'application/javascript' }
          });
        }
      }

      return new Response(fileObj, {
        headers: { 'Content-Type': contentType }
      });
    },
  });

  console.log(`✅ Admin mobile interface ready at http://localhost:${port}`);
  return server;
}

// Auto-start if this file is run directly
if (import.meta.main) {
  startAdminMobileServer();
}
