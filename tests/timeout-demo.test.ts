import { test, expect } from "bun:test";

test("Quick test - default timeout", () => {
  expect(true).toBe(true);
});

test("Medium delay - should pass", async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
  expect(true).toBe(true);
});

test("Custom short timeout", async () => {
  await new Promise(resolve => setTimeout(resolve, 50));
  expect(true).toBe(true);
}, 1000); // 1 second timeout

test("This will timeout with default 5s", async () => {
  // This would timeout after 5 seconds if we let it run
  await new Promise(resolve => setTimeout(resolve, 100));
  expect(true).toBe(true);
});

// Uncomment to see timeout failure:
// test("This will timeout quickly", async () => {
//   await new Promise(resolve => setTimeout(resolve, 200));
//   expect(true).toBe(true);
// }, 100); // 100ms timeout - will fail!