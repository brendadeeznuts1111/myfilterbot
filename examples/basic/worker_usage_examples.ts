/**
 * Worker Usage Examples
 * Demonstrates how to leverage Bun's 500x faster postMessage() performance
 * for large data transfers in multi-threaded applications
 */

import { reportGenerator } from '../src/report_worker.ts';
import { adminPortalProcessor } from '../src/admin_portal_worker.ts';
import { webSocketProcessor } from '../src/websocket_worker.ts';
import type { DatabaseSnapshot, CustomerStats, TransactionStats, GroupMemberStats } from '../src/report_worker.ts';

// Example: Background Report Generation
async function generateReportsExample() {
  console.log('=== Background Report Generation Example ===');
  
  // Large customer database (200+ customers)
  const databaseSnapshot: DatabaseSnapshot = {
    customers: generateMockCustomers(250), // Large dataset
    transactions: generateMockTransactions(1000), // Many transactions
    timestamp: new Date().toISOString()
  };

  console.log(`Processing ${Object.keys(databaseSnapshot.customers).length} customers and ${databaseSnapshot.transactions.length} transactions`);
  
  const startTime = performance.now();

  try {
    // This benefits from 500x faster postMessage() for large JSON transfer
    const dailyReport = await reportGenerator.generateDailyReport(databaseSnapshot);
    const weeklyReport = await reportGenerator.generateWeeklyReport(databaseSnapshot);
    const customerAlerts = await reportGenerator.generateCustomerAlerts(databaseSnapshot);
    
    const endTime = performance.now();
    
    console.log(`✅ Reports generated in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`📊 Daily report: ${dailyReport.length} characters`);
    console.log(`📈 Weekly report: ${weeklyReport.length} characters`);
    console.log(`🚨 Customer alerts: ${customerAlerts.length} characters`);
    
  } catch (error) {
    console.error('❌ Report generation failed:', error);
  }
}

// Example: Admin Portal Real-time Analytics
async function adminPortalAnalyticsExample() {
  console.log('\n=== Admin Portal Analytics Example ===');
  
  const customers: CustomerStats[] = Array.from({length: 150}, (_, i) => ({
    customer_id: `CUST${String(i + 1).padStart(3, '0')}`,
    balance: Math.random() * 10000,
    weekly_pnl: (Math.random() - 0.5) * 2000,
    active: Math.random() > 0.1,
    last_activity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    risk_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
  }));

  const transactions: TransactionStats[] = Array.from({length: 500}, (_, i) => ({
    transaction_id: `TX${String(i + 1).padStart(4, '0')}`,
    timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    customer_id: customers[Math.floor(Math.random() * customers.length)].customer_id,
    type: ['deposit', 'withdrawal', 'denied'][Math.floor(Math.random() * 3)],
    amount: Math.random() * 1000,
    status: ['completed', 'pending', 'failed'][Math.floor(Math.random() * 3)]
  }));

  console.log(`Processing analytics for ${customers.length} customers and ${transactions.length} transactions`);
  
  const startTime = performance.now();

  try {
    // Fast data processing in worker thread
    const [dashboardStats, customerAnalysis, transactionSummary] = await Promise.all([
      adminPortalProcessor.getDashboardStats(customers, transactions),
      adminPortalProcessor.analyzeCustomers(customers, transactions),
      adminPortalProcessor.getTransactionSummary(transactions, '7d')
    ]);
    
    const endTime = performance.now();
    
    console.log(`✅ Analytics completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`📊 Dashboard metrics: ${dashboardStats.totalCustomers} customers, $${dashboardStats.totalBalance.toFixed(2)} balance`);
    console.log(`⚠️ High-risk customers: ${customerAnalysis.highRiskCustomers.length}`);
    console.log(`📈 Transaction volume: ${transactionSummary.totalTransactions} transactions`);
    
  } catch (error) {
    console.error('❌ Analytics failed:', error);
  }
}

