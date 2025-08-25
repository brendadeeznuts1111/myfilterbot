/**
 * Performance Monitor Service
 * Tracks startup performance and runtime metrics
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface StartupPhase {
  phase: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'completed' | 'error';
  error?: string;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private startupPhases: StartupPhase[] = [];
  private startupStartTime: number;

  constructor() {
    this.startupStartTime = Date.now();
    this.startPhase('initialization');
  }

  /**
   * Start tracking a performance metric
   */
  startMetric(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: Date.now(),
      metadata,
    });
  }

  /**
   * End tracking a performance metric
   */
  endMetric(name: string): number {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric '${name}' not found`);
      return 0;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;

    console.log(`📊 Performance: ${name} completed in ${metric.duration}ms`);
    return metric.duration;
  }

  /**
   * Start a startup phase
   */
  startPhase(phase: string): void {
    // Complete previous phase if exists
    if (this.startupPhases.length > 0) {
      const lastPhase = this.startupPhases[this.startupPhases.length - 1];
      if (lastPhase.status === 'running') {
        this.endPhase(lastPhase.phase);
      }
    }

    this.startupPhases.push({
      phase,
      startTime: Date.now(),
      status: 'running',
    });

    console.log(`🚀 Starting phase: ${phase}`);
  }

  /**
   * End a startup phase
   */
  endPhase(phase: string, error?: string): void {
    const phaseIndex = this.startupPhases.findIndex(
      p => p.phase === phase && p.status === 'running'
    );
    if (phaseIndex === -1) {
      console.warn(`Startup phase '${phase}' not found or already completed`);
      return;
    }

    const phaseObj = this.startupPhases[phaseIndex];
    phaseObj.endTime = Date.now();
    phaseObj.duration = phaseObj.endTime - phaseObj.startTime;
    phaseObj.status = error ? 'error' : 'completed';
    if (error) {
      phaseObj.error = error;
    }

    const emoji = error ? '❌' : '✅';
    console.log(`${emoji} Phase completed: ${phase} (${phaseObj.duration}ms)`);
  }

  /**
   * Get all performance metrics
   */
  getMetrics(): Record<string, PerformanceMetric> {
    const result: Record<string, PerformanceMetric> = {};
    this.metrics.forEach((metric, name) => {
      result[name] = { ...metric };
    });
    return result;
  }

  /**
   * Get startup performance summary
   */
  getStartupSummary(): {
    total_startup_time: number;
    phases: StartupPhase[];
    completed_phases: number;
    failed_phases: number;
    current_phase?: string;
    startup_status: 'running' | 'completed' | 'failed';
  } {
    const totalTime = Date.now() - this.startupStartTime;
    const completedPhases = this.startupPhases.filter(
      p => p.status === 'completed'
    ).length;
    const failedPhases = this.startupPhases.filter(
      p => p.status === 'error'
    ).length;
    const currentPhase = this.startupPhases.find(
      p => p.status === 'running'
    )?.phase;

    let startupStatus: 'running' | 'completed' | 'failed' = 'running';
    if (failedPhases > 0) {
      startupStatus = 'failed';
    } else if (currentPhase === undefined && this.startupPhases.length > 0) {
      startupStatus = 'completed';
    }

    return {
      total_startup_time: totalTime,
      phases: [...this.startupPhases],
      completed_phases: completedPhases,
      failed_phases: failedPhases,
      current_phase: currentPhase,
      startup_status: startupStatus,
    };
  }

  /**
   * Mark startup as completed
   */
  completeStartup(): void {
    const currentPhase = this.startupPhases.find(p => p.status === 'running');
    if (currentPhase) {
      this.endPhase(currentPhase.phase);
    }

    const totalTime = Date.now() - this.startupStartTime;
    console.log(`🎉 Startup completed in ${totalTime}ms`);
  }

  /**
   * Get runtime performance stats
   */
  getRuntimeStats(): {
    uptime: number;
    memory_usage: NodeJS.MemoryUsage;
    completed_metrics: number;
    average_metric_time: number;
  } {
    const completedMetrics = Array.from(this.metrics.values()).filter(
      m => m.duration !== undefined
    );
    const avgTime =
      completedMetrics.length > 0
        ? completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) /
          completedMetrics.length
        : 0;

    return {
      uptime: Date.now() - this.startupStartTime,
      memory_usage: process.memoryUsage(),
      completed_metrics: completedMetrics.length,
      average_metric_time: Math.round(avgTime),
    };
  }

  /**
   * Log performance warning if metric is slow
   */
  warnIfSlow(name: string, thresholdMs: number = 1000): boolean {
    const metric = this.metrics.get(name);
    if (metric?.duration && metric.duration > thresholdMs) {
      console.warn(
        `⚠️ Slow performance: ${name} took ${metric.duration}ms (threshold: ${thresholdMs}ms)`
      );
      return true;
    }
    return false;
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  clearOldMetrics(maxAge: number = 300000): void {
    // 5 minutes default
    const cutoff = Date.now() - maxAge;
    const toDelete: string[] = [];

    this.metrics.forEach((metric, name) => {
      if (metric.endTime && metric.endTime < cutoff) {
        toDelete.push(name);
      }
    });

    toDelete.forEach(name => this.metrics.delete(name));

    if (toDelete.length > 0) {
      console.log(`🧹 Cleared ${toDelete.length} old performance metrics`);
    }
  }
}

export { PerformanceMonitor, type PerformanceMetric, type StartupPhase };
