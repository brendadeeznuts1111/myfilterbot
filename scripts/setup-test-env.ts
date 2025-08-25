#!/usr/bin/env bun

/**
 * Test Environment Setup Script
 * Ensures proper configuration for running tests
 */

import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🔧 Setting up test environment...');

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Create test environment file if it doesn't exist
const testEnvPath = join(import.meta.dir, '../.env.test');
if (!existsSync(testEnvPath)) {
  const testEnvContent = `# Test Environment Variables
NODE_ENV=test
BOT_HOST=localhost
BOT_PORT=8081
ADMIN_HOST=localhost
ADMIN_PORT=3001
API_HOST=localhost
API_PORT=3002
WS_PORT=3003
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_fantdev_trading
DB_USER=test_user
DB_PASS=test_password
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASS=
JWT_SECRET=test-jwt-secret-key-for-testing-only
ENCRYPTION_KEY=test-encryption-key-32-chars-long
TELEGRAM_BOT_TOKEN=test-bot-token-1234567890
TELEGRAM_WEBHOOK_URL=http://localhost:3001/webhook
TELEGRAM_API_ID=12345
TELEGRAM_API_HASH=test-api-hash-32-chars-long
TELEGRAM_ADMIN_CHAT_ID=123456789
CLOUDFLARE_ACCOUNT_ID=test-account-id
CLOUDFLARE_API_TOKEN=test-api-token
CLOUDFLARE_WORKER_NAME=test-worker
CLOUDFLARE_KV_NAMESPACE=test-namespace
FIREBASE_PROJECT_ID=test-project-id
`;

  writeFileSync(testEnvPath, testEnvContent);
  console.log('✅ Created .env.test file');
}

// Create test database directory if it doesn't exist
const testDbDir = join(import.meta.dir, '../test-db');
if (!existsSync(testDbDir)) {
  const { mkdirSync } = await import('fs');
  mkdirSync(testDbDir, { recursive: true });
  console.log('✅ Created test-db directory');
}

// Create test cache directory if it doesn't exist
const testCacheDir = join(import.meta.dir, '../test-cache');
if (!existsSync(testCacheDir)) {
  const { mkdirSync } = await import('fs');
  mkdirSync(testCacheDir, { recursive: true });
  console.log('✅ Created test-cache directory');
}

// Verify test configuration
const { YAML } = await import('bun');
const configPath = join(import.meta.dir, '../config/environments/test.yaml');

if (existsSync(configPath)) {
  try {
    const config = YAML.parse(await Bun.file(configPath).text());
    console.log('✅ Test configuration loaded successfully');
    console.log(`   App: ${config.app.name}`);
    console.log(`   Environment: ${config.app.environment}`);
    console.log(`   Database: ${config.database.primary.type}`);
  } catch (error) {
    console.error('❌ Failed to load test configuration:', error);
    process.exit(1);
  }
} else {
  console.error('❌ Test configuration file not found:', configPath);
  process.exit(1);
}

console.log('🎉 Test environment setup complete!');
console.log('   Run tests with: bun run test:ts');
