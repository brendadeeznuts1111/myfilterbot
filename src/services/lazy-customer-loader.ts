/**
 * Lazy Customer Loader Service
 * Optimizes startup performance by loading customer data in background
 */

import { EventEmitter } from 'events';

interface Customer {
  customer_id: string;
  password: string;
  balance: number;
  weekly_pnl: number;
  phone: string;
  telegram_id: string;
  telegram_username: string;
  active: boolean;
  last_activity: string;
  keywords: string[];
  group_chat_id: string;
}

interface LoadingStatus {
  phase:
    | 'initializing'
    | 'loading_config'
    | 'loading_database'
    | 'processing'
    | 'completed'
    | 'error';
  progress: number;
  total: number;
  currentItem?: string;
  startTime: number;
  error?: string;
}

class LazyCustomerLoader extends EventEmitter {
  private customers: Customer[] = [];
  private status: LoadingStatus = {
    phase: 'initializing',
    progress: 0,
    total: 0,
    startTime: Date.now(),
  };
  private loadingPromise: Promise<Customer[]> | null = null;

  constructor() {
    super();
    this.initializeCaching();
  }

  private initializeCaching() {
    // Initialize in-memory cache for frequently accessed customers
    this.customerCache = new Map();
    this.transactionCache = new Map();
    this.performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      avgLoadTime: 0,
      totalRequests: 0
    };
  }

  private createConnectionPool() {
    return {
      maxConnections: 10,
      activeConnections: 0,
      connectionQueue: [],
      
      async acquire() {
        if (this.activeConnections < this.maxConnections) {
          this.activeConnections++;
          return { id: `conn_${Date.now()}`, acquired: true };
        }
        return new Promise(resolve => {
          this.connectionQueue.push(resolve);
        });
      },
      
      release(connection) {
        this.activeConnections--;
        if (this.connectionQueue.length > 0) {
          const next = this.connectionQueue.shift();
          this.activeConnections++;
          next({ id: `conn_${Date.now()}`, acquired: true });
        }
      }
    };
  }

  /**
   * Get current loading status
   */
  getStatus(): LoadingStatus {
    return { ...this.status };
  }

  /**
   * Get customers (empty array if still loading)
   */
  getCustomers(): Customer[] {
    return [...this.customers];
  }

  /**
   * Check if loading is complete
   */
  isReady(): boolean {
    return this.status.phase === 'completed';
  }

  /**
   * Start background loading process
   */
  startBackgroundLoad(): Promise<Customer[]> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    console.log('🚀 Starting lazy customer loading...');
    this.loadingPromise = this.performLoad();
    return this.loadingPromise;
  }

  private async performLoad(): Promise<Customer[]> {
    try {
      this.updateStatus('loading_config', 0, 1, 'customer_config.json');

      // Load configuration file
      const configFile = await Bun.file('./customer_config.json');
      const customerConfig = await configFile.json();

      this.updateStatus('loading_database', 0, 1, 'customer_database.json');

      // Load database file
      const databaseFile = await Bun.file('./customer_database.json');
      const customerDatabase = await databaseFile.json();

      const configCustomers = customerConfig.customers || {};
      const databaseCustomers = customerDatabase.customers || {};

      const customerIds = Object.keys(configCustomers);
      this.status.total = customerIds.length;

      console.log(
        `🏆 Processing ${customerIds.length} Fantasy402.com customers`
      );
      this.updateStatus(
        'processing',
        0,
        customerIds.length,
        'Processing customers'
      );

      // Enhanced batch processing with connection pooling
      const batchSize = 100; // Increased batch size for better performance
      const customers: Customer[] = [];
      const connectionPool = this.createConnectionPool();
      
      // Pre-allocate memory for better performance
      customers.length = customerIds.length;

      for (let i = 0; i < customerIds.length; i += batchSize) {
        const batch = customerIds.slice(i, i + batchSize);
        
        // Acquire connection from pool
        const connection = await connectionPool.acquire();
        
        try {
          // Process batch in parallel for better performance
          const batchCustomers = await Promise.all(batch.map(async (customerId, index) => {
            const configCustomer = configCustomers[customerId];
            const dbCustomer = databaseCustomers[customerId] || {};
            
            // Check cache first
            const cacheKey = `customer_${customerId}`;
            if (this.customerCache?.has(cacheKey)) {
              this.performanceMetrics.cacheHits++;
              return this.customerCache.get(cacheKey);
            }
            
            this.performanceMetrics.cacheMisses++;

            const customer: Customer = {
              customer_id: customerId,
              password: configCustomer.password,
              balance: dbCustomer.balance || 0,
              weekly_pnl: dbCustomer.weekly_pnl || 0,
              phone: dbCustomer.phone || '',
              telegram_id: configCustomer.telegram_id,
              telegram_username: configCustomer.telegram_username,
              active: configCustomer.active,
              last_activity: dbCustomer.last_activity || new Date().toISOString(),
              keywords: configCustomer.keywords || [],
              group_chat_id: configCustomer.group_chat_id,
            };

            // Cache the customer for future access
            this.customerCache?.set(cacheKey, customer);
            
            return customer;
          }));

          customers.push(...batchCustomers);
          this.customers = customers;
        } finally {
          // Release connection back to pool
          connectionPool.release(connection);
        }

        this.updateStatus(
          'processing',
          i + batch.length,
          customerIds.length,
          `Processed ${i + batch.length}/${customerIds.length} customers`
        );

        // Emit progress event
        this.emit('progress', this.getStatus());

        // Allow other operations to run
        if (i + batchSize < customerIds.length) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      const loadTime = Date.now() - this.status.startTime;
      
      // Update performance metrics
      this.performanceMetrics.avgLoadTime = loadTime;
      this.performanceMetrics.totalRequests++;
      
      // Log performance statistics
      const cacheHitRate = this.performanceMetrics.totalRequests > 0 ? 
        (this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses)) * 100 : 0;
      
      console.log(`✅ Loaded ${customers.length} customers in ${loadTime}ms`);
      console.log(`📊 Cache Performance: ${cacheHitRate.toFixed(1)}% hit rate (${this.performanceMetrics.cacheHits} hits, ${this.performanceMetrics.cacheMisses} misses)`);
      console.log(`⚡ Memory Usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);

      this.updateStatus(
        'completed',
        customers.length,
        customers.length,
        'Loading complete'
      );
      this.emit('completed', customers);

      return customers;
    } catch (error) {
      console.error('❌ Customer loading failed:', error);
      this.status.phase = 'error';
      this.status.error =
        error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', error);
      throw error;
    }
  }

  private updateStatus(
    phase: LoadingStatus['phase'],
    progress: number,
    total: number,
    currentItem?: string
  ) {
    this.status.phase = phase;
    this.status.progress = progress;
    this.status.total = total;
    this.status.currentItem = currentItem;
  }

  /**
   * Wait for loading to complete
   */
  async waitForReady(): Promise<Customer[]> {
    if (this.isReady()) {
      return this.customers;
    }

    if (!this.loadingPromise) {
      return this.startBackgroundLoad();
    }

    return this.loadingPromise;
  }

  /**
   * Get loading progress as percentage
   */
  getProgressPercent(): number {
    if (this.status.total === 0) return 0;
    return Math.round((this.status.progress / this.status.total) * 100);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const cacheHitRate = this.performanceMetrics.totalRequests > 0 ? 
      (this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses)) * 100 : 0;
    
    return {
      ...this.performanceMetrics,
      cacheHitRate: cacheHitRate.toFixed(1) + '%',
      cacheSize: this.customerCache?.size || 0,
      memoryUsageMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Clear cache to free memory
   */
  clearCache() {
    this.customerCache?.clear();
    this.transactionCache?.clear();
    console.log('🧹 Customer cache cleared');
  }

  /**
   * Get cached customer (optimized access)
   */
  getCachedCustomer(customerId: string): Customer | undefined {
    const cacheKey = `customer_${customerId}`;
    if (this.customerCache?.has(cacheKey)) {
      this.performanceMetrics.cacheHits++;
      return this.customerCache.get(cacheKey);
    }
    this.performanceMetrics.cacheMisses++;
    return undefined;
  }
}

export { LazyCustomerLoader, type Customer, type LoadingStatus };
