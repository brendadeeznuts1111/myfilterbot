/**
 * HTML Analysis Worker - Background processing for web content analysis
 * Leverages Bun's 500x faster postMessage() for large data transfer
 */

import { HTMLAnalyzer, type LinkAnalysis, type ContentMetrics } from './html_analyzer';

export interface AnalysisTask {
  id: string;
  type: 'links' | 'content' | 'trading' | 'competitor' | 'contacts' | 'full';
  url: string;
  baseUrl?: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

export interface AnalysisResult {
  taskId: string;
  type: string;
  url: string;
  data: any;
  processingTime: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface WorkerMessage {
  type: 'analyze' | 'batch-analyze' | 'monitor' | 'status';
  payload: any;
}

class HTMLAnalysisWorker {
  private analyzer: HTMLAnalyzer;
  private taskQueue: AnalysisTask[] = [];
  private processing = false;
  private stats = {
    processed: 0,
    failed: 0,
    avgProcessingTime: 0,
    lastProcessed: null as string | null
  };

  constructor() {
    this.analyzer = new HTMLAnalyzer();
    this.setupMessageHandler();
  }

  private setupMessageHandler() {
    self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
      const { type, payload } = event.data;

      try {
        switch (type) {
          case 'analyze':
            await this.handleSingleAnalysis(payload as AnalysisTask);
            break;
          
          case 'batch-analyze':
            await this.handleBatchAnalysis(payload as AnalysisTask[]);
            break;
          
          case 'monitor':
            await this.handleMonitoring(payload);
            break;
          
          case 'status':
            this.sendStatus();
            break;
          
          default:
            this.sendError(`Unknown message type: ${type}`);
        }
      } catch (error) {
        this.sendError(`Worker error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
  }

  private async handleSingleAnalysis(task: AnalysisTask) {
    const startTime = performance.now();
    
    try {
      let data: any;
      
      switch (task.type) {
        case 'links':
          data = await this.analyzer.extractLinks(task.url);
          break;
        
        case 'content':
          data = await this.analyzer.analyzeContent(task.url, task.baseUrl);
          break;
        
        case 'trading':
          data = await this.analyzer.extractTradingData(task.url);
          break;
        
        case 'competitor':
          data = await this.analyzer.monitorCompetitor(task.url);
          break;
        
        case 'contacts':
          data = await this.analyzer.extractContacts(task.url);
          break;
        
        case 'full':
          // Comprehensive analysis - all types
          const [links, content, trading, contacts] = await Promise.all([
            this.analyzer.extractLinks(task.url),
            this.analyzer.analyzeContent(task.url, task.baseUrl),
            this.analyzer.extractTradingData(task.url),
            this.analyzer.extractContacts(task.url)
          ]);
          
          data = { links, content, trading, contacts };
          break;
        
        default:
          throw new Error(`Unknown analysis type: ${task.type}`);
      }

      const processingTime = performance.now() - startTime;
      
      const result: AnalysisResult = {
        taskId: task.id,
        type: task.type,
        url: task.url,
        data,
        processingTime,
        timestamp: Date.now(),
        success: true
      };

      this.updateStats(processingTime, true);
      this.sendResult(result);
      
    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      const result: AnalysisResult = {
        taskId: task.id,
        type: task.type,
        url: task.url,
        data: null,
        processingTime,
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      this.updateStats(processingTime, false);
      this.sendResult(result);
    }
  }

  private async handleBatchAnalysis(tasks: AnalysisTask[]) {
    this.taskQueue.push(...tasks);
    
    // Sort by priority (high -> medium -> low)
    this.taskQueue.sort((a, b) => {
      const priorities = { high: 0, medium: 1, low: 2 };
      return priorities[a.priority] - priorities[b.priority];
    });

    if (!this.processing) {
      await this.processBatch();
    }
  }

  private async processBatch() {
    this.processing = true;
    
    const batchSize = 5; // Process 5 URLs concurrently
    
    while (this.taskQueue.length > 0) {
      const batch = this.taskQueue.splice(0, batchSize);
      
      // Process batch concurrently
      await Promise.allSettled(
        batch.map(task => this.handleSingleAnalysis(task))
      );
      
      // Send progress update
      this.sendProgress({
        remaining: this.taskQueue.length,
        processed: this.stats.processed,
        failed: this.stats.failed
      });
    }
    
    this.processing = false;
  }

  private async handleMonitoring(config: {
    urls: string[];
    interval: number; // minutes
    types: string[];
  }) {
    const { urls, interval, types } = config;
    
    // Set up periodic monitoring
    const monitoringTask = async () => {
      const tasks: AnalysisTask[] = urls.map((url, index) => ({
        id: `monitor-${Date.now()}-${index}`,
        type: types[0] as any || 'content',
        url,
        priority: 'medium' as const,
        timestamp: Date.now()
      }));
      
      await this.handleBatchAnalysis(tasks);
    };
    
    // Initial run
    await monitoringTask();
    
    // Schedule periodic runs
    setInterval(monitoringTask, interval * 60 * 1000);
    
    this.sendMessage({
      type: 'monitoring-started',
      payload: {
        urls: urls.length,
        interval,
        types
      }
    });
  }

  private updateStats(processingTime: number, success: boolean) {
    if (success) {
      this.stats.processed++;
    } else {
      this.stats.failed++;
    }
    
    // Update average processing time
    const total = this.stats.processed + this.stats.failed;
    this.stats.avgProcessingTime = 
      (this.stats.avgProcessingTime * (total - 1) + processingTime) / total;
    
    this.stats.lastProcessed = new Date().toISOString();
  }

  private sendResult(result: AnalysisResult) {
    // Leveraging Bun's fast postMessage() for large data transfer
    self.postMessage({
      type: 'analysis-result',
      payload: result
    });
  }

  private sendProgress(progress: any) {
    self.postMessage({
      type: 'progress',
      payload: progress
    });
  }

  private sendStatus() {
    self.postMessage({
      type: 'status',
      payload: {
        stats: this.stats,
        queueSize: this.taskQueue.length,
        processing: this.processing,
        timestamp: Date.now()
      }
    });
  }

  private sendError(error: string) {
    self.postMessage({
      type: 'error',
      payload: { error, timestamp: Date.now() }
    });
  }

  private sendMessage(message: any) {
    self.postMessage(message);
  }
}

// Initialize worker
const worker = new HTMLAnalysisWorker();

// Export types for the main thread
export type { AnalysisTask, AnalysisResult, WorkerMessage };