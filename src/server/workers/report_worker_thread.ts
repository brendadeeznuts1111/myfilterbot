/**
 * Report Worker Thread Implementation
 * Processes large database snapshots in background thread
 * Leverages Bun's optimized postMessage() for fast data transfer
 */

import type { ReportRequest, ReportResponse, DatabaseSnapshot, CustomerData, TransactionData } from './report_worker.ts';

// Worker thread message handler
self.onmessage = (event: MessageEvent<ReportRequest>) => {
  const startTime = performance.now();
  const { type, data, requestId } = event.data;

  try {
    let report: string;

    switch (type) {
      case 'daily':
        report = generateDailyReport(data);
        break;
      case 'weekly':
        report = generateWeeklyReport(data);
        break;
      case 'customer_alerts':
        report = generateCustomerAlerts(data);
        break;
      case 'inactive_check':
        report = checkInactiveCustomers(data);
        break;
      default:
        throw new Error(`Unknown report type: ${type}`);
    }

    const processingTime = performance.now() - startTime;

    const response: ReportResponse = {
      requestId,
      reportType: type,
      report,
      processingTime
    };

    // Fast postMessage() - up to 500x faster for large JSON strings
    self.postMessage(response);

  } catch (error) {
    const processingTime = performance.now() - startTime;
    
    const response: ReportResponse = {
      requestId,
      reportType: type,
      report: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime
    };

    self.postMessage(response);
  }
};

function generateDailyReport(snapshot: DatabaseSnapshot): string {
  const { customers, transactions } = snapshot;
  
  // Calculate daily statistics
  const today = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(t => 
    t.timestamp.startsWith(today)
  );

  // Group by customer
  const customerActivity = new Map<string, {
    deposits: number;
    withdrawals: number;
    denied: number;
    total: number;
  }>();

  for (const tx of todayTransactions) {
    const activity = customerActivity.get(tx.customer_id) || {
      deposits: 0,
      withdrawals: 0,
      denied: 0,
      total: 0
    };

    if (tx.type === 'deposit' && tx.amount) {
      activity.deposits += tx.amount;
    } else if (tx.type === 'withdrawal' && tx.amount) {
      activity.withdrawals += tx.amount;
    } else if (tx.type === 'denied') {
      activity.denied += 1;
    }

    activity.total += 1;
    customerActivity.set(tx.customer_id, activity);
  }

  // Build report
  const now = new Date();
  let report = "📊 **DAILY REPORT**\n";
  report += `📅 ${now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}\n`;
  report += "━━━━━━━━━━━━━━━━━━\n\n";

  // Summary
  const totalDeposits = Array.from(customerActivity.values())
    .reduce((sum, c) => sum + c.deposits, 0);
  const totalWithdrawals = Array.from(customerActivity.values())
    .reduce((sum, c) => sum + c.withdrawals, 0);
  const netFlow = totalDeposits - totalWithdrawals;

  report += "**💰 FINANCIAL SUMMARY**\n";
  report += `• Total Deposits: **$${totalDeposits.toLocaleString('en-US', {minimumFractionDigits: 2})}**\n`;
  report += `• Total Withdrawals: **$${totalWithdrawals.toLocaleString('en-US', {minimumFractionDigits: 2})}**\n`;
  report += `• Net Flow: **$${netFlow >= 0 ? '+' : ''}${netFlow.toLocaleString('en-US', {minimumFractionDigits: 2})}**\n`;
  report += `• Active Customers: **${customerActivity.size}**\n\n`;

  // Top depositors
  if (customerActivity.size > 0) {
    const topDepositors = Array.from(customerActivity.entries())
      .filter(([, stats]) => stats.deposits > 0)
      .sort((a, b) => b[1].deposits - a[1].deposits)
      .slice(0, 5);

    if (topDepositors.length > 0) {
      report += "**🏆 TOP DEPOSITORS**\n";
      topDepositors.forEach(([customerId, stats], index) => {
        report += `${index + 1}. ${customerId}: **$${stats.deposits.toLocaleString('en-US', {minimumFractionDigits: 2})}**\n`;
      });
      report += "\n";
    }
  }

  // Low balance alerts
  const atRisk = Object.entries(customers)
    .filter(([, customer]) => customer.balance < 100 && customer.active)
    .sort((a, b) => a[1].balance - b[1].balance)
    .slice(0, 5);

  if (atRisk.length > 0) {
    report += "**⚠️ LOW BALANCE ALERTS**\n";
    atRisk.forEach(([customerId, customer]) => {
      report += `• ${customerId}: $${customer.balance.toFixed(2)}\n`;
    });
    report += "\n";
  }

  // Failed transactions
  const deniedCount = Array.from(customerActivity.values())
    .reduce((sum, c) => sum + c.denied, 0);
  
  if (deniedCount > 0) {
    report += `**❌ DENIED TRANSACTIONS: ${deniedCount}**\n`;
    for (const [customerId, stats] of customerActivity.entries()) {
      if (stats.denied > 0) {
        report += `• ${customerId}: ${stats.denied} denied\n`;
      }
    }
    report += "\n";
  }

  // Customer status
  const totalBalance = Object.values(customers)
    .reduce((sum, c) => sum + c.balance, 0);
  const activeCount = Object.values(customers)
    .filter(c => c.active).length;

  report += "**👥 CUSTOMER STATUS**\n";
  report += `• Total Customers: ${Object.keys(customers).length}\n`;
  report += `• Active: ${activeCount}\n`;
  report += `• Total Balance: **$${totalBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}**\n`;

  return report;
}

