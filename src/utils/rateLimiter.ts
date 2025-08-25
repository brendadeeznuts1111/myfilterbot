/**
 * Rate Limiter for API Protection
 * Prevents API flooding and implements circuit breaker pattern
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessful?: boolean; // Only count failed requests
  circuitBreaker?: {
    errorThreshold: number; // Number of errors before opening circuit
    resetTimeout: number; // Time to wait before closing circuit
  };
}

interface RateLimitState {
  requests: number;
  errors: number;
  windowStart: number;
  circuitOpen: boolean;
  circuitOpenedAt?: number;
}

export class RateLimiter {
  private states = new Map<string, RateLimitState>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessful: false,
      ...config,
    };
  }

  /**
   * Check if request should be allowed
   */
  shouldAllow(key: string): {
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  } {
    const now = Date.now();
    let state = this.states.get(key);

    // Initialize state if doesn't exist
    if (!state) {
      state = {
        requests: 0,
        errors: 0,
        windowStart: now,
        circuitOpen: false,
      };
      this.states.set(key, state);
    }

    // Check circuit breaker
    if (state.circuitOpen && this.config.circuitBreaker) {
      const circuitAge = now - (state.circuitOpenedAt || 0);
      if (circuitAge < this.config.circuitBreaker.resetTimeout) {
        return {
          allowed: false,
          reason: 'Circuit breaker is open due to too many errors',
          retryAfter: Math.ceil(
            (this.config.circuitBreaker.resetTimeout - circuitAge) / 1000
          ),
        };
      } else {
        // Reset circuit breaker
        state.circuitOpen = false;
        state.errors = 0;
        console.log(`🔌 Circuit breaker reset for ${key}`);
      }
    }

    // Check if window has expired
    if (now - state.windowStart > this.config.windowMs) {
      // Reset window
      state.requests = 0;
      state.windowStart = now;
    }

    // Check rate limit
    if (state.requests >= this.config.maxRequests) {
      const windowRemaining = this.config.windowMs - (now - state.windowStart);
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.config.maxRequests} requests per ${this.config.windowMs}ms`,
        retryAfter: Math.ceil(windowRemaining / 1000),
      };
    }

    // Allow request
    state.requests++;
    return { allowed: true };
  }

  /**
   * Record request result for circuit breaker
   */
  recordResult(key: string, success: boolean) {
    const state = this.states.get(key);
    if (!state) return;

    if (!success) {
      state.errors++;

      // Check if circuit should open
      if (
        this.config.circuitBreaker &&
        state.errors >= this.config.circuitBreaker.errorThreshold &&
        !state.circuitOpen
      ) {
        state.circuitOpen = true;
        state.circuitOpenedAt = Date.now();
        console.log(
          `⚡ Circuit breaker opened for ${key} after ${state.errors} errors`
        );
      }
    } else if (this.config.skipSuccessful) {
      // Don't count successful requests against rate limit
      state.requests = Math.max(0, state.requests - 1);
    }
  }

  /**
   * Get current state for debugging
   */
  getState(key: string): RateLimitState | undefined {
    return this.states.get(key);
  }

  /**
   * Clear all states
   */
  reset() {
    this.states.clear();
  }
}

// Create default rate limiters
export const apiRateLimiter = new RateLimiter({
  windowMs: 10000, // 10 seconds
  maxRequests: 30, // 30 requests per 10 seconds
  circuitBreaker: {
    errorThreshold: 10, // Open circuit after 10 errors
    resetTimeout: 30000, // Reset after 30 seconds
  },
});

export const aggressiveRateLimiter = new RateLimiter({
  windowMs: 1000, // 1 second
  maxRequests: 5, // 5 requests per second
  skipSuccessful: true, // Only count failed requests
  circuitBreaker: {
    errorThreshold: 3, // Open circuit after 3 errors
    resetTimeout: 10000, // Reset after 10 seconds
  },
});
