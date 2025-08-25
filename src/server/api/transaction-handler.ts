/**
 * Transaction History API Handler
 * Handles transaction queries, filtering, and reporting
 */

import type { 
  TransactionQueryParams, 
  Transaction, 
  TransactionSummary, 
  TransactionHistoryResponse,
  TransactionCode 
} from '../../shared/types/transactions';
import { getTransactionType, formatCurrency } from '../../shared/types/transactions';

export class TransactionHandler {
  private corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  /**
   * Handle transaction history request
   */
  async handleTransactionHistory(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const queryParams = this.parseQueryParams(url.searchParams);
      
      // Validate required parameters
      if (!queryParams.agentID) {
        return this.errorResponse('Agent ID is required', 400);
      }

      // Fetch transactions based on query parameters
      const transactions = await this.fetchTransactions(queryParams);
      
      // Calculate summary
      const summary = this.calculateSummary(transactions, queryParams);
      
      // Build response
      const response: TransactionHistoryResponse = {
        success: true,
        transactions,
        summary,
        pagination: {
          total: transactions.length,
          page: 1,
          pageSize: queryParams.limit || 100,
          hasMore: false
        },
        filters: {
          showDeposits: queryParams.deposits || false,
          showWithdrawals: queryParams.withdrawals || false,
          showAdjustments: queryParams.adjustments || false,
          showTransfers: queryParams.transfers || false,
          showFees: queryParams.fees || false,
          showPromotional: queryParams.promotional || false,
          showBalances: queryParams.balances || false,
          showDistribution: queryParams.distribution || false,
          dateRange: {
            start: new Date(queryParams.startDate),
            end: new Date(queryParams.endDate)
          },
          agentFilter: queryParams.agentID,
          customerFilter: queryParams.customerID
        },
        timestamp: new Date().toISOString()
      };

      return Response.json(response, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Transaction history error:', error);
      return this.errorResponse(error.message || 'Failed to fetch transaction history', 500);
    }
  }

  /**
   * Parse query parameters from URL
   */
  private parseQueryParams(params: URLSearchParams): TransactionQueryParams {
    return {
      agentID: params.get('agentID') || '',
      customerID: params.get('customerID') || undefined,
      startDate: params.get('startDate') || new Date().toISOString().split('T')[0],
      endDate: params.get('endDate') || new Date().toISOString().split('T')[0],
      deposits: params.get('deposits') === 'checked' || params.get('deposits') === 'true',
      withdrawals: params.get('withdrawals') === 'checked' || params.get('withdrawals') === 'true',
      adjustments: params.get('adjustments') === 'checked' || params.get('adjustments') === 'true',
      transfers: params.get('transfers') === 'checked' || params.get('transfers') === 'true',
      fees: params.get('fees') === 'checked' || params.get('fess') === 'checked', // Handle typo
      promotional: params.get('promotional') === 'checked' || params.get('promotional') === 'true',
      balances: params.get('balances') === 'checked' || params.get('balances') === 'true',
      distribution: params.get('distribution') === 'checked' || params.get('distribution') === 'true',
      freeFlag: (params.get('freeFlag') || 'player') as 'player' | 'agent' | 'master',
      operation: (params.get('operation') || 'getTransactionHistory') as TransactionQueryParams['operation'],
      RRO: parseInt(params.get('RRO') || '0'),
      agentOwner: params.get('agentOwner') || undefined,
      agentSite: parseInt(params.get('agentSite') || '0') || undefined,
      limit: parseInt(params.get('limit') || '100'),
      offset: parseInt(params.get('offset') || '0'),
      sortBy: (params.get('sortBy') || 'date') as TransactionQueryParams['sortBy'],
      sortOrder: (params.get('sortOrder') || 'desc') as TransactionQueryParams['sortOrder']
    };
  }

