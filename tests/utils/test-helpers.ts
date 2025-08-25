/**
 * Test Helper Utilities for Bun Native Features
 * 
 * Provides common utilities for testing SQL, YAML, and secrets functionality
 */

import { SQL, YAML, secrets } from "bun";
import { afterAll } from "bun:test";

export class TestDatabase {
  private static instances: SQL[] = [];
  
  static create(path: string = ":memory:"): SQL {
    const db = new SQL(path);
    this.instances.push(db);
    return db;
  }
  
  static async cleanup() {
    // Close all test databases
    for (const db of this.instances) {
      try {
        await db`SELECT 1`; // Test if connection is still alive
        // Note: Bun SQL doesn't have explicit close() method yet
      } catch (error) {
        // Database already closed or invalid
      }
    }
    this.instances.length = 0;
  }
}

export class TestSecrets {
  private static testSecrets: Array<{ service: string; name: string }> = [];
  
  static async set(service: string, name: string, value: string): Promise<void> {
    await secrets.set({ service, name, value });
    this.testSecrets.push({ service, name });
  }
  
  static async get(service: string, name: string): Promise<string | null> {
    return await secrets.get({ service, name });
  }
  
  static async cleanup(): Promise<void> {
    for (const { service, name } of this.testSecrets) {
      try {
        await secrets.delete({ service, name });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.testSecrets.length = 0;
  }
}

export class TestYAML {
  static parse(content: string): any {
    return YAML.parse(content);
  }
  
  static stringify(obj: any): string {
    return YAML.stringify(obj);
  }
  
  static createTestConfig(overrides: Record<string, any> = {}): string {
    const defaultConfig = {
      name: "test-config",
      version: "1.0.0",
      environment: "test",
      server: {
        port: 8080,
        host: "localhost"
      },
      database: {
        type: "sqlite",
        path: ":memory:"
      },
      features: {
        enabled: true,
        debug: true
      },
      ...overrides
    };
    
    return YAML.stringify(defaultConfig);
  }
}

export const testSchemas = {
  users: `
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `,
  
  posts: `
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      content TEXT,
      published INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `,
  
  analytics: `
    CREATE TABLE analytics (
      id INTEGER PRIMARY KEY,
      event_type TEXT NOT NULL,
      user_id INTEGER,
      metadata TEXT,
      timestamp INTEGER DEFAULT (unixepoch())
    )
  `,
  
  config: `
    CREATE TABLE config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      type TEXT DEFAULT 'string',
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `
};

export async function setupTestDatabase(schemas: string[] = ["users", "posts"]): Promise<SQL> {
  const db = TestDatabase.create();
  
  for (const schemaName of schemas) {
    if (testSchemas[schemaName as keyof typeof testSchemas]) {
      await db`${testSchemas[schemaName as keyof typeof testSchemas]}`;
    }
  }
  
  return db;
}

export async function seedTestData(db: SQL): Promise<void> {
  // Insert test users
  await db`INSERT INTO users (name, email) VALUES 
    ('Alice Johnson', 'alice@test.com'),
    ('Bob Smith', 'bob@test.com'),
    ('Charlie Brown', 'charlie@test.com')`;
  
  // Insert test posts
  await db`INSERT INTO posts (user_id, title, content, published) VALUES 
    (1, 'First Post', 'Hello World!', 1),
    (1, 'Second Post', 'More content here', 1),
    (2, 'Bob Post', 'Bob writing stuff', 1),
    (3, 'Draft', 'Work in progress', 0)`;
}

export function expectSQLResult(result: any[], expectedLength?: number) {
  if (expectedLength !== undefined) {
    expect(result).toHaveLength(expectedLength);
  }
  expect(Array.isArray(result)).toBe(true);
  return result;
}

export function expectYAMLStructure(parsed: any, expectedKeys: string[]) {
  expect(typeof parsed).toBe('object');
  expect(parsed).not.toBeNull();
  
  for (const key of expectedKeys) {
    expect(parsed).toHaveProperty(key);
  }
  
  return parsed;
}

export async function measurePerformance<T>(
  name: string, 
  operation: () => Promise<T>,
  iterations: number = 1
): Promise<{ result: T; avgTime: number; totalTime: number }> {
  const start = performance.now();
  let result: T;
  
  for (let i = 0; i < iterations; i++) {
    result = await operation();
  }
  
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  
  console.log(`📊 ${name}: ${avgTime.toFixed(2)}ms avg (${iterations} iterations, ${totalTime.toFixed(2)}ms total)`);
  
  return { result: result!, avgTime, totalTime };
}

export const testConstants = {
  TEST_SERVICE: "bun-test-suite",
  TEST_DATABASE_PATH: ":memory:",
  DEFAULT_TIMEOUT: 30000,
  PERFORMANCE_THRESHOLD: {
    SQL_QUERY: 100,    // 100ms max for simple queries
    YAML_PARSE: 50,    // 50ms max for YAML parsing
    SECRET_ACCESS: 200 // 200ms max for secret operations
  }
};

// Global test cleanup - runs after all tests
afterAll(async () => {
  await TestDatabase.cleanup();
  await TestSecrets.cleanup();
});

export default {
  TestDatabase,
  TestSecrets,
  TestYAML,
  testSchemas,
  setupTestDatabase,
  seedTestData,
  expectSQLResult,
  expectYAMLStructure,
  measurePerformance,
  testConstants
};