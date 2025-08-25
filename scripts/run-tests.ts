#!/usr/bin/env bun

/**
 * Test Runner Script
 * Ensures proper environment setup for running tests
 */

import { spawn } from 'child_process';

console.log('🧪 Starting test suite with proper environment...');

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Run the test command
const testProcess = spawn('bun', ['test'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test'
  }
});

testProcess.on('close', (code) => {
  console.log(`\n🎯 Test suite completed with exit code: ${code}`);
  process.exit(code || 0);
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error);
  process.exit(1);
});
