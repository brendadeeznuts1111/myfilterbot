#!/usr/bin/env bun
/**
 * YAML-Form Integration Demonstration
 * Shows complete bidirectional integration between YAML configs and forms
 */

import {
  yamlFormIntegration,
  registerYAMLForm,
  getYAMLForm,
  updateYAMLForm,
  validateYAMLForm,
  enableYAMLFormSync,
} from '../services/yaml-form-integration';
import { bunYAMLService } from '../services/bun-yaml-service';
import { parseFormSmart, buildForm, validateForm } from '../utils/form-utils';

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║              🔄 YAML-Form Integration Demo 🔄                    ║
║                                                                   ║
║  Showcasing bidirectional sync between:                         ║
║  • YAML configuration files                                      ║
║  • HTML form data                                                ║
║  • Live reload & validation                                      ║
║  • RESTful API management                                        ║
╚═══════════════════════════════════════════════════════════════════╝
`);

// ═══════════════════════════════════════════════════════════════
// Demo Configuration Setup
// ═══════════════════════════════════════════════════════════════

console.log('\n1️⃣  Setting up demo configuration files');
console.log('─────────────────────────────────────────────');

// Create demo YAML configurations
const appConfigYAML = `
app:
  name: "Trading Bot Demo"
  version: "2.1.0"
  environment: development
  debug: true

server:
  host: localhost
  port: 3000
  ssl: false
  cors:
    enabled: true
    origins: ["http://localhost:3000", "https://demo.example.com"]

features:
  trading: true
  analytics: true
  notifications: false
  backup: true

database:
  host: localhost
  port: 5432
  name: trading_bot
  ssl: false

notifications:
  email:
    enabled: true
    smtp_host: smtp.gmail.com
    smtp_port: 587
  telegram:
    enabled: false
    bot_token: ""
  discord:
    enabled: false
    webhook_url: ""

limits:
  max_connections: 100
  rate_limit: 1000
  timeout: 30000
  max_file_size: 10485760
`;

const userConfigYAML = `
profile:
  username: "demo_user"
  email: "demo@example.com"
  role: "admin"
  active: true
  created: "2024-01-01T00:00:00Z"

preferences:
  theme: "dark"
  language: "en"
  timezone: "UTC"
  notifications:
    - "email"
    - "push"

dashboard:
  layout: "grid"
  widgets:
    - "balance"
    - "trades"
    - "analytics"
    - "notifications"
  refresh_rate: 5000

trading:
  default_amount: 100.0
  auto_trade: false
  stop_loss: 5.0
  take_profit: 10.0
  strategies:
    - "dca"
    - "momentum"

api:
  keys:
    binance: ""
    coinbase: ""
  rate_limit: 60
  timeout: 10000
