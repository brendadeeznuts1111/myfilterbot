/**
 * Financial Calculator with Math.sumPrecise
 * New in Bun v1.2.18: Math.sumPrecise for accurate financial calculations
 * Prevents floating-point rounding errors in financial computations
 */

export class FinancialCalculator {
  /**
   * Calculate total balance using Math.sumPrecise
   * Avoids floating-point errors common in financial calculations
   */
  static calculateTotalBalance(transactions: number[]): number {
    // Bun v1.2.18: Math.sumPrecise for accurate summation
    return Math.sumPrecise(transactions);
  }

  /**
   * Calculate portfolio value with precise arithmetic
   */
  static calculatePortfolioValue(
    holdings: Array<{ quantity: number; price: number }>
  ): number {
    const values = holdings.map(h => h.quantity * h.price);
    return Math.sumPrecise(values);
  }

  /**
   * Calculate trading P&L (Profit and Loss)
   */
  static calculatePnL(
    trades: Array<{
      type: 'buy' | 'sell';
      quantity: number;
      price: number;
      fees: number;
    }>
  ): {
    totalBought: number;
    totalSold: number;
    totalFees: number;
    netPnL: number;
    positions: number;
  } {
    const buys: number[] = [];
    const sells: number[] = [];
    const fees: number[] = [];
    let positions = 0;

    for (const trade of trades) {
      const tradeValue = trade.quantity * trade.price;
      fees.push(trade.fees);

      if (trade.type === 'buy') {
        buys.push(tradeValue);
        positions += trade.quantity;
      } else {
        sells.push(tradeValue);
        positions -= trade.quantity;
      }
    }

    // Use Math.sumPrecise for accurate totals
    const totalBought = Math.sumPrecise(buys);
    const totalSold = Math.sumPrecise(sells);
    const totalFees = Math.sumPrecise(fees);

    // Calculate net P&L
    const netPnL = totalSold - totalBought - totalFees;

    return {
      totalBought,
      totalSold,
      totalFees,
      netPnL,
      positions,
    };
  }

  /**
   * Calculate compound interest with precision
   */
  static calculateCompoundInterest(
    principal: number,
    rate: number,
    time: number,
    compound: number = 12
  ): {
    futureValue: number;
    totalInterest: number;
    effectiveRate: number;
  } {
    // A = P(1 + r/n)^(nt)
    const futureValue =
      principal * Math.pow(1 + rate / compound, compound * time);
    const totalInterest = futureValue - principal;
    const effectiveRate = Math.pow(1 + rate / compound, compound) - 1;

    return {
      futureValue: Number(futureValue.toFixed(2)),
      totalInterest: Number(totalInterest.toFixed(2)),
      effectiveRate: Number((effectiveRate * 100).toFixed(4)),
    };
  }

  /**
   * Calculate transaction fees with precision
   */
  static calculateTransactionFees(
    transactions: Array<{
      amount: number;
      feePercentage: number;
      flatFee?: number;
    }>
  ): {
    totalAmount: number;
    totalFees: number;
    netAmount: number;
    averageFeePercentage: number;
  } {
    const amounts: number[] = [];
    const fees: number[] = [];

    for (const tx of transactions) {
      amounts.push(tx.amount);

      const percentageFee = tx.amount * (tx.feePercentage / 100);
      const totalFee = percentageFee + (tx.flatFee || 0);
      fees.push(totalFee);
    }

    const totalAmount = Math.sumPrecise(amounts);
    const totalFees = Math.sumPrecise(fees);
    const netAmount = totalAmount - totalFees;
    const averageFeePercentage = (totalFees / totalAmount) * 100;

    return {
      totalAmount: Number(totalAmount.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2)),
      averageFeePercentage: Number(averageFeePercentage.toFixed(4)),
    };
  }

  /**
   * Calculate weighted average price
   */
  static calculateWeightedAverage(
    items: Array<{
      price: number;
      quantity: number;
    }>
  ): number {
    const weightedValues = items.map(item => item.price * item.quantity);
    const totalQuantity = Math.sumPrecise(items.map(item => item.quantity));
    const totalWeightedValue = Math.sumPrecise(weightedValues);

    return totalWeightedValue / totalQuantity;
  }

  /**
   * Calculate daily balance changes
   */
  static calculateDailyChanges(
    balances: Array<{
      date: string;
      deposits: number[];
      withdrawals: number[];
    }>
  ): Array<{
    date: string;
    totalDeposits: number;
    totalWithdrawals: number;
    netChange: number;
    runningBalance: number;
  }> {
    let runningBalance = 0;
    const results = [];

    for (const day of balances) {
      const totalDeposits = Math.sumPrecise(day.deposits);
      const totalWithdrawals = Math.sumPrecise(day.withdrawals);
      const netChange = totalDeposits - totalWithdrawals;
      runningBalance += netChange;

      results.push({
        date: day.date,
        totalDeposits: Number(totalDeposits.toFixed(2)),
        totalWithdrawals: Number(totalWithdrawals.toFixed(2)),
        netChange: Number(netChange.toFixed(2)),
        runningBalance: Number(runningBalance.toFixed(2)),
      });
    }

    return results;
  }

  /**
   * Validate financial calculation accuracy
   */
  static validateCalculation(
    values: number[],
    expectedSum: number,
    tolerance: number = 0.01
  ): {
    isValid: boolean;
    preciseSum: number;
    traditionalSum: number;
    difference: number;
  } {
    // Calculate using Math.sumPrecise
    const preciseSum = Math.sumPrecise(values);

    // Calculate using traditional method (prone to errors)
    const traditionalSum = values.reduce((a, b) => a + b, 0);

    const difference = Math.abs(preciseSum - expectedSum);
    const isValid = difference <= tolerance;

    return {
      isValid,
      preciseSum: Number(preciseSum.toFixed(2)),
      traditionalSum: Number(traditionalSum.toFixed(2)),
      difference: Number(difference.toFixed(6)),
    };
  }
}

