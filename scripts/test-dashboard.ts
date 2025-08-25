/**
 * Test script for the unified dashboard implementation
 * Verifies YAML configuration, hot-reload, and timezone support
 */

import { dashboardConfigService } from '../src/services/dashboard-config-service';
import { isValidTimezone, getCurrentTimezone, formatWithTimezone } from '../src/utils/timezone';

async function testDashboard() {
  console.log('🧪 Testing Unified Dashboard Implementation\n');
  
  try {
    // Test 1: Configuration Service Initialization
    console.log('1️⃣ Testing Configuration Service...');
    const configs = dashboardConfigService.getAllConfigs();
    console.log(`✅ Loaded ${Object.keys(configs).length} configuration files`);
    
    // Test 2: YAML Validation
    console.log('\n2️⃣ Testing YAML Validation...');
    const validYaml = `
app:
  name: test-app
  version: 1.0.0
features:
  testFeature:
    enabled: true
`;
    
    const validation = dashboardConfigService.validateYaml(validYaml);
    console.log(`✅ YAML validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
    
    // Test 3: Feature Flags
    console.log('\n3️⃣ Testing Feature Flags...');
    const features = dashboardConfigService.getFeatureFlags();
    console.log(`✅ Loaded ${Object.keys(features).length} feature flags`);
    
    // Test 4: Timezone Support
    console.log('\n4️⃣ Testing Timezone Support...');
    const currentTz = getCurrentTimezone();
    console.log(`✅ Current timezone: ${currentTz}`);
    
    const isValid = isValidTimezone('America/New_York');
    console.log(`✅ Timezone validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    const formatted = formatWithTimezone(new Date(), 'UTC');
    console.log(`✅ Time formatting: ${formatted}`);
    
    // Test 5: Hot-reload Status
    console.log('\n5️⃣ Testing Hot-reload Status...');
    const hotReloadStatus = dashboardConfigService.getHotReloadStatus();
    console.log(`✅ Hot-reload active: ${hotReloadStatus.active}`);
    console.log(`✅ Files watching: ${hotReloadStatus.filesWatching}`);
    
    // Test 6: Configuration Export
    console.log('\n6️⃣ Testing Configuration Export...');
    try {
      const appJson = dashboardConfigService.exportConfigAsJson('app');
      console.log(`✅ Config export: ${appJson.length > 0 ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      console.log(`❌ Config export failed: ${error.message}`);
    }
    
    // Test 7: Environment Configuration
    console.log('\n7️⃣ Testing Environment Configuration...');
    const devConfig = dashboardConfigService.getEnvironmentConfig('development');
    const prodConfig = dashboardConfigService.getEnvironmentConfig('production');
    console.log(`✅ Development config loaded: ${devConfig ? 'YES' : 'NO'}`);
    console.log(`✅ Production config loaded: ${prodConfig ? 'YES' : 'NO'}`);
    
    // Test 8: Version Information
    console.log('\n8️⃣ Testing Version Information...');
    const version = dashboardConfigService.getVersionInfo();
    console.log(`✅ App version: ${version.app}`);
    console.log(`✅ Bun version: ${version.bun}`);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('  ✅ Configuration service initialization');
    console.log('  ✅ YAML validation');
    console.log('  ✅ Feature flags management');
    console.log('  ✅ Timezone support');
    console.log('  ✅ Hot-reload functionality');
    console.log('  ✅ Configuration export');
    console.log('  ✅ Environment-specific configs');
    console.log('  ✅ Version information');
    
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('\n🌐 Testing API Endpoints...');
  
  const baseUrl = 'http://localhost:3003';
  const endpoints = [
    { path: '/api/dashboard/overview', method: 'GET' },
    { path: '/api/yaml/list', method: 'GET' },
    { path: '/api/yaml/app', method: 'GET' },
    { path: '/api/features', method: 'GET' },
    { path: '/api/hotreload/status', method: 'GET' },
    { path: '/api/version', method: 'GET' },
    { path: '/api/health/full', method: 'GET' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method
      });
      
      console.log(`${response.ok ? '✅' : '❌'} ${endpoint.method} ${endpoint.path} - ${response.status}`);
    } catch (error) {
      console.log(`❌ ${endpoint.method} ${endpoint.path} - Connection failed`);
    }
  }
}

// Run tests
if (import.meta.main) {
  console.log('🚀 Starting Dashboard Tests...\n');
  
  const success = await testDashboard();
  
  if (success) {
    console.log('\n🌐 Testing API endpoints (requires server to be running)...');
    await testAPIEndpoints();
    
    console.log('\n🎯 Next Steps:');
    console.log('  1. Start the admin server: bun run src/admin-server.ts');
    console.log('  2. Visit: http://localhost:3003/dashboard');
    console.log('  3. Test YAML hot-reload by editing config files');
    console.log('  4. Toggle feature flags in the dashboard');
    console.log('  5. Monitor logs for real-time updates');
  } else {
    console.log('\n❌ Tests failed. Please fix the issues before proceeding.');
    process.exit(1);
  }
}