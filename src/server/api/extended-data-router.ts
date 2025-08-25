/**
 * Extended Data Router for Advanced Dashboard Features
 * Provides crypto, sports, weather, and advanced analytics endpoints
 */

import { ResponseCacheMiddleware } from '../../middleware/response-cache';

interface ExtendedRoute {
  method: string;
  pattern: RegExp;
  handler: (req: Request, matches: RegExpMatchArray) => Promise<Response>;
}

export class ExtendedDataRouter {
  private routes: ExtendedRoute[] = [];
  private corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  private responseCache: ResponseCacheMiddleware;

  constructor(responseCache: ResponseCacheMiddleware) {
    this.responseCache = responseCache;
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Crypto endpoints
    this.addRoute('GET', /^\/api\/extended\/crypto\/prices$/, this.getCryptoPrices.bind(this));
    this.addRoute('GET', /^\/api\/extended\/crypto\/portfolio$/, this.getCryptoPortfolio.bind(this));
    this.addRoute('GET', /^\/api\/extended\/crypto\/trends$/, this.getCryptoTrends.bind(this));
    
    // Sports betting endpoints
    this.addRoute('GET', /^\/api\/extended\/sports\/odds$/, this.getSportsOdds.bind(this));
    this.addRoute('GET', /^\/api\/extended\/sports\/live$/, this.getLiveSports.bind(this));
    this.addRoute('GET', /^\/api\/extended\/sports\/bets$/, this.getActiveBets.bind(this));
    
    // Weather & location data
    this.addRoute('GET', /^\/api\/extended\/weather\/current$/, this.getCurrentWeather.bind(this));
    this.addRoute('GET', /^\/api\/extended\/location\/activity$/, this.getLocationActivity.bind(this));
    
    // Advanced analytics
    this.addRoute('GET', /^\/api\/extended\/analytics\/risk$/, this.getRiskAnalysis.bind(this));
    this.addRoute('GET', /^\/api\/extended\/analytics\/predictions$/, this.getPredictions.bind(this));
    this.addRoute('GET', /^\/api\/extended\/analytics\/patterns$/, this.getPatterns.bind(this));
    
    // Market data
    this.addRoute('GET', /^\/api\/extended\/market\/forex$/, this.getForexRates.bind(this));
    this.addRoute('GET', /^\/api\/extended\/market\/stocks$/, this.getStockPrices.bind(this));
    this.addRoute('GET', /^\/api\/extended\/market\/commodities$/, this.getCommodities.bind(this));
    
    // Social metrics
    this.addRoute('GET', /^\/api\/extended\/social\/sentiment$/, this.getSocialSentiment.bind(this));
    this.addRoute('GET', /^\/api\/extended\/social\/trending$/, this.getTrendingTopics.bind(this));
  }

  private addRoute(method: string, pattern: RegExp, handler: ExtendedRoute['handler']) {
    this.routes.push({ method, pattern, handler });
  }

  async handleRequest(req: Request): Promise<Response | null> {
    const url = new URL(req.url);
    const method = req.method;

    if (method === 'OPTIONS') {
      return new Response(null, { headers: this.corsHeaders });
    }

    for (const route of this.routes) {
      if (route.method !== method) continue;
      
      const matches = url.pathname.match(route.pattern);
      if (matches) {
        try {
          return await route.handler(req, matches);
        } catch (error: any) {
          return this.errorResponse(error.message || 'Internal server error', 500);
        }
      }
    }

    return null;
  }

