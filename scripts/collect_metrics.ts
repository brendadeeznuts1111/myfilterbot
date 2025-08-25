#!/usr/bin/env bun

/**
 * Lightweight Metrics Collector
 * Collects performance baselines and monitors system health
 */

import { performance } from 'perf_hooks';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface MetricData {
  timestamp: string;
  metric: string;
  value: number;
  unit: string;
  context?: Record<string, unknown>;
}

interface PerformanceBaseline {
  apiResponseTimes: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  errorRates: {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  systemHealth: {
    cpuUsage: number;
    uptime: number;
    loadAverage: number[];
  };
}

class MetricsCollector {
  private metrics: MetricData[] = [];
  private baselineFile = join(process.cwd(), 'metrics', 'baseline.json');
  private metricsFile = join(process.cwd(), 'metrics', 'current.json');

  constructor() {
    this.ensureMetricsDirectory();
  }

  private ensureMetricsDirectory() {
    const metricsDir = join(process.cwd(), 'metrics');
    try {
      if (!existsSync(metricsDir)) {
        require('fs').mkdirSync(metricsDir, { recursive: true });
      }
    } catch (error) {
      console.warn('Could not create metrics directory:', error);
    }
  }

  /**
   * Record a metric data point
   */
  record(metric: string, value: number, unit: string, context?: Record<string, unknown>) {
    this.metrics.push({
      timestamp: new Date().toISOString(),
      metric,
      value,
      unit,
      context
    });
  }

  /**
   * Measure API endpoint response time
   */
  async measureApiEndpoint(url: string, headers: Record<string, string> = {}): Promise<number> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, { headers });
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.record('api_response_time', responseTime, 'ms', {
        url,
        status: response.status,
        success: response.ok
      });
      