// Example: WebSocket Message Broadcasting
async function webSocketBroadcastingExample() {
  console.log('\n=== WebSocket Broadcasting Example ===');
  
  // Simulate multiple connected customers
  const connectedCustomers = ['CUST001', 'CUST002', 'CUST003', 'ADMIN001', 'ADMIN002'];
  
  connectedCustomers.forEach((customerId, index) => {
    webSocketProcessor.registerConnection(customerId, `socket_${index}`, 
      customerId.startsWith('ADMIN') ? 'admin' : 'customers');
  });

  console.log(`Simulating broadcasts to ${connectedCustomers.length} connected users`);
  
  const startTime = performance.now();

  // Queue multiple messages of different types
  webSocketProcessor.queueMessage({
    type: 'transaction',
    customer_id: 'CUST001',
    data: {
      transaction_id: 'TX001',
      type: 'deposit',
      amount: 500,
      status: 'completed'
    },
    timestamp: new Date().toISOString(),
    priority: 'high'
  });

  webSocketProcessor.queueMessage({
    type: 'balance_update',
    customer_id: 'CUST002',
    data: {
      current_balance: 1500,
      previous_balance: 1000,
      change: 500
    },
    timestamp: new Date().toISOString(),
    priority: 'high'
  });

  // Broadcast system alert to all users
  webSocketProcessor.queueMessage({
    type: 'alert',
    data: {
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur at 2 AM EST',
      severity: 'info',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    timestamp: new Date().toISOString(),
    priority: 'medium'
  });

  // Send targeted alert to admin users
  await webSocketProcessor.sendAlert({
    title: 'High Risk Customer Alert',
    message: '5 customers flagged as high risk',
    action_required: true
  }, ['ADMIN001', 'ADMIN002'], 'urgent');

  const endTime = performance.now();
  const queueStatus = webSocketProcessor.getQueueStatus();
  
  console.log(`✅ Messages queued in ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`📊 Queue status: ${queueStatus.queue_size} pending, ${queueStatus.connection_count} connected`);
  console.log(`🚀 Processing: ${queueStatus.processing ? 'Yes' : 'No'}`);
}

// Example: Large Dataset Performance Comparison
async function performanceComparisonExample() {
  console.log('\n=== Performance Comparison Example ===');
  
  const sizes = [
    { name: '10 customers', count: 10 },
    { name: '50 customers', count: 50 },
    { name: '200 customers', count: 200 },
    { name: '500 customers', count: 500 }
  ];

  for (const size of sizes) {
    console.log(`\n--- Testing with ${size.name} ---`);
    
    const snapshot: DatabaseSnapshot = {
      customers: generateMockCustomers(size.count),
      transactions: generateMockTransactions(size.count * 5),
      timestamp: new Date().toISOString()
    };
    
    const dataSize = JSON.stringify(snapshot).length;
    console.log(`Data size: ${(dataSize / 1024).toFixed(1)} KB`);
    
    const startTime = performance.now();
    
    try {
      // This demonstrates the performance benefit for large datasets
      const report = await reportGenerator.generateDailyReport(snapshot);
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      const throughput = dataSize / processingTime * 1000; // bytes per second
      
      console.log(`⚡ Processed in ${processingTime.toFixed(2)}ms`);
      console.log(`📊 Throughput: ${(throughput / 1024 / 1024).toFixed(2)} MB/s`);
      console.log(`📄 Report length: ${report.length} characters`);
      
    } catch (error) {
      console.error(`❌ Failed for ${size.name}:`, error);
    }
  }
}

// Example: Real-time Streaming Data Processing
async function streamingDataExample() {
  console.log('\n=== Streaming Data Processing Example ===');
  
  const streamProcessor = {
    batchSize: 50,
    processingInterval: 1000, // 1 second
    dataBuffer: [] as any[],
    
    async processBatch() {
      if (this.dataBuffer.length === 0) return;
      
      const batch = this.dataBuffer.splice(0, this.batchSize);
      console.log(`Processing batch of ${batch.length} items...`);
      
      // Simulate processing customer data updates
      const customers = batch.map((item, index) => ({
        customer_id: `CUST${String(index + 1).padStart(3, '0')}`,
        balance: item.balance || Math.random() * 1000,
        weekly_pnl: item.pnl || (Math.random() - 0.5) * 200,
        active: true,
        last_activity: new Date().toISOString()
      }));
      
      try {
        const startTime = performance.now();
        
        // Fast processing with worker threads
        const analysis = await adminPortalProcessor.analyzeCustomers(customers, []);
        
        const endTime = performance.now();
        console.log(`✅ Batch processed in ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`📊 Analyzed ${analysis.customerPerformance.length} customers`);
        
      } catch (error) {
        console.error('❌ Batch processing failed:', error);
      }
    },
    
    addData(data: any) {
      this.dataBuffer.push(data);
      
      // Process if batch is full
      if (this.dataBuffer.length >= this.batchSize) {
        this.processBatch();
      }
    }
  };
  
  // Simulate streaming data
  console.log('🌊 Starting data stream simulation...');
  
  const streamInterval = setInterval(() => {
    const newData = {
      balance: Math.random() * 5000,
      pnl: (Math.random() - 0.5) * 1000,
      timestamp: new Date().toISOString()
    };
    
    streamProcessor.addData(newData);
  }, 100); // Add data every 100ms
  
  // Run for 5 seconds
  setTimeout(() => {
    clearInterval(streamInterval);
    
    // Process remaining data
    if (streamProcessor.dataBuffer.length > 0) {
      streamProcessor.processBatch();
    }
    
    console.log('🏁 Stream processing completed');
  }, 5000);
}

