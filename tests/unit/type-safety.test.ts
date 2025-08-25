/**
 * Type-Level Tests using expectTypeOf
 * New in Bun v1.2.30 - compile-time type assertions
 * Run: bunx --package typescript tsc --noEmit to verify types
 */

import { test, expectTypeOf } from 'bun:test';
import type { 
  CustomerBalance, 
  Transaction, 
  AdminTask,
  APIResponse 
} from '../../src/shared/types';

// Test API Response Types
test('API response types', () => {
  // Basic type assertions
  expectTypeOf<CustomerBalance>().toMatchTypeOf<{
    current: number;
    weekly_pnl: number;
    last_updated: string;
    currency: string;
  }>();
  
  // Transaction type structure
  expectTypeOf<Transaction>().toHaveProperty('id').toBeString();
  expectTypeOf<Transaction>().toHaveProperty('amount').toBeNumber();
  expectTypeOf<Transaction>().toHaveProperty('type').toEqualTypeOf<'deposit' | 'withdrawal' | 'trade' | 'bonus'>();
  
  // API Response wrapper
  type TestResponse = APIResponse<CustomerBalance>;
  expectTypeOf<TestResponse>().toHaveProperty('data').toMatchTypeOf<CustomerBalance | null>();
  expectTypeOf<TestResponse>().toHaveProperty('error').toMatchTypeOf<string | null>();
  expectTypeOf<TestResponse>().toHaveProperty('loading').toBeBoolean();
});

// Test Function Parameter and Return Types
test('function type signatures', () => {
  // Helper function types
  function processTransaction(tx: Transaction): Promise<boolean> {
    return Promise.resolve(true);
  }
  
  expectTypeOf(processTransaction).parameters.toEqualTypeOf<[Transaction]>();
  expectTypeOf(processTransaction).returns.toEqualTypeOf<Promise<boolean>>();
  expectTypeOf(processTransaction).toBeFunction();
  
  // Async function with multiple parameters
  async function updateBalance(
    customerId: string,
    amount: number,
    currency?: 'USD' | 'EUR'
  ): Promise<CustomerBalance> {
    return {
      current: amount,
      weekly_pnl: 0,
      last_updated: new Date().toISOString(),
      currency: currency || 'USD'
    };
  }
  
  expectTypeOf(updateBalance).parameters.items.toMatchTypeOf([
    expectTypeOf<string>(),
    expectTypeOf<number>(),
    expectTypeOf<'USD' | 'EUR' | undefined>()
  ]);
  expectTypeOf(updateBalance).returns.resolves.toMatchTypeOf<CustomerBalance>();
});

// Test Union and Intersection Types
test('complex type compositions', () => {
  type Status = 'pending' | 'approved' | 'rejected';
  type WithTimestamp = { timestamp: Date };
  type WithId = { id: string };
  
  type AuditedTransaction = Transaction & WithTimestamp & WithId;
  
  expectTypeOf<AuditedTransaction>().toMatchTypeOf<Transaction>();
  expectTypeOf<AuditedTransaction>().toHaveProperty('timestamp').toEqualTypeOf<Date>();
  expectTypeOf<AuditedTransaction>().toHaveProperty('id').toBeString();
  
  // Union type narrowing
  type Result<T> = { success: true; data: T } | { success: false; error: string };
  
  const successResult: Result<number> = { success: true, data: 42 };
  const errorResult: Result<number> = { success: false, error: 'Failed' };
  
  if (successResult.success) {
    expectTypeOf(successResult.data).toBeNumber();
  }
  
  if (!errorResult.success) {
    expectTypeOf(errorResult.error).toBeString();
  }
});

// Test Generic Types
test('generic type constraints', () => {
  // Generic cache interface
  interface Cache<T> {
    get(key: string): T | undefined;
    set(key: string, value: T): void;
    has(key: string): boolean;
  }
  
  class MemoryCache<T> implements Cache<T> {
    private store = new Map<string, T>();
    
    get(key: string): T | undefined {
      return this.store.get(key);
    }
    
    set(key: string, value: T): void {
      this.store.set(key, value);
    }
    
    has(key: string): boolean {
      return this.store.has(key);
    }
  }
  
  const numberCache = new MemoryCache<number>();
  expectTypeOf(numberCache.get).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(numberCache.get).returns.toEqualTypeOf<number | undefined>();
  expectTypeOf(numberCache.set).parameters.toEqualTypeOf<[string, number]>();
});

