/**
 * Background Report Generation Worker
 * Leverages Bun's 500x faster postMessage() for large JSON payloads
 */

// Worker thread for report generation
const worker = new Worker(new URL('./report_worker_thread.ts', import.meta.url).href);

export interface CustomerData {
  customer_id: string;
  balance: number;
  weekly_pnl: number;
  active: boolean;
  telegram_id?: number;
  last_activity?: string;
}

export interface TransactionData {
  transaction_id: string;
  timestamp: string;
  customer_id: string;
  type: 'deposit' | 'withdrawal' | 'denied';
  amount?: number;
  message: string;
  from_user: string;
  chat_id: number;
  status: string;
}

export interface DatabaseSnapshot {
  customers: Record<string, CustomerData>;
  transactions: TransactionData[];
  timestamp: string;
}

export interface ReportRequest {
  type: 'daily' | 'weekly' | 'customer_alerts' | 'inactive_check';
  data: DatabaseSnapshot;
  requestId: string;
}

export interface ReportResponse {
  requestId: string;
  reportType: string;
  report: string;
  error?: string;
  processingTime: number;
}

class ReportGenerator {
  private pendingRequests = new Map<string, {
    resolve: (report: string) => void;
    reject: (error: Error) => void;
  }>();

  constructor() {
    // Handle responses from worker
    worker.onmessage = (event: MessageEvent<ReportResponse>) => {
      const { requestId, report, error, processingTime } = event.data;
      
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        this.pendingRequests.delete(requestId);
        
        if (error) {
          pending.reject(new Error(error));
        } else {
          console.log(`Report generated in ${processingTime}ms`);
          pending.resolve(report);
        }
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      // Reject all pending requests
      for (const [requestId, pending] of this.pendingRequests) {
        pending.reject(new Error('Worker error'));
        this.pendingRequests.delete(requestId);
      }
    };
  }

  /**
   * Generate daily report using worker thread
   * Benefits from 500x faster postMessage() for large customer data
   */
  async generateDailyReport(databaseSnapshot: DatabaseSnapshot): Promise<string> {
    const requestId = `daily-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const request: ReportRequest = {
        type: 'daily',
        data: databaseSnapshot,
        requestId
      };

      // This postMessage() call benefits from the 500x performance improvement
      // Large JSON payloads (customer data) are now nearly instant to transfer
      worker.postMessage(request);
    });
  }

  /**
   * Generate weekly P&L report using worker thread
   */
  async generateWeeklyReport(databaseSnapshot: DatabaseSnapshot): Promise<string> {
    const requestId = `weekly-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const request: ReportRequest = {
        type: 'weekly',
        data: databaseSnapshot,
        requestId
      };

      worker.postMessage(request);
    });
  }

  /**
   * Generate customer alerts using worker thread
   */
  async generateCustomerAlerts(databaseSnapshot: DatabaseSnapshot): Promise<string> {
    const requestId = `alerts-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const request: ReportRequest = {
        type: 'customer_alerts',
        data: databaseSnapshot,
        requestId
      };

      worker.postMessage(request);
    });
  }

  /**
   * Check for inactive customers using worker thread
   */
  async checkInactiveCustomers(databaseSnapshot: DatabaseSnapshot): Promise<string> {
    const requestId = `inactive-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const request: ReportRequest = {
        type: 'inactive_check',
        data: databaseSnapshot,
        requestId
      };

      worker.postMessage(request);
    });
  }

  /**
   * Terminate the worker
   */
  terminate() {
    worker.terminate();
    // Reject all pending requests
    for (const [requestId, pending] of this.pendingRequests) {
      pending.reject(new Error('Worker terminated'));
    }
    this.pendingRequests.clear();
  }
}

// Export singleton instance
export const reportGenerator = new ReportGenerator();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Terminating report worker...');
  reportGenerator.terminate();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Terminating report worker...');
  reportGenerator.terminate();
  process.exit(0);
});