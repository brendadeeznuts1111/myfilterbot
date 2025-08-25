/**
 * Enhanced Test Matchers Demo
 * New matchers in Bun v1.2.30 for mock functions
 */

import { test, expect, mock, beforeEach } from 'bun:test';

// Test the new mock return value matchers
test('toHaveReturnedWith matcher', () => {
  const calculateTotal = mock((items: number[]) => {
    return items.reduce((sum, item) => sum + item, 0);
  });
  
  calculateTotal([10, 20, 30]);
  calculateTotal([5, 5]);
  
  // Check if the mock returned specific values
  expect(calculateTotal).toHaveReturnedWith(60);
  expect(calculateTotal).toHaveReturnedWith(10);
  expect(calculateTotal).not.toHaveReturnedWith(100);
});

test('toHaveLastReturnedWith matcher', () => {
  const getStatus = mock((code: number) => {
    if (code >= 200 && code < 300) return 'success';
    if (code >= 400 && code < 500) return 'client_error';
    if (code >= 500) return 'server_error';
    return 'unknown';
  });
  
  getStatus(200);
  getStatus(404);
  getStatus(500);
  
  // Check the last return value
  expect(getStatus).toHaveLastReturnedWith('server_error');
  expect(getStatus).not.toHaveLastReturnedWith('success');
});

test('toHaveNthReturnedWith matcher', () => {
  const fibonacci = mock((n: number): number => {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  });
  
  fibonacci(5);  // Returns 5
  fibonacci(6);  // Returns 8
  fibonacci(7);  // Returns 13
  
  // Check specific call return values (1-indexed)
  expect(fibonacci).toHaveNthReturnedWith(1, 5);
  expect(fibonacci).toHaveNthReturnedWith(2, 8);
  expect(fibonacci).toHaveNthReturnedWith(3, 13);
});

// Test with complex objects and deep equality
test('return value matchers with objects', () => {
  const createUser = mock((name: string, age: number) => ({
    id: Math.random().toString(36),
    name,
    age,
    createdAt: new Date().toISOString()
  }));
  
  const user1 = createUser('Alice', 30);
  const user2 = createUser('Bob', 25);
  
  // Deep equality checking
  expect(createUser).toHaveReturnedWith(
    expect.objectContaining({
      name: 'Alice',
      age: 30
    })
  );
  
  expect(createUser).toHaveLastReturnedWith(
    expect.objectContaining({
      name: 'Bob',
      age: 25
    })
  );
});

// Test with async functions
test('return value matchers with async functions', async () => {
  const fetchData = mock(async (url: string) => {
    await Bun.sleep(10); // Simulate network delay
    return {
      url,
      data: `Data from ${url}`,
      timestamp: Date.now()
    };
  });
  
  const result1 = await fetchData('/api/users');
  const result2 = await fetchData('/api/posts');
  
  expect(fetchData).toHaveReturnedWith(result1);
  expect(fetchData).toHaveReturnedWith(result2);
  expect(fetchData).toHaveLastReturnedWith(result2);
});

// Test mock.clearAllMocks()
test('mock.clearAllMocks() functionality', () => {
  const fn1 = mock(() => 'result1');
  const fn2 = mock(() => 'result2');
  const fn3 = mock(() => 'result3');
  
  // Call all mocks
  fn1();
  fn2();
  fn2(); // Called twice
  fn3();
  
  expect(fn1).toHaveBeenCalledTimes(1);
  expect(fn2).toHaveBeenCalledTimes(2);
  expect(fn3).toHaveBeenCalledTimes(1);
  
  // Clear all mocks at once
  mock.clearAllMocks();
  
  expect(fn1).toHaveBeenCalledTimes(0);
  expect(fn2).toHaveBeenCalledTimes(0);
  expect(fn3).toHaveBeenCalledTimes(0);
  
  // Implementations are preserved
  expect(fn1()).toBe('result1');
  expect(fn2()).toBe('result2');
  expect(fn3()).toBe('result3');
  
  expect(fn1).toHaveBeenCalledTimes(1);
  expect(fn2).toHaveBeenCalledTimes(1);
  expect(fn3).toHaveBeenCalledTimes(1);
});

// Test with error throwing
test('return value matchers with errors', () => {
  const riskyOperation = mock((shouldFail: boolean) => {
    if (shouldFail) {
      throw new Error('Operation failed');
    }
    return 'success';
  });
  
  expect(() => riskyOperation(true)).toThrow('Operation failed');
  const result = riskyOperation(false);
  
  expect(riskyOperation).toHaveReturnedWith('success');
  expect(riskyOperation).toHaveLastReturnedWith('success');
  expect(riskyOperation).toHaveBeenCalledTimes(2);
});

// Test with different return types
test('return value matchers with mixed types', () => {
  const polymorphicFn = mock((type: string) => {
    switch (type) {
      case 'number': return 42;
      case 'string': return 'hello';
      case 'boolean': return true;
      case 'array': return [1, 2, 3];
      case 'object': return { key: 'value' };
      default: return null;
    }
  });
  
  polymorphicFn('number');
  polymorphicFn('string');
  polymorphicFn('boolean');
  polymorphicFn('array');
  polymorphicFn('object');
  polymorphicFn('unknown');
  
  expect(polymorphicFn).toHaveReturnedWith(42);
  expect(polymorphicFn).toHaveReturnedWith('hello');
  expect(polymorphicFn).toHaveReturnedWith(true);
  expect(polymorphicFn).toHaveReturnedWith([1, 2, 3]);
  expect(polymorphicFn).toHaveReturnedWith({ key: 'value' });
  expect(polymorphicFn).toHaveReturnedWith(null);
  expect(polymorphicFn).toHaveLastReturnedWith(null);
  
  // Check specific positions
  expect(polymorphicFn).toHaveNthReturnedWith(1, 42);
  expect(polymorphicFn).toHaveNthReturnedWith(2, 'hello');
  expect(polymorphicFn).toHaveNthReturnedWith(6, null);
});

// Test with mock clearing between tests
test('mock clearing between tests - test 1', () => {
  const apiCall = mock(() => 'api response');
  const dbQuery = mock(() => 'db result');
  
  apiCall();
  expect(apiCall).toHaveBeenCalledTimes(1);
  expect(dbQuery).toHaveBeenCalledTimes(0);
  
  // Clear all mocks
  mock.clearAllMocks();
  
  expect(apiCall).toHaveBeenCalledTimes(0);
  expect(dbQuery).toHaveBeenCalledTimes(0);
});

test('mock clearing between tests - test 2', () => {
  const apiCall = mock(() => 'api response');
  const dbQuery = mock(() => 'db result');
  
  // Start fresh with new mocks
  dbQuery();
  expect(apiCall).toHaveBeenCalledTimes(0);
  expect(dbQuery).toHaveBeenCalledTimes(1);
  
  // Clear all mocks
  mock.clearAllMocks();
  
  // Verify cleared
  expect(apiCall).toHaveBeenCalledTimes(0);
  expect(dbQuery).toHaveBeenCalledTimes(0);
  
  // Can still use the mocks
  apiCall();
  dbQuery();
  expect(apiCall).toHaveBeenCalledTimes(1);
  expect(dbQuery).toHaveBeenCalledTimes(1);
});