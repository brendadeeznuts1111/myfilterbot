/**
 * Transaction Types and Interfaces
 * Defines transaction-related data structures for the trading platform
 */

// Transaction types based on your query parameters
export type TransactionType = 
  | 'deposit'
  | 'withdrawal'
  | 'adjustment'
  | 'transfer'
  | 'fee'
  | 'promotional'
  | 'balance'
  | 'distribution'
  | 'credit_adj'
  | 'debit_adj'
  | 'promotional_credit'
  | 'promotional_debit';

// Transaction type codes (from select element)
export enum TransactionCode {
  DEPOSIT = 'E',
  WITHDRAWAL = 'I',
  CREDIT_ADJ = 'C',
  DEBIT_ADJ = 'D',
  PROMOTIONAL_CREDIT = 'B',
  PROMOTIONAL_DEBIT = 'N'
}

// Transaction query parameters interface
export interface TransactionQueryParams {
  agentID: string;
  customerID?: string;
  startDate: string;
  endDate: string;
  deposits?: boolean;
  withdrawals?: boolean;
  adjustments?: boolean;
  transfers?: boolean;
  fees?: boolean;
  promotional?: boolean;
  balances?: boolean;
  distribution?: boolean;
  freeFlag?: 'player' | 'agent' | 'master';
  operation?: 'getTransactionHistory' | 'getTransactionSummary' | 'exportTransactions';
  RRO?: number;
  agentOwner?: string;
  agentSite?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'amount' | 'type' | 'customer';
  sortOrder?: 'asc' | 'desc';
}

// Transaction record interface
export interface Transaction {
  id: string;
  transactionID?: string;
  agentID: string;
  customerID?: string;
  customerName?: string;
  type: TransactionType;
  typeCode: TransactionCode;
  amount: number;
  balance?: number;
  previousBalance?: number;
  description?: string;
  reference?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  processedAt?: string;
  approvedBy?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

// Transaction summary interface
export interface TransactionSummary {
  agentID: string;
  period: {
    start: string;
    end: string;
  };
  totals: {
    deposits: number;
    withdrawals: number;
    adjustments: number;
    transfers: number;
    fees: number;
    promotional: number;
    net: number;
  };
  counts: {
    deposits: number;
    withdrawals: number;
    adjustments: number;
    transfers: number;
    fees: number;
    promotional: number;
    total: number;
  };
  balances: {
    opening: number;
    closing: number;
    available: number;
    pending: number;
  };
  customers: {
    active: number;
    new: number;
    total: number;
  };
}

// Transaction filter configuration
export interface TransactionFilterConfig {
  showDeposits: boolean;
  showWithdrawals: boolean;
  showAdjustments: boolean;
  showTransfers: boolean;
  showFees: boolean;
  showPromotional: boolean;
  showBalances: boolean;
  showDistribution: boolean;
  dateRange: {
    start: Date;
    end: Date;
  };
  agentFilter?: string;
  customerFilter?: string;
  amountRange?: {
    min: number;
    max: number;
  };
  statusFilter?: Transaction['status'][];
}

// Transaction response interface
export interface TransactionHistoryResponse {
  success: boolean;
  transactions: Transaction[];
  summary: TransactionSummary;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
  filters: TransactionFilterConfig;
  timestamp: string;
}

// Balance information interface
export interface BalanceInfo {
  available: number;
  pending: number;
  reserved: number;
  total: number;
  currency: string;
  lastUpdated: string;
}

// Agent billing interface
export interface AgentBilling {
  agentID: string;
  billingPeriod: string;
  transactions: Transaction[];
  summary: TransactionSummary;
  commission: {
    rate: number;
    earned: number;
    paid: number;
    pending: number;
  };
  balance: BalanceInfo;
}

// Transaction export formats
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

// Transaction export options
export interface TransactionExportOptions {
  format: ExportFormat;
  includeHeaders: boolean;
  includeSummary: boolean;
  dateFormat: string;
  timezone: string;
  fields?: (keyof Transaction)[];
}

// Helper function to map transaction codes to types
export function getTransactionType(code: TransactionCode): TransactionType {
  const mapping: Record<TransactionCode, TransactionType> = {
    [TransactionCode.DEPOSIT]: 'deposit',
    [TransactionCode.WITHDRAWAL]: 'withdrawal',
    [TransactionCode.CREDIT_ADJ]: 'adjustment',
    [TransactionCode.DEBIT_ADJ]: 'adjustment',
    [TransactionCode.PROMOTIONAL_CREDIT]: 'promotional',
    [TransactionCode.PROMOTIONAL_DEBIT]: 'promotional'
  };
  return mapping[code] || 'transfer';
}

// Helper function to format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Helper function to parse query string into TransactionQueryParams
export function parseTransactionQuery(queryString: string): TransactionQueryParams {
  const params = new URLSearchParams(queryString);
  
  return {
    agentID: params.get('agentID') || '',
    customerID: params.get('customerID') || undefined,
    startDate: params.get('startDate') || new Date().toISOString().split('T')[0],
    endDate: params.get('endDate') || new Date().toISOString().split('T')[0],
    deposits: params.get('deposits') === 'checked',
    withdrawals: params.get('withdrawals') === 'checked',
    adjustments: params.get('adjustments') === 'checked',
    transfers: params.get('transfers') === 'checked',
    fees: params.get('fees') === 'checked' || params.get('fess') === 'checked', // Handle typo
    promotional: params.get('promotional') === 'checked',
    balances: params.get('balances') === 'checked',
    distribution: params.get('distribution') === 'checked',
    freeFlag: (params.get('freeFlag') || 'player') as 'player' | 'agent' | 'master',
    operation: (params.get('operation') || 'getTransactionHistory') as TransactionQueryParams['operation'],
    RRO: parseInt(params.get('RRO') || '0'),
    agentOwner: params.get('agentOwner') || undefined,
    agentSite: parseInt(params.get('agentSite') || '0') || undefined
  };
}