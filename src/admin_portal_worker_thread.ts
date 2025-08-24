/**
 * Admin Portal Worker Thread Implementation
 * Processes large datasets for admin dashboard analytics
 * Optimized for Bun's fast postMessage() performance
 */

import type { 
  AdminDataRequest, 
  AdminDataResponse, 
  CustomerStats, 
  TransactionStats, 
  GroupMemberStats,
  DashboardMetrics 
} from './admin_portal_worker.ts';

// Worker thread message handler
self.onmessage = (event: MessageEvent<AdminDataRequest>) => {
  const startTime = performance.now();
  const { type, data, requestId } = event.data;

  try {
    let result: any;
    let dataSize = 0;

    switch (type) {
      case 'dashboard_stats':
        result = generateDashboardStats(data.customers!, data.transactions!);
        dataSize = estimateDataSize(data.customers!) + estimateDataSize(data.transactions!);
        break;
      
      case 'customer_analysis':
        result = analyzeCustomers(data.customers!, data.transactions!);
        dataSize = estimateDataSize(data.customers!) + estimateDataSize(data.transactions!);
        break;
      
      case 'transaction_summary':
        result = generateTransactionSummary(data.transactions!, data.timeRange || '7d');
        dataSize = estimateDataSize(data.transactions!);
        break;
      
      case 'group_activity':
        result = analyzeGroupActivity(data.groupMembers!, data.customers!);
        dataSize = estimateDataSize(data.groupMembers!) + estimateDataSize(data.customers!);
        break;
      
      case 'real_time_metrics':
        result = generateRealTimeMetrics(data.customers!, data.transactions!, data.groupMembers!);
        dataSize = estimateDataSize(data.customers!) + estimateDataSize(data.transactions!) + estimateDataSize(data.groupMembers!);
        break;
      
      default:
        throw new Error(`Unknown request type: ${type}`);
    }

    const processingTime = performance.now() - startTime;

    const response: AdminDataResponse = {
      requestId,
      type,
      result,
      processingTime,
      dataSize
    };

    // Fast postMessage() - benefits from 500x performance improvement
    self.postMessage(response);

  } catch (error) {
    const processingTime = performance.now() - startTime;
    
    const response: AdminDataResponse = {
      requestId,
      type,
      result: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
      dataSize: 0
    };

    self.postMessage(response);
  }
};

function estimateDataSize(data: any[]): number {
  // Rough estimation of JSON size
  return JSON.stringify(data).length;
}

function generateDashboardStats(customers: CustomerStats[], transactions: TransactionStats[]): DashboardMetrics {
  const activeCustomers = customers.filter(c => c.active);
  const totalBalance = customers.reduce((sum, c) => sum + c.balance, 0);
  const totalWeeklyPnl = customers.reduce((sum, c) => sum + c.weekly_pnl, 0);
  
  // Top customers by balance
  const topCustomers = customers
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 10)
    .map(c => ({ id: c.customer_id, balance: c.balance }));

  // Risk distribution
  const riskDistribution: Record<string, number> = {};
  customers.forEach(c => {
    const risk = c.risk_level || 'unknown';
    riskDistribution[risk] = (riskDistribution[risk] || 0) + 1;
  });

  // Balance distribution
  const balanceDistribution = {
    under100: customers.filter(c => c.balance < 100).length,
    between100And1000: customers.filter(c => c.balance >= 100 && c.balance < 1000).length,
    between1000And10000: customers.filter(c => c.balance >= 1000 && c.balance < 10000).length,
    over10000: customers.filter(c => c.balance >= 10000).length
  };

  // Activity trend (last 7 days)
  const activityTrend: Array<{date: string; count: number}> = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const count = transactions.filter(t => 
      t.timestamp.startsWith(dateStr)
    ).length;
    
    activityTrend.push({
      date: dateStr,
      count
    });
  }

  return {
    totalCustomers: customers.length,
    activeCustomers: activeCustomers.length,
    totalBalance,
    totalWeeklyPnl,
    transactionCount: transactions.length,
    averageBalance: customers.length > 0 ? totalBalance / customers.length : 0,
    topCustomers,
    riskDistribution,
    balanceDistribution,
    activityTrend
  };
}

