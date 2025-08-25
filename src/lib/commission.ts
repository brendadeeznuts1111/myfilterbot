/**
 * Commission Calculator Module
 * Handles agent, master, and VIP commission calculations
 */

import agentsConfig from '../../config/agents.yml';
import transactionsConfig from '../../config/transactions.yml';

interface Bet {
  betId: string;
  customerId: number;
  agent: string;
  stake: number;
  odds: number;
  status: 'open' | 'settled' | 'void';
  win: number;
  timestamp: string;
}

interface Transaction {
  id: string;
  customerId: number;
  type: 'bet' | 'deposit' | 'withdrawal' | 'adjustment';
  amount: number;
  timestamp: string;
  agentId?: string;
}

interface CommissionReport {
  agentId: string;
  period: string;
  turnover: number;
  profit: number;
  agentCommission: number;
  masterCommission: number;
  bonuses: number;
  netPayout: number;
  details: {
    customerCount: number;
    betCount: number;
    winRate: number;
    averageStake: number;
  };
}

interface AgentPerformance {
  agentId: string;
  name: string;
  monthlyVolume: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  bonusRate: number;
  customers: number[];
  newCustomers: number;
  vipCustomers: number;
}

export class CommissionCalculator {
  private agents: any;
  private masters: any;
  private commissionRates: any;
  private performanceTiers: any;
  
  constructor() {
    this.agents = agentsConfig.agents.list;
    this.masters = agentsConfig.masters.list;
    this.commissionRates = transactionsConfig.transactions.commission;
    this.performanceTiers = agentsConfig.commission.performance_tiers;
  }
  