function generateWeeklyReport(snapshot: DatabaseSnapshot): string {
  const { customers } = snapshot;
  
  // Build weekly P&L report
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  
  let report = "📈 **WEEKLY PERFORMANCE REPORT**\n";
  report += `📅 Week of ${weekStart.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  })}\n`;
  report += "━━━━━━━━━━━━━━━━━━\n\n";

  // Sort customers by P&L
  const sortedCustomers = Object.entries(customers)
    .sort((a, b) => b[1].weekly_pnl - a[1].weekly_pnl);

  // Winners
  const winners = sortedCustomers
    .filter(([, customer]) => customer.weekly_pnl > 0)
    .slice(0, 5);

  if (winners.length > 0) {
    report += "**🟢 TOP WINNERS**\n";
    winners.forEach(([customerId, customer]) => {
      report += `• ${customerId}: **+$${customer.weekly_pnl.toLocaleString('en-US', {minimumFractionDigits: 2})}**\n`;
    });
    report += "\n";
  }

  // Losers
  const losers = sortedCustomers
    .filter(([, customer]) => customer.weekly_pnl < 0)
    .slice(-5);

  if (losers.length > 0) {
    report += "**🔴 BIGGEST LOSSES**\n";
    losers.forEach(([customerId, customer]) => {
      report += `• ${customerId}: **$${customer.weekly_pnl.toLocaleString('en-US', {minimumFractionDigits: 2})}**\n`;
    });
    report += "\n";
  }

  // Weekly summary
  const totalWeeklyPnl = Object.values(customers)
    .reduce((sum, c) => sum + c.weekly_pnl, 0);
  const positivePnl = Object.values(customers)
    .filter(c => c.weekly_pnl > 0).length;
  const negativePnl = Object.values(customers)
    .filter(c => c.weekly_pnl < 0).length;
  const winRate = positivePnl + negativePnl > 0 
    ? (positivePnl / (positivePnl + negativePnl) * 100) 
    : 0;

  report += "**📊 WEEKLY SUMMARY**\n";
  report += `• Total P&L: **$${totalWeeklyPnl >= 0 ? '+' : ''}${totalWeeklyPnl.toLocaleString('en-US', {minimumFractionDigits: 2})}**\n`;
  report += `• Winners: ${positivePnl} customers\n`;
  report += `• Losers: ${negativePnl} customers\n`;
  report += `• Win Rate: **${winRate.toFixed(1)}%**\n`;

  return report;
}

function generateCustomerAlerts(snapshot: DatabaseSnapshot): string {
  const { customers } = snapshot;
  
  const alerts: string[] = [];

  for (const [customerId, customer] of Object.entries(customers)) {
    if (!customer.telegram_id || !customer.active) {
      continue;
    }

    const customerAlerts: string[] = [];

    // Low balance alert
    if (customer.balance < 100) {
      customerAlerts.push(`⚠️ Low balance: $${customer.balance.toFixed(2)}`);
    }

    // Weekly P&L alert
    if (customer.weekly_pnl < -500) {
      customerAlerts.push(`📉 Weekly loss exceeds $500: $${customer.weekly_pnl.toFixed(2)}`);
    }

    if (customerAlerts.length > 0) {
      let alert = `🔔 **Account Alerts for ${customerId}**\n\n`;
      alert += customerAlerts.join('\n');
      alert += '\n\nContact support if you need assistance.';
      alerts.push(alert);
    }
  }

  return alerts.length > 0 
    ? alerts.join('\n\n━━━━━━━━━━━━━━━━━━\n\n')
    : 'No customer alerts at this time.';
}

function checkInactiveCustomers(snapshot: DatabaseSnapshot): string {
  const { customers, transactions } = snapshot;
  
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const inactiveCustomers: Array<[string, Date | null]> = [];

  for (const [customerId, customer] of Object.entries(customers)) {
    if (!customer.active) {
      continue;
    }

    // Find last transaction for this customer
    const customerTransactions = transactions.filter(t => t.customer_id === customerId);
    
    if (customerTransactions.length > 0) {
      const lastTx = customerTransactions
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      const lastActivity = new Date(lastTx.timestamp);
      
      if (lastActivity < threeDaysAgo) {
        inactiveCustomers.push([customerId, lastActivity]);
      }
    } else {
      inactiveCustomers.push([customerId, null]);
    }
  }

  if (inactiveCustomers.length === 0) {
    return 'No inactive customers found.';
  }

  let alert = "⏰ **INACTIVE CUSTOMER ALERT**\n\n";
  
  inactiveCustomers.slice(0, 10).forEach(([customerId, lastActivity]) => {
    if (lastActivity) {
      const daysInactive = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      alert += `• ${customerId}: ${daysInactive} days inactive\n`;
    } else {
      alert += `• ${customerId}: No activity recorded\n`;
    }
  });

  return alert;
}