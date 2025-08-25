/**
 * Response Cache Middleware
 * Caches API responses with ETags and conditional requests
 */

import { MultiLevelCache } from '../services/multi-level-cache';

interface CachedResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  etag: string;
  timestamp: number;
}

interface CacheConfig {
  ttl?: number;
  maxAge?: number;
  private?: boolean;
  mustRevalidate?: boolean;
  staleWhileRevalidate?: number;
}

class ResponseCacheMiddleware {
  private cache: MultiLevelCache;

  constructor(cache: MultiLevelCache) {
    this.cache = cache;
  }

  /**
   * Generate ETag for response content
   */
  private generateETag(content: string): string {
    // Simple hash function for ETag generation
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `"${Math.abs(hash).toString(16)}"`;
  }

  /**
   * Create cache key from request
   */
  private createCacheKey(url: string, method: string = 'GET'): string {
    return `response_cache:${method}:${url}`;
  }

  /**
   * Build cache control header
   */
  private buildCacheControl(config: CacheConfig): string {
    const parts: string[] = [];

    if (config.private) parts.push('private');
    else parts.push('public');

    if (config.maxAge !== undefined) {
      parts.push(`max-age=${config.maxAge}`);
    }

    if (config.mustRevalidate) {
      parts.push('must-revalidate');
    }

    if (config.staleWhileRevalidate !== undefined) {
      parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
    }

    return parts.join(', ');
  }

  /**
   * Check if request has matching ETag
   */
  private hasMatchingETag(request: Request, etag: string): boolean {
    const ifNoneMatch = request.headers.get('if-none-match');
    return ifNoneMatch === etag;
  }

  /**
   * Wrap endpoint with response caching
   */
  withCache<T extends any[]>(
    handler: (...args: T) => Promise<Response>,
    config: CacheConfig = {}
  ) {
    return async (...args: T): Promise<Response> => {
      const request = args[0] as Request;
      const url = new URL(request.url);
      const cacheKey = this.createCacheKey(
        url.pathname + url.search,
        request.method
      );

      // Only cache GET requests by default
      if (request.method !== 'GET') {
        return handler(...args);
      }

      try {
        // Try to get cached response
        const cached = await this.cache.get<CachedResponse>(cacheKey);

        if (cached) {
          // Check if client has matching ETag (304 Not Modified)
          if (this.hasMatchingETag(request, cached.etag)) {
            return new Response(null, {
              status: 304,
              headers: {
                ETag: cached.etag,
                'Cache-Control': this.buildCacheControl(config),
                'X-Cache': 'HIT-304',
              },
            });
          }

          // Return cached response
          const headers = new Headers(cached.headers);
          headers.set('X-Cache', 'HIT');
          headers.set('ETag', cached.etag);
          headers.set('Cache-Control', this.buildCacheControl(config));

          return new Response(cached.body, {
            status: cached.status,
            headers,
          });
        }

        // Cache miss - execute handler
        const response = await handler(...args);

        // Only cache successful responses
        if (response.status >= 200 && response.status < 300) {
          const body = await response.text();
          const etag = this.generateETag(body);

          // Create cached response object
          const cachedResponse: CachedResponse = {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body,
            etag,
            timestamp: Date.now(),
          };

          // Store in cache
          await this.cache.set(cacheKey, cachedResponse, config.ttl || 300000); // 5 min default

          // Return response with cache headers
          const newHeaders = new Headers(response.headers);
          newHeaders.set('ETag', etag);
          newHeaders.set('Cache-Control', this.buildCacheControl(config));
          newHeaders.set('X-Cache', 'MISS');

          return new Response(body, {
            status: response.status,
            headers: newHeaders,
          });
        }

        return response;
      } catch (error) {
        console.error('Response cache error:', error);
        // Fall back to uncached response on error
        return handler(...args);
      }
    };
  }

  /**
   * Invalidate cache for specific pattern
   */
  async invalidate(pattern: string): Promise<number> {
    // This would need to be implemented based on cache backend
    // For now, just clear all cache entries with the pattern
    const invalidated = 0;

    // TODO: Implement pattern-based cache invalidation
    console.log(`Cache invalidation requested for pattern: ${pattern}`);

    return invalidated;
  }

  /**
   * Warm cache with pre-computed responses
   */
  async warmCache(
    entries: Array<{ key: string; response: Response; config?: CacheConfig }>
  ): Promise<void> {
    for (const entry of entries) {
      const body = await entry.response.text();
      const etag = this.generateETag(body);

      const cachedResponse: CachedResponse = {
        status: entry.response.status,
        headers: Object.fromEntries(entry.response.headers.entries()),
        body,
        etag,
        timestamp: Date.now(),
      };

      await this.cache.set(
        `response_cache:${entry.key}`,
        cachedResponse,
        entry.config?.ttl || 300000
      );
    }

    console.log(`🔥 Cache warmed with ${entries.length} entries`);
  }
}

export { ResponseCacheMiddleware, type CacheConfig };
