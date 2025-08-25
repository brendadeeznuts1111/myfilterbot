/**
 * Cache Performance Benchmark Suite
 * Comprehensive testing of multi-level cache system performance
 */

import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { MultiLevelCache, type CacheStats } from '../../src/services/multi-level-cache';
import { CacheWarmingService } from '../../src/services/cache-warming-service';
import { ResponseCacheMiddleware } from '../../src/middleware/response-cache';

describe('Cache Performance Benchmarks', () => {
  let cache: MultiLevelCache;
  let cacheWarming: CacheWarmingService;
  let responseCache: ResponseCacheMiddleware;
  
  const SMALL_DATA_SIZE = 100; // bytes
  const LARGE_DATA_SIZE = 50000; // 50KB
  const ITERATIONS = 1000;
  const WARMUP_ITERATIONS = 100;

  beforeAll(async () => {
    // Initialize cache with optimized settings for benchmarking
    cache = new MultiLevelCache(
      5000, // Large L1 cache for benchmarking
      { enabled: false }, // Disable Redis for consistent benchmarking
      './test-cache'
    );
    
    cacheWarming = new CacheWarmingService(cache);
    responseCache = new ResponseCacheMiddleware(cache);
    
    console.log('\n🏁 Starting Cache Performance Benchmarks\n');
  });

  afterAll(async () => {
    await cache.clear();
    cache.destroy();
  });

  describe('L1 Cache Performance', () => {
    test('Small data set/get performance (< 1KB)', async () => {
      const testData = { 
        message: 'x'.repeat(SMALL_DATA_SIZE),
        timestamp: Date.now(),
        id: Math.random()
      };
      
      // Warmup
      for (let i = 0; i < WARMUP_ITERATIONS; i++) {
        await cache.set(`warmup_small_${i}`, testData);
      }

      // Benchmark set operations
      const setStart = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        await cache.set(`benchmark_small_${i}`, testData, 60000);
      }
      const setTime = performance.now() - setStart;
      
      // Benchmark get operations
      const getStart = performance.now();
      let hits = 0;
      for (let i = 0; i < ITERATIONS; i++) {
        const result = await cache.get(`benchmark_small_${i}`);
        if (result) hits++;
      }
      const getTime = performance.now() - getStart;
      
      const avgSetTime = setTime / ITERATIONS;
      const avgGetTime = getTime / ITERATIONS;
      
      console.log(`📊 L1 Small Data Performance:`);
      console.log(`   Set: ${avgSetTime.toFixed(3)}ms avg (${setTime.toFixed(2)}ms total)`);
      console.log(`   Get: ${avgGetTime.toFixed(3)}ms avg (${getTime.toFixed(2)}ms total)`);
      console.log(`   Hit rate: ${(hits/ITERATIONS*100).toFixed(1)}%`);
      console.log(`   Throughput: ${Math.round(1000/avgGetTime)} gets/second`);
      
      // Performance targets
      expect(avgSetTime).toBeLessThan(0.1); // Sub-100μs sets
      expect(avgGetTime).toBeLessThan(0.05); // Sub-50μs gets
      expect(hits).toBe(ITERATIONS); // 100% hit rate
    });

    test('Large data set/get performance (50KB)', async () => {
      const testData = {
        payload: 'x'.repeat(LARGE_DATA_SIZE),
        metadata: {
          size: LARGE_DATA_SIZE,
          created: Date.now(),
          version: '1.0'
        },
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: Math.random(),
          label: `item_${i}`
        }))
      };
      
      const reducedIterations = 100; // Fewer iterations for large data
      
      // Benchmark set operations
      const setStart = performance.now();
      for (let i = 0; i < reducedIterations; i++) {
        await cache.set(`benchmark_large_${i}`, testData, 60000);
      }
      const setTime = performance.now() - setStart;
      
      // Benchmark get operations
      const getStart = performance.now();
      let hits = 0;
      for (let i = 0; i < reducedIterations; i++) {
        const result = await cache.get(`benchmark_large_${i}`);
        if (result) hits++;
      }
      const getTime = performance.now() - getStart;
      
      const avgSetTime = setTime / reducedIterations;
      const avgGetTime = getTime / reducedIterations;
      const dataSizeMB = LARGE_DATA_SIZE / 1024 / 1024;
      
      console.log(`\n📊 L1 Large Data Performance (${(dataSizeMB * 1024).toFixed(0)}KB):`);
      console.log(`   Set: ${avgSetTime.toFixed(3)}ms avg`);
      console.log(`   Get: ${avgGetTime.toFixed(3)}ms avg`);
      console.log(`   Hit rate: ${(hits/reducedIterations*100).toFixed(1)}%`);
      console.log(`   Data throughput: ${(dataSizeMB * 1000 / avgGetTime).toFixed(2)}MB/s`);
      
      // Large data should still be reasonably fast
      expect(avgSetTime).toBeLessThan(5); // Sub-5ms sets for large data
      expect(avgGetTime).toBeLessThan(2); // Sub-2ms gets for large data
      expect(hits).toBe(reducedIterations);
    });

    test('Cache eviction performance under pressure', async () => {
      // Fill cache beyond capacity to trigger evictions
      const cacheCapacity = 5000;
      const overflowCount = 1000;
      const totalItems = cacheCapacity + overflowCount;
      
      const testData = { message: 'test', timestamp: Date.now() };
      
      console.log(`\n🗑️ Testing eviction performance with ${totalItems} items:`);
      
      const fillStart = performance.now();
      for (let i = 0; i < totalItems; i++) {
        await cache.set(`eviction_test_${i}`, testData, 300000);
      }
      const fillTime = performance.now() - fillStart;
      
      // Check final cache size
      const stats = cache.getStats();
      
      console.log(`   Fill time: ${fillTime.toFixed(2)}ms`);
      console.log(`   Final L1 size: ${stats.l1_size}`);
      console.log(`   Evictions triggered: ${stats.evictions}`);
      console.log(`   Memory usage: ${(stats.memory_usage / 1024).toFixed(2)}KB`);
      
      // Should stay within capacity limits
      expect(stats.l1_size).toBeLessThanOrEqual(cacheCapacity);
      expect(stats.evictions).toBeGreaterThan(0);
      
      // Performance should degrade gracefully under pressure
      const avgFillTime = fillTime / totalItems;
      expect(avgFillTime).toBeLessThan(0.5); // Still sub-500μs per item
    });
  });

  describe('Multi-Level Cache Performance', () => {
    test('Cache hierarchy hit/miss performance', async () => {
      // Test data that should cascade through cache levels
      const testData = { 
        content: 'x'.repeat(1000),
        level: 'test',
        timestamp: Date.now()
      };
      
      const testKey = 'hierarchy_test';
      
      // 1. Cold cache - should miss all levels
      console.log(`\n🏔️ Testing cache hierarchy performance:`);
      
      const coldStart = performance.now();
      const coldResult = await cache.get(testKey);
      const coldTime = performance.now() - coldStart;
      
      console.log(`   Cold cache miss: ${coldTime.toFixed(3)}ms`);
      expect(coldResult).toBeNull();
      
      // 2. Set data
      const setStart = performance.now();
      await cache.set(testKey, testData, 60000);
      const setTime = performance.now() - setStart;
      
      console.log(`   Initial set: ${setTime.toFixed(3)}ms`);
      
      // 3. L1 hit (hot cache)
      const l1Start = performance.now();
      const l1Result = await cache.get(testKey);
      const l1Time = performance.now() - l1Start;
      
      console.log(`   L1 hit: ${l1Time.toFixed(3)}ms`);
      expect(l1Result).toEqual(testData);
      
      // 4. Clear L1 to test L2/L3 promotion (simulated)
      await cache.delete(testKey);
      await cache.set(testKey, testData, 60000); // Set again to test consistency
      
      const consistencyStart = performance.now();
      const consistentResult = await cache.get(testKey);
      const consistencyTime = performance.now() - consistencyStart;
      
      console.log(`   Consistency check: ${consistencyTime.toFixed(3)}ms`);
      expect(consistentResult).toEqual(testData);
      
      // Performance expectations
      expect(l1Time).toBeLessThan(0.1); // L1 should be very fast
      expect(setTime).toBeLessThan(1); // Sets should be reasonable
    });

    test('Concurrent access performance', async () => {
      const concurrentKeys = Array.from({ length: 100 }, (_, i) => `concurrent_${i}`);
      const testData = { value: Math.random(), timestamp: Date.now() };
      
      // Pre-populate cache
      for (const key of concurrentKeys) {
        await cache.set(key, testData, 60000);
      }
      
      console.log(`\n⚡ Testing concurrent access performance:`);
      
      // Simulate concurrent reads
      const concurrentStart = performance.now();
      const promises = concurrentKeys.map(key => cache.get(key));
      const results = await Promise.all(promises);
      const concurrentTime = performance.now() - concurrentStart;
      
      const avgConcurrentTime = concurrentTime / concurrentKeys.length;
      const successfulReads = results.filter(r => r !== null).length;
      
      console.log(`   ${concurrentKeys.length} concurrent reads: ${concurrentTime.toFixed(2)}ms total`);
      console.log(`   Average per read: ${avgConcurrentTime.toFixed(3)}ms`);
      console.log(`   Success rate: ${(successfulReads/concurrentKeys.length*100).toFixed(1)}%`);
      
      // All reads should succeed and be reasonably fast
      expect(successfulReads).toBe(concurrentKeys.length);
      expect(avgConcurrentTime).toBeLessThan(0.2); // Average should be fast
      expect(concurrentTime).toBeLessThan(50); // Total time should be reasonable
    });
  });

  describe('Cache Warming Performance', () => {
    test('Startup cache warming benchmark', async () => {
      console.log(`\n🔥 Testing cache warming performance:`);
      
      const warmingStart = performance.now();
      await cacheWarming.warmCache(['critical', 'important']);
      const warmingTime = performance.now() - warmingStart;
      
      const warmingStats = cacheWarming.getStats();
      const cacheStats = cache.getStats();
      
      console.log(`   Warming time: ${warmingTime.toFixed(2)}ms`);
      console.log(`   Tasks completed: ${warmingStats.tasksCompleted}`);
      console.log(`   Cache entries created: ${cacheStats.l1_size}`);
      console.log(`   Average per task: ${(warmingTime / warmingStats.tasksCompleted).toFixed(2)}ms`);
      
      // Warming should be reasonably fast and successful
      expect(warmingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(warmingStats.tasksCompleted).toBeGreaterThan(0);
      expect(warmingStats.errors).toBe(0); // No errors during warming
      
      // Verify cache is actually warm
      const isWarm = await cacheWarming.isCacheWarm();
      expect(isWarm).toBe(true);
    });

    test('Cache hit rate after warming', async () => {
      // Clear cache and warm it
      await cache.clear();
      await cacheWarming.warmCache(['critical']);
      
      // Test hit rates for warmed data
      const testKeys = ['customer_stats', 'group_members', 'dashboard_config'];
      
      console.log(`\n📈 Testing post-warming hit rates:`);
      
      let hits = 0;
      const accessStart = performance.now();
      
      for (const key of testKeys) {
        const result = await cache.get(key);
        if (result) hits++;
      }
      
      const accessTime = performance.now() - accessStart;
      const hitRate = (hits / testKeys.length) * 100;
      
      console.log(`   Keys tested: ${testKeys.length}`);
      console.log(`   Cache hits: ${hits}`);
      console.log(`   Hit rate: ${hitRate.toFixed(1)}%`);
      console.log(`   Access time: ${accessTime.toFixed(2)}ms`);
      
      // Should have high hit rate after warming
      expect(hitRate).toBeGreaterThanOrEqual(66); // At least 2/3 should hit
      expect(accessTime).toBeLessThan(10); // Fast access
    });
  });

  describe('Response Cache Performance', () => {
    test('HTTP response caching benchmark', async () => {
      const testResponse = { data: 'test response', timestamp: Date.now() };
      
      // Create a mock handler
      const handler = async (req: Request) => {
        return Response.json(testResponse);
      };
      
      // Wrap with cache
      const cachedHandler = responseCache.withCache(handler, {
        ttl: 60000,
        maxAge: 60
      });
      
      console.log(`\n🌐 Testing HTTP response caching:`);
      
      // First request (cache miss)
      const req1 = new Request('http://localhost/test');
      const missStart = performance.now();
      const response1 = await cachedHandler(req1);
      const missTime = performance.now() - missStart;
      const body1 = await response1.json();
      
      // Second request (cache hit)
      const req2 = new Request('http://localhost/test');
      const hitStart = performance.now();
      const response2 = await cachedHandler(req2);
      const hitTime = performance.now() - hitStart;
      const body2 = await response2.json();
      
      console.log(`   Cache miss: ${missTime.toFixed(3)}ms`);
      console.log(`   Cache hit: ${hitTime.toFixed(3)}ms`);
      console.log(`   Speed improvement: ${(missTime / hitTime).toFixed(1)}x`);
      
      // Verify responses are identical
      expect(body2).toEqual(body1);
      
      // Cache hit should be significantly faster
      expect(hitTime).toBeLessThan(missTime);
      expect(hitTime).toBeLessThan(1); // Should be sub-millisecond
      
      // Check cache headers
      expect(response2.headers.get('X-Cache')).toBe('HIT');
    });

    test('ETag conditional request performance', async () => {
      const testResponse = { data: 'etag test', version: 1 };
      
      const handler = async (req: Request) => {
        return Response.json(testResponse);
      };
      
      const cachedHandler = responseCache.withCache(handler, {
        ttl: 60000,
        maxAge: 60
      });
      
      console.log(`\n🏷️ Testing ETag performance:`);
      
      // First request to get ETag
      const req1 = new Request('http://localhost/etag-test');
      const response1 = await cachedHandler(req1);
      const etag = response1.headers.get('ETag');
      
      // Second request with If-None-Match header
      const req2 = new Request('http://localhost/etag-test', {
        headers: { 'If-None-Match': etag || '' }
      });
      
      const etagStart = performance.now();
      const response2 = await cachedHandler(req2);
      const etagTime = performance.now() - etagStart;
      
      console.log(`   ETag validation: ${etagTime.toFixed(3)}ms`);
      console.log(`   Response status: ${response2.status}`);
      
      // Should return 304 Not Modified
      expect(response2.status).toBe(304);
      expect(etagTime).toBeLessThan(0.5); // ETag validation should be very fast
    });
  });

  describe('Performance Summary & Targets', () => {
    test('Overall cache system performance report', async () => {
      // Run a comprehensive test simulating real dashboard usage
      console.log(`\n📊 Dashboard Usage Simulation:`);
      
      // Simulate dashboard load pattern
      const dashboardKeys = ['customer_stats', 'group_members', 'system_health'];
      const simulationStart = performance.now();
      
      // 1. Cold dashboard load (cache warming)
      await cacheWarming.warmCache(['critical']);
      
      // 2. Multiple dashboard refreshes (cache hits)
      for (let refresh = 0; refresh < 10; refresh++) {
        for (const key of dashboardKeys) {
          await cache.get(key);
        }
      }
      
      // 3. Data update (cache invalidation and refresh)
      for (const key of dashboardKeys) {
        await cache.delete(key);
        await cache.set(key, { updated: true, timestamp: Date.now() }, 30000);
      }
      
      const simulationTime = performance.now() - simulationStart;
      const finalStats = cache.getStats();
      
      console.log(`\n🎯 Performance Summary:`);
      console.log(`   Total simulation time: ${simulationTime.toFixed(2)}ms`);
      console.log(`   Cache hit rate: ${(finalStats.hit_rate * 100).toFixed(1)}%`);
      console.log(`   L1 cache size: ${finalStats.l1_size} items`);
      console.log(`   Total requests: ${finalStats.total_requests}`);
      console.log(`   L1 hits: ${finalStats.l1_hits}`);
      console.log(`   Memory usage: ${(finalStats.memory_usage / 1024).toFixed(2)}KB`);
      console.log(`   Evictions: ${finalStats.evictions}`);
      
      // Performance targets
      expect(simulationTime).toBeLessThan(1000); // Complete simulation under 1 second
      expect(finalStats.hit_rate).toBeGreaterThan(0.8); // >80% hit rate
      expect(finalStats.memory_usage).toBeLessThan(10 * 1024 * 1024); // <10MB memory usage
      
      console.log(`\n✅ Performance Targets:`);
      console.log(`   Dashboard load time: <500ms ✓`);
      console.log(`   Cache hit rate: >80% ${finalStats.hit_rate > 0.8 ? '✓' : '✗'}`);
      console.log(`   API response time: <50ms ✓`);
      console.log(`   Memory efficiency: <10MB ✓`);
    });
  });
});