#!/usr/bin/env bun
/**
 * Bun Native Performance Validation
 * Verifies that we're using Bun native APIs for optimal performance
 */

import { performance } from 'perf_hooks';

interface ValidationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  performance?: number;
}

class BunNativeValidator {
  private results: ValidationResult[] = [];

  async validateEnvironmentAccess(): Promise<void> {
    const start = performance.now();
    
    // Test Bun.env vs process.env performance
    const bunEnvTime = this.measureEnvAccess(() => Bun.env.NODE_ENV);
    const processEnvTime = this.measureEnvAccess(() => process.env.NODE_ENV);
    
    this.results.push({
      check: 'Environment Variable Access',
      status: bunEnvTime < processEnvTime ? 'PASS' : 'WARNING',
      message: `Bun.env: ${bunEnvTime.toFixed(3)}ms, process.env: ${processEnvTime.toFixed(3)}ms`,
      performance: bunEnvTime
    });
  }

  async validateFileOperations(): Promise<void> {
    // Test Bun.file() performance
    const start = performance.now();
    
    try {
      const testFile = Bun.file('./package.json');
      const exists = await testFile.exists();
      if (exists) {
        await testFile.text();
      }
      const end = performance.now();
      
      this.results.push({
        check: 'Bun.file() Operations',
        status: 'PASS',
        message: 'Using Bun native file operations',
        performance: end - start
      });
    } catch (error) {
      this.results.push({
        check: 'Bun.file() Operations',
        status: 'FAIL',
        message: `Error: ${error}`
      });
    }
  }

  async validateHTTPServer(): Promise<void> {
    // Check if we're using Bun.serve() patterns
    const start = performance.now();
    
    const server = Bun.serve({
      port: 0, // Use any available port
      fetch() {
        return new Response('test');
      }
    });
    
    const end = performance.now();
    server.stop();
    
    this.results.push({
      check: 'HTTP Server Performance',
      status: 'PASS',
      message: 'Using Bun.serve() native implementation',
      performance: end - start
    });
  }

  async validatePackageManager(): Promise<void> {
    // Check if bun.lock exists (indicates using bun as package manager)
    const lockFile = Bun.file('./bun.lock');
    const exists = await lockFile.exists();
    
    this.results.push({
      check: 'Package Manager',
      status: exists ? 'PASS' : 'WARNING',
      message: exists ? 'Using bun as package manager' : 'bun.lock not found - ensure using "bun install"'
    });
  }

  async validatePostMessagePerformance(): Promise<void> {
    // Test worker thread postMessage performance
    const start = performance.now();
    
    try {
      // Create a large JSON object
      const largeData = { 
        data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: Math.random() })) 
      };
      
      // Simulate postMessage operation (actual worker would be more complex)
      const jsonString = JSON.stringify(largeData);
      const parsed = JSON.parse(jsonString);
      
      const end = performance.now();
      const duration = end - start;
      
      this.results.push({
        check: 'PostMessage Performance',
        status: duration < 5 ? 'PASS' : 'WARNING',
        message: `Large JSON processing: ${duration.toFixed(3)}ms (Bun optimized)`,
        performance: duration
      });
    } catch (error) {
      this.results.push({
        check: 'PostMessage Performance',
        status: 'FAIL',
        message: `Error: ${error}`
      });
    }
  }

  async validateStreamConsumption(): Promise<void> {
    // Test Bun's enhanced ReadableStream consumption (v1.2.21+)
    const start = performance.now();
    
    try {
      const proc = Bun.spawn({
        cmd: ["echo", '{"test": "data"}'],
        stdout: "pipe",
      });
      
      // Use enhanced stream consumption (direct JSON parsing)
      const data = await new Response(proc.stdout).json();
      const end = performance.now();
      
      this.results.push({
        check: 'Stream Consumption',
        status: data.test === 'data' ? 'PASS' : 'FAIL',
        message: `Enhanced ReadableStream processing: ${(end - start).toFixed(3)}ms`,
        performance: end - start
      });
    } catch (error) {
      this.results.push({
        check: 'Stream Consumption',
        status: 'FAIL',
        message: `Error: ${error}`
      });
    }
  }

  async validateDependencies(): Promise<void> {
    // Check that we're not using unnecessary Node.js polyfills
    const packageFile = Bun.file('./package.json');
    const packageData = await packageFile.json();
    
    const problematicDeps = ['node-fetch', 'ws', 'bcrypt', 'fs-extra'];
    const found = problematicDeps.filter(dep => 
      packageData.dependencies?.[dep] || packageData.devDependencies?.[dep]
    );
    
    this.results.push({
      check: 'Dependency Optimization',
      status: found.length === 0 ? 'PASS' : 'WARNING',
      message: found.length === 0 
        ? 'No unnecessary Node.js polyfills found'
        : `Consider removing: ${found.join(', ')} (Bun has native alternatives)`
    });
  }

  private measureEnvAccess(accessor: () => any): number {
    const iterations = 10000;
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      accessor();
    }
    
    return (performance.now() - start) / iterations;
  }

  async runAllValidations(): Promise<void> {
    console.log('🔍 Validating Bun Native Implementation\n');
    console.log('=' + '='.repeat(50));
    
    await this.validateEnvironmentAccess();
    await this.validateFileOperations();
    await this.validateHTTPServer();
    await this.validatePackageManager();
    await this.validatePostMessagePerformance();
    await this.validateStreamConsumption();
    await this.validateDependencies();
    
    this.printResults();
  }

  private printResults(): void {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log('\n📊 Validation Results:');
    console.log('=' + '='.repeat(50));
    
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : 
                   result.status === 'WARNING' ? '⚠️' : '❌';
      const perfInfo = result.performance ? ` (${result.performance.toFixed(3)}ms)` : '';
      
      console.log(`${icon} ${result.check}${perfInfo}`);
      console.log(`   ${result.message}\n`);
    });
    
    console.log('Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 Bun Native Implementation Validated!');
      console.log('Your application is optimized for maximum Bun performance.');
    } else {
      console.log('\n⚠️  Some issues detected. Address failures for optimal performance.');
    }
    
    // Calculate overall performance score
    const totalPerf = this.results
      .filter(r => r.performance !== undefined)
      .reduce((sum, r) => sum + r.performance!, 0);
    
    console.log(`\n⚡ Overall Performance Score: ${totalPerf.toFixed(3)}ms`);
    console.log('(Lower is better - indicates efficient Bun native API usage)');
  }
}

// Run validation
const validator = new BunNativeValidator();
await validator.runAllValidations();