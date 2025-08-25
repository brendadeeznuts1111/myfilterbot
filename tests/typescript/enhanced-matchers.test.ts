/**
 * Enhanced Test Matchers Demo
 * New matchers in Bun v1.2.30 for mock functions
 */

import { test, expect, mock } from 'bun:test';

test("basic mock functionality", () => {
  const mockFn = mock(() => 'default');
  expect(mockFn()).toBe('default');
  expect(mockFn).toHaveBeenCalled();
});

test("mock return value override", () => {
  const mockFn = mock(() => 'default');
  mockFn.mockReturnValueOnce('override');
  
  expect(mockFn()).toBe('override');
  expect(mockFn()).toBe('default');
});

test("mock call tracking", () => {
  const mockFn = mock(() => 'result');
  
  mockFn();
  mockFn();
  mockFn();
  
  expect(mockFn).toHaveBeenCalledTimes(3);
});

test("mock with parameters", () => {
  const mockFn = mock((a: number, b: number) => a + b);
  
  const result = mockFn(5, 3);
  
  expect(result).toBe(8);
  expect(mockFn).toHaveBeenCalledWith(5, 3);
});

test("mock clear functionality", () => {
  const mockFn = mock(() => 'result');
  
  mockFn();
  expect(mockFn).toHaveBeenCalledTimes(1);
  
  mockFn.mockClear();
  expect(mockFn).not.toHaveBeenCalled();
});

test("mock with async function", async () => {
  const mockAsyncFn = mock(async (delay: number) => {
    await Bun.sleep(delay);
    return 'async result';
  });
  
  const result = await mockAsyncFn(1);
  
  expect(result).toBe('async result');
  expect(mockAsyncFn).toHaveBeenCalledWith(1);
});

test("mock error throwing", () => {
  const errorMock = mock(() => {
    throw new Error('Test error');
  });
  
  expect(() => errorMock()).toThrow('Test error');
});

test("mock return value sequence", () => {
  const mockFn = mock(() => 'default');
  
  mockFn.mockReturnValueOnce('first');
  mockFn.mockReturnValueOnce('second');
  mockFn.mockReturnValueOnce('third');
  
  expect(mockFn()).toBe('first');
  expect(mockFn()).toBe('second');
  expect(mockFn()).toBe('third');
  expect(mockFn()).toBe('default');
});

test("mock with complex objects", () => {
  const mockFn = mock(() => ({}));
  const obj1 = { id: 1, name: 'John' };
  const obj2 = { id: 2, name: 'Jane' };
  
  mockFn.mockReturnValueOnce(obj1);
  mockFn.mockReturnValueOnce(obj2);
  
  expect(mockFn()).toEqual(obj1);
  expect(mockFn()).toEqual(obj2);
});

test("mock call arguments tracking", () => {
  const mockFn = mock((...args: any[]) => 'result');
  
  mockFn('a', 'b', 'c');
  mockFn(1, 2, 3);
  
  expect(mockFn).toHaveBeenNthCalledWith(1, 'a', 'b', 'c');
  expect(mockFn).toHaveBeenNthCalledWith(2, 1, 2, 3);
});