  private async getCryptoPrices(_req: Request): Promise<Response> {
    return this.responseCache.withCache(async () => {
      const prices = [
        { symbol: 'BTC', name: 'Bitcoin', price: 42567.89, change24h: 2.34, volume: 28945678901, marketCap: 834567890123 },
        { symbol: 'ETH', name: 'Ethereum', price: 2234.56, change24h: -1.23, volume: 12345678901, marketCap: 267890123456 },
        { symbol: 'BNB', name: 'Binance Coin', price: 312.45, change24h: 5.67, volume: 1234567890, marketCap: 48901234567 },
        { symbol: 'SOL', name: 'Solana', price: 98.76, change24h: 8.91, volume: 987654321, marketCap: 41234567890 },
        { symbol: 'ADA', name: 'Cardano', price: 0.456, change24h: -3.45, volume: 567890123, marketCap: 15678901234 },
        { symbol: 'XRP', name: 'Ripple', price: 0.623, change24h: 1.23, volume: 678901234, marketCap: 33456789012 },
        { symbol: 'DOGE', name: 'Dogecoin', price: 0.0789, change24h: 12.34, volume: 456789012, marketCap: 11234567890 },
        { symbol: 'AVAX', name: 'Avalanche', price: 34.56, change24h: -2.45, volume: 345678901, marketCap: 12345678901 },
        { symbol: 'MATIC', name: 'Polygon', price: 0.891, change24h: 4.56, volume: 234567890, marketCap: 8901234567 },
        { symbol: 'DOT', name: 'Polkadot', price: 7.89, change24h: 3.21, volume: 123456789, marketCap: 9012345678 }
      ];

      return Response.json({ prices, timestamp: new Date().toISOString() }, { headers: this.corsHeaders });
    }, { ttl: 30000, maxAge: 30, staleWhileRevalidate: 60 })(_req);
  }

  private async getCryptoPortfolio(_req: Request): Promise<Response> {
    const portfolio = {
      totalValue: 125678.90,
      totalProfit: 23456.78,
      profitPercentage: 22.93,
      holdings: [
        { symbol: 'BTC', amount: 1.5, value: 63851.84, cost: 45000, profit: 18851.84 },
        { symbol: 'ETH', amount: 10, value: 22345.60, cost: 18000, profit: 4345.60 },
        { symbol: 'SOL', amount: 100, value: 9876.00, cost: 5000, profit: 4876.00 },
        { symbol: 'BNB', amount: 25, value: 7811.25, cost: 6000, profit: 1811.25 }
      ],
      transactions: [
        { type: 'buy', symbol: 'BTC', amount: 0.5, price: 41000, timestamp: '2024-03-15T10:30:00Z' },
        { type: 'sell', symbol: 'ETH', amount: 5, price: 2400, timestamp: '2024-03-14T15:45:00Z' },
        { type: 'buy', symbol: 'SOL', amount: 50, price: 85, timestamp: '2024-03-13T09:20:00Z' }
      ]
    };

    return Response.json(portfolio, { headers: this.corsHeaders });
  }

  private async getCryptoTrends(_req: Request): Promise<Response> {
    const trends = {
      bullish: ['BTC', 'SOL', 'AVAX', 'INJ', 'TIA'],
      bearish: ['ADA', 'XRP', 'ALGO'],
      trending: [
        { symbol: 'WLD', reason: 'AI narrative', momentum: 85 },
        { symbol: 'ARB', reason: 'Layer 2 adoption', momentum: 72 },
        { symbol: 'OP', reason: 'Ecosystem growth', momentum: 68 }
      ],
      fearGreedIndex: 72,
      marketSentiment: 'Greed',
      dominance: { BTC: 52.3, ETH: 16.8, stablecoins: 8.2 }
    };

    return Response.json(trends, { headers: this.corsHeaders });
  }

  private async getSportsOdds(req: Request): Promise<Response> {
    return this.responseCache.withCache(async () => {
      const odds = [
        {
          id: 'nba_001',
          sport: 'Basketball',
          league: 'NBA',
          homeTeam: 'Lakers',
          awayTeam: 'Warriors',
          homeOdds: 1.85,
          awayOdds: 2.10,
          overUnder: { line: 220.5, over: 1.90, under: 1.90 },
          spread: { home: -3.5, odds: 1.91 },
          startTime: '2024-03-20T19:30:00Z'
        },
        {
          id: 'nfl_001',
          sport: 'Football',
          league: 'NFL',
          homeTeam: 'Chiefs',
          awayTeam: 'Bills',
          homeOdds: 1.72,
          awayOdds: 2.35,
          overUnder: { line: 48.5, over: 1.87, under: 1.93 },
          spread: { home: -6.5, odds: 1.90 },
          startTime: '2024-03-21T13:00:00Z'
        },
        {
          id: 'epl_001',
          sport: 'Soccer',
          league: 'EPL',
          homeTeam: 'Manchester City',
          awayTeam: 'Liverpool',
          homeOdds: 2.20,
          drawOdds: 3.40,
          awayOdds: 3.10,
          overUnder: { line: 2.5, over: 1.75, under: 2.15 },
          startTime: '2024-03-20T15:00:00Z'
        }
      ];

      return Response.json({ odds, timestamp: new Date().toISOString() }, { headers: this.corsHeaders });
    }, { ttl: 60000, maxAge: 60, staleWhileRevalidate: 120 })(_req);
  }

