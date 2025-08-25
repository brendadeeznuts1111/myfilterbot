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
  phase: 'initializing' | 'loading_config' | 'loading_database' | 'processing' | 'completed' | 'error';
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
    startTime: Date.now()
  };
  private loadingPromise: Promise<Customer[]> | null = null;

  constructor() {
    super();
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
      const configFile = await Bun.file("./customer_config.json");
      const customerConfig = await configFile.json();
      
      this.updateStatus('loading_database', 0, 1, 'customer_database.json');

      // Load database file  
      const databaseFile = await Bun.file("./customer_database.json");
      const customerDatabase = await databaseFile.json();

      const configCustomers = customerConfig.customers || {};
      const databaseCustomers = customerDatabase.customers || {};

      const customerIds = Object.keys(configCustomers);
      this.status.total = customerIds.length;

      console.log(`🏆 Processing ${customerIds.length} Fantasy402.com customers`);
      this.updateStatus('processing', 0, customerIds.length, 'Processing customers');

      // Process customers in batches for better performance
      const batchSize = 50;
      const customers: Customer[] = [];

      for (let i = 0; i < customerIds.length; i += batchSize) {
        const batch = customerIds.slice(i, i + batchSize);
        
        const batchCustomers = batch.map(customerId => {
          const configCustomer = configCustomers[customerId];
          const dbCustomer = databaseCustomers[customerId] || {};
          
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
            group_chat_id: configCustomer.group_chat_id
          };

          return customer;
        });

        customers.push(...batchCustomers);
        this.customers = customers;
        
        this.updateStatus('processing', i + batch.length, customerIds.length, 
          `Processed ${i + batch.length}/${customerIds.length} customers`);

        // Emit progress event
        this.emit('progress', this.getStatus());

        // Allow other operations to run
        if (i + batchSize < customerIds.length) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }

      const loadTime = Date.now() - this.status.startTime;
      console.log(`✅ Loaded ${customers.length} customers in ${loadTime}ms`);

      this.updateStatus('completed', customers.length, customers.length, 'Loading complete');
      this.emit('completed', customers);

      return customers;

    } catch (error) {
      console.error('❌ Customer loading failed:', error);
      this.status.phase = 'error';
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', error);
      throw error;
    }
  }

  private updateStatus(phase: LoadingStatus['phase'], progress: number, total: number, currentItem?: string) {
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
}

export { LazyCustomerLoader, type Customer, type LoadingStatus };