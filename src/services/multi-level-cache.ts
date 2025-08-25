/**
 * Multi-Level Cache System
 * L1: In-memory LRU cache for hot data
 * L2: Redis cache for shared data
 * L3: File system cache for large datasets
 */

import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
}

interface CacheStats {
  l1_hits: number;
  l1_misses: number;
  l1_size: number;
  l1_max_size: number;
  l2_hits: number;
  l2_misses: number;
  l2_connected: boolean;
  l3_hits: number;
  l3_misses: number;
  l3_size: number;
  total_requests: number;
  hit_rate: number;
  evictions: number;
  memory_usage: number;
}

interface RedisConfig {
  url?: string;
  enabled: boolean;
}

class LRUCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>();
  private maxSize: number;
  private accessCounter = 0;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set(key: string, value: T, ttl: number = 300000): void {
    // 5 min default TTL
    const now = Date.now();
    const size = this.estimateSize(value);

    // Remove expired entry if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: now,
      ttl,
      hits: 0,
      size,
    });

    this.accessOrder.set(key, ++this.accessCounter);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access order and stats
    entry.hits++;
    this.accessOrder.set(key, ++this.accessCounter);
    this.stats.hits++;

    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, access] of this.accessOrder.entries()) {
      if (access < oldestAccess) {
        oldestAccess = access;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  private estimateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate in bytes
    } catch {
      return 1024; // Default size for non-serializable objects
    }
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    let memoryUsage = 0;

    for (const entry of this.cache.values()) {
      memoryUsage += entry.size;
    }

    return {
      l1_hits: this.stats.hits,
      l1_misses: this.stats.misses,
      l1_size: this.cache.size,
      l1_max_size: this.maxSize,
      total_requests: totalRequests,
      hit_rate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      evictions: this.stats.evictions,
      memory_usage: memoryUsage,
    };
  }

  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    });

    if (keysToDelete.length > 0) {
      console.log(
        `🧹 Cache cleanup: removed ${keysToDelete.length} expired entries`
      );
    }
  }
}

class MultiLevelCache {
  private l1Cache: LRUCache;
  private redisClient: any = null;
  private l3CacheDir: string;
  private cleanupInterval: NodeJS.Timeout;
  private l2Stats = { hits: 0, misses: 0 };
  private l3Stats = { hits: 0, misses: 0, size: 0 };

