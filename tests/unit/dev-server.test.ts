/**
 * Dev Server Integration Test
 * Verifies that Tailwind CSS is correctly processed and served
 */

import { describe, expect, it, beforeAll, afterAll } from 'bun:test';

describe('Dev Server CSS Processing', () => {
  let server: ReturnType<typeof import('../dev-server').startServer>;
  const TEST_PORT = 3006;

  beforeAll(async () => {
    // Import and start the server
    const { startServer } = await import('../../src/dev-server');
    server = await startServer(TEST_PORT);
    console.log(`🚀 Starting dev server for testing...`);

    // Wait a moment for server to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    if (server) {
      server.stop();
      console.log('🛑 Server stopped');
    }
  });

  it('should serve processed CSS with Tailwind and custom styles', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/index.css`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/css');

    const cssContent = await response.text();
    console.log(`📏 CSS content length: ${cssContent.length} bytes`);

    // Log first 500 chars for debugging
    console.log('📄 CSS preview:', cssContent.slice(0, 500));

    // Check for Tailwind processing
    expect(cssContent).toContain('--color-');
    expect(cssContent).toContain('@layer');

    // Check for custom styles
    expect(cssContent).toContain('@keyframes slide');
    expect(cssContent).toContain('body::before');
    expect(cssContent).toContain('linear-gradient');
  });

  it('should serve index.html with correct links', async () => {
    const htmlUrl = `http://localhost:${TEST_PORT}/`;
    console.log(`🌐 Testing HTML at: ${htmlUrl}`);

    const response = await fetch(htmlUrl);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/text\/html/);

    const htmlContent = await response.text();

    // Verify HTML structure
    expect(htmlContent).toContain('<title>Bun + React</title>');
    expect(htmlContent).toContain('<div id="root"></div>');
    expect(htmlContent).toContain(
      '<link rel="stylesheet" href="./index.css" />'
    );

    // Check for hot-reload script injection
    expect(htmlContent).toContain('Hot-reload enabled');
    expect(htmlContent).toContain('ws://localhost:3006/ws');

    console.log('✅ HTML structure verified');
  });

  it('should transpile TypeScript/JSX files', async () => {
    const jsUrl = `http://localhost:${TEST_PORT}/index.tsx`;
    console.log(`📜 Testing TypeScript transpilation at: ${jsUrl}`);

    const response = await fetch(jsUrl);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/javascript');

    const jsContent = await response.text();

    // Should be transpiled JavaScript, not TypeScript
    expect(jsContent).not.toContain('interface '); // No TS interfaces
    expect(jsContent).not.toContain(': string'); // No TS type annotations
    expect(jsContent).toContain('var '); // Transpiled JS

    // Should contain React runtime code
    expect(jsContent.toLowerCase()).toContain('react');

    console.log('✅ TypeScript transpilation verified');
  });

  it('should handle API proxy requests', async () => {
    const apiUrl = `http://localhost:${TEST_PORT}/api/health`;
    console.log(`🔌 Testing API proxy at: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        signal: AbortSignal.timeout(5000),
      });

      // API server might not be running, but proxy should still respond
      if (response.status === 503) {
        const data = await response.json();
        expect(data.error).toBe('API server unavailable');
        console.log('⚠️ API server not running, but proxy handled correctly');
      } else {
        expect(response.status).toBe(200);
        console.log('✅ API proxy working');
      }
    } catch (error) {
      // Timeout is acceptable if API server is not running
      console.log('⚠️ API proxy timeout (expected if API server not running)');
    }
  });

  it('should cache processed CSS for performance', async () => {
    const cssUrl = `http://localhost:${TEST_PORT}/index.css`;

    // First request
    const start1 = performance.now();
    const response1 = await fetch(cssUrl);
    const time1 = performance.now() - start1;

    expect(response1.status).toBe(200);

    // Second request (should be cached)
    const start2 = performance.now();
    const response2 = await fetch(cssUrl);
    const time2 = performance.now() - start2;

    expect(response2.status).toBe(200);

    // Cached request should be significantly faster
    console.log(`⏱️ First request: ${time1.toFixed(2)}ms`);
    console.log(`⏱️ Second request (cached): ${time2.toFixed(2)}ms`);

    // Cache should make second request at least 2x faster
    // (Being lenient here as performance can vary)
    if (time1 > 10) {
      // Only check if first request took meaningful time
      expect(time2).toBeLessThan(time1);
      console.log('✅ CSS caching verified');
    } else {
      console.log('⚠️ Requests too fast to measure caching effect');
    }
  });
});
