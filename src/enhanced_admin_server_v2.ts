#!/usr/bin/env bun
/**
 * Enhanced Admin Server v2.0
 * Scalable TypeScript server for managing 200+ customers with bulk operations
 * Built with Bun runtime for maximum performance
 */

import type { Server } from "bun";

interface Customer {
  customer_id: string;
  password: string;
  balance: number;
  weekly_pnl: number;
  phone: string;
  telegram_id?: number;
  telegram_username?: string;
  active: boolean;
  last_activity?: string;
  risk_level?: string;
  kyc_status?: string;
  created_at?: string;
  updated_at?: string;
}

interface Transaction {
  id: string;
  timestamp: string;
  customer_id: string;
  type: string;
  amount?: number;
  message: string;
  from_user: string;
  chat_id: number;
  status: string;
  payment_method?: string;
  reference_id?: string;
}

interface GroupChat {
  chat_id: string;
  name: string;
  description: string;
  active: boolean;
  created_at: string;
  member_count: number;
  keywords: string[];
  admin_ids: number[];
}

interface BulkOperation {
  id: string;
  type: 'balance_update' | 'status_change' | 'bulk_message' | 'data_export';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_items: number;
  processed_items: number;
  created_at: string;
  completed_at?: string;
  created_by: string;
  params: Record<string, any>;
  results?: any[];
  errors?: string[];
}

interface SystemHealth {
  database: {
    connected: boolean;
    response_time: number;
    customer_count: number;
    transaction_count: number;
  };
  cache: {
    hit_rate: number;
    memory_usage: number;
    active_connections: number;
  };
  queue: {
    pending_transactions: number;
    processing_transactions: number;
    failed_transactions: number;
    success_rate: number;
  };
  groups: {
    total_groups: number;
    active_groups: number;
    messages_processed: number;
  };
  performance: {
    cpu_usage: number;
    memory_usage: number;
    uptime: number;
    response_time: number;
  };
}

class EnhancedAdminServer {
  private server: Server | null = null;
  private bulkOperations: Map<string, BulkOperation> = new Map();
  private customers: Customer[] = [];
  private transactions: Transaction[] = [];
  private groups: GroupChat[] = [];
  private systemHealth: SystemHealth;

  constructor() {
    this.initializeMockData();
    this.systemHealth = this.generateSystemHealth();
    
    // Update system health every 30 seconds
    setInterval(() => {
      this.systemHealth = this.generateSystemHealth();
    }, 30000);
  }