// Test Array and Tuple Types
test('array and tuple types', () => {
  // Fixed-length tuple
  type Point3D = [x: number, y: number, z: number];
  expectTypeOf<Point3D>().toEqualTypeOf<[number, number, number]>();
  expectTypeOf<Point3D>().items.toEqualTypeOf<number>();
  
  // Array of objects
  type TransactionList = Transaction[];
  expectTypeOf<TransactionList>().items.toMatchTypeOf<Transaction>();
  
  // ReadonlyArray
  type ImmutableTransactions = ReadonlyArray<Transaction>;
  expectTypeOf<ImmutableTransactions>().items.toMatchTypeOf<Transaction>();
  expectTypeOf<ImmutableTransactions>().not.toHaveProperty('push');
});

// Test Conditional Types
test('conditional and mapped types', () => {
  // Extract promise type
  type Awaited<T> = T extends Promise<infer U> ? U : T;
  
  expectTypeOf<Awaited<Promise<string>>>().toBeString();
  expectTypeOf<Awaited<number>>().toBeNumber();
  
  // Partial and Required
  type PartialTransaction = Partial<Transaction>;
  type RequiredTransaction = Required<Transaction>;
  
  expectTypeOf<PartialTransaction>().toMatchTypeOf<{
    id?: string;
    amount?: number;
    type?: 'deposit' | 'withdrawal' | 'trade' | 'bonus';
  }>();
  
  // Pick and Omit
  type TransactionSummary = Pick<Transaction, 'id' | 'amount'>;
  type TransactionWithoutId = Omit<Transaction, 'id'>;
  
  expectTypeOf<TransactionSummary>().toHaveProperty('id');
  expectTypeOf<TransactionSummary>().toHaveProperty('amount');
  expectTypeOf<TransactionSummary>().not.toHaveProperty('type');
  
  expectTypeOf<TransactionWithoutId>().not.toHaveProperty('id');
  expectTypeOf<TransactionWithoutId>().toHaveProperty('amount');
});

// Test Worker Message Types
test('worker thread message types', () => {
  interface WorkerMessage<T = unknown> {
    type: string;
    payload: T;
    timestamp: number;
    id: string;
  }
  
  interface WorkerResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    processingTime: number;
  }
  
  // Type-safe message creator
  function createMessage<T>(type: string, payload: T): WorkerMessage<T> {
    return {
      type,
      payload,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    };
  }
  
  expectTypeOf(createMessage).toBeFunction();
  expectTypeOf(createMessage<CustomerBalance>).parameters.toEqualTypeOf<[string, CustomerBalance]>();
  expectTypeOf(createMessage<CustomerBalance>).returns.toMatchTypeOf<WorkerMessage<CustomerBalance>>();
  
  const message = createMessage('UPDATE_BALANCE', { current: 1000 } as CustomerBalance);
  expectTypeOf(message.payload).toMatchTypeOf<CustomerBalance>();
});

// Test Error Types
test('error handling types', () => {
  class APIError extends Error {
    constructor(
      message: string,
      public code: number,
      public endpoint: string
    ) {
      super(message);
    }
  }
  
  expectTypeOf<APIError>().constructorParameters.toEqualTypeOf<[string, number, string]>();
  expectTypeOf<APIError>().toHaveProperty('code').toBeNumber();
  expectTypeOf<APIError>().toHaveProperty('endpoint').toBeString();
  expectTypeOf<APIError>().toMatchTypeOf<Error>();
});

// Test Utility Types
test('custom utility types', () => {
  // DeepReadonly implementation
  type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
  };
  
  type ReadonlyTransaction = DeepReadonly<Transaction>;
  expectTypeOf<ReadonlyTransaction>().toMatchTypeOf<{
    readonly id: string;
    readonly amount: number;
    readonly type: 'deposit' | 'withdrawal' | 'trade' | 'bonus';
  }>();
  
  // ValueOf utility
  type ValueOf<T> = T[keyof T];
  type TransactionValues = ValueOf<Transaction>;
  
  // Nullable utility
  type Nullable<T> = T | null | undefined;
  expectTypeOf<Nullable<string>>().toEqualTypeOf<string | null | undefined>();
});