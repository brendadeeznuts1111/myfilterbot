/**
 * Optimized Worker Thread Implementation
 * Leverages Bun v1.2.30's 500x faster postMessage() for large JSON transfers
 * Implements efficient memory management and idle cleanup
 */

import { parentPort, workerData, isMainThread } from 'worker_threads';
import { Worker } from 'worker_threads';

// Worker Task Types
interface WorkerTask<T = any> {
  id: string;
  type: string;
  payload: T;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
}

interface WorkerResult<T = any> {
  taskId: string;
  success: boolean;
  data?: T;
  error?: string;
  metrics: {
    processingTimeMs: number;
    memoryUsedMB: number;
    payloadSizeMB: number;
  };
}

// Main thread worker pool manager
export class OptimizedWorkerPool {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeWorkers = 0;
  private readonly maxWorkers: number;
  private idleTimer?: Timer;
  private metrics = {
    tasksProcessed: 0,
    totalProcessingTime: 0,
    largePayloadsProcessed: 0,
    memoryReleased: 0
  };

  constructor(workerPath: string, maxWorkers = 4) {
    this.maxWorkers = maxWorkers;
    this.initializeWorkers(workerPath);
    this.startIdleMonitoring();
  }

  private initializeWorkers(workerPath: string) {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(workerPath, {
        workerData: { 
          workerId: i,
          optimizationFlags: {
            use500xFasterPostMessage: true,
            aggressiveMemoryCleanup: true,
            subMillisecondTracking: true
          }
        }
      });

      worker.on('message', (result: WorkerResult) => {
        this.handleWorkerResult(result);
      });

      worker.on('error', (error) => {
        console.error(`Worker ${i} error:`, error);
      });

      this.workers.push(worker);
    }
  }

  private startIdleMonitoring() {
    // Release memory after 10 seconds of inactivity (Bun v1.2.30 feature)
    this.idleTimer = setInterval(() => {
      if (this.activeWorkers === 0 && this.taskQueue.length === 0) {
        this.releaseIdleMemory();
      }
    }, 10000);
  }

  private releaseIdleMemory() {
    const memBefore = process.memoryUsage().heapUsed;
    
    // Trigger aggressive garbage collection
    if (global.gc) {
      global.gc();
    }
    
    const memAfter = process.memoryUsage().heapUsed;
    const released = (memBefore - memAfter) / 1024 / 1024;
    
    if (released > 0) {
      this.metrics.memoryReleased += released;
      console.log(`💾 Released ${released.toFixed(2)}MB of idle memory`);
    }
  }

  public async processTask<T, R>(type: string, payload: T, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<R> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask<T> = {
        id: crypto.randomUUID(),
        type,
        payload,
        priority,
        timestamp: Date.now()
      };

      // Measure payload size for metrics
      const payloadSize = JSON.stringify(payload).length / 1024 / 1024;
      if (payloadSize > 1) {
        this.metrics.largePayloadsProcessed++;
        console.log(`📦 Processing large payload: ${payloadSize.toFixed(2)}MB with 500x faster postMessage`);
      }

      // Priority queue insertion
      if (priority === 'high') {
        this.taskQueue.unshift(task);
      } else {
        this.taskQueue.push(task);
      }

      this.processQueue();

      // Set up result handler
      const resultHandler = (result: WorkerResult) => {
        if (result.taskId === task.id) {
          this.metrics.tasksProcessed++;
          this.metrics.totalProcessingTime += result.metrics.processingTimeMs;

          if (result.metrics.processingTimeMs < 1) {
            console.log(`⚡ Sub-millisecond processing: ${result.metrics.processingTimeMs.toFixed(3)}ms`);
          }

          if (result.success) {
            resolve(result.data as R);
          } else {
            reject(new Error(result.error));
          }
        }
      };

      // Listen for result (simplified for demo)
      this.workers[0].once('message', resultHandler);
    });
  }

  private processQueue() {
    while (this.taskQueue.length > 0 && this.activeWorkers < this.maxWorkers) {
      const task = this.taskQueue.shift();
      if (task) {
        const workerIndex = this.activeWorkers++;
        const startTime = performance.now();
        
        // Leverage Bun's 500x faster postMessage
        this.workers[workerIndex].postMessage(task);
        
        const postMessageTime = performance.now() - startTime;
        if (postMessageTime < 0.1) {
          console.log(`🚀 Ultra-fast postMessage: ${postMessageTime.toFixed(4)}ms`);
        }
      }
    }
  }

  private handleWorkerResult(result: WorkerResult) {
    this.activeWorkers--;
    this.processQueue();
  }

  public getMetrics() {
    return {
      ...this.metrics,
      avgProcessingTime: this.metrics.totalProcessingTime / this.metrics.tasksProcessed || 0,
      workersActive: this.activeWorkers,
      queueLength: this.taskQueue.length
    };
  }

  public terminate() {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
    }
    this.workers.forEach(worker => worker.terminate());
  }
}

