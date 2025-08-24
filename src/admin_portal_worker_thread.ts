/**
 * Admin Portal Worker Thread
 * High-performance background processing for admin dashboard
 * Leverages Bun's 500x faster postMessage() for large data transfers
 */

import { parentPort, workerData } from 'worker_threads';

interface AdminTask {
  id: string;
  type: 'CUSTOMER_STATS' | 'TRANSACTION_ANALYTICS' | 'MEMBER_PROCESSING' | 'REALTIME_UPDATE' | 'BULK_OPERATION';
  data: any;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

interface AdminWorkerResult {
  taskId: string;
  type: string;
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
}

class AdminPortalWorker {
  private taskQueue: AdminTask[] = [];
  private processing = false;
  private stats = {
    tasksProcessed: 0,
    totalProcessingTime: 0,
    errors: 0,
    startTime: Date.now()
  };

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (!parentPort) {
      throw new Error('Worker must be run in a worker thread');
    }

    parentPort.on('message', (task: AdminTask) => {
      this.addTask(task);
      this.processQueue();
    });

    // Send heartbeat every 10 seconds
    setInterval(() => {
      this.sendHeartbeat();
    }, 10000);

    console.log('[AdminWorker] Initialized and ready');
  }

  private addTask(task: AdminTask) {
    // Add task to queue based on priority
    if (task.priority === 'high') {
      this.taskQueue.unshift(task);
    } else {
      this.taskQueue.push(task);
    }
  }

  private async processQueue() {
    if (this.processing || this.taskQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()!;
      const startTime = Date.now();

      try {
        const result = await this.processTask(task);
        const processingTime = Date.now() - startTime;

        this.stats.tasksProcessed++;
        this.stats.totalProcessingTime += processingTime;

        this.sendResult({
          taskId: task.id,
          type: task.type,
          success: true,
          data: result,
          processingTime
        });

      } catch (error: any) {
        this.stats.errors++;
        
        this.sendResult({
          taskId: task.id,
          type: task.type,
          success: false,
          error: error.message,
          processingTime: Date.now() - startTime
        });
      }
    }

    this.processing = false;
  }

  private async processTask(task: AdminTask): Promise<any> {
    switch (task.type) {
      case 'CUSTOMER_STATS':
        return this.processCustomerStats(task.data);
      
      case 'TRANSACTION_ANALYTICS':
        return this.processTransactionAnalytics(task.data);
      
      case 'MEMBER_PROCESSING':
        return this.processMemberData(task.data);
      
      case 'REALTIME_UPDATE':
        return this.processRealtimeUpdate(task.data);
      
      case 'BULK_OPERATION':
        return this.processBulkOperation(task.data);
      
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  private async processCustomerStats(data: any) {
    const customers = data.customers || [];
    
    // Calculate comprehensive statistics
    const stats = {
      totalCustomers: customers.length,
      activeCustomers: 0,
      totalBalance: 0,
      averageBalance: 0,
      totalPnL: 0,
      topPerformers: [] as any[],
      lowBalanceAlerts: [] as any[],
      inactiveCustomers: [] as any[],
      balanceDistribution: {
        under100: 0,
        '100to500': 0,
        '500to1000': 0,
        '1000to5000': 0,
        over5000: 0
      },
      activityMetrics: {
        daily: 0,
        weekly: 0,
        monthly: 0
      }
    };

    // Process each customer
    for (const customer of customers) {
      const balance = customer.balance || 0;
      stats.totalBalance += balance;
      stats.totalPnL += customer.weekly_pnl || 0;

      // Check if active
      const lastActivity = customer.last_activity ? new Date(customer.last_activity) : null;
      const now = new Date();
      const daysSinceActivity = lastActivity ? 
        Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)) : 999;

      if (daysSinceActivity <= 1) {
        stats.activityMetrics.daily++;
        stats.activeCustomers++;
      }
      if (daysSinceActivity <= 7) {
        stats.activityMetrics.weekly++;
      }
      if (daysSinceActivity <= 30) {
        stats.activityMetrics.monthly++;
      }

      // Balance distribution
      if (balance < 100) {
        stats.balanceDistribution.under100++;
        stats.lowBalanceAlerts.push({
          customer_id: customer.customer_id,
          balance: balance,
          daysSinceActivity
        });
      } else if (balance < 500) {
        stats.balanceDistribution['100to500']++;
      } else if (balance < 1000) {
        stats.balanceDistribution['500to1000']++;
      } else if (balance < 5000) {
        stats.balanceDistribution['1000to5000']++;
      } else {
        stats.balanceDistribution.over5000++;
      }

      // Track inactive customers
      if (daysSinceActivity > 3) {
        stats.inactiveCustomers.push({
          customer_id: customer.customer_id,
          daysSinceActivity,
          lastBalance: balance
        });
      }

      // Track top performers
      if (customer.weekly_pnl > 0) {
        stats.topPerformers.push({
          customer_id: customer.customer_id,
          weekly_pnl: customer.weekly_pnl,
          balance: balance,
          pnl_percentage: balance > 0 ? (customer.weekly_pnl / balance * 100) : 0
        });
      }
    }

    // Calculate averages
    stats.averageBalance = customers.length > 0 ? stats.totalBalance / customers.length : 0;

    // Sort top performers
    stats.topPerformers.sort((a, b) => b.weekly_pnl - a.weekly_pnl);
    stats.topPerformers = stats.topPerformers.slice(0, 10);

    // Sort inactive customers by days
    stats.inactiveCustomers.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
    stats.inactiveCustomers = stats.inactiveCustomers.slice(0, 20);

    return stats;
  }

