/**
 * Comprehensive tests for Bun-native services
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { bunYAMLService } from '../../src/services/bun-yaml-service';
import { healthCheckService } from '../../src/services/health-check-service';
import { cronScheduler } from '../../src/services/cron-scheduler';
import { bunCryptoService } from '../../src/services/bun-crypto-service';
import { subprocessManager } from '../../src/services/subprocess-manager';

describe('Bun YAML Service', () => {
  const testYAML = `
app:
  name: test-app
  version: 1.0.0
features:
  testFeature: true
  anotherFeature: false
`;

  test('should parse YAML string', () => {
    const parsed = bunYAMLService.parseYAML(testYAML);
    expect(parsed.app.name).toBe('test-app');
    expect(parsed.app.version).toBe('1.0.0');
    expect(parsed.features.testFeature).toBe(true);
  });

  test('should stringify object to YAML', () => {
    const obj = {
      test: 'value',
      nested: {
        key: 'value'
      },
      array: [1, 2, 3]
    };
    const yamlString = bunYAMLService.stringifyYAML(obj);
    expect(yamlString).toContain('test: value');
    expect(yamlString).toContain('nested:');
    expect(yamlString).toContain('key: value');
  });

  test('should validate YAML syntax', () => {
    const valid = bunYAMLService.validateSyntax(testYAML);
    expect(valid.valid).toBe(true);

    const invalid = bunYAMLService.validateSyntax('invalid: yaml: content:');
    expect(invalid.valid).toBe(false);
  });

  test('should merge YAML configurations', () => {
    const base = { app: { name: 'base' }, features: { f1: true } };
    const override = { app: { version: '2.0' }, features: { f2: true } };
    
    const merged = bunYAMLService.mergeYAML(base, override);
    expect(merged.app.name).toBe('base');
    expect(merged.app.version).toBe('2.0');
    expect(merged.features.f1).toBe(true);
    expect(merged.features.f2).toBe(true);
  });

  test('should convert between YAML and JSON', () => {
    const json = bunYAMLService.yamlToJson(testYAML);
    const parsed = JSON.parse(json);
    expect(parsed.app.name).toBe('test-app');

    const yaml = bunYAMLService.jsonToYaml(json);
    expect(yaml).toContain('name: test-app');
  });

  test('should handle multi-document YAML', () => {
    const multiDoc = '---\nfirst: doc\n---\nsecond: doc';
    const docs = bunYAMLService.parseMultiDocumentYAML(multiDoc);
    expect(Array.isArray(docs)).toBe(true);
  });

  test('should validate against schema', () => {
    bunYAMLService.registerSchema('test', {
      required: ['name'],
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number', required: false }
      }
    });

    const valid = bunYAMLService.validateYAML(
      { name: 'test', age: 25 },
      bunYAMLService['schemas'].get('test')!
    );
    expect(valid.valid).toBe(true);

    const invalid = bunYAMLService.validateYAML(
      { age: 'not a number' },
      bunYAMLService['schemas'].get('test')!
    );
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });
});

describe('Health Check Service', () => {
  beforeAll(() => {
    healthCheckService.start();
  });

  afterAll(() => {
    healthCheckService.stop();
  });

  test('should register and run health checks', async () => {
    healthCheckService.registerCheck({
      name: 'test-check',
      check: async () => ({
        service: 'test-check',
        status: 'healthy',
        timestamp: new Date()
      }),
      interval: 1000
    });

    await healthCheckService.runAllChecks();
    const result = healthCheckService.getServiceHealth('test-check');
    expect(result?.status).toBe('healthy');
  });

  test('should get overall health status', async () => {
    const health = await healthCheckService.getHealth();
    expect(health.overall).toBeDefined();
    expect(health.services).toBeInstanceOf(Array);
    expect(health.uptime).toBeGreaterThan(0);
  });

  test('should export health report', async () => {
    const report = await healthCheckService.exportReport();
    expect(report).toContain('Health Check Report');
    expect(report).toContain('System Metrics');
    expect(report).toContain('Service Status');
  });

  test('should handle check timeouts', async () => {
    healthCheckService.registerCheck({
      name: 'timeout-check',
      check: async () => {
        await new Promise(resolve => setTimeout(resolve, 10000));
        return {
          service: 'timeout-check',
          status: 'healthy',
          timestamp: new Date()
        };
      },
      timeout: 100
    });

    await healthCheckService.runAllChecks();
    const result = healthCheckService.getServiceHealth('timeout-check');
    expect(result?.status).toBe('unhealthy');
  });
});

describe('Cron Scheduler Service', () => {
  beforeAll(() => {
    cronScheduler.start();
  });

  afterAll(() => {
    cronScheduler.stop();
  });

  test('should register and execute cron jobs', async () => {
    let executed = false;
    
    cronScheduler.registerJob({
      name: 'test-job',
      schedule: '* * * * *',
      handler: async () => {
        executed = true;
      },
      enabled: true,
      runCount: 0,
      errorCount: 0
    });

    await cronScheduler.runJob('test-job');
    expect(executed).toBe(true);
  });

  test('should get job statistics', () => {
    const stats = cronScheduler.getStatistics();
    expect(stats.totalJobs).toBeGreaterThan(0);
    expect(stats.jobs).toBeInstanceOf(Array);
  });

  test('should enable and disable jobs', () => {
    cronScheduler.disableJob('test-job');
    const disabled = cronScheduler.getJobStatus('test-job');
    expect(disabled?.enabled).toBe(false);

    cronScheduler.enableJob('test-job');
    const enabled = cronScheduler.getJobStatus('test-job');
    expect(enabled?.enabled).toBe(true);
  });

  test('should handle job errors', async () => {
    cronScheduler.registerJob({
      name: 'error-job',
      schedule: '* * * * *',
      handler: async () => {
        throw new Error('Test error');
      },
      enabled: true,
      runCount: 0,
      errorCount: 0
    });

    await cronScheduler.runJob('error-job');
    const job = cronScheduler.getJobStatus('error-job');
    expect(job?.errorCount).toBeGreaterThan(0);
    expect(job?.lastError).toContain('Test error');
  });

  test('should export configuration', () => {
    const config = cronScheduler.exportConfiguration();
    const parsed = JSON.parse(config);
    expect(parsed.jobs).toBeInstanceOf(Array);
    expect(parsed.statistics).toBeDefined();
  });
});

describe('Bun Crypto Service', () => {
  test('should generate hashes', () => {
    const data = 'test data';
    const sha256 = bunCryptoService.sha256(data);
    expect(sha256).toHaveLength(64); // SHA-256 hex is 64 chars

    const sha512 = bunCryptoService.sha512(data);
    expect(sha512).toHaveLength(128); // SHA-512 hex is 128 chars

    const md5 = bunCryptoService.md5(data);
    expect(md5).toHaveLength(32); // MD5 hex is 32 chars
  });

  test('should generate fast non-crypto hashes', () => {
    const data = 'test data';
    const hash = bunCryptoService.fastHash(data);
    expect(typeof hash).toBe('number');

    const wyhash = bunCryptoService.wyhash(data);
    expect(typeof wyhash).toBe('string');
  });

  test('should generate HMAC', () => {
    const data = 'test data';
    const key = 'secret-key';
    const hmac = bunCryptoService.hmac(data, { key });
    expect(hmac).toHaveLength(64);
  });

  test('should generate secure random strings', () => {
    const hex = bunCryptoService.randomString(32, 'hex');
    expect(hex).toHaveLength(32);
    expect(hex).toMatch(/^[0-9a-f]+$/);

    const base64 = bunCryptoService.randomString(32, 'base64');
    expect(base64).toHaveLength(32);
  });

  test('should generate UUIDs', () => {
    const uuid = bunCryptoService.uuid();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('should perform timing-safe comparisons', () => {
    const a = 'secret';
    const b = 'secret';
    const c = 'different';

    expect(bunCryptoService.timingSafeEqual(a, b)).toBe(true);
    expect(bunCryptoService.timingSafeEqual(a, c)).toBe(false);
  });

  test('should generate and verify tokens', () => {
    const payload = { userId: 123, role: 'admin' };
    const secret = 'secret-key';
    
    const token = bunCryptoService.generateToken(payload, secret);
    expect(token).toContain('.');

    const verified = bunCryptoService.verifyToken(token, secret);
    expect(verified.valid).toBe(true);
    expect(verified.payload).toEqual(payload);

    const invalid = bunCryptoService.verifyToken(token, 'wrong-secret');
    expect(invalid.valid).toBe(false);
  });

  test('should generate API signatures', () => {
    const method = 'POST';
    const path = '/api/test';
    const timestamp = Date.now();
    const body = { test: 'data' };
    const secret = 'api-secret';

    const signature = bunCryptoService.generateAPISignature(
      method, path, timestamp, body, secret
    );
    expect(signature).toHaveLength(64);

    const valid = bunCryptoService.verifyAPISignature(
      signature, method, path, timestamp, body, secret
    );
    expect(valid).toBe(true);
  });

  test('should assess entropy', () => {
    const lowEntropy = 'aaaaaaaaaa';
    const highEntropy = 'aB3$xY9@pQ';

    const low = bunCryptoService.assessEntropy(lowEntropy);
    const high = bunCryptoService.assessEntropy(highEntropy);

    expect(high).toBeGreaterThan(low);
  });
});

describe('Subprocess Manager', () => {
  test('should spawn and execute commands', async () => {
    const result = await subprocessManager.spawn(['echo', 'test']);
    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe('test');
  });

  test('should execute shell commands', async () => {
    const result = await subprocessManager.exec('echo "hello world"');
    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe('hello world');
  });

  test('should handle command failures', async () => {
    const result = await subprocessManager.spawn(['false']);
    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);
  });

  test('should handle timeouts', async () => {
    const result = await subprocessManager.spawn(
      ['sleep', '10'],
      { timeout: 100 }
    );
    expect(result.success).toBe(false);
  });

  test('should check if commands exist', async () => {
    const exists = await subprocessManager.commandExists('echo');
    expect(exists).toBe(true);

    const notExists = await subprocessManager.commandExists('nonexistentcommand123');
    expect(notExists).toBe(false);
  });

  test('should run commands with retry', async () => {
    let attempts = 0;
    const result = await subprocessManager.spawnWithRetry(
      ['sh', '-c', `if [ ${++attempts} -lt 2 ]; then exit 1; else echo "success"; fi`],
      { maxRetries: 3, retryDelay: 10 }
    );
    expect(result.success).toBe(true);
  });

  test('should run commands in parallel', async () => {
    const start = Date.now();
    const results = await subprocessManager.spawnParallel([
      { command: ['sleep', '0.1'] },
      { command: ['sleep', '0.1'] },
      { command: ['sleep', '0.1'] }
    ]);
    const duration = Date.now() - start;

    expect(results).toHaveLength(3);
    expect(duration).toBeLessThan(300); // Should run in parallel
  });

  test('should run commands in sequence', async () => {
    const results = await subprocessManager.spawnSequence([
      { command: ['echo', '1'] },
      { command: ['echo', '2'] },
      { command: ['echo', '3'] }
    ]);

    expect(results).toHaveLength(3);
    expect(results[0].stdout.trim()).toBe('1');
    expect(results[1].stdout.trim()).toBe('2');
    expect(results[2].stdout.trim()).toBe('3');
  });

  test('should maintain command history', async () => {
    await subprocessManager.spawn(['echo', 'history test']);
    const history = subprocessManager.getHistory(10);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].command).toContain('echo');
  });
});

describe('Integration Tests', () => {
  test('should integrate YAML service with health checks', async () => {
    const yamlConfig = `
health:
  checks:
    - name: test
      enabled: true
      interval: 1000
`;
    const parsed = bunYAMLService.parseYAML(yamlConfig);
    expect(parsed.health.checks).toHaveLength(1);

    // Use config to register health check
    const check = parsed.health.checks[0];
    healthCheckService.registerCheck({
      name: check.name,
      check: async () => ({
        service: check.name,
        status: 'healthy',
        timestamp: new Date()
      }),
      interval: check.interval
    });

    const health = await healthCheckService.getHealth();
    expect(health.services.find(s => s.service === 'test')).toBeDefined();
  });

  test('should use crypto service for cache keys', () => {
    const cacheKey1 = bunCryptoService.generateCacheKey('user', 123, { filter: 'active' });
    const cacheKey2 = bunCryptoService.generateCacheKey('user', 123, { filter: 'active' });
    const cacheKey3 = bunCryptoService.generateCacheKey('user', 456, { filter: 'active' });

    expect(cacheKey1).toBe(cacheKey2); // Same input = same key
    expect(cacheKey1).not.toBe(cacheKey3); // Different input = different key
  });

  test('should use subprocess for git operations', async () => {
    const status = await subprocessManager.gitStatus();
    expect(typeof status).toBe('string');
  });
});

// Performance benchmarks
describe('Performance Benchmarks', () => {
  test('YAML parsing performance', () => {
    const largeYAML = `
app:
  ${Array.from({ length: 100 }, (_, i) => `key${i}: value${i}`).join('\n  ')}
`;
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      bunYAMLService.parseYAML(largeYAML);
    }
    
    const duration = performance.now() - start;
    console.log(`YAML parsing: 1000 iterations in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(1000); // Should be fast
  });

  test('Crypto hashing performance', () => {
    const data = 'test data for hashing performance';
    const start = performance.now();
    
    for (let i = 0; i < 10000; i++) {
      bunCryptoService.sha256(data);
    }
    
    const duration = performance.now() - start;
    console.log(`SHA-256 hashing: 10000 iterations in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(1000); // Should be fast
  });

  test('Fast hash performance', () => {
    const data = 'test data for fast hashing';
    const start = performance.now();
    
    for (let i = 0; i < 100000; i++) {
      bunCryptoService.fastHash(data);
    }
    
    const duration = performance.now() - start;
    console.log(`Fast hash: 100000 iterations in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(500); // Should be very fast
  });
});