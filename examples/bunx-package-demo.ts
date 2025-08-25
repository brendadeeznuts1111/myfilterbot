#!/usr/bin/env bun
/**
 * Bunx --package Demo Script
 * Demonstrates the new --package flag support with User-Agent customization
 */

console.log('🚀 Bunx --package Demo');
console.log('========================');
console.log();

console.log('📦 New Features Available:');
console.log('✅ --package flag support for bunx');
console.log('✅ Multiple binary support');
console.log('✅ Scoped package support');
console.log('✅ User-Agent customization');
console.log();

console.log('🔧 Example Commands:');
console.log();

console.log('1. TypeScript Compiler:');
console.log(
  '   bunx --package typescript --user-agent "Fantdev-Build/2.2.0" tsc --noEmit'
);
console.log();

console.log('2. ESLint Linting:');
console.log(
  '   bunx --package eslint --user-agent "Fantdev-Lint/2.2.0" eslint src/'
);
console.log();

console.log('3. Prettier Formatting:');
console.log(
  '   bunx --package prettier --user-agent "Fantdev-Format/2.2.0" prettier --write src/'
);
console.log();

console.log('4. Renovate Config Validation:');
console.log('   bunx --package renovate renovate-config-validator');
console.log();

console.log('5. Angular CLI:');
console.log(
  '   bunx -p @angular/cli --user-agent "Fantdev-CLI/2.2.0" ng new my-app'
);
console.log();

console.log('6. Wrangler Deployment:');
console.log(
  '   bunx --package wrangler --user-agent "Fantdev-Deploy/2.2.0" wrangler deploy'
);
console.log();

console.log('💡 Benefits:');
console.log('• Reliable package execution');
console.log('• Multiple binary support');
console.log('• Scoped package support');
console.log('• Custom User-Agent identification');
console.log('• Better CI/CD integration');
console.log();

console.log('🎯 Use Cases:');
console.log('• Development workflows');
console.log('• CI/CD pipelines');
console.log('• Package management');
console.log('• Service identification');
console.log('• Monitoring and debugging');
console.log();

console.log('✅ Demo completed!');
console.log(
  'Try running the example commands above to see the new features in action.'
);
console.log();
console.log('📚 For more information, see:');
console.log('• docs/USER_AGENT_CUSTOMIZATION.md');
console.log('• README.md');
console.log('• https://bun.sh/docs/cli/bunx');
