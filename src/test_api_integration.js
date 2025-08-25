#!/usr/bin/env node

/**
 * API Integration Test Script
 * Tests the newly integrated Bun TypeScript APIs
 */

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003';

// Test configuration
const tests = [
  {
    name: 'Health Check',
    method: 'GET',
    url: `${BASE_URL}/health`,
    headers: {},
    expectedStatus: 200
  },
  {
    name: 'API Documentation',
    method: 'GET',
    url: `${BASE_URL}/api/docs`,
    headers: {},
    expectedStatus: 200
  },
  {
    name: 'Customer Balance',
    method: 'GET',
    url: `${BASE_URL}/api/customer/balance`,
    headers: {
      'X-Customer-ID': 'BB1042'
    },
    expectedStatus: 200
  },
  {
    name: 'Customer Profile',
    method: 'GET',
    url: `${BASE_URL}/api/customer/profile`,
    headers: {
      'X-Customer-ID': 'BB1042'
    },
    expectedStatus: 200
  },
  {
    name: 'Customer Transactions',
    method: 'GET',
    url: `${BASE_URL}/api/customer/transactions?page=1&limit=10`,
    headers: {
      'X-Customer-ID': 'BB1042'
    },
    expectedStatus: 200
  },
  {
    name: 'Notifications List',
    method: 'GET',
    url: `${BASE_URL}/api/notifications`,
    headers: {
      'X-User-ID': 'BB1042',
      'X-User-Type': 'customer'
    },
    expectedStatus: 200
  },
  {
    name: 'Notification Preferences',
    method: 'GET',
    url: `${BASE_URL}/api/notifications/preferences`,
    headers: {
      'X-User-ID': 'BB1042',
      'X-User-Type': 'customer'
    },
    expectedStatus: 200
  },
  {
    name: 'Security Status (Admin)',
    method: 'GET',
    url: `${BASE_URL}/api/security/status`,
    headers: {
      'X-Admin-ID': 'admin',
      'X-Admin-Permissions': 'security_read'
    },
    expectedStatus: 200
  },
  {
    name: 'Security Events (Admin)',
    method: 'GET',
    url: `${BASE_URL}/api/security/events?page=1&limit=10`,
    headers: {
      'X-Admin-ID': 'admin',
      'X-Admin-Permissions': 'security_read'
    },
    expectedStatus: 200
  },
  {
    name: 'Send Notification (Admin)',
    method: 'POST',
    url: `${BASE_URL}/api/notifications/send`,
    headers: {
      'X-Admin-ID': 'admin',
      'X-Admin-Permissions': 'notification_send',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipient_id: 'BB1042',
      type: 'balance_alert',
      title: 'Test Notification',
      message: 'This is a test notification from the API integration test',
      channels: ['in_app', 'telegram']
    }),
    expectedStatus: 200
  },
  {
    name: 'Rate Limit Test (should succeed)',
    method: 'GET',
    url: `${BASE_URL}/health`,
    headers: {},
    expectedStatus: 200,
    repeat: 5
  },
  {
    name: 'Unauthorized Access Test',
    method: 'GET',
    url: `${BASE_URL}/api/customer/balance`,
    headers: {},
    expectedStatus: 401
  }
];

// Test runner
async function runTests() {
  console.log('🚀 Starting API Integration Tests...\n');
  console.log(`Testing server at: ${BASE_URL}`);
  console.log('=' * 50);

  let passed = 0;
  let failed = 0;
  const results = [];

  // First, check if server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}/health`);
    if (!healthCheck.ok) {
      console.log('❌ Server is not responding. Please start the server with:');
      console.log('   bun run enhanced_admin_server.ts');
      process.exit(1);
    }
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Cannot connect to server. Please ensure it\'s running on port 3003');
    console.log('   Start with: bun run enhanced_admin_server.ts');
    process.exit(1);
  }

  console.log('\n📋 Running API Tests...\n');

  for (const test of tests) {
    const repeat = test.repeat || 1;
    
    for (let i = 0; i < repeat; i++) {
      const testName = repeat > 1 ? `${test.name} (${i + 1}/${repeat})` : test.name;
      
      try {
        const startTime = Date.now();
        
        const options = {
          method: test.method,
          headers: test.headers
        };
        
        if (test.body) {
          options.body = test.body;
        }
        
        const response = await fetch(test.url, options);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        let responseText = '';
        try {
          responseText = await response.text();
        } catch (e) {
          responseText = 'Could not read response body';
        }
        
        const success = response.status === test.expectedStatus;
        
        if (success) {
          console.log(`✅ ${testName}`);
          console.log(`   Status: ${response.status} (${responseTime}ms)`);
          
          // Show first 100 chars of response for successful tests
          if (responseText.length > 0) {
            const preview = responseText.substring(0, 100);
            console.log(`   Response: ${preview}${responseText.length > 100 ? '...' : ''}`);
          }
          
          passed++;
        } else {
          console.log(`❌ ${testName}`);
          console.log(`   Expected: ${test.expectedStatus}, Got: ${response.status}`);
          console.log(`   Response: ${responseText.substring(0, 200)}`);
          failed++;
        }
        
        results.push({
          name: testName,
          success,
          status: response.status,
          expectedStatus: test.expectedStatus,
          responseTime,
          url: test.url,
          method: test.method
        });
        
      } catch (error) {
        console.log(`❌ ${testName}`);
        console.log(`   Error: ${error.message}`);
        failed++;
        
        results.push({
          name: testName,
          success: false,
          error: error.message,
          url: test.url,
          method: test.method
        });
      }
      
      console.log(''); // Empty line for readability
      
      // Small delay between requests
      if (i < repeat - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Summary
  console.log('📊 Test Summary');
  console.log('=' * 30);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  // Performance summary
  const successfulTests = results.filter(r => r.success && r.responseTime);
  if (successfulTests.length > 0) {
    const avgResponseTime = successfulTests.reduce((sum, test) => sum + test.responseTime, 0) / successfulTests.length;
    const minResponseTime = Math.min(...successfulTests.map(t => t.responseTime));
    const maxResponseTime = Math.max(...successfulTests.map(t => t.responseTime));
    
    console.log('\n⚡ Performance Metrics');
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(1)}ms`);
    console.log(`   Fastest Response: ${minResponseTime}ms`);
    console.log(`   Slowest Response: ${maxResponseTime}ms`);
  }

  // Failed tests details
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log('\n🔍 Failed Tests Details:');
    failedTests.forEach(test => {
      console.log(`   • ${test.name}`);
      console.log(`     ${test.method} ${test.url}`);
      if (test.error) {
        console.log(`     Error: ${test.error}`);
      } else {
        console.log(`     Expected ${test.expectedStatus}, got ${test.status}`);
      }
    });
  }

  console.log('\n🏁 Testing completed!');
  
  if (failed > 0) {
    console.log('\n💡 Troubleshooting Tips:');
    console.log('   1. Ensure the server is running: bun run enhanced_admin_server.ts');
    console.log('   2. Check that the API routes are properly integrated');
    console.log('   3. Verify customer_database.json and customer_config.json exist');
    console.log('   4. Check server logs for any errors');
    process.exit(1);
  }
}

// Helper function to repeat string (simple polyfill)
String.prototype.repeat = String.prototype.repeat || function(count) {
  return new Array(count + 1).join(this);
};

// Run the tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});