function analyzeCustomers(customers: CustomerStats[], transactions: TransactionStats[]) {
  // Customer performance analysis
  const customerPerformance = customers.map(customer => {
    const customerTransactions = transactions.filter(t => t.customer_id === customer.customer_id);
    
    const deposits = customerTransactions
      .filter(t => t.type === 'deposit' && t.amount)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const withdrawals = customerTransactions
      .filter(t => t.type === 'withdrawal' && t.amount)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const deniedTransactions = customerTransactions.filter(t => t.type === 'denied').length;
    
    // Calculate activity score
    const daysSinceLastActivity = customer.last_activity 
      ? Math.floor((Date.now() - new Date(customer.last_activity).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    const activityScore = Math.max(0, 100 - daysSinceLastActivity * 2);
    
    // Risk assessment
    let riskScore = 0;
    if (customer.balance < 100) riskScore += 30;
    if (customer.weekly_pnl < -500) riskScore += 25;
    if (deniedTransactions > 5) riskScore += 20;
    if (daysSinceLastActivity > 7) riskScore += 15;
    if (withdrawals > deposits * 2) riskScore += 10;
    
    const riskLevel = riskScore > 60 ? 'high' : riskScore > 30 ? 'medium' : 'low';

    return {
      customer_id: customer.customer_id,
      balance: customer.balance,
      weekly_pnl: customer.weekly_pnl,
      total_deposits: deposits,
      total_withdrawals: withdrawals,
      denied_transactions: deniedTransactions,
      activity_score: activityScore,
      risk_score: riskScore,
      risk_level: riskLevel,
      days_since_activity: daysSinceLastActivity,
      transaction_count: customerTransactions.length
    };
  });

  // Sort by risk score descending
  customerPerformance.sort((a, b) => b.risk_score - a.risk_score);

  // Get high-risk customers
  const highRiskCustomers = customerPerformance.filter(c => c.risk_level === 'high');
  
  // Get inactive customers (no activity in 7+ days)
  const inactiveCustomers = customerPerformance.filter(c => c.days_since_activity > 7);
  
  // Get profitable customers
  const profitableCustomers = customerPerformance
    .filter(c => c.weekly_pnl > 0)
    .sort((a, b) => b.weekly_pnl - a.weekly_pnl)
    .slice(0, 20);

  return {
    customerPerformance,
    highRiskCustomers,
    inactiveCustomers,
    profitableCustomers,
    summary: {
      totalCustomers: customers.length,
      highRiskCount: highRiskCustomers.length,
      inactiveCount: inactiveCustomers.length,
      profitableCount: profitableCustomers.length,
      averageActivityScore: customerPerformance.reduce((sum, c) => sum + c.activity_score, 0) / customerPerformance.length
    }
  };
}

function generateTransactionSummary(transactions: TransactionStats[], timeRange: string) {
  // Parse time range
  let daysBack = 7;
  if (timeRange.endsWith('d')) {
    daysBack = parseInt(timeRange.slice(0, -1));
  } else if (timeRange.endsWith('h')) {
    daysBack = parseInt(timeRange.slice(0, -1)) / 24;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  const filteredTransactions = transactions.filter(t => 
    new Date(t.timestamp) >= cutoffDate
  );

  // Group by type
  const transactionsByType = new Map<string, TransactionStats[]>();
  filteredTransactions.forEach(tx => {
    if (!transactionsByType.has(tx.type)) {
      transactionsByType.set(tx.type, []);
    }
    transactionsByType.get(tx.type)!.push(tx);
  });

  // Calculate volumes
  const volumes = new Map<string, number>();
  const counts = new Map<string, number>();
  
  for (const [type, txs] of transactionsByType) {
    const totalAmount = txs
      .filter(tx => tx.amount !== undefined)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    volumes.set(type, totalAmount);
    counts.set(type, txs.length);
  }

  // Hourly distribution
  const hourlyDistribution = new Array(24).fill(0);
  filteredTransactions.forEach(tx => {
    const hour = new Date(tx.timestamp).getHours();
    hourlyDistribution[hour]++;
  });

  // Daily trend
  const dailyTrend: Array<{date: string; count: number; volume: number}> = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTransactions = filteredTransactions.filter(t => 
      t.timestamp.startsWith(dateStr)
    );
    
    const volume = dayTransactions
      .filter(t => t.amount !== undefined)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    dailyTrend.push({
      date: dateStr,
      count: dayTransactions.length,
      volume
    });
  }

  // Top customers by transaction count
  const customerTransactionCounts = new Map<string, number>();
  filteredTransactions.forEach(tx => {
    customerTransactionCounts.set(
      tx.customer_id, 
      (customerTransactionCounts.get(tx.customer_id) || 0) + 1
    );
  });

  const topActiveCustomers = Array.from(customerTransactionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([customerId, count]) => ({ customer_id: customerId, transaction_count: count }));

  // Anomaly detection (simple threshold-based)
  const averageDailyVolume = dailyTrend.reduce((sum, d) => sum + d.volume, 0) / dailyTrend.length;
  const anomalies = dailyTrend.filter(d => 
    d.volume > averageDailyVolume * 2 || d.volume < averageDailyVolume * 0.1
  );

  return {
    timeRange,
    totalTransactions: filteredTransactions.length,
    transactionsByType: Object.fromEntries(transactionsByType.entries()),
    volumes: Object.fromEntries(volumes.entries()),
    counts: Object.fromEntries(counts.entries()),
    hourlyDistribution,
    dailyTrend,
    topActiveCustomers,
    anomalies,
    averageDailyVolume
  };
}

function analyzeGroupActivity(groupMembers: GroupMemberStats[], customers: CustomerStats[]) {
  // Group by chat_id
  const membersByGroup = new Map<string, GroupMemberStats[]>();
  groupMembers.forEach(member => {
    if (!membersByGroup.has(member.chat_id)) {
      membersByGroup.set(member.chat_id, []);
    }
    membersByGroup.get(member.chat_id)!.push(member);
  });

  // Analyze each group
  const groupAnalysis = Array.from(membersByGroup.entries()).map(([chatId, members]) => {
    const approvedMembers = members.filter(m => m.status === 'approved');
    const pendingMembers = members.filter(m => m.status === 'pending');
    const deniedMembers = members.filter(m => m.status === 'denied');
    
    // Find linked customers
    const linkedCustomers = members
      .filter(m => m.customer_id)
      .map(m => customers.find(c => c.customer_id === m.customer_id))
      .filter(Boolean) as CustomerStats[];

    const totalBalance = linkedCustomers.reduce((sum, c) => sum + c.balance, 0);
    const averageBalance = linkedCustomers.length > 0 ? totalBalance / linkedCustomers.length : 0;

    // Recent activity (members joined in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentJoins = members.filter(m => 
      new Date(m.join_date) >= weekAgo
    ).length;

    return {
      chat_id: chatId,
      total_members: members.length,
      approved_members: approvedMembers.length,
      pending_members: pendingMembers.length,
      denied_members: deniedMembers.length,
      linked_customers: linkedCustomers.length,
      total_balance: totalBalance,
      average_balance: averageBalance,
      recent_joins: recentJoins,
      approval_rate: members.length > 0 ? (approvedMembers.length / members.length) * 100 : 0
    };
  });

  // Overall statistics
  const totalMembers = groupMembers.length;
  const totalApproved = groupMembers.filter(m => m.status === 'approved').length;
  const totalPending = groupMembers.filter(m => m.status === 'pending').length;
  const totalLinked = groupMembers.filter(m => m.customer_id).length;

  // Member status distribution
  const statusDistribution: Record<string, number> = {};
  groupMembers.forEach(member => {
    statusDistribution[member.status] = (statusDistribution[member.status] || 0) + 1;
  });

  // Daily join trend (last 7 days)
  const joinTrend: Array<{date: string; joins: number}> = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const joins = groupMembers.filter(m => 
      m.join_date.startsWith(dateStr)
    ).length;
    
    joinTrend.push({
      date: dateStr,
      joins
    });
  }

  return {
    groupAnalysis: groupAnalysis.sort((a, b) => b.total_members - a.total_members),
    summary: {
      total_members: totalMembers,
      total_approved: totalApproved,
      total_pending: totalPending,
      total_linked: totalLinked,
      approval_rate: totalMembers > 0 ? (totalApproved / totalMembers) * 100 : 0,
      link_rate: totalMembers > 0 ? (totalLinked / totalMembers) * 100 : 0
    },
    statusDistribution,
    joinTrend,
    topGroups: groupAnalysis.slice(0, 5)
  };
}

