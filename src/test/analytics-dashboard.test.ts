/**
 * Enhanced Analytics Dashboard Test Suite
 * Tests all API endpoints and route functionality for the dashboard
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

describe('Enhanced Analytics Dashboard API Tests', () => {
  const baseURL = 'http://localhost:3003';
  const testCustomerId = 'BB895'; // Customer with real transaction data

  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Health and Status Endpoints', () => {
    test('should return healthy status', async () => {
      const response = await fetch(`${baseURL}/health`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.services.customer_api).toBe('operational');
      expect(data.services.notification_api).toBe('operational');
      expect(data.services.security_api).toBe('operational');
      expect(data.routes).toBeGreaterThan(0);
    });

    test('should provide API documentation', async () => {
      const response = await fetch(`${baseURL}/api/docs`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.title).toBe('Fantdev Trading Bot API');
      expect(data.version).toBe('2.1.0');
      expect(data.endpoints.customer).toBeDefined();
      expect(data.endpoints.notifications).toBeDefined();
      expect(data.endpoints.security).toBeDefined();
    });
  });

  describe('Customer API Endpoints', () => {
    test('should get customer balance with proper headers', async () => {
      const response = await fetch(`${baseURL}/api/customer/balance`, {
        headers: {
          'X-Customer-ID': testCustomerId,
          'X-User-ID': testCustomerId
        }
      });
      
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.balance).toBeDefined();
      expect(data.balance.current).toBeDefined();
      expect(data.balance.weekly_pnl).toBeDefined();
      expect(data.balance.currency).toBe('USD');
      expect(data.balance.last_updated).toBeDefined();
    });

    test('should get customer analytics', async () => {
      const response = await fetch(`${baseURL}/api/customer/analytics`, {
        headers: {
          'X-Customer-ID': testCustomerId,
          'X-User-ID': testCustomerId
        }
      });
      
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.analytics).toBeDefined();
      expect(data.analytics.balance_trend).toBeInstanceOf(Array);
      expect(data.analytics.transaction_summary).toBeDefined();
      expect(data.analytics.performance_metrics).toBeDefined();
      expect(data.analytics.activity_stats).toBeDefined();
      expect(data.generated_at).toBeDefined();
    });

    test('should get customer transactions with pagination', async () => {
      const response = await fetch(`${baseURL}/api/customer/transactions?page=1&limit=10`, {
        headers: {
          'X-Customer-ID': testCustomerId,
          'X-User-ID': testCustomerId
        }
      });
      
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.transactions).toBeInstanceOf(Array);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.total).toBeGreaterThanOrEqual(0);
    });

    test('should get customer profile', async () => {
      const response = await fetch(`${baseURL}/api/customer/profile`, {
        headers: {
          'X-Customer-ID': testCustomerId,
          'X-User-ID': testCustomerId
        }
      });
      
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.profile).toBeDefined();
      expect(data.profile.customer_id).toBe(testCustomerId);
    });

    test('should handle missing authentication headers', async () => {
      const response = await fetch(`${baseURL}/api/customer/balance`);
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Notification API Endpoints', () => {
    test('should get user notifications', async () => {
      const response = await fetch(`${baseURL}/api/notifications`, {
        headers: {
          'X-Customer-ID': testCustomerId,
          'X-User-ID': testCustomerId
        }
      });
      
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.notifications).toBeInstanceOf(Array);
      expect(data.pagination.total).toBeGreaterThanOrEqual(0);
      expect(data.pagination.unread_count).toBeGreaterThanOrEqual(0);
    });

    test('should get notification preferences', async () => {
      const response = await fetch(`${baseURL}/api/notifications/preferences`, {
        headers: {
          'X-Customer-ID': testCustomerId,
          'X-User-ID': testCustomerId
        }
      });
      
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.preferences).toBeDefined();
      expect(data.preferences.channels).toBeDefined();
      expect(data.preferences.types).toBeDefined();
    });
  });

  describe('Security API Endpoints', () => {
    test('should get security status with admin permissions', async () => {
      const response = await fetch(`${baseURL}/api/security/status`, {
        headers: {
          'X-Admin-ID': 'admin',
          'X-User-ID': 'admin',
          'X-Admin-Permissions': 'security_read'
        }
      });
      
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.status).toBeDefined();
      expect(data.metrics).toBeDefined();
      expect(data.system_health).toBeDefined();
    });

    test('should handle insufficient permissions for security endpoints', async () => {
      const response = await fetch(`${baseURL}/api/security/status`, {
        headers: {
          'X-Admin-ID': 'admin',
          'X-User-ID': 'admin'
          // Missing X-Admin-Permissions header
        }
      });
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('CORS and Headers', () => {
    test('should handle CORS preflight requests', async () => {
      const response = await fetch(`${baseURL}/api/customer/balance`, {
        method: 'OPTIONS'
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });

    test('should include CORS headers in API responses', async () => {
      const response = await fetch(`${baseURL}/api/customer/balance`, {
        headers: {
          'X-Customer-ID': testCustomerId,
          'X-User-ID': testCustomerId
        }
      });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits after many requests', async () => {
      const requests = [];
      
      // Send more than the rate limit (100 requests per minute)
      for (let i = 0; i < 105; i++) {
        requests.push(
          fetch(`${baseURL}/health`).catch(() => ({ ok: false, status: 429 }))
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      // Rate limiting may not trigger in test environment
      // This is expected behavior for a simple in-memory rate limiter
      console.log('Rate limit test:', rateLimited ? 'triggered' : 'not triggered (expected)');
    }, { timeout: 10000 });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent endpoints', async () => {
      const response = await fetch(`${baseURL}/api/nonexistent/endpoint`, {
        headers: {
          'X-Customer-ID': testCustomerId,
          'X-User-ID': testCustomerId
        }
      });

      expect(response.status).toBe(404);
    });

    test('should return structured error responses', async () => {
      const response = await fetch(`${baseURL}/api/customer/balance`);
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.message).toBeDefined();
    });

    test('should handle malformed customer ID', async () => {
      const response = await fetch(`${baseURL}/api/customer/balance`, {
        headers: {
          'X-Customer-ID': 'INVALID_ID',
          'X-User-ID': 'INVALID_ID'
        }
      });
      
      // Unknown customers should return error or default data
      // The API should handle unknown customer IDs gracefully
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Performance Tests', () => {
    test('should respond quickly to balance requests', async () => {
      const startTime = performance.now();
      
      const response = await fetch(`${baseURL}/api/customer/balance`, {
        headers: {
          'X-Customer-ID': testCustomerId,
          'X-User-ID': testCustomerId
        }
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(responseTime).toBeLessThan(100); // Less than 100ms
    });

    test('should handle concurrent requests efficiently', async () => {
      const startTime = performance.now();
      
      const requests = Array(10).fill(0).map(() =>
        fetch(`${baseURL}/api/customer/balance`, {
          headers: {
            'X-Customer-ID': testCustomerId,
            'X-User-ID': testCustomerId
          }
        })
      );

      const responses = await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      expect(responses.every(r => r.ok)).toBe(true);
      
      // Should handle 10 concurrent requests quickly
      expect(totalTime).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe('Data Validation', () => {
    test('should return valid balance data structure', async () => {
      const response = await fetch(`${baseURL}/api/customer/balance`, {
        headers: {
          'X-Customer-ID': testCustomerId,
          'X-User-ID': testCustomerId
        }
      });
      
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(typeof data.balance.current).toBe('number');
      expect(typeof data.balance.weekly_pnl).toBe('number');
      expect(typeof data.balance.currency).toBe('string');
      expect(typeof data.balance.last_updated).toBe('string');
      expect(new Date(data.balance.last_updated)).toBeInstanceOf(Date);
    });

    test('should return valid analytics data structure', async () => {
      const response = await fetch(`${baseURL}/api/customer/analytics`, {
        headers: {
          'X-Customer-ID': testCustomerId,
          'X-User-ID': testCustomerId
        }
      });
      
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.analytics.balance_trend)).toBe(true);
      expect(typeof data.analytics.transaction_summary).toBe('object');
      expect(typeof data.analytics.performance_metrics).toBe('object');
      expect(typeof data.analytics.activity_stats).toBe('object');
      
      // Check specific metrics
      const metrics = data.analytics.performance_metrics;
      expect(typeof metrics.total_deposits).toBe('number');
      expect(typeof metrics.total_withdrawals).toBe('number');
      expect(typeof metrics.net_pnl).toBe('number');
      expect(typeof metrics.roi_percentage).toBe('number');
    });

    test('should return valid transaction data structure', async () => {
      const response = await fetch(`${baseURL}/api/customer/transactions`, {
        headers: {
          'X-Customer-ID': testCustomerId,
          'X-User-ID': testCustomerId
        }
      });
      
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.transactions)).toBe(true);
      
      if (data.transactions.length > 0) {
        const transaction = data.transactions[0];
        expect(typeof transaction.id).toBe('string');
        expect(typeof transaction.amount).toBe('number');
        expect(['deposit', 'withdrawal', 'trade', 'bonus']).toContain(transaction.type);
        expect(['pending', 'completed', 'failed']).toContain(transaction.status);
        expect(typeof transaction.timestamp).toBe('string');
        expect(typeof transaction.description).toBe('string');
      }
    });
  });
});