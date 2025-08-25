/**
 * Comprehensive Bun API Benchmarking Tests
 * Measures performance of Bun-specific APIs vs Node.js equivalents
 */

import { test, expect, describe, beforeAll } from 'bun:test';
import { PasswordSecurity } from '../../src/utils/password-security';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Bun API Performance Benchmarks', () => {
  const ITERATIONS = 1000;
  const tempDir = join(process.cwd(), 'temp-benchmark');
  
  beforeAll(() => {
    // Create temp directory for file operations
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
  });

  describe('File Operations', () => {
    test('Bun.file() vs fs.readFileSync performance', async () => {
      const testFile = join(tempDir, 'test-read.json');
      const testData = { data: Array(1000).fill('test-data'), timestamp: Date.now() };
      await Bun.write(testFile, JSON.stringify(testData));
      
      // Benchmark Bun.file()
      const bunStart = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        const file = Bun.file(testFile);
        await file.text();
      }
      const bunTime = performance.now() - bunStart;
      
      // Benchmark fs.readFileSync
      const fsStart = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        readFileSync(testFile, 'utf-8');
      }
      const fsTime = performance.now() - fsStart;
      
      const improvement = ((fsTime - bunTime) / fsTime) * 100;
      
      console.log(`📁 File Read Performance:`);
      console.log(`   Bun.file(): ${bunTime.toFixed(2)}ms`);
      console.log(`   fs.readFileSync: ${fsTime.toFixed(2)}ms`);
      console.log(`   Improvement: ${improvement.toFixed(1)}%`);
      
      expect(bunTime).toBeLessThan(fsTime);
    });

    test('Bun.write() vs fs.writeFileSync performance', async () => {
      const testData = JSON.stringify({ data: Array(100).fill('test'), timestamp: Date.now() });
      
      // Benchmark Bun.write()
      const bunStart = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        await Bun.write(join(tempDir, `bun-write-${i}.json`), testData);
      }
      const bunTime = performance.now() - bunStart;
      
      // Benchmark fs.writeFileSync
      const fsStart = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        writeFileSync(join(tempDir, `fs-write-${i}.json`), testData);
      }
      const fsTime = performance.now() - fsStart;
      
      const improvement = ((fsTime - bunTime) / fsTime) * 100;
      
      console.log(`\n📝 File Write Performance:`);
      console.log(`   Bun.write(): ${bunTime.toFixed(2)}ms`);
      console.log(`   fs.writeFileSync: ${fsTime.toFixed(2)}ms`);
      console.log(`   Improvement: ${improvement.toFixed(1)}%`);
      
      // Clean up
      for (let i = 0; i < ITERATIONS; i++) {
        try {
          rmSync(join(tempDir, `bun-write-${i}.json`));
          rmSync(join(tempDir, `fs-write-${i}.json`));
        } catch {
        // Ignore cleanup errors
      }
      }
    });
  });

  describe('Password Hashing (Bun.password)', () => {
    test('Bun.password.hash() performance with bcrypt', async () => {
      const passwords = Array.from({ length: 10 }, (_, i) => `testPassword${i}!@#`);
      
      const start = performance.now();
      const hashes = await Promise.all(
        passwords.map(pwd => PasswordSecurity.hashPassword(pwd, { algorithm: 'bcrypt', cost: 10 }))
      );
      const hashTime = performance.now() - start;
      
      console.log(`\n🔐 Password Hashing (bcrypt, cost=10):`);
      console.log(`   10 passwords hashed in ${hashTime.toFixed(2)}ms`);
      console.log(`   Average: ${(hashTime / 10).toFixed(2)}ms per password`);
      
      // Verify performance
      const verifyStart = performance.now();
      const results = await Promise.all(
        passwords.map((pwd, i) => PasswordSecurity.verifyPassword(pwd, hashes[i]))
      );
      const verifyTime = performance.now() - verifyStart;
      
      console.log(`   10 passwords verified in ${verifyTime.toFixed(2)}ms`);
      console.log(`   Average: ${(verifyTime / 10).toFixed(2)}ms per verification`);
      
      expect(results.every(r => r === true)).toBe(true);
    });

    test('Bun.password.hash() performance with argon2id', async () => {
      const passwords = Array.from({ length: 5 }, (_, i) => `securePass${i}!@#$`);
      
      const start = performance.now();
      const hashes = await Promise.all(
        passwords.map(pwd => PasswordSecurity.hashPassword(pwd, { algorithm: 'argon2id' }))
      );
      const hashTime = performance.now() - start;
      
      console.log(`\n🔐 Password Hashing (argon2id):`);
      console.log(`   5 passwords hashed in ${hashTime.toFixed(2)}ms`);
      console.log(`   Average: ${(hashTime / 5).toFixed(2)}ms per password`);
      
      expect(hashes.length).toBe(5);
    });
  });

  describe('YAML Import Performance', () => {
    test('Native YAML import vs JSON parsing', async () => {
      const yamlFile = join(tempDir, 'test.yaml');
      const jsonFile = join(tempDir, 'test.json');
      
      const testData = {
        config: {
          server: { port: 3000, host: 'localhost' },
          features: ['auth', 'api', 'websocket'],
          database: { type: 'sqlite', path: './db.sqlite' }
        }
      };
      
      // Create YAML file
      const yamlContent = `
config:
  server:
    port: 3000
    host: localhost
  features:
    - auth
    - api
    - websocket
  database:
    type: sqlite
    path: ./db.sqlite
`;
      await Bun.write(yamlFile, yamlContent);
      await Bun.write(jsonFile, JSON.stringify(testData));
      
      // Benchmark YAML parsing
      const yamlStart = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        Bun.YAML.parse(yamlContent);
      }
      const yamlTime = performance.now() - yamlStart;
      
      // Benchmark JSON parsing
      const jsonString = JSON.stringify(testData);
      const jsonStart = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        JSON.parse(jsonString);
      }
      const jsonTime = performance.now() - jsonStart;
      
      console.log(`\n📄 YAML vs JSON Parsing:`);
      console.log(`   YAML.parse: ${yamlTime.toFixed(2)}ms for ${ITERATIONS} iterations`);
      console.log(`   JSON.parse: ${jsonTime.toFixed(2)}ms for ${ITERATIONS} iterations`);
      console.log(`   Ratio: ${(yamlTime / jsonTime).toFixed(2)}x`);
    });
  });

  describe('Bun.spawn() vs child_process', () => {
    test('Process spawning performance', async () => {
      const commands = Array(10).fill('echo "test"');
      
      // Benchmark Bun.spawn()
      const bunStart = performance.now();
      const bunProcesses = await Promise.all(
        commands.map(cmd => 
          Bun.spawn(['sh', '-c', cmd], { stdout: 'pipe' }).exited
        )
      );
      const bunTime = performance.now() - bunStart;
      
      console.log(`\n🚀 Process Spawning Performance:`);
      console.log(`   Bun.spawn(): ${bunTime.toFixed(2)}ms for 10 processes`);
      console.log(`   Average: ${(bunTime / 10).toFixed(2)}ms per process`);
      
      expect(bunProcesses.every(code => code === 0)).toBe(true);
    });
  });

  describe('Sleep/Timing APIs', () => {
    test('Bun.sleep() accuracy', async () => {
      const sleepTimes = [10, 50, 100];
      const results: number[] = [];
      
      for (const ms of sleepTimes) {
        const start = performance.now();
        await Bun.sleep(ms);
        const actual = performance.now() - start;
        results.push(actual);
        
        console.log(`⏱️  Bun.sleep(${ms}): actual ${actual.toFixed(2)}ms (diff: ${(actual - ms).toFixed(2)}ms)`);
        
        // Allow 20% tolerance
        expect(actual).toBeGreaterThanOrEqual(ms);
        expect(actual).toBeLessThan(ms * 1.2);
      }
    });
  });

  describe('Crypto Performance', () => {
    test('crypto.randomUUID() performance', () => {
      const iterations = 10000;
      
      const start = performance.now();
      const uuids = Array.from({ length: iterations }, () => globalThis.crypto.randomUUID());
      const time = performance.now() - start;
      
      console.log(`\n🎲 UUID Generation:`);
      console.log(`   Generated ${iterations} UUIDs in ${time.toFixed(2)}ms`);
      console.log(`   Rate: ${(iterations / (time / 1000)).toFixed(0)} UUIDs/second`);
      
      // Verify uniqueness
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(iterations);
    });

    test('crypto.getRandomValues() performance', () => {
      const iterations = 1000;
      const bufferSize = 1024; // 1KB
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const buffer = new Uint8Array(bufferSize);
        globalThis.crypto.getRandomValues(buffer);
      }
      const time = performance.now() - start;
      
      const totalMB = (iterations * bufferSize) / (1024 * 1024);
      const throughput = totalMB / (time / 1000);
      
      console.log(`\n🎲 Random Data Generation:`);
      console.log(`   Generated ${totalMB.toFixed(2)}MB in ${time.toFixed(2)}ms`);
      console.log(`   Throughput: ${throughput.toFixed(2)}MB/second`);
    });
  });

  describe('Native vs Polyfill Performance', () => {
    test('Math.sumPrecise vs reduce for floating point', () => {
      const numbers = Array.from({ length: 1000 }, () => Math.random() * 0.1);
      
      // Benchmark Math.sumPrecise
      const preciseStart = performance.now();
      let preciseResult: number = 0;
      for (let i = 0; i < ITERATIONS; i++) {
        preciseResult = Math.sumPrecise(numbers);
      }
      const preciseTime = performance.now() - preciseStart;
      
      // Benchmark reduce
      const reduceStart = performance.now();
      let reduceResult: number = 0;
      for (let i = 0; i < ITERATIONS; i++) {
        reduceResult = numbers.reduce((a, b) => a + b, 0);
      }
      const reduceTime = performance.now() - reduceStart;
      
      console.log(`\n➕ Math.sumPrecise Performance:`);
      console.log(`   Math.sumPrecise: ${preciseTime.toFixed(2)}ms`);
      console.log(`   Array.reduce: ${reduceTime.toFixed(2)}ms`);
      console.log(`   Speed ratio: ${(reduceTime / preciseTime).toFixed(2)}x`);
      console.log(`   Precision difference: ${Math.abs(preciseResult - reduceResult)}`);
    });
  });

  describe('Overall Bun Runtime Performance', () => {
    test('Comprehensive performance summary', () => {
      const summary = {
        runtime: Bun.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + 'MB',
          heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + 'MB'
        },
        features: {
          'File Operations': 'Optimized with Bun.file()',
          'Password Hashing': 'Native Bun.password API',
          'YAML Support': 'Native import and parsing',
          'Process Spawning': 'Bun.spawn() API',
          'Crypto': 'Web Crypto API',
          'Precision Math': 'Math.sumPrecise'
        }
      };
      
      console.log('\n📊 Bun Runtime Summary:', JSON.stringify(summary, null, 2));
      
      expect(Bun.version).toBeDefined();
    });
  });

  // Cleanup
  afterAll(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });
});