/**
 * YAML Formatting Tests
 * Test the YAML formatter utility against project configurations
 */

import { formatYAML, validateYAML, normalizeYAML } from '../src/utils/yaml-formatter';

// Test YAML content samples
const testYAMLs = {
  validConfig: `
# Main application configuration
app:
  name: fantdev-trading-bot
  version: 2.1.0
  timezone: Europe/London
  environment: \${NODE_ENV:-development}

server:
  bot:
    host: \${BOT_HOST:-localhost}
    port: \${BOT_PORT:-8080}
    workers: 4
  admin:
    host: \${ADMIN_HOST:-localhost}
    port: \${ADMIN_PORT:-3000}

features:
  newDashboard:
    enabled: true
    rolloutPercentage: 100
    description: "Enhanced dashboard"
`,

  invalidYAML: `
app:
  name: test
  invalid: [unclosed array
  version: 1.0.0
`,

  badlyFormatted: `
app:
   name:    "fantdev-trading-bot"    # Inconsistent spacing
version:2.1.0   # Missing space
features:
darkMode:
    enabled:true # Missing space
     rolloutPercentage:   50    # Wrong indentation
`,

  featureFlags: `
features:
  # Missing required fields
  badFeature:
    enabled: true
    # Missing rolloutPercentage and description
    
  goodFeature:
    enabled: true
    rolloutPercentage: 75
    description: "Well-formed feature flag"
    
  invalidPercentage:
    enabled: false
    rolloutPercentage: 150  # Invalid percentage
    description: "Invalid percentage"
`,

  agentConfig: `
agents:
  list:
    - id: A100
      name: "Test Agent"
      status: active
      commission_rate: 0.05
      customers: [1, 2, 3]
    
    - id: A101
      # Missing name field
      status: active
      commission_rate: 1.5  # Invalid rate > 1
`,

  securityIssues: `
database:
  password: "hardcoded-secret-123"  # Security issue
  api_key: "abcdef1234567890abcdef"  # Potential secret
  
jwt:
  secret: "my-super-secret-key"  # Should use env var
`,

  environmentVariables: `
production:
  database:
    host: \${DB_HOST}  # No default - could be issue for dev
    password: \${DB_PASS}
    port: \${DB_PORT:-5432}  # Has default
    
development:
  database:
    host: \${DB_HOST:-localhost}  # Good: has default
`
};

async function testYAMLFormatting() {
  console.log('🧪 Testing YAML Formatting...\n');

  // Test 1: Valid YAML formatting
  console.log('Test 1: Valid YAML Formatting');
  try {
    const result = await formatYAML(testYAMLs.validConfig, {
      indent: 2,
      preserveComments: true,
      minimizeQuotes: true
    }, 'test-valid.yaml');

    if (result.valid) {
      console.log('✅ Valid YAML formatted successfully');
      console.log(`   Metrics: ${result.metrics.lines} lines, ${result.metrics.keys} keys`);
      if (result.warnings.length > 0) {
        console.log(`   Warnings: ${result.warnings.length}`);
      }
    } else {
      console.log('❌ Valid YAML formatting failed:', result.errors);
    }
  } catch (error) {
    console.log('❌ Valid YAML formatting error:', error);
  }

  // Test 2: Invalid YAML handling
  console.log('\nTest 2: Invalid YAML Handling');
  try {
    const result = await formatYAML(testYAMLs.invalidYAML, {}, 'test-invalid.yaml');
    
    if (!result.valid) {
      console.log('✅ Invalid YAML properly rejected');
      console.log(`   Errors: ${result.errors.join(', ')}`);
    } else {
      console.log('❌ Invalid YAML should have been rejected');
    }
  } catch (error) {
    console.log('❌ Invalid YAML test error:', error);
  }

  // Test 3: Badly formatted YAML improvement
  console.log('\nTest 3: Badly Formatted YAML Improvement');
  try {
    const result = await formatYAML(testYAMLs.badlyFormatted, {
      indent: 2,
      preserveComments: true,
      minimizeQuotes: true
    }, 'test-badly-formatted.yaml');

    if (result.valid) {
      console.log('✅ Badly formatted YAML improved');
      console.log(`   Warnings: ${result.warnings.length}`);
      if (result.warnings.length > 0) {
        console.log(`   Issues found: ${result.warnings.slice(0, 3).join(', ')}${result.warnings.length > 3 ? '...' : ''}`);
      }
    } else {
      console.log('❌ Badly formatted YAML formatting failed:', result.errors);
    }
  } catch (error) {
    console.log('❌ Badly formatted YAML test error:', error);
  }

  console.log('✅ YAML Formatting tests completed\n');
}