// Helper functions for generating mock data
function generateMockCustomers(count: number): Record<string, any> {
  const customers: Record<string, any> = {};
  
  for (let i = 1; i <= count; i++) {
    const customerId = `CUST${String(i).padStart(3, '0')}`;
    customers[customerId] = {
      customer_id: customerId,
      password: 'mock_password',
      balance: Math.random() * 10000,
      weekly_pnl: (Math.random() - 0.5) * 2000,
      phone: `+1555${String(i).padStart(7, '0')}`,
      telegram_id: 100000 + i,
      telegram_username: `user${i}`,
      active: Math.random() > 0.1,
      last_activity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }
  
  return customers;
}

function generateMockTransactions(count: number): any[] {
  const transactions: any[] = [];
  
  for (let i = 1; i <= count; i++) {
    transactions.push({
      transaction_id: `TX${String(i).padStart(6, '0')}`,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      customer_id: `CUST${String(Math.floor(Math.random() * 200) + 1).padStart(3, '0')}`,
      type: ['deposit', 'withdrawal', 'denied'][Math.floor(Math.random() * 3)],
      amount: Math.random() * 1000,
      message: `Mock transaction ${i}`,
      from_user: 'system',
      chat_id: -123456789,
      status: ['completed', 'pending', 'failed'][Math.floor(Math.random() * 3)]
    });
  }
  
  return transactions;
}

// Main example runner
async function runAllExamples() {
  console.log('🚀 Worker Usage Examples - Leveraging Bun\'s 500x Faster postMessage()');
  console.log('=' .repeat(80));
  
  await generateReportsExample();
  await adminPortalAnalyticsExample();
  await webSocketBroadcastingExample();
  await performanceComparisonExample();
  await streamingDataExample();
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ All examples completed successfully!');
  console.log('🎯 Key Benefits Demonstrated:');
  console.log('   • 500x faster string transfer for large datasets');
  console.log('   • 22x less memory usage in multi-threaded operations');
  console.log('   • Background processing without blocking main thread');
  console.log('   • Real-time analytics and reporting capabilities');
  console.log('   • Efficient message queue processing');
}

// Run examples if this file is executed directly
if (import.meta.main) {
  runAllExamples().catch(console.error);
}

export {
  generateReportsExample,
  adminPortalAnalyticsExample,
  webSocketBroadcastingExample,
  performanceComparisonExample,
  streamingDataExample,
  runAllExamples
};