  private async processTransactionAnalytics(data: any) {
    const transactions = data.transactions || [];
    const timeframe = data.timeframe || 'day';

    const analytics = {
      totalTransactions: transactions.length,
      totalVolume: 0,
      deposits: { count: 0, total: 0 },
      withdrawals: { count: 0, total: 0 },
      denied: { count: 0, total: 0 },
      hourlyDistribution: new Array(24).fill(0),
      topCustomers: new Map<string, number>(),
      transactionTypes: new Map<string, number>(),
      averageTransactionSize: 0,
      peakHour: 0,
      trends: [] as any[]
    };

    // Process transactions
    for (const tx of transactions) {
      const amount = Math.abs(tx.amount || 0);
      analytics.totalVolume += amount;

      // Type breakdown
      if (tx.type === 'deposit') {
        analytics.deposits.count++;
        analytics.deposits.total += amount;
      } else if (tx.type === 'withdrawal') {
        analytics.withdrawals.count++;
        analytics.withdrawals.total += amount;
      } else if (tx.type === 'denied') {
        analytics.denied.count++;
        analytics.denied.total += amount;
      }

      // Hourly distribution
      const hour = new Date(tx.timestamp).getHours();
      analytics.hourlyDistribution[hour]++;

      // Top customers
      const currentCount = analytics.topCustomers.get(tx.customer_id) || 0;
      analytics.topCustomers.set(tx.customer_id, currentCount + 1);

      // Transaction types
      const typeCount = analytics.transactionTypes.get(tx.type) || 0;
      analytics.transactionTypes.set(tx.type, typeCount + 1);
    }

    // Calculate averages and peaks
    analytics.averageTransactionSize = transactions.length > 0 ? 
      analytics.totalVolume / transactions.length : 0;

    // Find peak hour
    let maxTransactions = 0;
    for (let i = 0; i < 24; i++) {
      if (analytics.hourlyDistribution[i] > maxTransactions) {
        maxTransactions = analytics.hourlyDistribution[i];
        analytics.peakHour = i;
      }
    }

    // Convert maps to arrays for serialization
    const topCustomersArray = Array.from(analytics.topCustomers.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([customer_id, count]) => ({ customer_id, count }));

    const transactionTypesArray = Array.from(analytics.transactionTypes.entries())
      .map(([type, count]) => ({ type, count, percentage: (count / transactions.length * 100) }));

    return {
      ...analytics,
      topCustomers: topCustomersArray,
      transactionTypes: transactionTypesArray
    };
  }