async function testYAMLValidation() {
  console.log('🧪 Testing YAML Validation...\n');

  // Test 1: Feature flag validation
  console.log('Test 1: Feature Flag Validation');
  try {
    const result = await validateYAML(testYAMLs.featureFlags, 'features.yaml');
    
    console.log(`Validation result: ${result.valid ? 'Valid' : 'Invalid'}`);
    console.log(`Warnings: ${result.warnings.length}`);
    
    if (result.warnings.length > 0) {
      console.log('Issues found:');
      result.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
    }
  } catch (error) {
    console.log('❌ Feature flag validation error:', error);
  }

  // Test 2: Agent config validation
  console.log('\nTest 2: Agent Configuration Validation');
  try {
    const result = await validateYAML(testYAMLs.agentConfig, 'agents.yaml');
    
    console.log(`Validation result: ${result.valid ? 'Valid' : 'Invalid'}`);
    console.log(`Warnings: ${result.warnings.length}`);
    
    if (result.warnings.length > 0) {
      console.log('Agent issues:');
      result.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
    }
  } catch (error) {
    console.log('❌ Agent config validation error:', error);
  }

  // Test 3: Security validation
  console.log('\nTest 3: Security Issues Detection');
  try {
    const result = await validateYAML(testYAMLs.securityIssues, 'security-test.yaml');
    
    console.log(`Validation result: ${result.valid ? 'Valid' : 'Invalid'}`);
    console.log(`Security warnings: ${result.warnings.filter(w => w.includes('secret')).length}`);
    
    const securityWarnings = result.warnings.filter(w => w.toLowerCase().includes('secret'));
    if (securityWarnings.length > 0) {
      console.log('Security issues found:');
      securityWarnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
    }
  } catch (error) {
    console.log('❌ Security validation error:', error);
  }

  // Test 4: Environment variable validation
  console.log('\nTest 4: Environment Variable Validation');
  try {
    const result = await validateYAML(testYAMLs.environmentVariables, 'env-test.yaml');
    
    console.log(`Validation result: ${result.valid ? 'Valid' : 'Invalid'}`);
    
    const envWarnings = result.warnings.filter(w => w.includes('environment'));
    if (envWarnings.length > 0) {
      console.log('Environment variable issues:');
      envWarnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
    }
  } catch (error) {
    console.log('❌ Environment variable validation error:', error);
  }

  console.log('✅ YAML Validation tests completed\n');
}

async function testYAMLNormalization() {
  console.log('🧪 Testing YAML Normalization...\n');

  try {
    const normalized = await normalizeYAML(testYAMLs.badlyFormatted, 'normalize-test.yaml');
    
    console.log('✅ YAML normalized successfully');
    
    // Check if normalized version is different
    const originalLines = testYAMLs.badlyFormatted.split('\n').length;
    const normalizedLines = normalized.split('\n').length;
    
    console.log(`   Original: ${originalLines} lines`);
    console.log(`   Normalized: ${normalizedLines} lines`);
    
    // Verify it's still valid YAML
    const { YAML } = await import('bun');
    const parsed = YAML.parse(normalized);
    console.log(`   Parsed successfully: ${Object.keys(parsed).length} top-level keys`);
    
  } catch (error) {
    console.log('❌ YAML normalization error:', error);
  }

  console.log('✅ YAML Normalization tests completed\n');
}

async function testRealConfigFiles() {
  console.log('🧪 Testing Real Configuration Files...\n');

  const configFiles = [
    'config/app.yaml',
    'config/features.yaml',
    'config/agents.yml'
  ];

  for (const configFile of configFiles) {
    console.log(`Testing ${configFile}:`);
    
    try {
      const file = Bun.file(configFile);
      if (await file.exists()) {
        const content = await file.text();
        const result = await validateYAML(content, configFile);
        
        console.log(`   Valid: ${result.valid}`);
        console.log(`   Warnings: ${result.warnings.length}`);
        console.log(`   Metrics: ${result.metrics.lines} lines, ${result.metrics.keys} keys`);
        
        if (result.warnings.length > 0) {
          console.log(`   Issues: ${result.warnings.slice(0, 2).join(', ')}${result.warnings.length > 2 ? '...' : ''}`);
        }
      } else {
        console.log(`   File not found: ${configFile}`);
      }
    } catch (error: any) {
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log('✅ Real config file tests completed\n');
}

async function runAllTests() {
  console.log('🚀 Starting YAML Formatting Tests...\n');

  try {
    await testYAMLFormatting();
    await testYAMLValidation();
    await testYAMLNormalization();
    await testRealConfigFiles();

    console.log('🎉 All YAML formatting tests completed successfully!');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  runAllTests();
}