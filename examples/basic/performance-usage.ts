/**
 * Performance Monitoring Usage Examples
 * 
 * This file demonstrates how to use the zero-dependency performance layer
 */

import { bench, record, report, hrtime } from '../src/utils/perf';
import { perfDashboard } from '../src/server/perf-dashboard';
import { perfIntegration } from '../src/utils/perf-integration';

// ===== 1. Basic Timing =====
function basicTimingExample() {
  console.log('\n🎯 Basic Timing Example:');
  
  // Time a simple operation
  const { res, ns } = bench(() => {
    // Simulate some work
    let sum = 0;
    for (let i = 0; i < 100000; i++) {
      sum += Math.random();
    }
    return sum;
  });
  
  console.log(`Result: ${res}, Time: ${ns / 1_000_000}ms`);
}

// ===== 2. YAML Performance Testing =====
async function yamlPerformanceExample() {
  console.log('\n📄 YAML Performance Testing:');
  
  const testConfig = {
    app: {
      name: 'test-app',
      version: '1.0.0',
      features: {
        auth: true,
        monitoring: true,
        cache: { enabled: true, ttl: 3600 }
      }
    },
    database: {
      host: 'localhost',
      port: 5432,
      ssl: false,
      pool: { min: 5, max: 20 }
    }
  };
  
  // Test YAML parsing performance
  const { res: parsed, ns } = bench(() => {
    const yamlString = JSON.stringify(testConfig); // Mock YAML content
    return JSON.parse(yamlString); // Simulate YAML.parse
  });
  
  record('yaml:parse', ns);
  console.log(`YAML parse time: ${ns / 1_000_000}ms`);
  
  // Warn if too slow
  if (ns > 1_000_000) {
    console.warn(`⚠️ YAML parse took ${ns / 1_000_000}ms (threshold: 1ms)`);
  }
}

// ===== 3. Wager Ingestion Simulation =====
function wagerIngestionExample() {
  console.log('\n💰 Wager Ingestion Simulation:');
  
  const mockWagers = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    amount: Math.random() * 500 + 10,
    customer_id: `CUST_${Math.floor(Math.random() * 100)}`,
    agent: `AGENT_${Math.floor(Math.random() * 10)}`,
    timestamp: new Date().toISOString()
  }));
  
  // Simulate wager processing
  const { res: processedCount, ns } = bench(() => {
    let processed = 0;
    for (const wager of mockWagers) {
      // Simulate wager normalization
      const normalized = {
        WagerNumber: wager.id,
        CustomerID: wager.customer_id,
        AmountWagered: wager.amount,
        InsertDateTime: wager.timestamp
      };
      processed++;
    }
    return processed;
  });
  
  record('wager:ingest', ns);
  console.log(`Processed ${processedCount} wagers in ${ns / 1_000_000}ms`);
  console.log(`Average: ${(ns / processedCount) / 1_000}μs per wager`);
}

// ===== 4. Transaction Processing =====
async function transactionProcessingExample() {
  console.log('\n💳 Transaction Processing Simulation:');
  
  // Simulate fetch performance
  const { res: response, ns: fetchTime } = await bench(async () => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 10));
    return { 
      transactions: Array.from({ length: 50 }, (_, i) => ({ id: i, amount: 100 }))
    };
  });
  
  record('api:fetch', fetchTime);
  console.log(`API fetch: ${fetchTime / 1_000_000}ms`);
  
  // Simulate processing
  const { res: processed, ns: processTime } = bench(() => {
    return response.transactions.map(t => ({
      ...t,
      processed: true,
      timestamp: Date.now()
    }));
  });
  
  record('transaction:process', processTime);
  console.log(`Processing: ${processTime / 1_000}μs`);
}

// ===== 5. Memory Usage Demo =====
function memoryUsageExample() {
  console.log('\n🧠 Memory Usage Example:');
  
  const { getMemoryUsage } = require('../src/utils/perf');
  const before = getMemoryUsage();
  
  // Create some objects
  const largeArray = Array.from({ length: 100000 }, (_, i) => ({ 
    id: i, 
    data: `item_${i}`.repeat(10) 
  }));
  
  const after = getMemoryUsage();
  
  console.log('Memory usage:');
  console.log(`  Before: ${before.heapUsedMB.toFixed(1)} MB`);
  console.log(`  After:  ${after.heapUsedMB.toFixed(1)} MB`);
  console.log(`  Delta:  ${(after.heapUsedMB - before.heapUsedMB).toFixed(1)} MB`);
  
  // Clean up
  largeArray.length = 0;
}

// ===== 6. Performance Dashboard Usage =====
async function dashboardExample() {
  console.log('\n📊 Performance Dashboard Example:');
  
  // Generate some metrics
  for (let i = 0; i < 10; i++) {
    const { ns } = bench(() => {
      // Simulate various operations
      Math.random() * 1000;
    });
    record('demo:operation', ns);
  }
  
  console.log('Generated demo metrics');
  console.log('Dashboard available at: http://localhost:9998');
  console.log('Endpoints:');
  console.log('  GET /          - HTML dashboard');
  console.log('  GET /metrics   - JSON metrics');
  console.log('  GET /memory    - Memory usage');
  console.log('  GET /health    - Health check');
}

// ===== Main Demo Function =====
async function runPerformanceDemo() {
  console.log('🚀 Performance Monitoring Demo\n');
  
  // Start the performance integration on different port
  const { PerfIntegration } = await import('../src/utils/perf-integration');
  const perfDemo = new PerfIntegration({ dashboardPort: 9998 });
  await perfDemo.start();
  
  // Run examples
  basicTimingExample();
  await yamlPerformanceExample();
  wagerIngestionExample();
  await transactionProcessingExample();
  memoryUsageExample();
  await dashboardExample();
  
  // Show current metrics
  console.log('\n📈 Current Performance Report:');
  const metrics = report();
  if (metrics.length > 0) {
    console.table(metrics);
  } else {
    console.log('No metrics recorded yet');
  }
  
  console.log('\n✅ Demo complete! Visit http://localhost:9998 for live dashboard');
  console.log('\nTip: Run with performance flags:');
  console.log('  bun --gc-bomb=1000 examples/performance-usage.ts  # Force GC every 1s');
  console.log('  bun --smol examples/performance-usage.ts          # Use smaller heap');
}

// ===== Run Demo =====
if (import.meta.main) {
  runPerformanceDemo().catch(console.error);
  
  // Keep alive for dashboard
  setInterval(() => {
    // Generate some background activity
    const { ns } = bench(() => Date.now());
    record('background:heartbeat', ns);
  }, 5000);
}