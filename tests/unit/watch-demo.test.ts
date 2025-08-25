/**
 * Watch Mode Demonstration Test
 * This test demonstrates Bun's fast test watching capabilities
 */

import { test, expect, describe } from 'bun:test';

describe('Watch Mode Demo', () => {
  test('should pass basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle string operations', () => {
    const text = 'Bun test watch mode';
    expect(text).toContain('Bun');
    expect(text).toHaveLength(19);
  });

  test('should verify Bun environment', () => {
    expect(typeof Bun).toBe('object');
    expect(Bun.version).toBeDefined();
  });

  test('should handle async operations', async () => {
    const result = await new Promise(resolve => {
      setTimeout(() => resolve('async success'), 10);
    });
    expect(result).toBe('async success');
  });

  test('should validate performance', () => {
    const start = performance.now();
    const arr = Array.from({length: 1000}, (_, i) => i);
    const sum = arr.reduce((acc, val) => acc + val, 0);
    const end = performance.now();
    
    expect(sum).toBe(499500); // Sum of 0 to 999
    expect(end - start).toBeLessThan(100); // Should be very fast
  });
});