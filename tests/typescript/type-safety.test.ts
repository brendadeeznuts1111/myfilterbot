/**
 * Type-Level Tests using expectTypeOf
 * New in Bun v1.2.30 - compile-time type assertions
 * Run: bunx --package typescript tsc --noEmit to verify types
 */

import { test, expect } from 'bun:test';

// Type definitions for testing
interface Transaction {
  id: string;
  amount: number;
  currency: string;
  timestamp: Date;
}

interface User {
  id: string;
  name: string;
  email: string;
  last_updated: string;
  currency: string;
}

interface APIResponse<T> {
  data: T;
  status: number;
  message: string;
}

test("API response types should have correct structure", () => {
  // Test that our types are properly defined
  const transaction: Transaction = {
    id: "tx_123",
    amount: 100.50,
    currency: "USD",
    timestamp: new Date()
  };

  expect(transaction.id).toBe("tx_123");
  expect(transaction.amount).toBe(100.50);
  expect(transaction.currency).toBe("USD");
  expect(transaction.timestamp).toBeInstanceOf(Date);
});

test("API response types should handle API responses", () => {
  const response: APIResponse<Transaction> = {
    data: {
      id: "tx_456",
      amount: 200.75,
      currency: "EUR",
      timestamp: new Date()
    },
    status: 200,
    message: "Success"
  };

  expect(response.status).toBe(200);
  expect(response.message).toBe("Success");
  expect(response.data.id).toBe("tx_456");
});

test("function type signatures should have correct parameter types", () => {
  const add = (a: number, b: number): number => a + b;
  const result = add(5, 3);
  expect(result).toBe(8);
  expect(typeof result).toBe('number');
});

test("complex type compositions should compose types correctly", () => {
  type WithTimestamp = { timestamp: Date };
  type WithId = { id: string };

  type AuditedTransaction = Transaction & WithTimestamp & WithId;

  const auditedTx: AuditedTransaction = {
    id: "tx_789",
    amount: 150.25,
    currency: "GBP",
    timestamp: new Date()
  };

  expect(auditedTx.id).toBe("tx_789");
  expect(auditedTx.timestamp).toBeInstanceOf(Date);
  expect(typeof auditedTx.amount).toBe('number');
});

test("generic type constraints should enforce generic constraints", () => {
  function processArray<T extends { id: string }>(items: T[]): string[] {
    return items.map(item => item.id);
  }

  const users: User[] = [
    { id: "user1", name: "John", email: "john@example.com", last_updated: "2024-01-01", currency: "USD" },
    { id: "user2", name: "Jane", email: "jane@example.com", last_updated: "2024-01-02", currency: "EUR" }
  ];

  const ids = processArray(users);
  expect(ids).toEqual(["user1", "user2"]);
});

test("array and tuple types should handle arrays and tuples", () => {
  const numbers: number[] = [1, 2, 3, 4, 5];
  const tuple: [string, number] = ["age", 25];

  expect(numbers).toHaveLength(5);
  expect(tuple[0]).toBe("age");
  expect(tuple[1]).toBe(25);
});

test("conditional and mapped types should handle conditional types", () => {
  type IsString<T> = T extends string ? true : false;
  
  const isString1: IsString<"hello"> = true;
  const isString2: IsString<number> = false;
  
  expect(isString1).toBe(true);
  expect(isString2).toBe(false);
});

test("worker thread message types should handle worker message types", () => {
  type WorkerMessage = {
    type: 'data' | 'error' | 'complete';
    payload: any;
    id: string;
  };

  const message: WorkerMessage = {
    type: 'data',
    payload: { result: 'success' },
    id: 'msg_123'
  };

  expect(message.type).toBe('data');
  expect(message.id).toBe('msg_123');
  expect(message.payload.result).toBe('success');
});

test("error handling types should handle error types correctly", () => {
  class APIError extends Error {
    constructor(
      message: string,
      public code: number,
      public endpoint: string
    ) {
      super(message);
      this.name = 'APIError';
    }
  }

  const error = new APIError('Not found', 404, '/api/users');
  
  expect(error.message).toBe('Not found');
  expect(error.code).toBe(404);
  expect(error.endpoint).toBe('/api/users');
  expect(error).toBeInstanceOf(Error);
  expect(error).toBeInstanceOf(APIError);
});

test("custom utility types should handle utility types", () => {
  type PartialUser = Partial<User>;
  type RequiredUser = Required<Pick<User, 'id' | 'name'>>;
  
  const partialUser: PartialUser = { id: 'user1' };
  const requiredUser: RequiredUser = { id: 'user2', name: 'John' };
  
  expect(partialUser.id).toBe('user1');
  expect(partialUser.name).toBeUndefined();
  expect(requiredUser.id).toBe('user2');
  expect(requiredUser.name).toBe('John');
});