  /**
   * Fetch transactions from database
   */
  private async fetchTransactions(params: TransactionQueryParams): Promise<Transaction[]> {
    try {
      // Load from customer database
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      let transactions: Transaction[] = [];
      
      if (customerData.transactions) {
        const rawTransactions = Object.values(customerData.transactions) as any[];
        
        // Filter and transform transactions
        transactions = rawTransactions
          .filter(t => this.filterTransaction(t, params))
          .map(t => this.transformTransaction(t, params.agentID))
          .sort((a, b) => {
            if (params.sortBy === 'date') {
              const dateA = new Date(a.timestamp).getTime();
              const dateB = new Date(b.timestamp).getTime();
              return params.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            } else if (params.sortBy === 'amount') {
              return params.sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
            }
            return 0;
          });
        
        // Apply pagination
        if (params.limit && params.offset !== undefined) {
          transactions = transactions.slice(params.offset, params.offset + params.limit);
        }
      }
      
      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  /**
   * Filter transaction based on query parameters
   */
  private filterTransaction(transaction: any, params: TransactionQueryParams): boolean {
    // Date range filter
    const transactionDate = new Date(transaction.timestamp || transaction.created_at);
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    endDate.setHours(23, 59, 59, 999); // Include entire end date
    
    if (transactionDate < startDate || transactionDate > endDate) {
      return false;
    }
    
    // Agent filter
    if (params.agentID && transaction.agent_id !== params.agentID) {
      // Check if transaction belongs to agent's customers
      if (!transaction.customer_id || !this.isAgentCustomer(transaction.customer_id, params.agentID)) {
        return false;
      }
    }
    
    // Customer filter
    if (params.customerID && transaction.customer_id !== params.customerID) {
      return false;
    }
    
    // Transaction type filters
    const type = transaction.type?.toLowerCase() || '';
    
    if (params.deposits && (type === 'deposit' || type === 'e')) return true;
    if (params.withdrawals && (type === 'withdrawal' || type === 'i')) return true;
    if (params.adjustments && (type === 'adjustment' || type === 'c' || type === 'd')) return true;
    if (params.transfers && type === 'transfer') return true;
    if (params.fees && type === 'fee') return true;
    if (params.promotional && (type === 'promotional' || type === 'b' || type === 'n')) return true;
    if (params.balances && type === 'balance') return true;
    if (params.distribution && type === 'distribution') return true;
    
    // If no type filters are selected, include all
    if (!params.deposits && !params.withdrawals && !params.adjustments && 
        !params.transfers && !params.fees && !params.promotional && 
        !params.balances && !params.distribution) {
      return true;
    }
    
    return false;
  }

  /**
   * Transform raw transaction to Transaction interface
   */
  private transformTransaction(raw: any, agentID: string): Transaction {
    // Determine transaction type code
    let typeCode: TransactionCode = TransactionCode.DEPOSIT;
    const type = raw.type?.toLowerCase() || '';
    
    if (type === 'deposit' || type === 'e') typeCode = TransactionCode.DEPOSIT;
    else if (type === 'withdrawal' || type === 'i') typeCode = TransactionCode.WITHDRAWAL;
    else if (type === 'credit_adj' || type === 'c') typeCode = TransactionCode.CREDIT_ADJ;
    else if (type === 'debit_adj' || type === 'd') typeCode = TransactionCode.DEBIT_ADJ;
    else if (type === 'promotional_credit' || type === 'b') typeCode = TransactionCode.PROMOTIONAL_CREDIT;
    else if (type === 'promotional_debit' || type === 'n') typeCode = TransactionCode.PROMOTIONAL_DEBIT;
    
    return {
      id: raw.id || raw.transaction_id || `txn_${Date.now()}`,
      transactionID: raw.transaction_id,
      agentID: raw.agent_id || agentID,
      customerID: raw.customer_id,
      customerName: raw.customer_name,
      type: getTransactionType(typeCode),
      typeCode,
      amount: parseFloat(raw.amount) || 0,
      balance: raw.balance,
      previousBalance: raw.previous_balance,
      description: raw.description || raw.note || this.getDefaultDescription(typeCode),
      reference: raw.reference || raw.ref_id,
      status: raw.status || 'completed',
      timestamp: raw.timestamp || raw.created_at || new Date().toISOString(),
      processedAt: raw.processed_at,
      approvedBy: raw.approved_by || raw.agent_id,
      ip: raw.ip_address,
      userAgent: raw.user_agent,
      metadata: raw.metadata || {}
    };
  }

  /**
   * Get default description for transaction type
   */
  private getDefaultDescription(typeCode: TransactionCode): string {
    const descriptions: Record<TransactionCode, string> = {
      [TransactionCode.DEPOSIT]: 'Deposit',
      [TransactionCode.WITHDRAWAL]: 'Withdrawal',
      [TransactionCode.CREDIT_ADJ]: 'Credit Adjustment',
      [TransactionCode.DEBIT_ADJ]: 'Debit Adjustment',
      [TransactionCode.PROMOTIONAL_CREDIT]: 'Promotional Credit',
      [TransactionCode.PROMOTIONAL_DEBIT]: 'Promotional Debit'
    };
    return descriptions[typeCode] || 'Transaction';
  }

  /**
   * Check if customer belongs to agent
   */
  private isAgentCustomer(customerID: string, agentID: string): boolean {
    // TODO: Implement proper agent-customer relationship check
    // For now, return true to show all transactions
    return true;
  }

  /**
   * Calculate transaction summary
   */
  private calculateSummary(transactions: Transaction[], params: TransactionQueryParams): TransactionSummary {
    const summary: TransactionSummary = {
      agentID: params.agentID,
      period: {
        start: params.startDate,
        end: params.endDate
      },
      totals: {
        deposits: 0,
        withdrawals: 0,
        adjustments: 0,
        transfers: 0,
        fees: 0,
        promotional: 0,
        net: 0
      },
      counts: {
        deposits: 0,
        withdrawals: 0,
        adjustments: 0,
        transfers: 0,
        fees: 0,
        promotional: 0,
        total: transactions.length
      },
      balances: {
        opening: 0,
        closing: 0,
        available: 10011.00, // From your HTML snippet
        pending: 0
      },
      customers: {
        active: 0,
        new: 0,
        total: 0
      }
    };

    // Calculate totals and counts
    const uniqueCustomers = new Set<string>();
    
    transactions.forEach(t => {
      if (t.customerID) {
        uniqueCustomers.add(t.customerID);
      }
      
      switch (t.type) {
        case 'deposit':
          summary.totals.deposits += t.amount;
          summary.counts.deposits++;
          break;
        case 'withdrawal':
          summary.totals.withdrawals += Math.abs(t.amount);
          summary.counts.withdrawals++;
          break;
        case 'adjustment':
          summary.totals.adjustments += t.amount;
          summary.counts.adjustments++;
          break;
        case 'transfer':
          summary.totals.transfers += t.amount;
          summary.counts.transfers++;
          break;
        case 'fee':
          summary.totals.fees += Math.abs(t.amount);
          summary.counts.fees++;
          break;
        case 'promotional':
          summary.totals.promotional += t.amount;
          summary.counts.promotional++;
          break;
      }
    });
    
    // Calculate net
    summary.totals.net = summary.totals.deposits - summary.totals.withdrawals + 
                         summary.totals.adjustments + summary.totals.transfers - 
                         summary.totals.fees + summary.totals.promotional;
    
    // Update customer counts
    summary.customers.total = uniqueCustomers.size;
    summary.customers.active = uniqueCustomers.size; // Simplified - all are considered active
    
    // Set opening and closing balances from first and last transactions
    if (transactions.length > 0) {
      summary.balances.opening = transactions[0].previousBalance || 0;
      summary.balances.closing = transactions[transactions.length - 1].balance || summary.balances.available;
    }
    
    return summary;
  }

  /**
   * Return error response
   */
  private errorResponse(message: string, status: number): Response {
    return Response.json(
      { success: false, error: message },
      { status, headers: this.corsHeaders }
    );
  }
}

// Export singleton instance
export const transactionHandler = new TransactionHandler();