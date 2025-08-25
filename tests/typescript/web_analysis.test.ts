/**
 * Web Analysis System Tests
 * Tests for HTMLRewriter-based content analysis with Bun optimization
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { WebAnalysisManager, createTradingWebAnalyzer } from '../../src/web_analysis_manager';
import { HTMLAnalyzer } from '../../src/html_analyzer';

describe('HTML Analysis System', () => {
  let manager: WebAnalysisManager;
  let analyzer: HTMLAnalyzer;
  let originalFetch: typeof fetch;

  beforeAll(() => {
    // Store the original fetch function
    originalFetch = global.fetch;

    manager = new WebAnalysisManager({
      maxWorkers: 2,
      batchSize: 5,
      timeout: 10000
    });
    analyzer = new HTMLAnalyzer();
  });

  afterEach(() => {
    // Restore the original fetch function after each test
    console.log('🔄 [WEB-ANALYSIS] Restoring original fetch function...');
    global.fetch = originalFetch;
    console.log('✅ [WEB-ANALYSIS] Original fetch function restored');

    // Force a small delay to ensure cleanup completes before next test
    return new Promise(resolve => setTimeout(resolve, 10));
  });

  afterAll(() => {
    // Restore the original fetch function and cleanup
    global.fetch = originalFetch;
    manager.destroy();
  });

  describe('HTMLAnalyzer', () => {
    test('should extract links from HTML content', async () => {
      // Create a mock HTML response
      const mockHtml = `
        <html>
          <body>
            <a href="https://binance.com">Trading Platform</a>
            <a href="/docs">Documentation</a>
            <a href="https://twitter.com/binance">Social</a>
            <a href="mailto:support@example.com">Email</a>
          </body>
        </html>
      `;

      // Mock fetch to return proper Response object
      global.fetch = async () => {
        return new Response(mockHtml, {
          headers: { 'content-type': 'text/html' }
        });
      };

      const result = await analyzer.extractLinks('https://example.com');

      expect(result.links).toContain('https://binance.com');
      expect(result.links).toContain('/docs');
      expect(result.socialLinks).toContain('https://twitter.com/binance');
      expect(result.links.length).toBeGreaterThan(0);
    });

    test('should analyze content metrics', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1>Bitcoin Trading Analysis</h1>
            <p>The market is showing bullish signals with strong profit potential.</p>
            <a href="/internal">Internal Link</a>
            <a href="https://external.com">External Link</a>
            <div>Buy signal detected for crypto trading.</div>
          </body>
        </html>
      `;

      global.fetch = async () => {
        return new Response(mockHtml, {
          headers: { 'content-type': 'text/html' }
        });
      };

      const result = await analyzer.analyzeContent('https://example.com', 'https://example.com');

      expect(result.totalLinks).toBe(2);
      expect(result.internalLinks).toBe(1);
      expect(result.externalLinks).toBe(1);
      expect(result.tradingKeywords).toBeGreaterThan(0);
      expect(['positive', 'negative', 'neutral']).toContain(result.sentiment);
    });

    test('should extract trading data', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="price" data-symbol="BTCUSDT" data-price="45000">BTC: $45,000</div>
            <div class="signal">BUY Signal for Bitcoin</div>
            <div class="indicator-rsi" data-value="65">RSI: 65</div>
          </body>
        </html>
      `;

      global.fetch = async () => {
        return new Response(mockHtml, {
          headers: { 'content-type': 'text/html' }
        });
      };

      const result = await analyzer.extractTradingData('https://example.com');

      expect(result.prices).toHaveProperty('BTCUSDT');
      expect(result.signals.length).toBeGreaterThan(0);
      expect(result.indicators).toHaveProperty('indicator-rsi');
    });

    test('should extract contact information', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="mailto:support@trading.com">Email Support</a>
            <a href="tel:+1234567890">Call Us</a>
            <a href="https://t.me/tradingchannel">Telegram</a>
            <p>Contact us at info@example.com or call (555) 123-4567</p>
          </body>
        </html>
      `;

      global.fetch = async () => {
        return new Response(mockHtml, {
          headers: { 'content-type': 'text/html' }
        });
      };

      const result = await analyzer.extractContacts('https://example.com');

      expect(result.emails).toContain('support@trading.com');
      expect(result.emails).toContain('info@example.com');
      expect(result.phones).toContain('+1234567890');
      expect(result.phones).toContain('(555) 123-4567');
      expect(result.socialProfiles).toContain('https://t.me/tradingchannel');
    });
  });

  describe('WebAnalysisManager', () => {
    test('should analyze single URL', async () => {
      // Mock successful analysis
      global.fetch = async () => {
        return new Response('<html><body><a href="/test">Test</a></body></html>', {
          headers: { 'content-type': 'text/html' }
        });
      };

      const taskId = await manager.analyzeUrl('https://example.com', 'links', 'high');
      
      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
      expect(taskId).toMatch(/^analysis-\d+-[a-z0-9]+$/);
    });

    test('should handle batch analysis', async () => {
      global.fetch = async () => {
        return new Response('<html><body>Test</body></html>', {
          headers: { 'content-type': 'text/html' }
        });
      };

      const urls = [
        { url: 'https://example1.com', type: 'content' as const },
        { url: 'https://example2.com', type: 'links' as const },
        { url: 'https://example3.com', type: 'trading' as const }
      ];

      const taskIds = await manager.analyzeBatch(urls);
      
      expect(taskIds).toHaveLength(3);
      taskIds.forEach(id => {
        expect(id).toMatch(/^batch-\d+-\d+$/);
      });
    });

    test('should manage monitoring targets', () => {
      const target = {
        id: 'test-monitor',
        url: 'https://example.com',
        type: 'competitor' as const,
        interval: 10,
        analysisTypes: ['content' as const],
        active: false
      };

      manager.addMonitoringTarget(target);
      
      const stats = manager.getMonitoringStats();
      expect(stats.totalTargets).toBe(1);
      expect(stats.activeTargets).toBe(0);
      expect(stats.targetsByType.competitor).toBe(1);
    });

    test('should get worker status', async () => {
      const status = await manager.getWorkerStatus();
      
      expect(Array.isArray(status)).toBe(true);
      expect(status.length).toBeGreaterThan(0);
    });
  });

  describe('Trading Web Analyzer Integration', () => {
    test('should create trading-focused analyzer', () => {
      const tradingAnalyzer = createTradingWebAnalyzer();
      
      expect(tradingAnalyzer).toBeInstanceOf(WebAnalysisManager);
      
      const stats = tradingAnalyzer.getMonitoringStats();
      expect(stats.totalTargets).toBeGreaterThan(0);
      expect(stats.targetsByType.news).toBeGreaterThan(0);
      
      // Cleanup
      tradingAnalyzer.destroy();
    });

    test('should monitor competitor websites', async () => {
      const competitorUrls = [
        'https://competitor1.com',
        'https://competitor2.com'
      ];

      global.fetch = async () => {
        return new Response('<html><body>Competitor content</body></html>', {
          headers: { 'content-type': 'text/html' }
        });
      };

      const taskIds = await manager.analyzeCompetitors(competitorUrls);
      
      expect(taskIds).toHaveLength(2);
      taskIds.forEach(id => {
        expect(id).toMatch(/^batch-\d+-\d+$/);
      });
    });

    test('should set up signal source monitoring', async () => {
      const signalUrls = [
        'https://signals1.com',
        'https://signals2.com'
      ];

      await manager.monitorSignalSources(signalUrls);
      
      const stats = manager.getMonitoringStats();
      expect(stats.totalTargets).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Performance and Bun Integration', () => {
    test('should handle large data transfer efficiently', async () => {
      // Test large HTML content (simulating Bun's fast postMessage)
      const largeHtml = '<html><body>' + 
        Array(1000).fill('<a href="/link">Large content</a>').join('') +
        '</body></html>';

      global.fetch = async () => ({
        blob: () => Promise.resolve(new Blob([largeHtml], { type: 'text/html' }))
      }) as any;

      const startTime = performance.now();
      const taskId = await manager.analyzeUrl('https://large-site.com', 'full');
      const submitTime = performance.now() - startTime;

      // Task should be submitted quickly (leveraging Bun's fast postMessage)
      expect(submitTime).toBeLessThan(100); // Less than 100ms for submission
      expect(taskId).toBeDefined();
    });

    test('should process concurrent analyses', async () => {
      global.fetch = async () => {
        return new Response('<html><body>Concurrent test</body></html>', {
          headers: { 'content-type': 'text/html' }
        });
      };

      const concurrentTasks = Array(10).fill(0).map((_, i) => 
        manager.analyzeUrl(`https://concurrent${i}.com`, 'content')
      );

      const taskIds = await Promise.all(concurrentTasks);
      
      expect(taskIds).toHaveLength(10);
      taskIds.forEach(id => {
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network error
      global.fetch = async () => {
        throw new Error('Network error');
      };

      const taskId = await manager.analyzeUrl('https://unreachable.com');
      
      expect(taskId).toBeDefined();
      
      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Should not throw, errors handled internally
      expect(() => manager.getResult(taskId)).not.toThrow();
    });

    test('should timeout on long-running tasks', async () => {
      // Mock slow response
      global.fetch = async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return new Response('<html></html>', {
          headers: { 'content-type': 'text/html' }
        });
      };

      const shortTimeoutManager = new WebAnalysisManager({ timeout: 500 });
      
      try {
        const taskId = await shortTimeoutManager.analyzeUrl('https://slow-site.com');
        
        await expect(
          shortTimeoutManager.waitForResult(taskId, 1000)
        ).rejects.toThrow('timeout');
      } finally {
        shortTimeoutManager.destroy();
      }
    });
  });
});

// Performance benchmark test
describe('Performance Benchmarks', () => {
  test('should demonstrate Bun postMessage performance', async () => {
    const sizes = [
      { name: '1KB', content: 'x'.repeat(1024) },
      { name: '10KB', content: 'x'.repeat(10 * 1024) },
      { name: '100KB', content: 'x'.repeat(100 * 1024) }
    ];

    console.log('\n=== Bun postMessage Performance Test ===');
    
    for (const size of sizes) {
      const html = `<html><body>${size.content}</body></html>`;
      
      global.fetch = async () => {
        return new Response(html, {
          headers: { 'content-type': 'text/html' }
        });
      };

      const manager = new WebAnalysisManager({ maxWorkers: 1 });
      
      const startTime = performance.now();
      const taskId = await manager.analyzeUrl('https://test.com', 'content');
      const endTime = performance.now();
      
      console.log(`${size.name}: ${(endTime - startTime).toFixed(3)}ms`);
      
      manager.destroy();
    }
  });
});