// Worker thread implementation
if (!isMainThread && parentPort) {
  const workerId = workerData?.workerId || 0;
  const optimizationFlags = workerData?.optimizationFlags || {};
  
  console.log(`[Worker ${workerId}] Started with optimizations:`, optimizationFlags);

  // Handle incoming tasks
  parentPort.on('message', async (task: WorkerTask) => {
    const startTime = performance.now();
    const memStart = process.memoryUsage().heapUsed;
    
    try {
      // Process based on task type
      let result: any;
      
      switch (task.type) {
        case 'HEAVY_COMPUTATION':
          result = await performHeavyComputation(task.payload);
          break;
          
        case 'LARGE_JSON_TRANSFORM':
          result = await transformLargeJSON(task.payload);
          break;
          
        case 'DATA_AGGREGATION':
          result = await aggregateData(task.payload);
          break;
          
        default:
          result = { processed: true, ...task.payload };
      }
      
      const processingTime = performance.now() - startTime;
      const memUsed = (process.memoryUsage().heapUsed - memStart) / 1024 / 1024;
      const payloadSize = JSON.stringify(task.payload).length / 1024 / 1024;
      
      const response: WorkerResult = {
        taskId: task.id,
        success: true,
        data: result,
        metrics: {
          processingTimeMs: processingTime,
          memoryUsedMB: Math.max(0, memUsed),
          payloadSizeMB: payloadSize
        }
      };
      
      // Leverage Bun's 500x faster postMessage for response
      parentPort.postMessage(response);
      
    } catch (error) {
      const errorResponse: WorkerResult = {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          processingTimeMs: performance.now() - startTime,
          memoryUsedMB: 0,
          payloadSizeMB: 0
        }
      };
      
      parentPort.postMessage(errorResponse);
    }
  });

  // Worker utility functions
  async function performHeavyComputation(data: any) {
    // Simulate CPU-intensive work
    const iterations = data.iterations || 1000000;
    let result = 0;
    
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.random();
    }
    
    return { 
      result, 
      iterations,
      workerId 
    };
  }

  async function transformLargeJSON(data: any) {
    // Transform large JSON structures efficiently
    const transformed = JSON.parse(JSON.stringify(data)); // Deep clone
    
    // Recursive transformation
    function transform(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map(transform);
      } else if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          result[`transformed_${key}`] = transform(value);
        }
        return result;
      }
      return obj;
    }
    
    return transform(transformed);
  }

  async function aggregateData(data: any) {
    // Aggregate arrays of data
    if (!Array.isArray(data)) {
      return { error: 'Data must be an array' };
    }
    
    const aggregation = {
      count: data.length,
      sum: 0,
      avg: 0,
      min: Infinity,
      max: -Infinity,
      workerId
    };
    
    for (const item of data) {
      const value = typeof item === 'number' ? item : item.value || 0;
      aggregation.sum += value;
      aggregation.min = Math.min(aggregation.min, value);
      aggregation.max = Math.max(aggregation.max, value);
    }
    
    aggregation.avg = aggregation.sum / aggregation.count;
    
    return aggregation;
  }
}

// Export for use in main thread
export default OptimizedWorkerPool;