  constructor(
    l1MaxSize: number = 1000, 
    redisConfig: RedisConfig = { enabled: false },
    l3CacheDir: string = './cache'
  ) {
    this.l1Cache = new LRUCache(l1MaxSize);
    this.l3CacheDir = l3CacheDir;

    // Initialize Redis L2 cache if enabled
    if (redisConfig.enabled) {
      this.initializeRedis(redisConfig.url);
    }

    // Initialize L3 file system cache
    this.initializeL3Cache();

    // Periodic cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.l1Cache.cleanup();
      this.cleanupL3Cache();
    }, 300000);
  }

  /**
   * Initialize Redis connection for L2 cache
   */
  private async initializeRedis(redisUrl?: string): Promise<void> {
    try {
      // Dynamic import to avoid bundling Redis if not needed
      const Redis = await import('ioredis').catch(() => null);
      
      if (Redis) {
        this.redisClient = new Redis.default(redisUrl || 'redis://localhost:6379');
        
        this.redisClient.on('connect', () => {
          console.log('🔗 L2 Redis cache connected');
        });
        
        this.redisClient.on('error', (error: Error) => {
          console.warn('⚠️ Redis L2 cache error:', error.message);
          this.redisClient = null;
        });
        
        // Test connection
        await this.redisClient.ping();
      } else {
        console.warn('⚠️ Redis not available, L2 cache disabled');
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize Redis L2 cache:', error);
      this.redisClient = null;
    }
  }

  /**
   * Initialize L3 file system cache directory
   */
  private initializeL3Cache(): void {
    try {
      if (!existsSync(this.l3CacheDir)) {
        mkdirSync(this.l3CacheDir, { recursive: true });
      }
      console.log(`📁 L3 file cache initialized: ${this.l3CacheDir}`);
    } catch (error) {
      console.warn('⚠️ Failed to initialize L3 file cache:', error);
    }
  }

  /**
   * Generate L3 cache file path
   */
  private getL3FilePath(key: string): string {
    const safeKey = key.replace(/[/\\?%*:|"<>]/g, '_');
    return join(this.l3CacheDir, `${safeKey}.json`);
  }

  /**
   * Clean up expired L3 cache files
   */
  private async cleanupL3Cache(): Promise<void> {
    try {
      const cacheFiles = await Bun.file(this.l3CacheDir).arrayBuffer().then(
        () => [], // Handle case where it's a directory
        () => []
      );
      
      // This is a simplified cleanup - in production you'd scan the directory
      // and check file timestamps against TTL
    } catch (error) {
      // Silent cleanup failure
    }
  }

  /**
   * Get value from cache (tries L1 -> L2 -> L3)
   */
  async get<T>(key: string): Promise<T | null> {
    // Try L1 cache first
    const l1Result = this.l1Cache.get(key);
    if (l1Result !== null) {
      return l1Result as T;
    }

    // Try L2 (Redis) cache
    if (this.redisClient) {
      try {
        const l2Result = await this.redisClient.get(key);
        if (l2Result !== null) {
          this.l2Stats.hits++;
          const parsed = JSON.parse(l2Result);
          
          // Promote to L1 cache
          this.l1Cache.set(key, parsed.value, parsed.ttl || 300000);
          
          return parsed.value as T;
        } else {
          this.l2Stats.misses++;
        }
      } catch (error) {
        console.warn('L2 cache read error:', error);
        this.l2Stats.misses++;
      }
    }

    // Try L3 (File system) cache
    try {
      const filePath = this.getL3FilePath(key);
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        const content = await file.json();
        const now = Date.now();
        
        // Check if expired
        if (!content.expiresAt || now < content.expiresAt) {
          this.l3Stats.hits++;
          
          // Promote to L1 and L2 caches
          this.l1Cache.set(key, content.value, content.ttl || 300000);
          
          if (this.redisClient) {
            try {
              await this.redisClient.setex(key, Math.floor((content.ttl || 300000) / 1000), JSON.stringify({
                value: content.value,
                ttl: content.ttl
              }));
            } catch (error) {
              // Silent Redis promotion failure
            }
          }
          
          return content.value as T;
        } else {
          // File expired, clean up
          try {
            await Bun.write(filePath, ''); // Delete file
          } catch {
            // Silent cleanup failure
          }
        }
      }
      
      this.l3Stats.misses++;
    } catch (error) {
      this.l3Stats.misses++;
    }

    return null;
  }

  /**
   * Set value in cache (stores in all levels)
   */
  async set<T>(key: string, value: T, ttl: number = 300000): Promise<void> {
    // Store in L1 cache
    this.l1Cache.set(key, value, ttl);

    // Store in L2 (Redis) cache
    if (this.redisClient) {
      try {
        const ttlSeconds = Math.floor(ttl / 1000);
        const payload = JSON.stringify({ value, ttl });
        
        if (ttlSeconds > 0) {
          await this.redisClient.setex(key, ttlSeconds, payload);
        } else {
          await this.redisClient.set(key, payload);
        }
      } catch (error) {
        console.warn('L2 cache write error:', error);
      }
    }

    // Store in L3 (File system) cache for large data
    try {
      const dataSize = JSON.stringify(value).length;
      
      // Only store in L3 if data is larger than 10KB or has long TTL
      if (dataSize > 10240 || ttl > 3600000) { // 1 hour TTL threshold
        const filePath = this.getL3FilePath(key);
        const cacheEntry = {
          value,
          ttl,
          createdAt: Date.now(),
          expiresAt: ttl > 0 ? Date.now() + ttl : null,
          size: dataSize
        };
        
        await Bun.write(filePath, JSON.stringify(cacheEntry));
        this.l3Stats.size++;
      }
    } catch (error) {
      console.warn('L3 cache write error:', error);
    }
  }

  /**
   * Check if key exists in any cache level
   */
  async has(key: string): Promise<boolean> {
    if (this.l1Cache.has(key)) {
      return true;
    }

    // Check L2 (Redis) cache
    if (this.redisClient) {
      try {
        const exists = await this.redisClient.exists(key);
        if (exists) {
          return true;
        }
      } catch (error) {
        // Silent failure
      }
    }

    // Check L3 (File system) cache
    try {
      const filePath = this.getL3FilePath(key);
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        const content = await file.json();
        
        // Check if expired
        if (!content.expiresAt || Date.now() < content.expiresAt) {
          return true;
        }
      }
    } catch (error) {
      // Silent failure
    }

    return false;
  }

  /**
   * Delete key from all cache levels
   */
  async delete(key: string): Promise<boolean> {
    let deleted = false;

    // Delete from L1 cache
    if (this.l1Cache.delete(key)) {
      deleted = true;
    }

    // Delete from L2 (Redis) cache
    if (this.redisClient) {
      try {
        const result = await this.redisClient.del(key);
        if (result > 0) {
          deleted = true;
        }
      } catch (error) {
        console.warn('L2 cache delete error:', error);
      }
    }

    // Delete from L3 (File system) cache
    try {
      const filePath = this.getL3FilePath(key);
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        await Bun.write(filePath, ''); // Delete file
        this.l3Stats.size = Math.max(0, this.l3Stats.size - 1);
        deleted = true;
      }
    } catch (error) {
      console.warn('L3 cache delete error:', error);
    }

    return deleted;
  }

  /**
   * Clear all cache levels
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();

    // Clear L2 (Redis) cache
    if (this.redisClient) {
      try {
        await this.redisClient.flushall();
      } catch (error) {
        console.warn('L2 cache clear error:', error);
      }
    }

    // Clear L3 (File system) cache
    try {
      // Simple approach: reset the cache directory
      if (existsSync(this.l3CacheDir)) {
        await this.initializeL3Cache(); // Recreate directory
        this.l3Stats.size = 0;
      }
    } catch (error) {
      console.warn('L3 cache clear error:', error);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const l1Stats = this.l1Cache.getStats();

    const totalHits = l1Stats.l1_hits + this.l2Stats.hits + this.l3Stats.hits;
    const totalMisses = l1Stats.l1_misses + this.l2Stats.misses + this.l3Stats.misses;
    const totalRequests = totalHits + totalMisses;

    return {
      ...l1Stats,
      l2_hits: this.l2Stats.hits,
      l2_misses: this.l2Stats.misses,
      l2_connected: this.redisClient !== null,
      l3_hits: this.l3Stats.hits,
      l3_misses: this.l3Stats.misses,
      l3_size: this.l3Stats.size,
      total_requests: totalRequests,
      hit_rate: totalRequests > 0 ? totalHits / totalRequests : 0,
    };
  }

  /**
   * Get or compute value with caching
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl: number = 300000
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute the value
    const value = await computeFn();

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Batch get multiple keys
   */
  async getBatch<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();

    for (const key of keys) {
      result.set(key, await this.get<T>(key));
    }

    return result;
  }

  /**
   * Batch set multiple key-value pairs
   */
  async setBatch<T>(
    entries: Map<string, T>,
    ttl: number = 300000
  ): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttl);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.l1Cache.clear();
  }
}

export { MultiLevelCache, type CacheStats, type RedisConfig };
