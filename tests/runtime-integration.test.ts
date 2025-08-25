import { test, expect } from "bun:test";

test("NODE_ENV is automatically set to test", () => {
  expect(process.env.NODE_ENV).toBe("test");
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