  private initializeMockData() {
    // Generate 200 mock customers
    this.customers = Array.from({ length: 200 }, (_, i) => ({
      customer_id: `BB${1000 + i}`,
      password: this.generatePassword(),
      balance: Math.random() * 50000,
      weekly_pnl: (Math.random() - 0.5) * 10000,
      phone: this.generatePhone(),
      telegram_id: Math.random() > 0.3 ? Math.floor(Math.random() * 1000000000) : undefined,
      telegram_username: Math.random() > 0.3 ? `@user${1000 + i}` : undefined,
      active: Math.random() > 0.1,
      last_activity: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
      risk_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      kyc_status: ['approved', 'pending', 'rejected', 'not_started'][Math.floor(Math.random() * 4)],
      created_at: new Date(Date.now() - Math.random() * 86400000 * 365).toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Generate mock transactions
    this.transactions = Array.from({ length: 1000 }, (_, i) => ({
      id: `TX_${Date.now()}_${i}`,
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      customer_id: this.customers[Math.floor(Math.random() * this.customers.length)].customer_id,
      type: ['deposit', 'withdrawal', 'denied', 'pending'][Math.floor(Math.random() * 4)],
      amount: Math.random() * 5000,
      message: `Transaction ${i + 1}`,
      from_user: `@user${Math.floor(Math.random() * 100)}`,
      chat_id: -Math.floor(Math.random() * 1000000000),
      status: ['completed', 'pending', 'failed'][Math.floor(Math.random() * 3)],
      payment_method: ['stripe', 'paypal', 'crypto'][Math.floor(Math.random() * 3)],
      reference_id: `REF_${Date.now()}_${i}`
    }));

    // Generate mock groups
    this.groups = Array.from({ length: 10 }, (_, i) => ({
      chat_id: `-${1000000000 + i}`,
      name: `Trading Group ${i + 1}`,
      description: `Trading group for region ${i + 1}`,
      active: Math.random() > 0.2,
      created_at: new Date(Date.now() - Math.random() * 86400000 * 100).toISOString(),
      member_count: Math.floor(Math.random() * 500) + 50,
      keywords: ['deposit', 'withdrawal', 'trade', `group${i}`],
      admin_ids: [123456789, 987654321]
    }));
  }

  private generatePassword(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  private generatePhone(): string {
    return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
  }

  private generateSystemHealth(): SystemHealth {
    return {
      database: {
        connected: true,
        response_time: Math.random() * 100 + 10,
        customer_count: this.customers.length,
        transaction_count: this.transactions.length
      },
      cache: {
        hit_rate: Math.random() * 0.3 + 0.7, // 70-100%
        memory_usage: Math.random() * 50 + 30, // 30-80%
        active_connections: Math.floor(Math.random() * 20) + 5
      },
      queue: {
        pending_transactions: Math.floor(Math.random() * 50),
        processing_transactions: Math.floor(Math.random() * 10),
        failed_transactions: Math.floor(Math.random() * 5),
        success_rate: Math.random() * 0.1 + 0.9 // 90-100%
      },
      groups: {
        total_groups: this.groups.length,
        active_groups: this.groups.filter(g => g.active).length,
        messages_processed: Math.floor(Math.random() * 10000) + 5000
      },
      performance: {
        cpu_usage: Math.random() * 50 + 20, // 20-70%
        memory_usage: Math.random() * 40 + 40, // 40-80%
        uptime: Math.floor(Math.random() * 86400 * 30), // Up to 30 days in seconds
        response_time: Math.random() * 200 + 50 // 50-250ms
      }
    };
  }

  private async handleBulkOperation(operation: BulkOperation): Promise<void> {
    operation.status = 'processing';
    operation.results = [];
    operation.errors = [];

    try {
      switch (operation.type) {
        case 'balance_update':
          await this.processBulkBalanceUpdate(operation);
          break;
        case 'status_change':
          await this.processBulkStatusChange(operation);
          break;
        case 'bulk_message':
          await this.processBulkMessage(operation);
          break;
        case 'data_export':
          await this.processDataExport(operation);
          break;
      }
      
      operation.status = 'completed';
      operation.completed_at = new Date().toISOString();
    } catch (error) {
      operation.status = 'failed';
      operation.errors?.push(error instanceof Error ? error.message : 'Unknown error');
      operation.completed_at = new Date().toISOString();
    }
  }

  private async processBulkBalanceUpdate(operation: BulkOperation): Promise<void> {
    const { customer_ids, amount_type, amount } = operation.params;
    
    for (const customerId of customer_ids) {
      try {
        const customer = this.customers.find(c => c.customer_id === customerId);
        if (customer) {
          if (amount_type === 'add') {
            customer.balance += amount;
          } else if (amount_type === 'subtract') {
            customer.balance -= amount;
          } else if (amount_type === 'set') {
            customer.balance = amount;
          }
          customer.updated_at = new Date().toISOString();
          operation.results?.push({ customer_id: customerId, success: true, new_balance: customer.balance });
        } else {
          operation.errors?.push(`Customer ${customerId} not found`);
        }
        
        operation.processed_items++;
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        operation.errors?.push(`Error processing ${customerId}: ${error}`);
      }
    }
  }

  private async processBulkStatusChange(operation: BulkOperation): Promise<void> {
    const { customer_ids, new_status } = operation.params;
    
    for (const customerId of customer_ids) {
      try {
        const customer = this.customers.find(c => c.customer_id === customerId);
        if (customer) {
          customer.active = new_status === 'active';
          customer.updated_at = new Date().toISOString();
          operation.results?.push({ customer_id: customerId, success: true, new_status: customer.active ? 'active' : 'inactive' });
        } else {
          operation.errors?.push(`Customer ${customerId} not found`);
        }
        
        operation.processed_items++;
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        operation.errors?.push(`Error processing ${customerId}: ${error}`);
      }
    }
  }

  private async processBulkMessage(operation: BulkOperation): Promise<void> {
    const { customer_ids, message_text } = operation.params;
    
    for (const customerId of customer_ids) {
      try {
        const customer = this.customers.find(c => c.customer_id === customerId);
        if (customer && customer.telegram_id) {
          // Simulate sending message
          operation.results?.push({ 
            customer_id: customerId, 
            success: true, 
            telegram_id: customer.telegram_id 
          });
        } else {
          operation.errors?.push(`Customer ${customerId} has no Telegram account`);
        }
        
        operation.processed_items++;
        
        // Simulate message sending time
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        operation.errors?.push(`Error sending message to ${customerId}: ${error}`);
      }
    }
  }

  private async processDataExport(operation: BulkOperation): Promise<void> {
    const { export_type, filters } = operation.params;
    
    try {
      let data: any[] = [];
      
      if (export_type === 'customers') {
        data = this.customers.filter(customer => {
          if (filters.active !== undefined && customer.active !== filters.active) return false;
          if (filters.risk_level && customer.risk_level !== filters.risk_level) return false;
          if (filters.kyc_status && customer.kyc_status !== filters.kyc_status) return false;
          return true;
        });
      } else if (export_type === 'transactions') {
        data = this.transactions.filter(tx => {
          if (filters.type && tx.type !== filters.type) return false;
          if (filters.status && tx.status !== filters.status) return false;
          if (filters.date_from && new Date(tx.timestamp) < new Date(filters.date_from)) return false;
          if (filters.date_to && new Date(tx.timestamp) > new Date(filters.date_to)) return false;
          return true;
        });
      }
      
      // Simulate export processing
      const chunkSize = 50;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        operation.processed_items = Math.min(i + chunkSize, data.length);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      operation.results = [{
        export_type,
        record_count: data.length,
        file_url: `/exports/${operation.id}.csv`,
        generated_at: new Date().toISOString()
      }];
      
    } catch (error) {
      operation.errors?.push(`Export failed: ${error}`);
    }
  }

  public start(port: number = 8080): void {
    this.server = Bun.serve({
      port,
      fetch: this.handleRequest.bind(this),
      error: (error) => {
        console.error('Server error:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    });

    console.log(`🚀 Enhanced Admin Server v2.0 started on port ${port}`);
    console.log(`📊 Managing ${this.customers.length} customers`);
    console.log(`💳 ${this.transactions.length} transactions loaded`);
    console.log(`👥 ${this.groups.length} groups configured`);
  }

  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const response = await this.routeRequest(path, method, request);
      return new Response(response.body, {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Request handling error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  private async routeRequest(path: string, method: string, request: Request) {
    // Dashboard stats
    if (path === '/api/dashboard/stats' && method === 'GET') {
      return {
        status: 200,
        body: JSON.stringify({
          customers: {
            total: this.customers.length,
            active: this.customers.filter(c => c.active).length,
            registered: this.customers.filter(c => c.telegram_id).length,
            total_balance: this.customers.reduce((sum, c) => sum + c.balance, 0),
            total_weekly_pnl: this.customers.reduce((sum, c) => sum + c.weekly_pnl, 0)
          },
          transactions: {
            total: this.transactions.length,
            today: this.transactions.filter(t => 
              new Date(t.timestamp).toDateString() === new Date().toDateString()
            ).length,
            pending: this.transactions.filter(t => t.status === 'pending').length,
            failed: this.transactions.filter(t => t.status === 'failed').length
          },
          groups: {
            total: this.groups.length,
            active: this.groups.filter(g => g.active).length,
            total_members: this.groups.reduce((sum, g) => sum + g.member_count, 0)
          },
          system: this.systemHealth
        })
      };
    }

    // Customers API
    if (path === '/api/customers' && method === 'GET') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const search = url.searchParams.get('search') || '';
      const status = url.searchParams.get('status') || '';
      const risk_level = url.searchParams.get('risk_level') || '';
      const sort = url.searchParams.get('sort') || 'customer_id';
      const order = url.searchParams.get('order') || 'asc';

      let filteredCustomers = this.customers;

      // Apply filters
      if (search) {
        filteredCustomers = filteredCustomers.filter(c =>
          c.customer_id.toLowerCase().includes(search.toLowerCase()) ||
          (c.telegram_username && c.telegram_username.toLowerCase().includes(search.toLowerCase()))
        );
      }

      if (status) {
        filteredCustomers = filteredCustomers.filter(c =>
          status === 'active' ? c.active : !c.active
        );
      }

      if (risk_level) {
        filteredCustomers = filteredCustomers.filter(c => c.risk_level === risk_level);
      }

      // Apply sorting
      filteredCustomers.sort((a, b) => {
        const aValue = a[sort as keyof Customer];
        const bValue = b[sort as keyof Customer];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return order === 'asc' ? aValue - bValue : bValue - aValue;
        }
        return 0;
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + limit);

      return {
        status: 200,
        body: JSON.stringify({
          customers: paginatedCustomers,
          pagination: {
            page,
            limit,
            total: filteredCustomers.length,
            total_pages: Math.ceil(filteredCustomers.length / limit)
          },
          filters: { search, status, risk_level, sort, order }
        })
      };
    }

    // Bulk operations
    if (path === '/api/bulk-operations' && method === 'POST') {
      const body = await request.json();
      const operation: BulkOperation = {
        id: `BULK_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: body.type,
        status: 'pending',
        total_items: body.customer_ids?.length || 0,
        processed_items: 0,
        created_at: new Date().toISOString(),
        created_by: 'admin',
        params: body.params || {}
      };

      this.bulkOperations.set(operation.id, operation);

      // Start processing in background
      this.handleBulkOperation(operation);

      return {
        status: 202,
        body: JSON.stringify({
          operation_id: operation.id,
          status: operation.status,
          message: 'Bulk operation queued successfully'
        })
      };
    }

    // Get bulk operation status
    if (path.startsWith('/api/bulk-operations/') && method === 'GET') {
      const operationId = path.split('/')[3];
      const operation = this.bulkOperations.get(operationId);

      if (!operation) {
        return {
          status: 404,
          body: JSON.stringify({ error: 'Operation not found' })
        };
      }

      return {
        status: 200,
        body: JSON.stringify({
          ...operation,
          progress: operation.total_items > 0 ? (operation.processed_items / operation.total_items) * 100 : 0
        })
      };
    }

    // System health
    if (path === '/api/system/health' && method === 'GET') {
      return {
        status: 200,
        body: JSON.stringify(this.systemHealth)
      };
    }

    // Transactions API
    if (path === '/api/transactions' && method === 'GET') {
      const customerId = url.searchParams.get('customer_id');
      const type = url.searchParams.get('type');
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '100');

      let filteredTransactions = this.transactions;

      if (customerId) {
        filteredTransactions = filteredTransactions.filter(t => t.customer_id === customerId);
      }
      if (type) {
        filteredTransactions = filteredTransactions.filter(t => t.type === type);
      }
      if (status) {
        filteredTransactions = filteredTransactions.filter(t => t.status === status);
      }

      // Sort by timestamp descending
      filteredTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        status: 200,
        body: JSON.stringify({
          transactions: filteredTransactions.slice(0, limit),
          total: filteredTransactions.length
        })
      };
    }

    // Groups API
    if (path === '/api/groups' && method === 'GET') {
      return {
        status: 200,
        body: JSON.stringify({
          groups: this.groups,
          total: this.groups.length
        })
      };
    }

    // Analytics API
    if (path === '/api/analytics/overview' && method === 'GET') {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const weeklyTransactions = this.transactions.filter(t => new Date(t.timestamp) >= lastWeek);
      const monthlyTransactions = this.transactions.filter(t => new Date(t.timestamp) >= lastMonth);

      return {
        status: 200,
        body: JSON.stringify({
          customer_growth: {
            total: this.customers.length,
            weekly_new: this.customers.filter(c => c.created_at && new Date(c.created_at) >= lastWeek).length,
            monthly_new: this.customers.filter(c => c.created_at && new Date(c.created_at) >= lastMonth).length
          },
          transaction_volume: {
            weekly: weeklyTransactions.length,
            monthly: monthlyTransactions.length,
            weekly_amount: weeklyTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
            monthly_amount: monthlyTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
          },
          top_performers: this.customers
            .sort((a, b) => b.weekly_pnl - a.weekly_pnl)
            .slice(0, 10)
            .map(c => ({ customer_id: c.customer_id, weekly_pnl: c.weekly_pnl, balance: c.balance })),
          risk_distribution: {
            low: this.customers.filter(c => c.risk_level === 'low').length,
            medium: this.customers.filter(c => c.risk_level === 'medium').length,
            high: this.customers.filter(c => c.risk_level === 'high').length
          }
        })
      };
    }

    // 404 - Not found
    return {
      status: 404,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };
  }
}

// Start the server
const server = new EnhancedAdminServer();
server.start(8080);

export default server;