  private async processMemberData(data: any) {
    const members = data.members || [];
    const action = data.action || 'analyze';

    if (action === 'analyze') {
      const analysis = {
        totalMembers: members.length,
        pendingApproval: 0,
        approved: 0,
        denied: 0,
        groups: new Set<string>(),
        membersByGroup: new Map<string, number>(),
        recentJoins: [] as any[],
        requiresAttention: [] as any[]
      };

      for (const member of members) {
        // Status counts
        if (member.status === 'pending') {
          analysis.pendingApproval++;
          analysis.requiresAttention.push({
            telegram_id: member.telegram_id,
            username: member.username,
            group_name: member.group_name,
            join_date: member.join_date
          });
        } else if (member.status === 'approved') {
          analysis.approved++;
        } else if (member.status === 'denied') {
          analysis.denied++;
        }

        // Group tracking
        analysis.groups.add(member.group_name);
        const groupCount = analysis.membersByGroup.get(member.group_name) || 0;
        analysis.membersByGroup.set(member.group_name, groupCount + 1);

        // Recent joins (last 24 hours)
        const joinDate = new Date(member.join_date);
        const hoursSinceJoin = (Date.now() - joinDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceJoin <= 24) {
          analysis.recentJoins.push(member);
        }
      }

      return {
        ...analysis,
        groups: Array.from(analysis.groups),
        membersByGroup: Array.from(analysis.membersByGroup.entries())
          .map(([group, count]) => ({ group, count }))
          .sort((a, b) => b.count - a.count)
      };
    }

    // Handle bulk actions
    if (action === 'bulk_approve' || action === 'bulk_deny') {
      const memberIds = data.memberIds || [];
      const newStatus = action === 'bulk_approve' ? 'approved' : 'denied';
      
      return {
        action: action,
        processedCount: memberIds.length,
        newStatus: newStatus,
        memberIds: memberIds
      };
    }

    return { error: 'Unknown member processing action' };
  }

  private async processRealtimeUpdate(data: any) {
    // Process real-time updates for WebSocket broadcasting
    const update = {
      type: data.updateType,
      timestamp: Date.now(),
      data: data.payload,
      metadata: {
        source: 'admin_worker',
        priority: data.priority || 'medium'
      }
    };

    // Simulate processing delay for complex updates
    if (data.updateType === 'FULL_REFRESH') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return update;
  }

  private async processBulkOperation(data: any) {
    const operation = data.operation;
    const targets = data.targets || [];
    const parameters = data.parameters || {};

    const results = {
      operation: operation,
      totalTargets: targets.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as any[],
      results: [] as any[]
    };

    // Process each target
    for (const target of targets) {
      try {
        // Simulate processing based on operation type
        const result = await this.processSingleTarget(operation, target, parameters);
        
        results.processed++;
        results.succeeded++;
        results.results.push({
          target: target,
          success: true,
          result: result
        });

      } catch (error: any) {
        results.processed++;
        results.failed++;
        results.errors.push({
          target: target,
          error: error.message
        });
        results.results.push({
          target: target,
          success: false,
          error: error.message
        });
      }

      // Yield to prevent blocking
      if (results.processed % 10 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    return results;
  }

  private async processSingleTarget(operation: string, target: any, parameters: any): Promise<any> {
    // Simulate different operations
    switch (operation) {
      case 'UPDATE_BALANCE':
        return {
          customer_id: target.customer_id,
          old_balance: target.balance,
          new_balance: parameters.new_balance,
          change: parameters.new_balance - target.balance
        };

      case 'SEND_NOTIFICATION':
        return {
          customer_id: target.customer_id,
          notification_type: parameters.type,
          message: parameters.message,
          sent_at: Date.now()
        };

      case 'GENERATE_REPORT':
        return {
          customer_id: target.customer_id,
          report_type: parameters.report_type,
          period: parameters.period,
          data_points: Math.floor(Math.random() * 100) + 50
        };

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private sendResult(result: AdminWorkerResult) {
    if (parentPort) {
      // Leverage Bun's optimized postMessage for fast data transfer
      parentPort.postMessage(result);
    }
  }

  private sendHeartbeat() {
    const uptime = Date.now() - this.stats.startTime;
    const avgProcessingTime = this.stats.tasksProcessed > 0 ? 
      this.stats.totalProcessingTime / this.stats.tasksProcessed : 0;

    this.sendResult({
      taskId: 'heartbeat',
      type: 'HEARTBEAT',
      success: true,
      data: {
        uptime: uptime,
        tasksProcessed: this.stats.tasksProcessed,
        averageProcessingTime: avgProcessingTime,
        errorRate: this.stats.tasksProcessed > 0 ? 
          (this.stats.errors / this.stats.tasksProcessed * 100) : 0,
        queueLength: this.taskQueue.length,
        isProcessing: this.processing
      },
      processingTime: 0
    });
  }
}

// Initialize worker
const worker = new AdminPortalWorker();

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('[AdminWorker] Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[AdminWorker] Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

export { AdminTask, AdminWorkerResult };