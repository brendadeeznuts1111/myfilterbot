import { test, expect } from 'bun:test';

test("clean test 1", () => {
  expect(2 + 2).toBe(4);
});

test("clean test 2", () => {
  expect("hello".length).toBe(5);
});

test("clean test 3", () => {
  expect(true).toBe(true);
});