`;

// Save demo configs
await Bun.write('./temp/app-config.yaml', appConfigYAML);
await Bun.write('./temp/user-config.yaml', userConfigYAML);

console.log('✅ Demo YAML files created:');
console.log('   • temp/app-config.yaml');
console.log('   • temp/user-config.yaml');

// ═══════════════════════════════════════════════════════════════
// Schema Registration
// ═══════════════════════════════════════════════════════════════

console.log('\n2️⃣  Registering validation schemas');
console.log('─────────────────────────────────────────────');

// Register schemas for validation
bunYAMLService.registerSchema('app-config', {
  required: ['app', 'server'],
  properties: {
    app: {
      type: 'object',
      required: true,
      validate: value => value.name && value.version,
    },
    server: {
      type: 'object',
      required: true,
      validate: value => value.host && value.port,
    },
    features: {
      type: 'object',
      required: false,
    },
    database: {
      type: 'object',
      required: false,
    },
  },
});

bunYAMLService.registerSchema('user-config', {
  required: ['profile'],
  properties: {
    profile: {
      type: 'object',
      required: true,
      validate: value => value.username && value.email,
    },
    preferences: {
      type: 'object',
      required: false,
    },
    dashboard: {
      type: 'object',
      required: false,
    },
  },
});

console.log('✅ Validation schemas registered:');
console.log('   • app-config schema');
console.log('   • user-config schema');

// ═══════════════════════════════════════════════════════════════
// Configuration Registration
// ═══════════════════════════════════════════════════════════════

console.log('\n3️⃣  Registering configurations with form integration');
console.log('─────────────────────────────────────────────');

// Register app configuration
registerYAMLForm('app-config', {
  path: './temp/app-config.yaml',
  schema: bunYAMLService.schemas.get('app-config'),
  autoSave: true,
  validation: {
    required: ['app.name', 'server.host', 'server.port'],
    sanitize: true,
    allowedKeys: [
      'app.name',
      'app.version',
      'app.environment',
      'app.debug',
      'server.host',
      'server.port',
      'server.ssl',
      'features.trading',
      'features.analytics',
      'features.notifications',
      'database.host',
      'database.port',
      'database.name',
    ],
  },
  transform: {
    toForm: yamlData => {
      // Custom transformation: flatten with custom separator
      return bunYAMLService.flattenYAMLData(yamlData, '', '.');
    },
    toYAML: formData => {
      // Custom transformation: unflatten with validation
      const unflattened = bunYAMLService.unflattenFormData(formData);

      // Ensure numeric types for ports
      if (unflattened.server?.port) {
        unflattened.server.port = parseInt(unflattened.server.port, 10);
      }
      if (unflattened.database?.port) {
        unflattened.database.port = parseInt(unflattened.database.port, 10);
      }

      return unflattened;
    },
  },
});

// Register user configuration
registerYAMLForm('user-config', {
  path: './temp/user-config.yaml',
  schema: bunYAMLService.schemas.get('user-config'),
  autoSave: true,
  validation: {
    required: ['profile.username', 'profile.email'],
    sanitize: true,
  },
});

console.log('✅ Configurations registered with form integration:');
console.log('   • app-config (with custom transforms)');
console.log('   • user-config (with validation)');

// ═══════════════════════════════════════════════════════════════
// YAML to Form Conversion Demo
// ═══════════════════════════════════════════════════════════════

console.log('\n4️⃣  YAML to Form Conversion');
console.log('─────────────────────────────────────────────');

const appFormData = getYAMLForm('app-config');
const userFormData = getYAMLForm('user-config');

console.log('App config as form data (sample):');
console.log(
  JSON.stringify(
    {
      'app.name': appFormData?.['app.name'],
      'app.version': appFormData?.['app.version'],
      'server.host': appFormData?.['server.host'],
      'server.port': appFormData?.['server.port'],
      'features.trading': appFormData?.['features.trading'],
    },
    null,
    2
  )
);

console.log('\nUser config as form data (sample):');
console.log(
  JSON.stringify(
    {
      'profile.username': userFormData?.['profile.username'],
      'profile.email': userFormData?.['profile.email'],
      'profile.role': userFormData?.['profile.role'],
      'preferences.theme': userFormData?.['preferences.theme'],
    },
    null,
    2
  )
);

console.log('✅ YAML successfully converted to form-compatible format!');

// ═══════════════════════════════════════════════════════════════
// Form Data Manipulation & Validation
// ═══════════════════════════════════════════════════════════════

console.log('\n5️⃣  Form Data Manipulation & Validation');
console.log('─────────────────────────────────────────────');

// Simulate form updates
const updatedAppForm = {
  ...appFormData,
  'app.name': 'Updated Trading Bot',
  'app.version': '2.2.0',
  'server.port': 8080,
  'features.notifications': true,
  'limits.max_connections': 200,
};

const updatedUserForm = {
  ...userFormData,
  'profile.username': 'updated_user',
  'preferences.theme': 'light',
  'dashboard.refresh_rate': 3000,
  'trading.auto_trade': true,
};

// Validate form updates
const appValidation = validateYAMLForm('app-config', updatedAppForm);
const userValidation = validateYAMLForm('user-config', updatedUserForm);

console.log(
  'App config validation:',
  appValidation.valid ? '✅ VALID' : '❌ INVALID'
);
if (!appValidation.valid) {
  console.log('Errors:', JSON.stringify(appValidation.errors, null, 2));
}

console.log(
  'User config validation:',
  userValidation.valid ? '✅ VALID' : '❌ INVALID'
);
if (!userValidation.valid) {
  console.log('Errors:', JSON.stringify(userValidation.errors, null, 2));
}

// Update form data
if (appValidation.valid) {
  await updateYAMLForm('app-config', updatedAppForm);
  console.log('✅ App config updated from form data');
}

if (userValidation.valid) {
  await updateYAMLForm('user-config', updatedUserForm);
  console.log('✅ User config updated from form data');
}

// ═══════════════════════════════════════════════════════════════
// URL-Encoded Form Demo
// ═══════════════════════════════════════════════════════════════

console.log('\n6️⃣  URL-Encoded Form Handling');
console.log('─────────────────────────────────────────────');

// Create URL-encoded form data
const urlEncodedForm = buildForm({
  'app.name': 'Form Submitted Bot',
  'app.environment': 'production',
  'server.port': '9000',
  'features.trading': 'true',
  'features.analytics': 'false',
  'database.host': 'prod-db.example.com',
  'notifications.email.enabled': 'true',
  'notifications.telegram.enabled': 'false',
});

console.log('URL-encoded form data:');
console.log(urlEncodedForm);

// Parse and update from URL-encoded data
const parsedFormData = parseFormSmart(urlEncodedForm);
console.log('\nParsed form data (with type coercion):');
console.log(JSON.stringify(parsedFormData, null, 2));

// Update configuration from URL-encoded form
const urlFormValidation = validateYAMLForm('app-config', parsedFormData);
if (urlFormValidation.valid) {
  await updateYAMLForm('app-config', parsedFormData);
  console.log('✅ Config updated from URL-encoded form!');
}

// ═══════════════════════════════════════════════════════════════
// Live Sync Demonstration
// ═══════════════════════════════════════════════════════════════

console.log('\n7️⃣  Live Sync Demonstration');
console.log('─────────────────────────────────────────────');

// Enable live sync with custom options
enableYAMLFormSync('app-config', {
  bidirectional: true,
  debounce: 1000,
  validate: true,
  sanitize: true,
});

enableYAMLFormSync('user-config', {
  bidirectional: true,
  debounce: 500,
  validate: true,
  sanitize: false,
});

console.log('✅ Live sync enabled for both configurations');

// Set up event listeners to demonstrate sync
yamlFormIntegration.on('yaml-form:live:yaml-changed', ({ name, yamlData }) => {
  console.log(`📁 YAML file changed: ${name}`);
  console.log('   New data keys:', Object.keys(yamlData).join(', '));
});

yamlFormIntegration.on('yaml-form:live:form-synced', ({ name }) => {
  console.log(`📝 Form data synced to YAML: ${name}`);
});

yamlFormIntegration.on('yaml-form:live:error', ({ name, error }) => {
  console.log(`❌ Live sync error for ${name}:`, error);
});

// Simulate external YAML file modification
console.log('\n🔄 Simulating external YAML file modification...');
setTimeout(async () => {
  const currentAppConfig = await bunYAMLService.loadYAML(
    './temp/app-config.yaml'
  );
  currentAppConfig.app.name = 'Externally Modified Bot';
  currentAppConfig.server.port = 7777;
  currentAppConfig.features.backup = false;

  await bunYAMLService.saveYAML('./temp/app-config.yaml', currentAppConfig);
  console.log('✅ External YAML modification completed');
}, 2000);

// Simulate form data updates that should sync to YAML
setTimeout(async () => {
  console.log('\n📝 Simulating form data updates...');

  const currentFormData = getYAMLForm('user-config');
  if (currentFormData) {
    currentFormData['profile.username'] = 'sync_test_user';
    currentFormData['preferences.language'] = 'es';
    currentFormData['dashboard.layout'] = 'list';

    await updateYAMLForm('user-config', currentFormData);
    console.log('✅ Form data updates submitted');
  }
}, 4000);

// ═══════════════════════════════════════════════════════════════
// Import/Export Demo
// ═══════════════════════════════════════════════════════════════

console.log('\n8️⃣  Import/Export Capabilities');
console.log('─────────────────────────────────────────────');

// Export YAML as form data
const exportedAppForm = yamlFormIntegration.getFormDataAsString('app-config');
console.log('Exported app config as URL-encoded form:');
console.log(exportedAppForm.slice(0, 200) + '...');

// Export YAML as YAML string
const exportedAppYAML = yamlFormIntegration.exportFormAsYAML('app-config');
console.log('\nExported app config as YAML:');
console.log(exportedAppYAML.split('\n').slice(0, 10).join('\n') + '\n...');

// Import from YAML string
const importYAML = `
app:
  name: "Imported Configuration"
  version: "1.0.0"
  environment: "test"

