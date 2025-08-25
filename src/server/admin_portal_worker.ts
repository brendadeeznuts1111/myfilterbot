/**
 * Admin Portal Real-time Data Processing Worker
 * Handles heavy data processing tasks for admin dashboard
 * Leverages Bun's 500x faster postMessage() for large datasets
 */

const worker = new Worker(new URL('./admin_portal_worker_thread.ts', import.meta.url).href);

export interface CustomerStats {
  customer_id: string;
  balance: number;
  weekly_pnl: number;
  active: boolean;
  last_activity?: string;
  telegram_id?: number;
  telegram_username?: string;
  risk_level?: string;
  daily_limit?: number;
}

export interface TransactionStats {
  transaction_id: string;
  timestamp: string;
  customer_id: string;
  type: string;
  amount?: number;
  status: string;
}

export interface GroupMemberStats {
  member_id: string;
  telegram_id: number;
  username?: string;
  chat_id: string;
  customer_id?: string;
  status: string;
  join_date: string;
}

export interface AdminDataRequest {
  type: 'dashboard_stats' | 'customer_analysis' | 'transaction_summary' | 'group_activity' | 'real_time_metrics';
  data: {
    customers?: CustomerStats[];
    transactions?: TransactionStats[];
    groupMembers?: GroupMemberStats[];
    timeRange?: string;
  };
  requestId: string;
}

export interface AdminDataResponse {
  requestId: string;
  type: string;
  result: any;
  error?: string;
  processingTime: number;
  dataSize: number;
}

export interface DashboardMetrics {
  totalCustomers: number;
  activeCustomers: number;
  totalBalance: number;
  totalWeeklyPnl: number;
  transactionCount: number;
  averageBalance: number;
  topCustomers: Array<{id: string; balance: number}>;
  riskDistribution: Record<string, number>;
  balanceDistribution: {
    under100: number;
    between100And1000: number;
    between1000And10000: number;
    over10000: number;
  };
  activityTrend: Array<{date: string; count: number}>;
}

class AdminPortalDataProcessor {
  private pendingRequests = new Map<string, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }>();

  private metricsCache = new Map<string, {
    data: any;
    timestamp: number;
    ttl: number;
  }>();

  constructor() {
    // Handle responses from worker
    worker.onmessage = (event: MessageEvent<AdminDataResponse>) => {
      const { requestId, result, error, processingTime, dataSize } = event.data;
      
      console.log(`Admin data processed: ${dataSize} bytes in ${processingTime}ms`);
      
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        this.pendingRequests.delete(requestId);
        
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(result);
        }
      }
    };

    worker.onerror = (error) => {
      console.error('Admin portal worker error:', error);
      for (const [requestId, pending] of this.pendingRequests) {
        pending.reject(new Error('Worker error'));
        this.pendingRequests.delete(requestId);
      }
    };

    // Clear cache every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.metricsCache) {
        if (now - cached.timestamp > cached.ttl) {
          this.metricsCache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Get real-time dashboard statistics
   * Uses fast postMessage() for large customer datasets
   */
  async getDashboardStats(customers: CustomerStats[], transactions: TransactionStats[]): Promise<DashboardMetrics> {
    const cacheKey = `dashboard-${customers.length}-${transactions.length}`;
    const cached = this.metricsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    const requestId = `dashboard-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const request: AdminDataRequest = {
        type: 'dashboard_stats',
        data: { customers, transactions },
        requestId
      };

      // Fast transfer of large customer/transaction datasets
      worker.postMessage(request);
    }).then((result) => {
      // Cache for 2 minutes
      this.metricsCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl: 2 * 60 * 1000
      });
      return result;
    });
  }

  /**
   * Analyze customer performance and risk profiles
   */
  async analyzeCustomers(customers: CustomerStats[], transactions: TransactionStats[]): Promise<any> {
    const requestId = `analysis-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const request: AdminDataRequest = {
        type: 'customer_analysis',
        data: { customers, transactions },
        requestId
      };

      worker.postMessage(request);
    });
  }

  /**
   * Generate transaction summary with patterns and anomalies
   */
  async getTransactionSummary(transactions: TransactionStats[], timeRange: string = '7d'): Promise<any> {
    const requestId = `tx-summary-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const request: AdminDataRequest = {
        type: 'transaction_summary',
        data: { transactions, timeRange },
        requestId
      };

      worker.postMessage(request);
    });
  }

  /**
   * Analyze group member activity and engagement
   */
  async analyzeGroupActivity(groupMembers: GroupMemberStats[], customers: CustomerStats[]): Promise<any> {
    const requestId = `group-activity-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const request: AdminDataRequest = {
        type: 'group_activity',
        data: { groupMembers, customers },
        requestId
      };

      worker.postMessage(request);
    });
  }

  /**
   * Get real-time metrics for monitoring dashboard
   */
  async getRealTimeMetrics(
    customers: CustomerStats[], 
    transactions: TransactionStats[], 
    groupMembers: GroupMemberStats[]
  ): Promise<any> {
    const requestId = `realtime-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const request: AdminDataRequest = {
        type: 'real_time_metrics',
        data: { customers, transactions, groupMembers },
        requestId
      };

      worker.postMessage(request);
    });
  }

  /**
   * Clear cache manually
   */
  clearCache() {
    this.metricsCache.clear();
  }

  /**
   * Terminate the worker
   */
  terminate() {
    worker.terminate();
    for (const [requestId, pending] of this.pendingRequests) {
      pending.reject(new Error('Worker terminated'));
    }
    this.pendingRequests.clear();
    this.metricsCache.clear();
  }
}

// Export singleton instance
export const adminPortalProcessor = new AdminPortalDataProcessor();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Terminating admin portal worker...');
  adminPortalProcessor.terminate();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Terminating admin portal worker...');
  adminPortalProcessor.terminate();
  process.exit(0);
});