/**
 * Customer balance tracker using precise calculations
 */
export class CustomerBalanceTracker {
  private transactions: Map<string, number[]> = new Map();

  /**
   * Add transaction for customer
   */
  addTransaction(customerId: string, amount: number) {
    if (!this.transactions.has(customerId)) {
      this.transactions.set(customerId, []);
    }
    this.transactions.get(customerId)!.push(amount);
  }

  /**
   * Get customer balance with precision
   */
  getBalance(customerId: string): number {
    const customerTransactions = this.transactions.get(customerId) || [];
    return Math.sumPrecise(customerTransactions);
  }

  /**
   * Get all balances
   */
  getAllBalances(): Map<string, number> {
    const balances = new Map<string, number>();

    for (const [customerId, transactions] of this.transactions) {
      balances.set(customerId, Math.sumPrecise(transactions));
    }

    return balances;
  }

  /**
   * Calculate total platform balance
   */
  getTotalPlatformBalance(): number {
    const allTransactions: number[] = [];

    for (const transactions of this.transactions.values()) {
      allTransactions.push(...transactions);
    }

    return Math.sumPrecise(allTransactions);
  }

  /**
   * Get balance statistics
   */
  getStatistics(): {
    totalCustomers: number;
    totalBalance: number;
    averageBalance: number;
    maxBalance: number;
    minBalance: number;
  } {
    const balances = Array.from(this.getAllBalances().values());

    if (balances.length === 0) {
      return {
        totalCustomers: 0,
        totalBalance: 0,
        averageBalance: 0,
        maxBalance: 0,
        minBalance: 0,
      };
    }

    const totalBalance = Math.sumPrecise(balances);

    return {
      totalCustomers: balances.length,
      totalBalance: Number(totalBalance.toFixed(2)),
      averageBalance: Number((totalBalance / balances.length).toFixed(2)),
      maxBalance: Math.max(...balances),
      minBalance: Math.min(...balances),
    };
  }
}

/**
 * Example usage demonstrating precision benefits
 */
export function demonstratePrecision() {
  // Problem: Traditional sum has floating-point errors
  const problematicValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

  // Traditional sum (has rounding error)
  const traditionalSum = problematicValues.reduce((a, b) => a + b, 0);
  console.log('Traditional sum:', traditionalSum); // 4.499999999999999

  // Math.sumPrecise (accurate)
  const preciseSum = Math.sumPrecise(problematicValues);
  console.log('Precise sum:', preciseSum); // 4.5

  // Financial example
  const trades = [
    { type: 'buy' as const, quantity: 100, price: 50.25, fees: 2.5 },
    { type: 'sell' as const, quantity: 50, price: 52.75, fees: 2.5 },
    { type: 'buy' as const, quantity: 75, price: 51.1, fees: 2.5 },
    { type: 'sell' as const, quantity: 125, price: 53.9, fees: 5.0 },
  ];

  const pnl = FinancialCalculator.calculatePnL(trades);
  console.log('P&L Analysis:', pnl);

  return {
    traditionalSum,
    preciseSum,
    difference: Math.abs(traditionalSum - 4.5),
    pnl,
  };
}