  private async getLiveSports(_req: Request): Promise<Response> {
    const live = [
      {
        id: 'live_001',
        sport: 'Basketball',
        homeTeam: 'Heat',
        awayTeam: 'Celtics',
        homeScore: 78,
        awayScore: 82,
        period: '3rd Quarter',
        timeRemaining: '5:23',
        possession: 'away'
      },
      {
        id: 'live_002',
        sport: 'Soccer',
        homeTeam: 'Real Madrid',
        awayTeam: 'Barcelona',
        homeScore: 1,
        awayScore: 1,
        minute: 67,
        status: 'In Play'
      }
    ];

    return Response.json({ live, timestamp: new Date().toISOString() }, { headers: this.corsHeaders });
  }

  private async getActiveBets(_req: Request): Promise<Response> {
    const bets = [
      {
        id: 'bet_001',
        userId: 'user_123',
        type: 'single',
        sport: 'Basketball',
        event: 'Lakers vs Warriors',
        selection: 'Lakers -3.5',
        stake: 100,
        odds: 1.91,
        potentialWin: 191,
        status: 'pending',
        placedAt: '2024-03-20T10:15:00Z'
      },
      {
        id: 'bet_002',
        userId: 'user_456',
        type: 'parlay',
        legs: [
          { event: 'Chiefs vs Bills', selection: 'Over 48.5', odds: 1.87 },
          { event: 'Heat vs Celtics', selection: 'Celtics ML', odds: 1.65 }
        ],
        stake: 50,
        totalOdds: 3.09,
        potentialWin: 154.50,
        status: 'active',
        placedAt: '2024-03-20T09:30:00Z'
      }
    ];

    return Response.json({ bets, totalActive: 47, totalPending: 123 }, { headers: this.corsHeaders });
  }

  private async getCurrentWeather(_req: Request): Promise<Response> {
    const weather = {
      location: 'New York, NY',
      temperature: 22,
      feelsLike: 19,
      condition: 'Partly Cloudy',
      humidity: 65,
      windSpeed: 15,
      windDirection: 'NW',
      pressure: 1013,
      visibility: 10,
      uvIndex: 3,
      forecast: [
        { day: 'Today', high: 24, low: 18, condition: 'Partly Cloudy', precipitation: 20 },
        { day: 'Tomorrow', high: 26, low: 19, condition: 'Sunny', precipitation: 10 },
        { day: 'Thursday', high: 23, low: 17, condition: 'Rain', precipitation: 80 }
      ]
    };

    return Response.json(weather, { headers: this.corsHeaders });
  }

  private async getLocationActivity(_req: Request): Promise<Response> {
    const activity = {
      activeRegions: [
        { region: 'North America', users: 4567, growth: 12.3 },
        { region: 'Europe', users: 3456, growth: 8.7 },
        { region: 'Asia', users: 5678, growth: 23.4 },
        { region: 'South America', users: 1234, growth: 15.6 }
      ],
      topCities: [
        { city: 'New York', country: 'USA', users: 890, revenue: 45678 },
        { city: 'London', country: 'UK', users: 678, revenue: 34567 },
        { city: 'Tokyo', country: 'Japan', users: 1234, revenue: 67890 },
        { city: 'Singapore', country: 'Singapore', users: 567, revenue: 23456 }
      ],
      heatmap: {
        data: Array.from({ length: 20 }, () => ({
          lat: Math.random() * 180 - 90,
          lng: Math.random() * 360 - 180,
          intensity: Math.random() * 100
        }))
      }
    };

    return Response.json(activity, { headers: this.corsHeaders });
  }

