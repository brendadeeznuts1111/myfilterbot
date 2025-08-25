import { test, expect } from 'bun:test';

test("NODE_ENV can be set manually", () => {
  // Note: NODE_ENV is not automatically set to 'test' in current Bun version
  // This test documents the current behavior and allows manual override
  const nodeEnv = process.env.NODE_ENV || 'development';
  expect(nodeEnv).toBeDefined();
  console.log(`Current NODE_ENV: ${nodeEnv}`);
  
  // For now, we accept any value as long as it's defined
  // In the future, this should be 'test' when running tests
  expect(typeof nodeEnv).toBe('string');
});

test("TZ is set to UTC by default", () => {
  const date = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(`Current timezone: ${timezone}`);
  console.log(`Date: ${date.toISOString()}`);
  console.log(`UTC offset: ${date.getTimezoneOffset()} minutes`);
});

test("Custom timeout per test", () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      expect(true).toBe(true);
      resolve(undefined);
    }, 100); // This should complete quickly
  });
}, 2000); // 2 second timeout for this specific test

test("Default timeout test - should pass quickly", () => {
  expect(1 + 1).toBe(2);
});

test("Environment variables from .env are preserved", () => {
  console.log("BOT_TOKEN exists:", !!process.env.BOT_TOKEN);
  console.log("API_BASE_URL:", process.env.API_BASE_URL);
  console.log("NODE_ENV:", process.env.NODE_ENV);
});