function generateRealTimeMetrics(
  customers: CustomerStats[], 
  transactions: TransactionStats[], 
  groupMembers: GroupMemberStats[]
) {
  const now = new Date();
  
  // Last 24 hours metrics
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentTransactions = transactions.filter(t => 
    new Date(t.timestamp) >= last24h
  );

  // Last hour metrics
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
  const lastHourTransactions = transactions.filter(t => 
    new Date(t.timestamp) >= lastHour
  );

  // System health indicators
  const activeCustomers = customers.filter(c => c.active);
  const lowBalanceCustomers = customers.filter(c => c.balance < 100);
  const highRiskCustomers = customers.filter(c => c.weekly_pnl < -500);
  
  // Transaction success rate (last 24h)
  const successfulTransactions = recentTransactions.filter(t => 
    t.status === 'completed' || t.status === 'success'
  );
  const successRate = recentTransactions.length > 0 
    ? (successfulTransactions.length / recentTransactions.length) * 100 
    : 100;

  // Member activity
  const pendingApprovals = groupMembers.filter(m => m.status === 'pending').length;
  
  // Revenue metrics
  const todayDeposits = recentTransactions
    .filter(t => t.type === 'deposit' && t.amount)
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const todayWithdrawals = recentTransactions
    .filter(t => t.type === 'withdrawal' && t.amount)
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return {
    timestamp: now.toISOString(),
    system_health: {
      total_customers: customers.length,
      active_customers: activeCustomers.length,
      low_balance_alerts: lowBalanceCustomers.length,
      high_risk_customers: highRiskCustomers.length,
      pending_approvals: pendingApprovals
    },
    transaction_metrics: {
      last_24h_count: recentTransactions.length,
      last_hour_count: lastHourTransactions.length,
      success_rate: successRate,
      today_deposits: todayDeposits,
      today_withdrawals: todayWithdrawals,
      net_flow: todayDeposits - todayWithdrawals
    },
    performance_indicators: {
      avg_balance: customers.reduce((sum, c) => sum + c.balance, 0) / customers.length,
      total_pnl: customers.reduce((sum, c) => sum + c.weekly_pnl, 0),
      activity_ratio: activeCustomers.length / customers.length,
      approval_backlog: pendingApprovals
    },
    alerts: [
      ...(lowBalanceCustomers.length > 5 ? [`${lowBalanceCustomers.length} customers have low balance`] : []),
      ...(highRiskCustomers.length > 0 ? [`${highRiskCustomers.length} customers at high risk`] : []),
      ...(successRate < 90 ? [`Transaction success rate below 90%: ${successRate.toFixed(1)}%`] : []),
      ...(pendingApprovals > 10 ? [`${pendingApprovals} members awaiting approval`] : [])
    ]
  };
}