  private async getRiskAnalysis(_req: Request): Promise<Response> {
    const analysis = {
      overallRisk: 'Medium',
      riskScore: 62,
      factors: [
        { name: 'Market Volatility', score: 75, weight: 0.3, status: 'high' },
        { name: 'User Behavior', score: 45, weight: 0.25, status: 'medium' },
        { name: 'Transaction Patterns', score: 58, weight: 0.2, status: 'medium' },
        { name: 'Geographic Distribution', score: 72, weight: 0.15, status: 'high' },
        { name: 'Platform Stability', score: 85, weight: 0.1, status: 'low' }
      ],
      alerts: [
        { level: 'warning', message: 'Unusual trading volume detected in Asian markets', timestamp: '2024-03-20T08:30:00Z' },
        { level: 'info', message: 'New regulatory update in EU region', timestamp: '2024-03-20T07:15:00Z' }
      ],
      recommendations: [
        'Increase monitoring of high-volume traders',
        'Review risk limits for volatile markets',
        'Update compliance procedures for new regulations'
      ]
    };

    return Response.json(analysis, { headers: this.corsHeaders });
  }

  private async getPredictions(_req: Request): Promise<Response> {
    const predictions = {
      revenue: {
        current: 125678,
        predicted: {
          week: 145000,
          month: 567890,
          quarter: 1890000
        },
        confidence: 78,
        factors: ['Seasonal trends', 'Market growth', 'User acquisition']
      },
      userGrowth: {
        current: 4567,
        predicted: {
          week: 4890,
          month: 5678,
          quarter: 8901
        },
        confidence: 82,
        growthRate: 7.2
      },
      churn: {
        current: 2.3,
        predicted: 1.9,
        improvementActions: ['Enhanced onboarding', 'Loyalty program', 'Better support']
      }
    };

    return Response.json(predictions, { headers: this.corsHeaders });
  }

  private async getPatterns(_req: Request): Promise<Response> {
    const patterns = {
      transactionPatterns: [
        { pattern: 'Peak Hours', description: '2-4 PM EST highest activity', frequency: 'Daily' },
        { pattern: 'Weekend Surge', description: '35% increase on weekends', frequency: 'Weekly' },
        { pattern: 'Month-end Drop', description: '20% decrease last 3 days', frequency: 'Monthly' }
      ],
      userPatterns: [
        { pattern: 'Power Users', percentage: 15, contribution: 65, avgTransactions: 45 },
        { pattern: 'Regular Users', percentage: 40, contribution: 25, avgTransactions: 12 },
        { pattern: 'Casual Users', percentage: 45, contribution: 10, avgTransactions: 3 }
      ],
      anomalies: [
        { type: 'Unusual Deposit', userId: 'user_789', amount: 50000, deviation: '10x average', timestamp: '2024-03-20T06:45:00Z' },
        { type: 'Rapid Transactions', userId: 'user_456', count: 47, timeframe: '1 hour', timestamp: '2024-03-20T05:30:00Z' }
      ]
    };

    return Response.json(patterns, { headers: this.corsHeaders });
  }

  private async getForexRates(_req: Request): Promise<Response> {
    const rates = {
      base: 'USD',
      rates: {
        EUR: 0.92,
        GBP: 0.79,
        JPY: 149.85,
        CHF: 0.88,
        CAD: 1.36,
        AUD: 1.54,
        NZD: 1.65,
        CNY: 7.19
      },
      changes: {
        EUR: -0.32,
        GBP: 0.15,
        JPY: 0.45,
        CHF: -0.18
      }
    };

    return Response.json(rates, { headers: this.corsHeaders });
  }

  private async getStockPrices(_req: Request): Promise<Response> {
    const stocks = [
      { symbol: 'AAPL', name: 'Apple', price: 172.45, change: 1.23, changePercent: 0.72, volume: 54234567 },
      { symbol: 'GOOGL', name: 'Google', price: 141.89, change: -0.56, changePercent: -0.39, volume: 23456789 },
      { symbol: 'MSFT', name: 'Microsoft', price: 408.23, change: 3.45, changePercent: 0.85, volume: 19876543 },
      { symbol: 'TSLA', name: 'Tesla', price: 178.90, change: -2.34, changePercent: -1.29, volume: 98765432 },
      { symbol: 'NVDA', name: 'NVIDIA', price: 875.43, change: 12.56, changePercent: 1.46, volume: 45678901 }
    ];

    return Response.json({ stocks, marketStatus: 'Open', timestamp: new Date().toISOString() }, { headers: this.corsHeaders });
  }

