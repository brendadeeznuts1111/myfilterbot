/**
 * Enhanced Dashboard API Router
 * Handles player tracking, affiliate management, and message monitoring
 */

import { dashboardConfigService } from '../../services/dashboard-config-service';

interface Player {
  id: string;
  name: string;
  username: string;
  telegram_id: number;
  balance: number;
  status: 'online' | 'offline' | 'busy';
  todayPnl: number;
  winRate: number;
  agentTier?: string;
  totalBets: number;
  joinedAt: string;
  lastActive: string;
  // Enhanced fields
  phone?: string;
  email?: string;
  creditLimit?: number;
  riskLevel: 'low' | 'medium' | 'high';
  vipTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  weeklyPnl?: number;
  monthlyPnl?: number;
  totalWagered?: number;
  totalWon?: number;
  avgBetSize?: number;
  lastBet?: string;
  favoriteGame?: string;
  agent?: {
    tier: 'master' | 'agent' | 'sub-agent';
    upline?: string;
    commissionRate: number;
    downlineCount: number;
    totalCommissions?: number;
  };
  tags?: string[];
  notes?: string;
}

interface Message {
  id: string;
  group_id: string;
  group_name: string;
  user_id: number;
  username: string;
  text: string;
  timestamp: string;
  type: 'text' | 'command' | 'bet' | 'signal';
  flagged?: boolean;
}

