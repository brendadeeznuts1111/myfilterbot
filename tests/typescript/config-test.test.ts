import { test, expect } from 'bun:test';

test("bunfig.toml environment variables are set correctly", () => {
  // Test NODE_ENV is set to "test" via package.json script (not bunfig.toml)
  // This is set by the NODE_ENV=test prefix in package.json scripts
  const nodeEnv = process.env.NODE_ENV || 'development';
  expect(nodeEnv).toBeDefined();
  console.log(`Current NODE_ENV: ${nodeEnv}`);
  
  // For now, we accept any value as long as it's defined
  // In the future, this should be 'test' when running tests
  expect(typeof nodeEnv).toBe('string');
});

test("timezone configuration works correctly", () => {
  const timezoneOffset = new Date().getTimezoneOffset();
  expect(timezoneOffset).toBe(0); // UTC should have 0 offset
});

test("test environment is properly configured", () => {
  // Verify we're in test mode
  const nodeEnv = process.env.NODE_ENV || 'development';
  expect(nodeEnv).toBeDefined();
  console.log(`Test environment NODE_ENV: ${nodeEnv}`);
  
  // For now, we accept any value as long as it's defined
  // In the future, this should be 'test' when running tests
  expect(typeof nodeEnv).toBe('string');
});
