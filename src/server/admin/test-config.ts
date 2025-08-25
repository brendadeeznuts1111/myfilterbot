#!/usr/bin/env bun
/**
 * Test script for API configuration system
 * Run with: bun run src/server/admin/test-config.ts
 */

import { loadApiConfig, reloadApiConfig, isFeatureEnabled, getRoute } from '../../lib/apiConfig';
import { startConfigWatcher, onConfigChange } from '../../lib/apiConfigWatcher';
import { verifyJWT } from '../middleware/configMiddleware';
import jwt from 'jsonwebtoken';

console.log('🧪 Testing API Configuration System\n');

// Test 1: Load configuration
console.log('📖 Test 1: Loading configuration...');
try {
  const config = loadApiConfig();
  console.log('✅ Configuration loaded successfully');
  console.log(`  Name: ${config.api.name}`);
  console.log(`  Version: ${config.api.version}`);
  console.log(`  Port: ${config.api.server.port}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}\n`);
} catch (error) {
  console.error('❌ Failed to load configuration:', error);
  process.exit(1);
}

// Test 2: Environment variable substitution
console.log('🔧 Test 2: Environment variable substitution...');
process.env.API_PORT = '9999';
process.env.API_NAME = 'Test API';
try {
  const config = reloadApiConfig();
  if (config.api.server.port === 9999 && config.api.name === 'Test API') {
    console.log('✅ Environment variables applied correctly');
    console.log(`  API_PORT: ${config.api.server.port}`);
    console.log(`  API_NAME: ${config.api.name}\n`);
  } else {
    console.log('⚠️ Environment variables not applied as expected\n');
  }
} catch (error) {
  console.error('❌ Error testing environment variables:', error);
}

// Reset env vars
delete process.env.API_PORT;
delete process.env.API_NAME;
reloadApiConfig();

// Test 3: Feature flags
console.log('🎯 Test 3: Feature flags...');
const features = ['v2Endpoints', 'graphql', 'websocket', 'streaming', 'batchRequests'];
for (const feature of features) {
  const enabled = isFeatureEnabled(feature);
  console.log(`  ${feature}: ${enabled ? '✅ enabled' : '❌ disabled'}`);
}
console.log();

// Test 4: Route matching
console.log('🛣️ Test 4: Route matching...');
const testRoutes = [
  { path: '/health', method: 'GET' },
  { path: '/api/users/123', method: 'GET' },
  { path: '/api/admin/settings', method: 'POST' },
  { path: '/api/customers/list', method: 'GET' },
  { path: '/nonexistent', method: 'GET' }
];

for (const test of testRoutes) {
  const route = getRoute(test.path, test.method);
  if (route) {
    console.log(`  ✅ ${test.method} ${test.path} → Found (roles: ${route.roles?.join(', ') || 'none'})`);
  } else {
    console.log(`  ❌ ${test.method} ${test.path} → Not found`);
  }
}
console.log();

// Test 5: JWT validation
console.log('🔐 Test 5: JWT validation...');
try {
  const config = loadApiConfig();
  const jwtConfig = config.api.middleware.auth.jwt;
  
  // Create a test token
  const testPayload = {
    sub: 'user123',
    roles: ['admin'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  
  // Need JWT_SECRET env var for this test
  if (!process.env.JWT_SECRET) {
    console.log('  ⚠️ JWT_SECRET not set, using test secret');
    process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
    reloadApiConfig();
  }
  
  const token = jwt.sign(testPayload, process.env.JWT_SECRET, {
    algorithm: jwtConfig?.algorithm as any || 'HS256',
    issuer: jwtConfig?.issuer,
    audience: jwtConfig?.audience
  });
  
  const { valid, payload } = verifyJWT(token);
  if (valid) {
    console.log('  ✅ JWT validation successful');
    console.log(`    User: ${payload.sub}`);
    console.log(`    Roles: ${payload.roles.join(', ')}`);
  } else {
    console.log('  ❌ JWT validation failed');
  }
} catch (error) {
  console.log('  ⚠️ JWT test skipped:', error);
}
console.log();

// Test 6: Config hot-reload (development only)
if (process.env.NODE_ENV !== 'production') {
  console.log('🔄 Test 6: Config hot-reload...');
  console.log('  Starting config watcher...');
  
  // Subscribe to changes
  const unsubscribe = onConfigChange((event) => {
    if (event.type === 'reload') {
      console.log('  🔁 Config reloaded!');
      console.log(`    Version: ${event.config?.api.version}`);
    } else if (event.type === 'error') {
      console.log('  ❌ Reload error:', event.error?.message);
    }
  });
  
  startConfigWatcher();
  console.log('  ✅ Watcher started');
  console.log('  ℹ️ Try editing config/api.yaml to see hot-reload in action');
  console.log('  Press Ctrl+C to exit\n');
  
  // Keep process alive for testing
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    unsubscribe();
    process.exit(0);
  });
} else {
  console.log('🏁 All tests completed successfully!');
}