  /**
   * Calculate commission for an agent for a specific period
   */
  calculateAgentCommission(agentId: string, period: string, bets: Bet[]): CommissionReport {
    const agent = this.agents.find((a: any) => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    // Filter bets for this agent
    const agentBets = bets.filter(b => b.agent === agentId);
    
    // Calculate totals
    const turnover = agentBets.reduce((sum, bet) => sum + bet.stake, 0);
    const winnings = agentBets.reduce((sum, bet) => sum + bet.win, 0);
    const profit = turnover - winnings; // House profit
    
    // Get performance tier
    const tier = this.getPerformanceTier(turnover);
    const bonusRate = this.performanceTiers[tier]?.agent_bonus || 0;
    
    // Calculate commissions
    const baseRate = agent.commission_rate || this.commissionRates.agent;
    const effectiveRate = baseRate + bonusRate;
    const agentCommission = turnover * effectiveRate;
    
    // Calculate master commission
    const master = this.masters.find((m: any) => m.agents.includes(agentId));
    const masterRate = master?.override_rate || this.commissionRates.master;
    const masterCommission = turnover * masterRate;
    
    // Calculate bonuses
    const bonuses = this.calculateBonuses(agent, period, agentBets);
    
    // Calculate win rate and other stats
    const settledBets = agentBets.filter(b => b.status === 'settled');
    const wonBets = settledBets.filter(b => b.win > b.stake);
    const winRate = settledBets.length > 0 ? wonBets.length / settledBets.length : 0;
    
    return {
      agentId,
      period,
      turnover,
      profit,
      agentCommission,
      masterCommission,
      bonuses,
      netPayout: agentCommission + bonuses,
      details: {
        customerCount: agent.customers.length,
        betCount: agentBets.length,
        winRate: Math.round(winRate * 100) / 100,
        averageStake: agentBets.length > 0 ? turnover / agentBets.length : 0
      }
    };
  }
  
  /**
   * Calculate master commission for a period
   */
  calculateMasterCommission(masterId: string, period: string, bets: Bet[]): any {
    const master = this.masters.find((m: any) => m.id === masterId);
    if (!master) {
      throw new Error(`Master ${masterId} not found`);
    }
    
    // Get all agents under this master
    const masterAgents = this.agents.filter((a: any) => a.master === masterId);
    
    // Calculate total turnover from all agents
    let totalTurnover = 0;
    let totalProfit = 0;
    const agentReports: CommissionReport[] = [];
    
    for (const agent of masterAgents) {
      const report = this.calculateAgentCommission(agent.id, period, bets);
      totalTurnover += report.turnover;
      totalProfit += report.profit;
      agentReports.push(report);
    }
    
    // Get performance tier
    const tier = this.getPerformanceTier(totalTurnover);
    const bonusRate = this.performanceTiers[tier]?.master_bonus || 0;
    
    // Calculate master commission
    const baseRate = master.commission_rate || this.commissionRates.master;
    const overrideRate = master.override_rate || 0.01;
    const effectiveRate = baseRate + bonusRate;
    
    const directCommission = totalTurnover * effectiveRate;
    const overrideCommission = totalTurnover * overrideRate;
    const totalCommission = directCommission + overrideCommission;
    
    // Calculate bonuses
    const volumeBonus = this.calculateVolumeBonus(totalTurnover);
    
    return {
      masterId,
      masterName: master.name,
      period,
      totalTurnover,
      totalProfit,
      directCommission,
      overrideCommission,
      totalCommission,
      volumeBonus,
      netPayout: totalCommission + volumeBonus,
      tier,
      agentCount: masterAgents.length,
      agentReports
    };
  }
  
  /**
   * Calculate VIP rebates
   */
  calculateVIPRebate(customerId: number, period: string, transactions: Transaction[]): any {
    // Filter customer transactions
    const customerTrans = transactions.filter(t => t.customerId === customerId);
    
    // Calculate losses (deposits - withdrawals - winnings)
    const deposits = customerTrans
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const withdrawals = customerTrans
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const netLoss = deposits - withdrawals;
    
    // Only calculate rebate on losses
    if (netLoss <= 0) {
      return {
        customerId,
        period,
        deposits,
        withdrawals,
        netLoss: 0,
        rebateRate: 0,
        rebateAmount: 0
      };
    }
    
    // Get customer tier and rebate rate
    const tier = this.getCustomerTier(deposits);
    const rebateRate = transactionsConfig.transactions.tiers[tier]?.rebate || 0;
    const rebateAmount = netLoss * rebateRate;
    
    return {
      customerId,
      period,
      deposits,
      withdrawals,
      netLoss,
      rebateRate,
      rebateAmount,
      tier
    };
  }
  
  /**
   * Generate monthly statement for an agent
   */
  generateAgentStatement(agentId: string, month: string): any {
    const agent = this.agents.find((a: any) => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    // This would load actual bet data from files
    // For now, generate sample data
    const sampleBets = this.generateSampleBets(agent.customers, agentId, 100);
    const commission = this.calculateAgentCommission(agentId, month, sampleBets);
    
    return {
      statement: {
        agentId,
        agentName: agent.name,
        agentCode: agent.code,
        period: month,
        status: agent.status,
        ...commission,
        previousBalance: agent.balance,
        newBalance: agent.balance + commission.netPayout,
        paymentMethod: 'bank_transfer',
        paymentDate: this.getPaymentDate(month)
      },
      transactions: sampleBets.slice(0, 10), // First 10 for preview
      summary: {
        totalCustomers: agent.customers.length,
        activeCustomers: Math.floor(agent.customers.length * 0.8),
        newCustomers: Math.floor(Math.random() * 5) + 1,
        topCustomer: agent.customers[0],
        growthRate: Math.random() * 0.2 - 0.1 // -10% to +10%
      }
    };
  }
  
  // Helper methods
  
  private getPerformanceTier(volume: number): string {
    if (volume >= 250000) return 'platinum';
    if (volume >= 100000) return 'gold';
    if (volume >= 50000) return 'silver';
    return 'bronze';
  }
  
  private getCustomerTier(totalDeposits: number): string {
    if (totalDeposits >= 50000) return 'platinum';
    if (totalDeposits >= 10000) return 'vip';
    if (totalDeposits >= 5000) return 'gold';
    if (totalDeposits >= 1000) return 'silver';
    return 'basic';
  }
  
  private calculateBonuses(agent: any, period: string, bets: Bet[]): number {
    let bonuses = 0;
    
    // New customer bonus (mock - would check actual new signups)
    const newCustomers = Math.floor(Math.random() * 3);
    bonuses += newCustomers * 50; // $50 per new customer
    
    // VIP customer bonus (mock)
    const vipCustomers = Math.floor(Math.random() * 2);
    bonuses += vipCustomers * 500; // $500 per VIP
    
    // Retention bonus (if >90% customers active)
    const retentionRate = 0.92; // Mock
    if (retentionRate > 0.9) {
      const turnover = bets.reduce((sum, b) => sum + b.stake, 0);
      bonuses += turnover * 0.01; // 1% retention bonus
    }
    
    return bonuses;
  }
  
  private calculateVolumeBonus(volume: number): number {
    if (volume >= 1000000) return 15000;
    if (volume >= 500000) return 5000;
    if (volume >= 100000) return 1000;
    return 0;
  }
  
  private getPaymentDate(period: string): string {
    // Calculate 5th of next month
    const [year, month] = period.split('-').map(Number);
    const paymentDate = new Date(year, month, 5); // Month is 0-indexed in Date
    return paymentDate.toISOString().split('T')[0];
  }
  
  private generateSampleBets(customers: number[], agentId: string, count: number): Bet[] {
    const bets: Bet[] = [];
    const now = Date.now();
    
    for (let i = 0; i < count; i++) {
      const customerId = customers[Math.floor(Math.random() * customers.length)];
      const stake = Math.floor(Math.random() * 500) + 10;
      const odds = Math.random() * 3 + 1.5;
      const isWin = Math.random() > 0.55; // 45% win rate
      
      bets.push({
        betId: `b_${now}_${i}`,
        customerId,
        agent: agentId,
        stake,
        odds,
        status: 'settled',
        win: isWin ? stake * odds : 0,
        timestamp: new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return bets;
  }
  
  /**
   * Batch calculate all agent commissions
   */
  calculateAllCommissions(period: string): any {
    const results = {
      period,
      agents: [] as any[],
      masters: [] as any[],
      totalTurnover: 0,
      totalCommissions: 0,
      totalBonuses: 0,
      companyRevenue: 0
    };
    
    // Calculate for each agent
    for (const agent of this.agents) {
      const bets = this.generateSampleBets(agent.customers, agent.id, 100);
      const report = this.calculateAgentCommission(agent.id, period, bets);
      results.agents.push(report);
      results.totalTurnover += report.turnover;
      results.totalCommissions += report.agentCommission;
      results.totalBonuses += report.bonuses;
    }
    
    // Calculate for each master
    for (const master of this.masters) {
      const allBets: Bet[] = [];
      const agentIds = this.agents
        .filter((a: any) => a.master === master.id)
        .map((a: any) => a.id);
      
      for (const agentId of agentIds) {
        const agent = this.agents.find((a: any) => a.id === agentId);
        const bets = this.generateSampleBets(agent.customers, agentId, 100);
        allBets.push(...bets);
      }
      
      const report = this.calculateMasterCommission(master.id, period, allBets);
      results.masters.push(report);
      results.totalCommissions += report.totalCommission;
      results.totalBonuses += report.volumeBonus;
    }
    
    // Calculate company revenue (after all commissions)
    results.companyRevenue = results.totalTurnover * 0.03; // 3% to company
    
    return results;
  }
}

// Export singleton instance
export const commissionCalculator = new CommissionCalculator();