server:
  host: "imported.example.com"
  port: 5000
  ssl: true
`;

try {
  await yamlFormIntegration.importYAMLToForm('app-config', importYAML);
  console.log('✅ YAML successfully imported to form data');

  const importedFormData = getYAMLForm('app-config');
  console.log('Imported form data sample:', {
    'app.name': importedFormData?.['app.name'],
    'server.host': importedFormData?.['server.host'],
    'server.ssl': importedFormData?.['server.ssl'],
  });
} catch (error) {
  console.log('❌ Import failed:', error);
}

// ═══════════════════════════════════════════════════════════════
// Performance & Statistics
// ═══════════════════════════════════════════════════════════════

setTimeout(() => {
  console.log('\n9️⃣  Performance & Statistics');
  console.log('─────────────────────────────────────────────');

  // Get cache statistics
  const cacheStats = bunYAMLService.getCacheStats();
  console.log('YAML cache statistics:');
  console.log(`  • Cache size: ${cacheStats.size} entries`);
  console.log(
    `  • Cache entries: ${cacheStats.entries.map(e => e.path).join(', ')}`
  );

  // Get registered configurations
  const registeredConfigs = yamlFormIntegration.getRegisteredConfigs();
  console.log(`\nRegistered configurations: ${registeredConfigs.length}`);
  registeredConfigs.forEach(name => {
    const config = yamlFormIntegration.getConfigDetails(name);
    console.log(`  • ${name}: ${config?.path} (autoSave: ${config?.autoSave})`);
  });

  // Performance test
  console.log('\n⚡ Performance test - 100 form conversions:');
  const start = performance.now();

  for (let i = 0; i < 100; i++) {
    const yamlData = { test: `iteration_${i}`, value: i, active: i % 2 === 0 };
    const formData = yamlFormIntegration.yamlToForm(yamlData);
    const backToYAML = yamlFormIntegration.formToYAML(formData);
  }

  const end = performance.now();
  console.log(
    `✅ Completed in ${(end - start).toFixed(2)}ms (${((end - start) / 100).toFixed(3)}ms per conversion)`
  );
}, 6000);

// ═══════════════════════════════════════════════════════════════
// Cleanup and Summary
// ═══════════════════════════════════════════════════════════════

setTimeout(() => {
  console.log('\n🔟 Demo Summary');
  console.log('─────────────────────────────────────────────');

  console.log('Integration features demonstrated:');
  console.log('• ✅ YAML ↔ Form bidirectional conversion');
  console.log('• ✅ Schema validation and type coercion');
  console.log('• ✅ Live file watching and sync');
  console.log('• ✅ URL-encoded form handling');
  console.log('• ✅ Custom transformation functions');
  console.log('• ✅ Import/Export capabilities');
  console.log('• ✅ Event-driven architecture');
  console.log('• ✅ Performance optimization');
  console.log('• ✅ Error handling and validation');
  console.log('• ✅ Zero external dependencies');

  console.log('\n🎉 YAML-Form Integration Demo Complete!');
  console.log(
    '═════════════════════════════════════════════════════════════════════'
  );
  console.log(
    'Your YAML configs are now fully integrated with form utilities! 🚀'
  );

  // Cleanup
  yamlFormIntegration.disableLiveSync('app-config');
  yamlFormIntegration.disableLiveSync('user-config');

  setTimeout(() => {
    process.exit(0);
  }, 1000);
}, 8000);

export {}; // Make this a module
