/**
 * Multi-Level Cache System
 * L1: In-memory LRU cache for hot data
 * L2: Redis cache for shared data (future)
 * L3: File system cache for large datasets
 */

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
  total_requests: number;
  hit_rate: number;
  evictions: number;
  memory_usage: number;
}

class LRUCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>();
  private maxSize: number;
  private accessCounter = 0;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set(key: string, value: T, ttl: number = 300000): void { // 5 min default TTL
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
      size
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
      memory_usage: memoryUsage
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
      console.log(`🧹 Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }
}

class MultiLevelCache {
  private l1Cache: LRUCache;
  private cleanupInterval: NodeJS.Timeout;

  constructor(l1MaxSize: number = 1000) {
    this.l1Cache = new LRUCache(l1MaxSize);
    
    // Periodic cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.l1Cache.cleanup();
    }, 300000);
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

    // TODO: Try L2 (Redis) cache
    // TODO: Try L3 (File system) cache

    return null;
  }

  /**
   * Set value in cache (stores in all levels)
   */
  async set<T>(key: string, value: T, ttl: number = 300000): Promise<void> {
    // Store in L1 cache
    this.l1Cache.set(key, value, ttl);

    // TODO: Store in L2 (Redis) cache
    // TODO: Store in L3 (File system) cache for large data
  }

  /**
   * Check if key exists in any cache level
   */
  async has(key: string): Promise<boolean> {
    if (this.l1Cache.has(key)) {
      return true;
    }

    // TODO: Check L2 (Redis) cache
    // TODO: Check L3 (File system) cache

    return false;
  }

  /**
   * Delete key from all cache levels
   */
  async delete(key: string): Promise<boolean> {
    const l1Deleted = this.l1Cache.delete(key);

    // TODO: Delete from L2 (Redis) cache
    // TODO: Delete from L3 (File system) cache

    return l1Deleted;
  }

  /**
   * Clear all cache levels
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();
    
    // TODO: Clear L2 (Redis) cache
    // TODO: Clear L3 (File system) cache
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const l1Stats = this.l1Cache.getStats();

    // TODO: Add L2 and L3 stats
    return {
      ...l1Stats,
      // Add L2 and L3 stats when implemented
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
  async setBatch<T>(entries: Map<string, T>, ttl: number = 300000): Promise<void> {
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

export { MultiLevelCache, type CacheStats };