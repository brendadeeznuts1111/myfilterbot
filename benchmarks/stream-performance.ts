/**
 * Stream Performance Benchmark
 * Compare old vs new ReadableStream consumption methods in Bun v1.2.21+
 */

import { StreamBenchmark, StreamUtils } from '../src/utils/stream-helpers';
import { spawnPythonJSON, spawnPythonText } from '../src/utils/spawn-utils';

interface BenchmarkResult {
  testName: string;
  oldMethod: { duration: number; method: string };
  newMethod: { duration: number; method: string };
  improvement: number;
  dataSize: number;
}

class StreamPerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Test 1: JSON consumption comparison
   */
  async testJSONConsumption() {
    console.log('\n📊 Testing JSON Stream Consumption...');
    
    const testData = {
      customers: Array(1000).fill(null).map((_, i) => ({
        id: `CUST-${i.toString().padStart(4, '0')}`,
        balance: Math.random() * 10000,
        transactions: Math.floor(Math.random() * 100),
        last_active: new Date().toISOString()
      })),
      stats: {
        total_balance: Math.random() * 1000000,
        active_customers: Math.floor(Math.random() * 1000),
        transactions_today: Math.floor(Math.random() * 5000)
      }
    };

    const jsonString = JSON.stringify(testData);
    const dataSize = jsonString.length;

    // Create two identical streams
    const stream1 = StreamUtils.fromJSON(testData);
    const stream2 = StreamUtils.fromJSON(testData);

    const benchmark = new StreamBenchmark();
    await benchmark.compareStreamMethods(stream1, stream2, testData);
    
    const summary = benchmark.getSummary();
    if (summary) {
      this.results.push({
        testName: 'JSON Consumption',
        oldMethod: summary.oldMethod,
        newMethod: summary.newMethod,
        improvement: parseFloat(summary.improvementPercent),
        dataSize
      });
    }
  }

  /**
   * Test 2: Large text stream processing
   */
  async testLargeTextStreams() {
    console.log('\n📊 Testing Large Text Stream Processing...');
    
    // Generate large text data
    const largeText = Array(10000).fill(null)
      .map(() => `Transaction ${Math.random()} processed at ${Date.now()}`)
      .join('\n');
    
    const dataSize = largeText.length;
    
    // Old method timing
    const oldStart = performance.now();
    const oldStream = StreamUtils.fromString(largeText);
    const oldResponse = new Response(oldStream);
    const oldResult = await oldResponse.text();
    const oldDuration = performance.now() - oldStart;

    // New method timing  
    const newStart = performance.now();
    const newStream = StreamUtils.fromString(largeText);
    const newResult = await newStream.text();
    const newDuration = performance.now() - newStart;
    
    const improvement = ((oldDuration - newDuration) / oldDuration) * 100;
    
    this.results.push({
      testName: 'Large Text Processing',
      oldMethod: { duration: oldDuration, method: 'Response wrapper' },
      newMethod: { duration: newDuration, method: 'Direct consumption' },
      improvement,
      dataSize
    });
  }

  /**
   * Test 3: Spawn operations with JSON output
   */
  async testSpawnJSONOperations() {
    console.log('\n📊 Testing Spawn JSON Operations...');
    
    try {
      // Test health check operation
      const start = performance.now();
      const result = await spawnPythonJSON('./health_check.py');
      const duration = performance.now() - start;
      
      if (result.success) {
        console.log(`✅ Health check completed in ${duration.toFixed(2)}ms`);
        console.log(`📄 Data size: ${JSON.stringify(result.data).length} bytes`);
      } else {
        console.log(`❌ Health check failed: ${result.error}`);
      }
    } catch (error: any) {
      console.log(`⚠️  Spawn test skipped (health_check.py not available): ${error.message}`);
    }
  }

  /**
   * Test 4: Multiple concurrent streams
   */
  async testConcurrentStreams() {
    console.log('\n📊 Testing Concurrent Stream Processing...');
    
    const testData = { message: `Large payload ${Date.now()}`, data: Array(1000).fill('x').join('') };
    const streams = Array(10).fill(null).map(() => StreamUtils.fromJSON(testData));
    
    // Old method
    const oldStart = performance.now();
    const oldPromises = streams.slice(0, 5).map(async stream => {
      const response = new Response(stream);
      return response.json();
    });
    await Promise.all(oldPromises);
    const oldDuration = performance.now() - oldStart;
    
    // New method
    const newStart = performance.now();
    const newPromises = streams.slice(5, 10).map(stream => stream.json());
    await Promise.all(newPromises);
    const newDuration = performance.now() - newStart;
    
    const improvement = ((oldDuration - newDuration) / oldDuration) * 100;
    
    this.results.push({
      testName: 'Concurrent Streams (5x)',
      oldMethod: { duration: oldDuration, method: 'Response wrapper' },
      newMethod: { duration: newDuration, method: 'Direct consumption' },
      improvement,
      dataSize: JSON.stringify(testData).length * 5
    });
  }

  /**
   * Test 5: Memory usage comparison
   */
  async testMemoryUsage() {
    console.log('\n📊 Testing Memory Usage...');
    
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const initialMemory = process.memoryUsage();
      
      // Generate large dataset
      const largeData = {
        customers: Array(5000).fill(null).map((_, i) => ({
          id: i,
          data: 'x'.repeat(1000) // 1KB per customer
        }))
      };
      
      // Old method memory test
      const oldMemStart = process.memoryUsage();
      const oldStream = StreamUtils.fromJSON(largeData);
      const oldResponse = new Response(oldStream);
      await oldResponse.json();
      const oldMemEnd = process.memoryUsage();
      
      // New method memory test
      const newMemStart = process.memoryUsage();
      const newStream = StreamUtils.fromJSON(largeData);
      await newStream.json();
      const newMemEnd = process.memoryUsage();
      
      console.log('Memory Usage Comparison:');
      console.log(`Old method: ${((oldMemEnd.heapUsed - oldMemStart.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
      console.log(`New method: ${((newMemEnd.heapUsed - newMemStart.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  /**
   * Generate and display benchmark report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🏆 STREAM PERFORMANCE BENCHMARK RESULTS');
    console.log('='.repeat(80));
    
    if (this.results.length === 0) {
      console.log('No benchmark results available.');
      return;
    }
    
    // Summary table
    console.log('\n📈 Performance Summary:');
    console.log('─'.repeat(80));
    console.log('Test Name                 | Old (ms) | New (ms) | Improvement | Data Size');
    console.log('─'.repeat(80));
    
    let totalImprovement = 0;
    let testCount = 0;
    
    for (const result of this.results) {
      const improvement = result.improvement > 0 ? `+${result.improvement.toFixed(1)}%` : `${result.improvement.toFixed(1)}%`;
      const dataSize = result.dataSize > 1024 * 1024 ? 
        `${(result.dataSize / 1024 / 1024).toFixed(1)}MB` :
        result.dataSize > 1024 ? 
          `${(result.dataSize / 1024).toFixed(1)}KB` :
          `${result.dataSize}B`;
      
      console.log(
        `${result.testName.padEnd(25)} | ${result.oldMethod.duration.toFixed(2).padStart(8)} | ${result.newMethod.duration.toFixed(2).padStart(8)} | ${improvement.padStart(11)} | ${dataSize.padStart(9)}`
      );
      
      if (result.improvement > 0) {
        totalImprovement += result.improvement;
        testCount++;
      }
    }
    
    console.log('─'.repeat(80));
    
    if (testCount > 0) {
      const avgImprovement = totalImprovement / testCount;
      console.log(`\n🎯 Average Performance Improvement: ${avgImprovement.toFixed(1)}%`);
      
      if (avgImprovement > 10) {
        console.log('✅ Significant performance improvement detected!');
      } else if (avgImprovement > 0) {
        console.log('✅ Modest performance improvement detected.');
      } else {
        console.log('⚠️  No significant performance improvement.');
      }
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('─'.repeat(40));
    
    const bestImprovement = Math.max(...this.results.map(r => r.improvement));
    const bestTest = this.results.find(r => r.improvement === bestImprovement);
    
    if (bestTest && bestImprovement > 0) {
      console.log(`• Best improvement: ${bestTest.testName} (${bestImprovement.toFixed(1)}%)`);
      console.log('• Use direct stream consumption for better performance');
      console.log('• Consider upgrading to Bun v1.2.21+ for optimal results');
    } else {
      console.log('• Performance gains may vary based on data size and usage patterns');
      console.log('• Consider profiling specific use cases in your application');
    }
    
    console.log('\n' + '='.repeat(80));
  }

  /**
   * Save results to JSON file
   */
  async saveResults() {
    const reportData = {
      timestamp: new Date().toISOString(),
      bun_version: process.versions?.bun || 'unknown',
      results: this.results,
      summary: {
        total_tests: this.results.length,
        average_improvement: this.results.length > 0 ? 
          this.results.reduce((sum, r) => sum + r.improvement, 0) / this.results.length : 0,
        best_improvement: Math.max(...this.results.map(r => r.improvement))
      }
    };
    
    const filename = `benchmarks/stream-performance-${Date.now()}.json`;
    await Bun.write(filename, JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Benchmark results saved to: ${filename}`);
  }
}

/**
 * Run all benchmarks
 */
async function runBenchmarks() {
  console.log('🚀 Starting Stream Performance Benchmarks...');
  console.log(`📦 Bun Version: ${process.versions?.bun || 'unknown'}`);
  
  const benchmark = new StreamPerformanceBenchmark();
  
  try {
    await benchmark.testJSONConsumption();
    await benchmark.testLargeTextStreams();
    await benchmark.testSpawnJSONOperations();
    await benchmark.testConcurrentStreams();
    await benchmark.testMemoryUsage();
    
    benchmark.generateReport();
    await benchmark.saveResults();
    
  } catch (error: any) {
    console.error('❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

// Run benchmarks if this file is executed directly
if (import.meta.main) {
  await runBenchmarks();
}

export { StreamPerformanceBenchmark, runBenchmarks };