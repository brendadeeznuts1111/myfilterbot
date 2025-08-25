/**
 * Error Handling Tests
 * Verify that error handling improvements work correctly
 */

import { errorLogger, logError, logDatabaseError, logApiError } from '../src/utils/error-logger';

// Test error logging functionality
function testErrorLogger() {
  console.log('🧪 Testing Error Logger...');

  // Test basic error logging
  const error1 = logError('Test error message', {
    component: 'test',
    action: 'basic_test'
  });
  console.log('✓ Basic error logged:', error1.id);

  // Test database error logging
  const dbError = new Error('Connection timeout');
  const error2 = logDatabaseError(dbError, 'query', 'users', 'SELECT * FROM users');
  console.log('✓ Database error logged:', error2.id);

  // Test API error logging (mock request)
  const mockRequest = {
    url: 'http://localhost:3000/api/test',
    method: 'POST'
  } as Request;
  const error3 = logApiError('Invalid request', mockRequest, { userId: '123' });
  console.log('✓ API error logged:', error3.id);

  // Test error statistics
  const stats = errorLogger.getErrorStats();
  console.log('✓ Error stats:', JSON.stringify(stats, null, 2));

  // Test getting recent errors
  const recentErrors = errorLogger.getRecentErrors(5);
  console.log('✓ Recent errors count:', recentErrors.length);

  console.log('✅ Error Logger tests completed');
}

// Test error handling in async functions
async function testAsyncErrorHandling() {
  console.log('🧪 Testing Async Error Handling...');

  try {
    // Simulate an async operation that fails
    await new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Async operation failed')), 10);
    });
  } catch (error) {
    const logged = logError(error as Error, {
      component: 'async_test',
      action: 'promise_rejection'
    });
    console.log('✓ Async error handled:', logged.id);
  }

  console.log('✅ Async Error Handling tests completed');
}

// Test configuration error handling
function testConfigErrorHandling() {
  console.log('🧪 Testing Config Error Handling...');

  try {
    // Simulate a configuration parsing error
    JSON.parse('invalid json{');
  } catch (error) {
    const logged = errorLogger.logConfigError(
      error as Error,
      'test-config.json',
      'load'
    );
    console.log('✓ Config error handled:', logged.id);
  }

  console.log('✅ Config Error Handling tests completed');
}

// Test error recovery
function testErrorRecovery() {
  console.log('🧪 Testing Error Recovery...');

  // Simulate multiple attempts with fallback
  let attempts = 0;
  const maxAttempts = 3;

  function attemptOperation(): boolean {
    attempts++;
    
    try {
      if (attempts < maxAttempts) {
        throw new Error(`Attempt ${attempts} failed`);
      }
      return true;
    } catch (error) {
      logError(error as Error, {
        component: 'recovery_test',
        action: 'attempt',
        attempt: attempts,
        maxAttempts
      });

      if (attempts < maxAttempts) {
        console.log(`⚠️ Attempt ${attempts} failed, retrying...`);
        return attemptOperation();
      } else {
        console.log('❌ All attempts failed, operation aborted');
        return false;
      }
    }
  }

  const success = attemptOperation();
  console.log('✓ Recovery test result:', success ? 'Success' : 'Failed');
  console.log('✅ Error Recovery tests completed');
}

// Main test runner
async function runErrorHandlingTests() {
  console.log('🚀 Starting Error Handling Tests...\n');

  try {
    testErrorLogger();
    console.log('');
    
    await testAsyncErrorHandling();
    console.log('');
    
    testConfigErrorHandling();
    console.log('');
    
    testErrorRecovery();
    console.log('');

    // Final stats
    const finalStats = errorLogger.getErrorStats();
    console.log('📊 Final Error Stats:');
    console.log(`   Total Errors: ${finalStats.total}`);
    console.log(`   By Level: ${JSON.stringify(finalStats.byLevel)}`);
    console.log(`   By Component: ${JSON.stringify(finalStats.byComponent)}`);
    
    console.log('\n✅ All Error Handling Tests Completed Successfully!');
    
    // Clear logs for clean state
    errorLogger.clearLogs();
    console.log('🧹 Error logs cleared');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  runErrorHandlingTests();
}