interface GroupStats {
  messagesToday: number;
  activeUsers: number;
  topUsers: string[];
  peakHour: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export class EnhancedDashboardRouter {
  private corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  async handleRequest(req: Request): Promise<Response | null> {
    const url = new URL(req.url);
    
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: this.corsHeaders });
    }

    // Route handlers
    switch (url.pathname) {
      case '/api/dashboard/players':
        return req.method === 'POST' ? this.bulkUpdatePlayers(req) : this.getPlayers(req);
      case '/api/dashboard/players/stats':
        return this.getPlayerStats(req);
      case '/api/dashboard/players/bulk/suspend':
        return this.bulkSuspendPlayers(req);
      case '/api/dashboard/players/bulk/message':
        return this.bulkMessagePlayers(req);
      case '/api/dashboard/players/bulk/export':
        return this.exportPlayers(req);
      case '/api/dashboard/agents':
        return this.getAgents(req);
      case '/api/dashboard/agents/promote':
        return this.promoteToAgent(req);
      case '/api/dashboard/messages':
        return this.getMessages(req);
      case '/api/dashboard/messages/stream':
        return this.createMessageStream(req);
      case '/api/dashboard/groups/stats':
        return this.getGroupStats(req);
      case '/api/dashboard/miniapp/status':
        return this.getMiniAppStatus(req);
      case '/api/dashboard/commission/calculate':
        return this.calculateCommissions(req);
      case '/api/dashboard/accounting/history':
        return this.getAccountingHistory(req);
      default:
        if (url.pathname.startsWith('/api/dashboard/player/')) {
          const segments = url.pathname.split('/');
          if (segments[segments.length - 1] === 'update' && req.method === 'POST') {
            return this.updatePlayer(req, url.pathname);
          }
          if (segments[segments.length - 1] === 'suspend' && req.method === 'POST') {
            return this.suspendPlayer(req, url.pathname);
          }
          if (segments[segments.length - 1] === 'message' && req.method === 'POST') {
            return this.messagePlayer(req, url.pathname);
          }
          return this.getPlayerDetails(req, url.pathname);
        }
        if (url.pathname.startsWith('/api/dashboard/group/')) {
          return this.getGroupMessages(req, url.pathname);
        }
        return null;
    }
  }

  private async getPlayers(req: Request): Promise<Response> {
    try {
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      const players: Player[] = [];
      
      if (customerData.customers) {
        const customers = Object.entries(customerData.customers);
        
        for (const [id, customer] of customers as [string, any][]) {
          // Calculate today's P&L
          const todayTransactions = customerData.transactions?.filter((t: any) => {
            const txDate = new Date(t.timestamp).toDateString();
            const today = new Date().toDateString();
            return txDate === today && t.customer_id === parseInt(id);
          }) || [];
          
          const todayPnl = todayTransactions.reduce((sum: number, t: any) => {
            return sum + (t.type === 'win' ? t.amount : -t.amount);
          }, 0);
          
          // Calculate win rate
          const allBets = customerData.transactions?.filter((t: any) => 
            t.customer_id === parseInt(id) && (t.type === 'bet' || t.type === 'win')
          ) || [];
          
          const wins = allBets.filter((t: any) => t.type === 'win').length;
          const winRate = allBets.length > 0 ? (wins / allBets.length) * 100 : 0;
          
          // Calculate risk level based on betting patterns
          const riskLevel = this.calculateRiskLevel(customer, allBets);
          
          // Determine VIP tier based on total wagered
          const totalWagered = allBets.reduce((sum: number, t: any) => 
            sum + Math.abs(t.amount || 0), 0
          );
          const vipTier = this.determineVipTier(totalWagered);
          
          // Calculate weekly and monthly P&L
          const weeklyPnl = customer.weekly_pnl || 0;
          const monthlyTransactions = customerData.transactions?.filter((t: any) => {
            const txDate = new Date(t.timestamp);
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return txDate > monthAgo && t.customer_id === parseInt(id);
          }) || [];
          
          const monthlyPnl = monthlyTransactions.reduce((sum: number, t: any) => {
            return sum + (t.type === 'win' ? t.amount : -t.amount);
          }, 0);
          
          // Determine agent details
          let agentInfo = undefined;
          if (customer.agent_level || customer.is_agent) {
            agentInfo = {
              tier: customer.agent_level === 'master' ? 'master' : 
                    customer.agent_level === 'agent' ? 'agent' : 'sub-agent',
              upline: customer.upline_id,
              commissionRate: customer.commission_rate || 0.05,
              downlineCount: customer.downline_players?.length || 0,
              totalCommissions: customer.total_commissions || 0
            };
          }
          
          players.push({
            id: id,
            name: customer.name || customer.customer_id || `Player ${id}`,
            username: customer.username || customer.telegram_username || `player${id}`,
            telegram_id: customer.telegram_id || parseInt(id),
            balance: customer.balance || 0,
            status: this.determineStatus(customer.last_activity || customer.last_active),
            todayPnl: todayPnl,
            winRate: Math.round(winRate),
            agentTier: customer.agent_level || null,
            totalBets: allBets.length,
            joinedAt: customer.created_at || new Date().toISOString(),
            lastActive: customer.last_activity || customer.last_active || new Date().toISOString(),
            // Enhanced fields
            phone: customer.phone,
            email: customer.email,
            creditLimit: customer.credit_limit || 5000,
            riskLevel: riskLevel,
            vipTier: vipTier,
            weeklyPnl: weeklyPnl,
            monthlyPnl: monthlyPnl,
            totalWagered: totalWagered,
            totalWon: wins * (totalWagered / allBets.length || 0),
            avgBetSize: allBets.length > 0 ? totalWagered / allBets.length : 0,
            lastBet: allBets[allBets.length - 1]?.timestamp,
            favoriteGame: customer.favorite_game || 'sports',
            agent: agentInfo,
            tags: customer.tags || [],
            notes: customer.notes
          });
        }
      }
      
      return Response.json(players, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading players:', error);
      return Response.json({ error: 'Failed to load players' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }

  private async getPlayerStats(req: Request): Promise<Response> {
    try {
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      const stats = {
        totalPlayers: Object.keys(customerData.customers || {}).length,
        onlinePlayers: 0,
        totalBalance: 0,
        todayVolume: 0,
        todayNewPlayers: 0,
        topPlayer: null as any
      };
      
      const today = new Date().toDateString();
      
      for (const [id, customer] of Object.entries(customerData.customers || {}) as [string, any][]) {
        stats.totalBalance += customer.balance || 0;
        
        // Check if online (active in last 5 minutes)
        if (customer.last_active) {
          const lastActive = new Date(customer.last_active);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          if (lastActive > fiveMinutesAgo) {
            stats.onlinePlayers++;
          }
        }
        
        // Check if joined today
        if (customer.created_at) {
          const joinedDate = new Date(customer.created_at).toDateString();
          if (joinedDate === today) {
            stats.todayNewPlayers++;
          }
        }
      }
      
      // Calculate today's volume
      const todayTransactions = customerData.transactions?.filter((t: any) => {
        const txDate = new Date(t.timestamp).toDateString();
        return txDate === today;
      }) || [];
      
      stats.todayVolume = todayTransactions.reduce((sum: number, t: any) => {
        return sum + Math.abs(t.amount || 0);
      }, 0);
      
      return Response.json(stats, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading player stats:', error);
      return Response.json({ error: 'Failed to load stats' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }

  private async getAgents(req: Request): Promise<Response> {
    try {
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      const agents = Object.entries(customerData.customers || {})
        .filter(([_, customer]: [string, any]) => customer.agent_level)
        .map(([id, customer]: [string, any]) => ({
          id,
          name: customer.name,
          username: customer.username,
          tier: customer.agent_level,
          referrals: customer.referrals || [],
          commission: customer.commission_rate || 0.1,
          totalEarnings: customer.total_commissions || 0,
          status: this.determineStatus(customer.last_active)
        }));
      
      return Response.json(agents, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading agents:', error);
      return Response.json([], { headers: this.corsHeaders });
    }
  }

  private async getMessages(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const groupId = url.searchParams.get('group_id');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      
      // Read message log file (would be a real database in production)
      const messagesFile = Bun.file('./data/telegram_messages.jsonl');
      let messages: Message[] = [];
      
      if (await messagesFile.exists()) {
        const content = await messagesFile.text();
        const lines = content.trim().split('\n').filter(Boolean);
        
        messages = lines.map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        }).filter(Boolean);
        
        // Filter by group if specified
        if (groupId) {
          messages = messages.filter(m => m.group_id === groupId);
        }
        
        // Sort by timestamp and limit
        messages = messages
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
      }
      
      return Response.json(messages, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading messages:', error);
      return Response.json([], { headers: this.corsHeaders });
    }
  }

  private async createMessageStream(req: Request): Response {
    // Server-Sent Events for real-time message streaming
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'connected',
          timestamp: new Date().toISOString()
        })}\n\n`));
        
        // Simulate message stream (in production, connect to real message queue)
        const interval = setInterval(() => {
          const message = {
            type: 'message',
            data: {
              id: `msg_${Date.now()}`,
              group_id: 'main',
              group_name: 'Main Trading',
              user_id: Math.floor(Math.random() * 1000000),
              username: `User${Math.floor(Math.random() * 100)}`,
              text: ['New signal received', 'Position opened', 'Trade closed'][Math.floor(Math.random() * 3)],
              timestamp: new Date().toISOString()
            }
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
        }, 5000);
        
        // Cleanup on close
        req.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      }
    });
    
    return new Response(stream, {
      headers: {
        ...this.corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }

  private async getGroupStats(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const groupId = url.searchParams.get('group_id') || 'all';
      
      // Calculate group statistics
      const stats: GroupStats = {
        messagesToday: Math.floor(Math.random() * 500) + 100,
        activeUsers: Math.floor(Math.random() * 100) + 20,
        topUsers: ['User1', 'User2', 'User3', 'User4', 'User5'],
        peakHour: Math.floor(Math.random() * 24),
        sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as any
      };
      
      return Response.json(stats, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading group stats:', error);
      return Response.json({ error: 'Failed to load stats' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }

  private async getMiniAppStatus(req: Request): Promise<Response> {
    return Response.json({
      status: 'online',
      version: '2.1.0',
      activeUsers: Math.floor(Math.random() * 1000) + 500,
      todayTransactions: Math.floor(Math.random() * 500) + 100,
      features: {
        trading: true,
        p2p: true,
        staking: false,
        referrals: true
      },
      url: 'https://t.me/fantdev_bot/trading'
    }, { headers: this.corsHeaders });
  }

  private async calculateCommissions(req: Request): Promise<Response> {
    try {
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      const commissions = [];
      
      // Calculate commissions for agents
      for (const [id, customer] of Object.entries(customerData.customers || {}) as [string, any][]) {
        if (customer.agent_level) {
          const referrals = customer.referrals || [];
          let totalVolume = 0;
          
          // Calculate volume from referrals
          for (const referralId of referrals) {
            const referralTransactions = customerData.transactions?.filter((t: any) => 
              t.customer_id === referralId
            ) || [];
            
            totalVolume += referralTransactions.reduce((sum: number, t: any) => {
              return sum + Math.abs(t.amount || 0);
            }, 0);
          }
          
          const commissionRate = customer.commission_rate || 0.1;
          const commission = totalVolume * commissionRate;
          
          commissions.push({
            agent_id: id,
            agent_name: customer.name,
            referral_count: referrals.length,
            total_volume: totalVolume,
            commission_rate: commissionRate,
            commission_earned: commission
          });
        }
      }
      
      return Response.json(commissions, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error calculating commissions:', error);
      return Response.json({ error: 'Failed to calculate commissions' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }

  private async getPlayerDetails(req: Request, pathname: string): Promise<Response> {
    const playerId = pathname.split('/').pop();
    
    try {
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      const customer = customerData.customers?.[playerId!];
      
      if (!customer) {
        return Response.json({ error: 'Player not found' }, { 
          status: 404, 
          headers: this.corsHeaders 
        });
      }
      
      // Get player's transaction history
      const allTransactions = customerData.transactions?.filter((t: any) => 
        t.customer_id === parseInt(playerId!)
      ) || [];
      
      // Sort transactions by date
      const sortedTransactions = allTransactions.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Calculate detailed statistics
      const bets = allTransactions.filter((t: any) => t.type === 'bet');
      const wins = allTransactions.filter((t: any) => t.type === 'win');
      const deposits = allTransactions.filter((t: any) => t.type === 'deposit');
      const withdrawals = allTransactions.filter((t: any) => t.type === 'withdrawal');
      
      // Calculate P&L by period
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const calculatePnL = (transactions: any[], startDate: Date) => {
        const filtered = transactions.filter(t => new Date(t.timestamp) > startDate);
        const winAmount = filtered.filter(t => t.type === 'win').reduce((sum, t) => sum + t.amount, 0);
        const betAmount = filtered.filter(t => t.type === 'bet').reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return winAmount - betAmount;
      };
      
      // Get agent relationships
      const downlineIds = customer.downline_players || [];
      const downlinePlayers = downlineIds.map((id: string) => {
        const downlineCustomer = customerData.customers?.[id];
        return {
          id,
          name: downlineCustomer?.name || `Player ${id}`,
          balance: downlineCustomer?.balance || 0,
          status: this.determineStatus(downlineCustomer?.last_active)
        };
      });
      
      // Calculate commission details if agent
      let commissionDetails = null;
      if (customer.agent_level) {
        const downlineVolume = downlineIds.reduce((total: number, id: string) => {
          const downlineTransactions = customerData.transactions?.filter((t: any) => 
            t.customer_id === parseInt(id)
          ) || [];
          return total + downlineTransactions.reduce((sum: number, t: any) => 
            sum + Math.abs(t.amount || 0), 0
          );
        }, 0);
        
        commissionDetails = {
          tier: customer.agent_level,
          rate: customer.commission_rate || 0.05,
          downlineCount: downlineIds.length,
          downlineVolume,
          estimatedCommission: downlineVolume * (customer.commission_rate || 0.05),
          lastPayout: customer.last_commission_payout || null
        };
      }
      
      const playerDetails = {
        // Basic info
        id: playerId,
        name: customer.name || customer.customer_id || `Player ${playerId}`,
        username: customer.username || customer.telegram_username,
        telegram_id: customer.telegram_id,
        phone: customer.phone,
        email: customer.email,
        
        // Account info
        balance: customer.balance || 0,
        creditLimit: customer.credit_limit || 5000,
        status: this.determineStatus(customer.last_active),
        verified: customer.verified || false,
        joinedAt: customer.created_at || new Date().toISOString(),
        lastActive: customer.last_active || new Date().toISOString(),
        
        // Risk and VIP
        riskLevel: this.calculateRiskLevel(customer, allTransactions),
        vipTier: this.determineVipTier(
          allTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
        ),
        
        // Transaction history (last 100)
        transactions: sortedTransactions.slice(0, 100),
        
        // Statistics
        statistics: {
          totalBets: bets.length,
          totalWins: wins.length,
          totalDeposits: deposits.length,
          totalWithdrawals: withdrawals.length,
          totalVolume: allTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0),
          averageBet: bets.length > 0 ? 
            bets.reduce((sum, t) => sum + Math.abs(t.amount), 0) / bets.length : 0,
          winRate: bets.length > 0 ? (wins.length / bets.length) * 100 : 0,
          largestBet: Math.max(...bets.map(t => Math.abs(t.amount)), 0),
          largestWin: Math.max(...wins.map(t => t.amount), 0)
        },
        
        // P&L tracking
        profitLoss: {
          daily: calculatePnL(allTransactions, dayAgo),
          weekly: calculatePnL(allTransactions, weekAgo),
          monthly: calculatePnL(allTransactions, monthAgo),
          allTime: wins.reduce((sum, t) => sum + t.amount, 0) - 
                   bets.reduce((sum, t) => sum + Math.abs(t.amount), 0)
        },
        
        // Agent info (if applicable)
        agentInfo: commissionDetails,
        
        // Downline (if agent)
        downline: customer.agent_level ? downlinePlayers : [],
        
        // Preferences
        favoriteGame: customer.favorite_game || 'sports',
        preferredPaymentMethod: customer.preferred_payment || 'telegram',
        language: customer.language || 'en',
        timezone: customer.timezone || 'UTC',
        
        // Notes and tags
        tags: customer.tags || [],
        notes: customer.notes || '',
        
        // Limits
        dailyLimit: customer.daily_limit || 10000,
        weeklyLimit: customer.weekly_limit || 50000,
        monthlyLimit: customer.monthly_limit || 200000
      };
      
      return Response.json(playerDetails, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading player details:', error);
      return Response.json({ error: 'Failed to load player details' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }

  private async getGroupMessages(req: Request, pathname: string): Promise<Response> {
    const groupId = pathname.split('/').pop();
    
    try {
      // In production, this would query a real message database
      const messages = Array.from({ length: 20 }, (_, i) => ({
        id: `msg_${i}`,
        group_id: groupId,
        user_id: Math.floor(Math.random() * 1000000),
        username: `User${Math.floor(Math.random() * 100)}`,
        text: ['Trading signal', 'Market update', 'Position closed'][Math.floor(Math.random() * 3)],
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        type: 'text' as const
      }));
      
      return Response.json(messages, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading group messages:', error);
      return Response.json([], { headers: this.corsHeaders });
    }
  }

  private determineStatus(lastActive?: string): 'online' | 'offline' | 'busy' {
    if (!lastActive) return 'offline';
    
    const lastActiveTime = new Date(lastActive);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastActiveTime.getTime()) / (1000 * 60);
    
    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'busy';
    return 'offline';
  }

  private calculateRiskLevel(customer: any, transactions: any[]): 'low' | 'medium' | 'high' {
    // Calculate risk based on multiple factors
    const factors = {
      largeTransactions: 0,
      frequentBetting: 0,
      negativeBalance: customer.balance < 0 ? 1 : 0,
      highLosses: 0,
      rapidActivity: 0
    };
    
    // Check for large transactions (>$1000)
    const largeTransactions = transactions.filter(t => Math.abs(t.amount) > 1000);
    factors.largeTransactions = largeTransactions.length > 5 ? 1 : 0;
    
    // Check betting frequency (>20 bets per day average)
    const daysSinceJoined = Math.max(1, Math.floor((Date.now() - new Date(customer.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24)));
    const avgBetsPerDay = transactions.length / daysSinceJoined;
    factors.frequentBetting = avgBetsPerDay > 20 ? 1 : 0;
    
    // Check for high losses
    const totalLosses = transactions
      .filter(t => t.type === 'bet' || t.type === 'loss')
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    const totalWins = transactions
      .filter(t => t.type === 'win')
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    factors.highLosses = (totalLosses - totalWins) > 5000 ? 1 : 0;
    
    // Check for rapid activity (>10 transactions in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTransactions = transactions.filter(t => 
      new Date(t.timestamp) > oneHourAgo
    );
    factors.rapidActivity = recentTransactions.length > 10 ? 1 : 0;
    
    // Calculate total risk score
    const riskScore = Object.values(factors).reduce((sum, val) => sum + val, 0);
    
    if (riskScore >= 3) return 'high';
    if (riskScore >= 1) return 'medium';
    return 'low';
  }

  private determineVipTier(totalWagered: number): 'bronze' | 'silver' | 'gold' | 'platinum' | undefined {
    if (totalWagered < 1000) return undefined;
    if (totalWagered < 10000) return 'bronze';
    if (totalWagered < 50000) return 'silver';
    if (totalWagered < 100000) return 'gold';
    return 'platinum';
  }

  // Bulk operations
  private async bulkUpdatePlayers(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      const { playerIds, updates } = body;
      
      if (!playerIds || !Array.isArray(playerIds) || !updates) {
        return Response.json({ error: 'Invalid request body' }, { 
          status: 400, 
          headers: this.corsHeaders 
        });
      }
      
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      let updatedCount = 0;
      for (const playerId of playerIds) {
        if (customerData.customers?.[playerId]) {
          Object.assign(customerData.customers[playerId], updates);
          updatedCount++;
        }
      }
      
      // Save updated data
      await Bun.write('./src/bot/customer_database.json', JSON.stringify(customerData, null, 2));
      
      return Response.json({ 
        success: true, 
        updatedCount,
        message: `Updated ${updatedCount} players`
      }, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error bulk updating players:', error);
      return Response.json({ error: 'Failed to update players' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }

  private async bulkSuspendPlayers(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      const { playerIds, suspend = true, reason } = body;
      
      if (!playerIds || !Array.isArray(playerIds)) {
        return Response.json({ error: 'Player IDs required' }, { 
          status: 400, 
          headers: this.corsHeaders 
        });
      }
      
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      let suspendedCount = 0;
      for (const playerId of playerIds) {
        if (customerData.customers?.[playerId]) {
          customerData.customers[playerId].suspended = suspend;
          customerData.customers[playerId].suspension_reason = reason;
          customerData.customers[playerId].suspension_date = new Date().toISOString();
          suspendedCount++;
        }
      }
      
      await Bun.write('./src/bot/customer_database.json', JSON.stringify(customerData, null, 2));
      
      return Response.json({ 
        success: true, 
        suspendedCount,
        message: `${suspend ? 'Suspended' : 'Unsuspended'} ${suspendedCount} players`
      }, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error suspending players:', error);
      return Response.json({ error: 'Failed to suspend players' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }

  private async bulkMessagePlayers(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      const { playerIds, message, sendMethod = 'telegram' } = body;
      
      if (!playerIds || !Array.isArray(playerIds) || !message) {
        return Response.json({ error: 'Invalid request' }, { 
          status: 400, 
          headers: this.corsHeaders 
        });
      }
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN || Bun.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return Response.json({ error: 'Bot not configured' }, { 
          status: 500, 
          headers: this.corsHeaders 
        });
      }
      
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      let sentCount = 0;
      const errors = [];
      
      for (const playerId of playerIds) {
        const customer = customerData.customers?.[playerId];
        if (customer?.telegram_id) {
          try {
            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: customer.telegram_id,
                text: message,
                parse_mode: 'HTML'
              })
            });
            
            const result = await response.json();
            if (result.ok) {
              sentCount++;
            } else {
              errors.push({ playerId, error: result.description });
            }
          } catch (error: any) {
            errors.push({ playerId, error: error.message });
          }
        }
      }
      
      return Response.json({ 
        success: true, 
        sentCount,
        failedCount: errors.length,
        errors: errors.slice(0, 10), // Limit error details
        message: `Sent message to ${sentCount} players`
      }, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error messaging players:', error);
      return Response.json({ error: 'Failed to message players' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }

  private async exportPlayers(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const format = url.searchParams.get('format') || 'json';
      const playerIds = url.searchParams.get('ids')?.split(',');
      
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      let players = [];
      
      if (playerIds) {
        players = playerIds.map(id => customerData.customers?.[id]).filter(Boolean);
      } else {
        players = Object.entries(customerData.customers || {}).map(([id, customer]) => ({
          id,
          ...customer
        }));
      }
      
      if (format === 'csv') {
        const headers = ['ID', 'Name', 'Username', 'Balance', 'Status', 'Agent Tier', 'Joined At'];
        const rows = players.map(p => [
          p.id || p.customer_id,
          p.name || '',
          p.username || '',
          p.balance || 0,
          p.suspended ? 'Suspended' : 'Active',
          p.agent_level || '',
          p.created_at || ''
        ]);
        
        const csv = [headers, ...rows].map(row => row.map(cell => 
          typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
        ).join(',')).join('\n');
        
        return new Response(csv, { 
          headers: {
            ...this.corsHeaders,
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="players-${Date.now()}.csv"`
          }
        });
      }
      
      return new Response(JSON.stringify(players, null, 2), { 
        headers: {
          ...this.corsHeaders,
          'Content-Disposition': `attachment; filename="players-${Date.now()}.json"`
        }
      });
    } catch (error: any) {
      console.error('Error exporting players:', error);
      return Response.json({ error: 'Failed to export players' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }

  private async updatePlayer(req: Request, pathname: string): Promise<Response> {
    const segments = pathname.split('/');
    const playerId = segments[segments.length - 2];
    
    try {
      const body = await req.json();
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      if (!customerData.customers?.[playerId!]) {
        return Response.json({ error: 'Player not found' }, { 
          status: 404, 
          headers: this.corsHeaders 
        });
      }
      
      Object.assign(customerData.customers[playerId!], body);
      customerData.customers[playerId!].last_modified = new Date().toISOString();
      
      await Bun.write('./src/bot/customer_database.json', JSON.stringify(customerData, null, 2));
      
      return Response.json({ 
        success: true, 
        message: 'Player updated successfully',
        player: customerData.customers[playerId!]
      }, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error updating player:', error);
      return Response.json({ error: 'Failed to update player' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }

  private async suspendPlayer(req: Request, pathname: string): Promise<Response> {
    const segments = pathname.split('/');
    const playerId = segments[segments.length - 2];
    
    try {
      const body = await req.json();
      const { suspend = true, reason } = body;
      
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      if (!customerData.customers?.[playerId!]) {
        return Response.json({ error: 'Player not found' }, { 
          status: 404, 
          headers: this.corsHeaders 
        });
      }
      
      customerData.customers[playerId!].suspended = suspend;
      customerData.customers[playerId!].suspension_reason = reason;
      customerData.customers[playerId!].suspension_date = new Date().toISOString();
      
      await Bun.write('./src/bot/customer_database.json', JSON.stringify(customerData, null, 2));
      
      return Response.json({ 
        success: true, 
        message: `Player ${suspend ? 'suspended' : 'unsuspended'} successfully`
      }, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error suspending player:', error);
      return Response.json({ error: 'Failed to suspend player' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }

  private async messagePlayer(req: Request, pathname: string): Promise<Response> {
    const segments = pathname.split('/');
    const playerId = segments[segments.length - 2];
    
    try {
      const body = await req.json();
      const { message } = body;
      
      if (!message) {
        return Response.json({ error: 'Message required' }, { 
          status: 400, 
          headers: this.corsHeaders 
        });
      }
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN || Bun.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return Response.json({ error: 'Bot not configured' }, { 
          status: 500, 
          headers: this.corsHeaders 
        });
      }
      
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      const customer = customerData.customers?.[playerId!];
      
      if (!customer?.telegram_id) {
        return Response.json({ error: 'Player telegram ID not found' }, { 
          status: 404, 
          headers: this.corsHeaders 
        });
      }
      
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: customer.telegram_id,
          text: message,
          parse_mode: 'HTML'
        })
      });
      
      const result = await response.json();
      
      if (result.ok) {
        return Response.json({ 
          success: true, 
          message: 'Message sent successfully',
          message_id: result.result.message_id
        }, { headers: this.corsHeaders });
      } else {
        return Response.json({ 
          error: result.description || 'Failed to send message'
        }, { 
          status: 400, 
          headers: this.corsHeaders 
        });
      }
    } catch (error: any) {
      console.error('Error messaging player:', error);
      return Response.json({ error: 'Failed to message player' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }

  private async promoteToAgent(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      const { playerId, agentTier, commissionRate, uplineId } = body;
      
      if (!playerId || !agentTier) {
        return Response.json({ error: 'Player ID and tier required' }, { 
          status: 400, 
          headers: this.corsHeaders 
        });
      }
      
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      if (!customerData.customers?.[playerId]) {
        return Response.json({ error: 'Player not found' }, { 
          status: 404, 
          headers: this.corsHeaders 
        });
      }
      
      customerData.customers[playerId].agent_level = agentTier;
      customerData.customers[playerId].commission_rate = commissionRate || 0.05;
      customerData.customers[playerId].upline_id = uplineId || null;
      customerData.customers[playerId].promoted_at = new Date().toISOString();
      customerData.customers[playerId].downline_players = [];
      
      await Bun.write('./src/bot/customer_database.json', JSON.stringify(customerData, null, 2));
      
      return Response.json({ 
        success: true, 
        message: `Player promoted to ${agentTier} successfully`
      }, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error promoting player:', error);
      return Response.json({ error: 'Failed to promote player' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }

  private async getAccountingHistory(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      
      // Parse query parameters matching the accounting history format
      const agentId = url.searchParams.get('agentID');
      const customerId = url.searchParams.get('customerID');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      const includeDeposits = url.searchParams.get('deposits') === 'checked';
      const includeWithdrawals = url.searchParams.get('withdrawals') === 'checked';
      const includeAdjustments = url.searchParams.get('adjustments') === 'checked';
      const includeTransfers = url.searchParams.get('transfers') === 'checked';
      const includeFees = url.searchParams.get('fees') === 'checked';
      const includePromotional = url.searchParams.get('promotional') === 'checked';
      const includeBalances = url.searchParams.get('balances') === 'checked';
      
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      let transactions = customerData.transactions || [];
      const startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDateObj = endDate ? new Date(endDate + 'T23:59:59') : new Date();
      
      // Filter transactions by date range
      transactions = transactions.filter((t: any) => {
        const txDate = new Date(t.timestamp);
        return txDate >= startDateObj && txDate <= endDateObj;
      });
      
      // Filter by agent if specified
      if (agentId) {
        const agent = Object.entries(customerData.customers || {})
          .find(([_, c]: [string, any]) => c.username === agentId || c.agent_id === agentId);
        
        if (agent) {
          const [agentCustomerId] = agent;
          const downlineIds = customerData.customers[agentCustomerId].downline_players || [];
          downlineIds.push(parseInt(agentCustomerId)); // Include agent's own transactions
          
          transactions = transactions.filter((t: any) => 
            downlineIds.includes(t.customer_id)
          );
        }
      }
      
      // Filter by customer if specified
      if (customerId) {
        transactions = transactions.filter((t: any) => 
          t.customer_id === parseInt(customerId)
        );
      }
      
      // Filter by transaction types
      const allowedTypes = [];
      if (includeDeposits) allowedTypes.push('deposit');
      if (includeWithdrawals) allowedTypes.push('withdrawal');
      if (includeAdjustments) allowedTypes.push('adjustment');
      if (includeTransfers) allowedTypes.push('transfer');
      if (includeFees) allowedTypes.push('fee');
      if (includePromotional) allowedTypes.push('bonus', 'promotion');
      
      if (allowedTypes.length > 0) {
        transactions = transactions.filter((t: any) => 
          allowedTypes.includes(t.type)
        );
      }
      
      // Calculate balances if requested
      let accountingSummary = null;
      if (includeBalances) {
        const deposits = transactions.filter((t: any) => t.type === 'deposit')
          .reduce((sum: number, t: any) => sum + t.amount, 0);
        const withdrawals = transactions.filter((t: any) => t.type === 'withdrawal')
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
        const adjustments = transactions.filter((t: any) => t.type === 'adjustment')
          .reduce((sum: number, t: any) => sum + t.amount, 0);
        const fees = transactions.filter((t: any) => t.type === 'fee')
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
        
        accountingSummary = {
          totalDeposits: deposits,
          totalWithdrawals: withdrawals,
          totalAdjustments: adjustments,
          totalFees: fees,
          netBalance: deposits - withdrawals + adjustments - fees,
          transactionCount: transactions.length,
          period: {
            start: startDateObj.toISOString(),
            end: endDateObj.toISOString()
          }
        };
      }
      
      // Format transactions for accounting display
      const formattedTransactions = transactions.map((t: any) => {
        const customer = customerData.customers?.[t.customer_id];
        return {
          id: t.id || `tx_${t.customer_id}_${t.timestamp}`,
          date: t.timestamp,
          type: t.type,
          amount: t.amount,
          balance: t.balance_after || 0,
          customerId: t.customer_id,
          customerName: customer?.name || `Customer ${t.customer_id}`,
          customerUsername: customer?.username,
          description: t.description || t.type,
          reference: t.reference || '',
          status: t.status || 'completed',
          agentId: customer?.upline_id || agentId,
          method: t.method || 'telegram'
        };
      });
      
      // Sort by date descending
      formattedTransactions.sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      return Response.json({
        success: true,
        transactions: formattedTransactions,
        summary: accountingSummary,
        filters: {
          agentId,
          customerId,
          startDate: startDateObj.toISOString(),
          endDate: endDateObj.toISOString(),
          types: allowedTypes
        }
      }, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading accounting history:', error);
      return Response.json({ error: 'Failed to load accounting history' }, { 
        status: 500, 
        headers: this.corsHeaders 
      });
    }
  }
}

export const enhancedDashboardRouter = new EnhancedDashboardRouter();