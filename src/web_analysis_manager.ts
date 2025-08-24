/**
 * Web Analysis Manager - Client interface for HTML analysis workers
 * Integrates with the trading bot system for web content monitoring
 */

import type { AnalysisTask, AnalysisResult, WorkerMessage } from './html_analysis_worker';

export interface WebAnalysisConfig {
  maxWorkers?: number;
  batchSize?: number;
  retryAttempts?: number;
  timeout?: number; // milliseconds
}

export interface MonitoringTarget {
  id: string;
  url: string;
  type: 'competitor' | 'news' | 'signals' | 'general';
  interval: number; // minutes
  analysisTypes: ('links' | 'content' | 'trading' | 'contacts')[];
  active: boolean;
  lastAnalyzed?: number;
}

export interface AnalysisSchedule {
  id: string;
  name: string;
  targets: string[]; // target IDs
  cronExpression?: string;
  interval?: number; // minutes
  enabled: boolean;
}

export class WebAnalysisManager {
  private workers: Worker[] = [];
  private currentWorker = 0;
  private taskQueue: Map<string, AnalysisTask> = new Map();
  private results: Map<string, AnalysisResult> = new Map();
  private config: Required<WebAnalysisConfig>;
  private monitoringTargets: Map<string, MonitoringTarget> = new Map();
  private schedules: Map<string, AnalysisSchedule> = new Map();
  private intervalIds: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: WebAnalysisConfig = {}) {
    this.config = {
      maxWorkers: config.maxWorkers || 3,
      batchSize: config.batchSize || 10,
      retryAttempts: config.retryAttempts || 2,
      timeout: config.timeout || 30000
    };

    this.initializeWorkers();
  }

  private initializeWorkers() {
    for (let i = 0; i < this.config.maxWorkers; i++) {
      const worker = new Worker(new URL('./html_analysis_worker.ts', import.meta.url));
      
      worker.onmessage = (event: MessageEvent) => {
        this.handleWorkerMessage(event.data);
      };

      worker.onerror = (error) => {
        console.error(`Worker ${i} error:`, error);
        this.restartWorker(i);
      };

      this.workers.push(worker);
    }
  }

  private handleWorkerMessage(message: any) {
    switch (message.type) {
      case 'analysis-result':
        this.handleAnalysisResult(message.payload as AnalysisResult);
        break;
      
      case 'progress':
        this.handleProgress(message.payload);
        break;
      
      case 'status':
        this.handleStatus(message.payload);
        break;
      
      case 'error':
        this.handleError(message.payload);
        break;
      
      case 'monitoring-started':
        console.log('Monitoring started:', message.payload);
        break;
    }
  }

  private handleAnalysisResult(result: AnalysisResult) {
    this.results.set(result.taskId, result);
    this.taskQueue.delete(result.taskId);
    
    // Emit event for listeners
    this.emit('result', result);
    
    // Clean up old results (keep last 1000)
    if (this.results.size > 1000) {
      const oldestKey = this.results.keys().next().value;
      this.results.delete(oldestKey);
    }
  }

  private handleProgress(progress: any) {
    this.emit('progress', progress);
  }

  private handleStatus(status: any) {
    this.emit('status', status);
  }

  private handleError(error: any) {
    console.error('Worker error:', error);
    this.emit('error', error);
  }

  private restartWorker(index: number) {
    this.workers[index].terminate();
    const worker = new Worker(new URL('./html_analysis_worker.ts', import.meta.url));
    
    worker.onmessage = (event: MessageEvent) => {
      this.handleWorkerMessage(event.data);
    };

    worker.onerror = (error) => {
      console.error(`Worker ${index} error:`, error);
      this.restartWorker(index);
    };

    this.workers[index] = worker;
  }

  private getNextWorker(): Worker {
    const worker = this.workers[this.currentWorker];
    this.currentWorker = (this.currentWorker + 1) % this.workers.length;
    return worker;
  }

  private emit(event: string, data: any) {
    // Simple event emitter - could be enhanced with proper EventEmitter
    const eventName = `webAnalysis.${event}`;
    globalThis.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  // Public API Methods

  /**
   * Analyze a single URL
   */
  async analyzeUrl(
    url: string, 
    type: AnalysisTask['type'] = 'full',
    priority: AnalysisTask['priority'] = 'medium'
  ): Promise<string> {
    const taskId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: AnalysisTask = {
      id: taskId,
      type,
      url,
      priority,
      timestamp: Date.now()
    };

    this.taskQueue.set(taskId, task);
    
    const worker = this.getNextWorker();
    worker.postMessage({
      type: 'analyze',
      payload: task
    } as WorkerMessage);

    return taskId;
  }

  /**
   * Analyze multiple URLs in batch
   */
  async analyzeBatch(
    urls: { url: string; type?: AnalysisTask['type']; priority?: AnalysisTask['priority'] }[]
  ): Promise<string[]> {
    const tasks: AnalysisTask[] = urls.map((item, index) => ({
      id: `batch-${Date.now()}-${index}`,
      type: item.type || 'content',
      url: item.url,
      priority: item.priority || 'medium',
      timestamp: Date.now()
    }));

    tasks.forEach(task => this.taskQueue.set(task.id, task));

    // Distribute tasks across workers
    const tasksPerWorker = Math.ceil(tasks.length / this.workers.length);
    
    for (let i = 0; i < this.workers.length; i++) {
      const workerTasks = tasks.slice(i * tasksPerWorker, (i + 1) * tasksPerWorker);
      if (workerTasks.length > 0) {
        this.workers[i].postMessage({
          type: 'batch-analyze',
          payload: workerTasks
        } as WorkerMessage);
      }
    }

    return tasks.map(task => task.id);
  }

  /**
   * Get analysis result by task ID
   */
  getResult(taskId: string): AnalysisResult | undefined {
    return this.results.get(taskId);
  }

  /**
   * Wait for a specific analysis to complete
   */
  async waitForResult(taskId: string, timeoutMs?: number): Promise<AnalysisResult> {
    const timeout = timeoutMs || this.config.timeout;
    
    return new Promise((resolve, reject) => {
      const checkResult = () => {
        const result = this.results.get(taskId);
        if (result) {
          resolve(result);
          return true;
        }
        return false;
      };

      // Check if result already exists
      if (checkResult()) return;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Analysis timeout after ${timeout}ms`));
      }, timeout);

      // Listen for result
      const listener = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail.taskId === taskId) {
          cleanup();
          resolve(customEvent.detail);
        }
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        globalThis.removeEventListener('webAnalysis.result', listener);
      };

      globalThis.addEventListener('webAnalysis.result', listener);
    });
  }

  /**
   * Add a monitoring target
   */
  addMonitoringTarget(target: MonitoringTarget) {
    this.monitoringTargets.set(target.id, target);
    
    if (target.active) {
      this.startMonitoring(target.id);
    }
  }

  /**
   * Start monitoring a target
   */
  startMonitoring(targetId: string) {
    const target = this.monitoringTargets.get(targetId);
    if (!target) return;

    // Stop existing monitoring if running
    this.stopMonitoring(targetId);

    const intervalId = setInterval(async () => {
      try {
        await this.analyzeUrl(target.url, 'full', 'medium');
        target.lastAnalyzed = Date.now();
      } catch (error) {
        console.error(`Monitoring error for ${targetId}:`, error);
      }
    }, target.interval * 60 * 1000);

    this.intervalIds.set(targetId, intervalId);
    target.active = true;

    // Initial analysis
    this.analyzeUrl(target.url, 'full', 'high');
  }

  /**
   * Stop monitoring a target
   */
  stopMonitoring(targetId: string) {
    const intervalId = this.intervalIds.get(targetId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervalIds.delete(targetId);
    }

    const target = this.monitoringTargets.get(targetId);
    if (target) {
      target.active = false;
    }
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    const targets = Array.from(this.monitoringTargets.values());
    
    return {
      totalTargets: targets.length,
      activeTargets: targets.filter(t => t.active).length,
      targetsByType: targets.reduce((acc, target) => {
        acc[target.type] = (acc[target.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentActivity: targets
        .filter(t => t.lastAnalyzed)
        .sort((a, b) => (b.lastAnalyzed || 0) - (a.lastAnalyzed || 0))
        .slice(0, 10)
    };
  }

  /**
   * Analyze competitor websites
   */
  async analyzeCompetitors(competitorUrls: string[]): Promise<string[]> {
    return this.analyzeBatch(
      competitorUrls.map(url => ({
        url,
        type: 'competitor' as const,
        priority: 'high' as const
      }))
    );
  }

  /**
   * Monitor trading signal sources
   */
  async monitorSignalSources(signalUrls: string[]): Promise<void> {
    for (const [index, url] of signalUrls.entries()) {
      this.addMonitoringTarget({
        id: `signal-${index}`,
        url,
        type: 'signals',
        interval: 5, // Check every 5 minutes
        analysisTypes: ['trading', 'content'],
        active: true
      });
    }
  }

  /**
   * Get worker status
   */
  async getWorkerStatus(): Promise<any[]> {
    const statusPromises = this.workers.map(worker => {
      return new Promise(resolve => {
        const listener = (event: MessageEvent) => {
          if (event.data.type === 'status') {
            worker.removeEventListener('message', listener);
            resolve(event.data.payload);
          }
        };
        
        worker.addEventListener('message', listener);
        worker.postMessage({ type: 'status' } as WorkerMessage);
        
        // Timeout after 1 second
        setTimeout(() => {
          worker.removeEventListener('message', listener);
          resolve({ error: 'Timeout' });
        }, 1000);
      });
    });

    return Promise.all(statusPromises);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Stop all monitoring
    for (const targetId of this.monitoringTargets.keys()) {
      this.stopMonitoring(targetId);
    }

    // Terminate workers
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];

    // Clear data
    this.taskQueue.clear();
    this.results.clear();
    this.monitoringTargets.clear();
    this.schedules.clear();
    this.intervalIds.clear();
  }
}

// Default export
export default WebAnalysisManager;

// Usage example for trading bot integration
export function createTradingWebAnalyzer() {
  const analyzer = new WebAnalysisManager({
    maxWorkers: 4,
    batchSize: 20,
    timeout: 45000
  });

  // Common trading-related monitoring targets
  const tradingTargets: MonitoringTarget[] = [
    {
      id: 'binance-news',
      url: 'https://www.binance.com/en/news',
      type: 'news',
      interval: 15,
      analysisTypes: ['content', 'links'],
      active: true
    },
    {
      id: 'coindesk',
      url: 'https://www.coindesk.com',
      type: 'news',
      interval: 30,
      analysisTypes: ['content', 'links'],
      active: true
    }
  ];

  // Add monitoring targets
  tradingTargets.forEach(target => {
    analyzer.addMonitoringTarget(target);
  });

  return analyzer;
}