      return responseTime;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.record('api_response_time', responseTime, 'ms', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
      
      return responseTime;
    }
  }

  /**
   * Collect memory usage metrics
   */
  collectMemoryMetrics() {
    const memUsage = process.memoryUsage();
    
    this.record('memory_heap_used', memUsage.heapUsed, 'bytes');
    this.record('memory_heap_total', memUsage.heapTotal, 'bytes');
    this.record('memory_external', memUsage.external, 'bytes');
    this.record('memory_rss', memUsage.rss, 'bytes');
    
    return memUsage;
  }

  /**
   * Collect system health metrics
   */
  collectSystemMetrics() {
    const uptime = process.uptime();
    const cpuUsage = process.cpuUsage();
    
    this.record('system_uptime', uptime, 'seconds');
    this.record('cpu_user_time', cpuUsage.user, 'microseconds');
    this.record('cpu_system_time', cpuUsage.system, 'microseconds');
    
    // Load average (Unix-like systems only)
    try {
      const os = require('os');
      const loadAvg = os.loadavg();
      this.record('load_average_1m', loadAvg[0], 'ratio');
      this.record('load_average_5m', loadAvg[1], 'ratio');
      this.record('load_average_15m', loadAvg[2], 'ratio');
    } catch (error) {
      // Load average not available on this platform
    }
    
    return {
      uptime,
      cpuUsage,
      loadAverage: require('os').loadavg?.() || []
    };
  }

  /**
   * Run comprehensive performance baseline collection
   */
  async collectBaseline(): Promise<PerformanceBaseline> {
    console.log('🔍 Collecting performance baseline...');
    
    // Test API endpoints
    const apiEndpoints = [
      'http://localhost:3003/health',
      'http://localhost:3003/api/customer/balance',
      'http://localhost:3003/api/admin/stats',
      'http://localhost:3006/health'
    ];
    
    const apiTimes: number[] = [];
    
    for (const endpoint of apiEndpoints) {
      console.log(`📊 Testing ${endpoint}...`);
      
      // Run multiple requests to get statistical data
      for (let i = 0; i < 10; i++) {
        const responseTime = await this.measureApiEndpoint(endpoint, {
          'X-Customer-ID': 'BB1042',
          'X-Admin-ID': 'admin123'
        });
        apiTimes.push(responseTime);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Calculate percentiles
    apiTimes.sort((a, b) => a - b);
    const p50 = apiTimes[Math.floor(apiTimes.length * 0.5)];
    const p95 = apiTimes[Math.floor(apiTimes.length * 0.95)];
    const p99 = apiTimes[Math.floor(apiTimes.length * 0.99)];
    const avg = apiTimes.reduce((sum, time) => sum + time, 0) / apiTimes.length;
    
    // Collect system metrics
    const memoryUsage = this.collectMemoryMetrics();
    const systemHealth = this.collectSystemMetrics();
    
    const baseline: PerformanceBaseline = {
      apiResponseTimes: { p50, p95, p99, avg },
      memoryUsage,
      errorRates: {
        total: 0,
        byCategory: {},
        bySeverity: {}
      },
      systemHealth: {
        cpuUsage: systemHealth.cpuUsage.user + systemHealth.cpuUsage.system,
        uptime: systemHealth.uptime,
        loadAverage: systemHealth.loadAverage
      }
    };
    
    // Save baseline
    this.saveBaseline(baseline);
    
    console.log('✅ Baseline collection complete');
    console.log(`📈 API Response Times: P50=${p50.toFixed(2)}ms, P95=${p95.toFixed(2)}ms, P99=${p99.toFixed(2)}ms`);
    console.log(`💾 Memory Usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB heap`);
    console.log(`⏱️  System Uptime: ${(systemHealth.uptime / 60).toFixed(1)} minutes`);
    
    return baseline;
  }

  /**
   * Save baseline to file
   */
  private saveBaseline(baseline: PerformanceBaseline) {
    try {
      writeFileSync(this.baselineFile, JSON.stringify(baseline, null, 2));
      console.log(`💾 Baseline saved to ${this.baselineFile}`);
    } catch (error) {
      console.error('Failed to save baseline:', error);
    }
  }

  /**
   * Load existing baseline
   */
  loadBaseline(): PerformanceBaseline | null {
    try {
      if (existsSync(this.baselineFile)) {
        const data = readFileSync(this.baselineFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load baseline:', error);
    }
    return null;
  }

  /**
   * Compare current metrics with baseline
   */
  async compareWithBaseline(): Promise<void> {
    const baseline = this.loadBaseline();
    if (!baseline) {
      console.log('❌ No baseline found. Run with --collect-baseline first.');
      return;
    }
    
    console.log('🔍 Comparing current performance with baseline...');
    
    // Collect current metrics
    const current = await this.collectBaseline();
    
    // Compare API response times
    const apiImprovement = ((baseline.apiResponseTimes.avg - current.apiResponseTimes.avg) / baseline.apiResponseTimes.avg) * 100;
    console.log(`📊 API Response Time Change: ${apiImprovement > 0 ? '+' : ''}${apiImprovement.toFixed(1)}%`);
    
    // Compare memory usage
    const memoryChange = ((current.memoryUsage.heapUsed - baseline.memoryUsage.heapUsed) / baseline.memoryUsage.heapUsed) * 100;
    console.log(`💾 Memory Usage Change: ${memoryChange > 0 ? '+' : ''}${memoryChange.toFixed(1)}%`);
    
    // Save comparison report
    const report = {
      timestamp: new Date().toISOString(),
      baseline,
      current,
      improvements: {
        apiResponseTime: apiImprovement,
        memoryUsage: memoryChange
      }
    };
    
    const reportFile = join(process.cwd(), 'metrics', `comparison-${Date.now()}.json`);
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📋 Comparison report saved to ${reportFile}`);
  }

  /**
   * Save current metrics to file
   */
  saveMetrics() {
    try {
      writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2));
      console.log(`💾 Metrics saved to ${this.metricsFile}`);
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const collector = new MetricsCollector();
  
  if (args.includes('--collect-baseline')) {
    await collector.collectBaseline();
  } else if (args.includes('--compare')) {
    await collector.compareWithBaseline();
  } else if (args.includes('--monitor')) {
    console.log('🔄 Starting continuous monitoring...');
    
    setInterval(async () => {
      collector.collectMemoryMetrics();
      collector.collectSystemMetrics();
      
      // Test a few key endpoints
      await collector.measureApiEndpoint('http://localhost:3003/health');
      
      console.log(`📊 Metrics collected at ${new Date().toISOString()}`);
    }, 30000); // Every 30 seconds
    
    // Save metrics every 5 minutes
    setInterval(() => {
      collector.saveMetrics();
    }, 300000);
    
  } else {
    console.log(`
🔍 MyFilterBot Metrics Collector

Usage:
  bun run scripts/collect_metrics.ts --collect-baseline  # Collect performance baseline
  bun run scripts/collect_metrics.ts --compare          # Compare with baseline
  bun run scripts/collect_metrics.ts --monitor          # Start continuous monitoring

Examples:
  # Collect baseline before deployment
  bun run scripts/collect_metrics.ts --collect-baseline
  
  # Compare performance after deployment
  bun run scripts/collect_metrics.ts --compare
  
  # Monitor system continuously
  bun run scripts/collect_metrics.ts --monitor
`);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