  private async getCommodities(_req: Request): Promise<Response> {
    const commodities = [
      { name: 'Gold', symbol: 'XAU', price: 2045.67, change: 8.90, unit: 'oz' },
      { name: 'Silver', symbol: 'XAG', price: 23.45, change: -0.12, unit: 'oz' },
      { name: 'Crude Oil', symbol: 'WTI', price: 78.34, change: 1.23, unit: 'barrel' },
      { name: 'Natural Gas', symbol: 'NG', price: 1.89, change: -0.05, unit: 'MMBtu' },
      { name: 'Copper', symbol: 'HG', price: 3.89, change: 0.07, unit: 'lb' }
    ];

    return Response.json(commodities, { headers: this.corsHeaders });
  }

  private async getSocialSentiment(_req: Request): Promise<Response> {
    const sentiment = {
      overall: 'Positive',
      score: 72,
      platforms: {
        twitter: { positive: 65, neutral: 25, negative: 10, mentions: 4567 },
        reddit: { positive: 58, neutral: 30, negative: 12, posts: 234 },
        telegram: { positive: 70, neutral: 20, negative: 10, messages: 8901 }
      },
      trending: [
        { topic: '#CryptoBull', sentiment: 'positive', mentions: 1234 },
        { topic: 'Market Analysis', sentiment: 'neutral', mentions: 890 },
        { topic: 'New Features', sentiment: 'positive', mentions: 567 }
      ],
      influencers: [
        { name: 'CryptoKing', followers: 125000, sentiment: 'positive', reach: 89000 },
        { name: 'TradingGuru', followers: 98000, sentiment: 'neutral', reach: 67000 }
      ]
    };

    return Response.json(sentiment, { headers: this.corsHeaders });
  }

  private async getTrendingTopics(_req: Request): Promise<Response> {
    const topics = [
      { topic: 'Bitcoin Halving', mentions: 5678, growth: 234, sentiment: 'positive' },
      { topic: 'AI Trading Bots', mentions: 3456, growth: 156, sentiment: 'neutral' },
      { topic: 'DeFi Yields', mentions: 2345, growth: 89, sentiment: 'positive' },
      { topic: 'Regulation Updates', mentions: 1234, growth: 45, sentiment: 'negative' },
      { topic: 'Layer 2 Solutions', mentions: 890, growth: 67, sentiment: 'positive' }
    ];

    return Response.json({ topics, lastUpdated: new Date().toISOString() }, { headers: this.corsHeaders });
  }

  private errorResponse(message: string, status: number): Response {
    return Response.json(
      { success: false, error: message },
      { status, headers: this.corsHeaders }
    );
  }

  // WebSocket endpoint for live data streams
  createWebSocketServer() {
    return {
      upgrade(req: Request) {
        const success = Bun.upgrade(req, {
          data: { userId: 'anonymous' }
        });
        return success ? undefined : new Response('WebSocket upgrade failed', { status: 400 });
      },
      websocket: {
        open(ws: WebSocket) {
          console.log('WebSocket connected');
          ws.subscribe('crypto-prices');
          ws.subscribe('sports-odds');
          ws.subscribe('market-data');
          
          // Send initial connection message
          ws.send(JSON.stringify({
            type: 'connected',
            channels: ['crypto-prices', 'sports-odds', 'market-data'],
            timestamp: new Date().toISOString()
          }));
        },
        message(ws: WebSocket, message: string) {
          const data = JSON.parse(message);
          
          if (data.type === 'subscribe') {
            ws.subscribe(data.channel);
            ws.send(JSON.stringify({
              type: 'subscribed',
              channel: data.channel
            }));
          } else if (data.type === 'unsubscribe') {
            ws.unsubscribe(data.channel);
            ws.send(JSON.stringify({
              type: 'unsubscribed',
              channel: data.channel
            }));
          }
        },
        close(_ws: WebSocket) {
          console.log('WebSocket disconnected');
        }
      }
    };
  }
}

// Export factory function
export function createExtendedDataRouter(responseCache: ResponseCacheMiddleware): ExtendedDataRouter {
  return new ExtendedDataRouter(responseCache);
}