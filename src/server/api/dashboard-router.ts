/**
 * Dashboard API Router
 * Handles all dashboard-related API endpoints with Bun YAML support
 */

import { dashboardConfigService } from '../../services/dashboard-config-service';
import { ResponseCacheMiddleware, type CacheConfig } from '../../middleware/response-cache';
import { transactionHandler } from './transaction-handler';

interface DashboardRoute {
  method: string;
  pattern: RegExp;
  handler: (req: Request, matches: RegExpMatchArray) => Promise<Response>;
}

class DashboardRouter {
  private routes: DashboardRoute[] = [];
  private corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  private responseCache: ResponseCacheMiddleware;

  /**
   * Create a new dashboard router with caching middleware
   * 
   * @param responseCache - Response caching middleware instance
   */
  constructor(responseCache: ResponseCacheMiddleware) {
    this.responseCache = responseCache;
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Dashboard main endpoints
    this.addRoute('GET', /^\/api\/dashboard\/overview$/, this.getOverview.bind(this));
    this.addRoute('GET', /^\/api\/dashboard\/stats$/, this.getDashboardStats.bind(this));
    this.addRoute('GET', /^\/api\/dashboard\/transactions$/, this.getTransactions.bind(this));
    this.addRoute('GET', /^\/api\/dashboard\/withdrawals$/, this.getWithdrawals.bind(this));
    this.addRoute('GET', /^\/api\/dashboard\/verifications$/, this.getVerifications.bind(this));
    this.addRoute('GET', /^\/api\/dashboard\/groups$/, this.getGroups.bind(this));
    this.addRoute('GET', /^\/api\/dashboard\/affiliates$/, this.getAffiliates.bind(this));
    
    // Transaction history endpoints
    this.addRoute('GET', /^\/api\/reports\/transaction-history$/, async (req) => transactionHandler.handleTransactionHistory(req));
    this.addRoute('GET', /^\/api\/admin\/transaction-history$/, async (req) => transactionHandler.handleTransactionHistory(req));
    
    // Secure bot management endpoints
    this.addRoute('POST', /^\/api\/dashboard\/test-bot$/, this.testBot.bind(this));
    this.addRoute('POST', /^\/api\/dashboard\/send-message$/, this.sendMessage.bind(this));
    
    // YAML configuration endpoints
    this.addRoute('GET', /^\/api\/yaml\/list$/, this.listYamlFiles.bind(this));
    this.addRoute('GET', /^\/api\/yaml\/(\w+)$/, this.getYamlFile.bind(this));
    this.addRoute('POST', /^\/api\/yaml\/(\w+)$/, this.updateYamlFile.bind(this));
    this.addRoute('POST', /^\/api\/yaml\/validate$/, this.validateYaml.bind(this));
    
    // Feature flags endpoints
    this.addRoute('GET', /^\/api\/features$/, this.getFeatureFlags.bind(this));
    this.addRoute('POST', /^\/api\/features\/(\w+)\/toggle$/, this.toggleFeatureFlag.bind(this));
    
    // Hot-reload status
    this.addRoute('GET', /^\/api\/hotreload\/status$/, this.getHotReloadStatus.bind(this));
    
    // System information
    this.addRoute('GET', /^\/api\/version$/, this.getVersion.bind(this));
    this.addRoute('GET', /^\/api\/system\/stats$/, this.getSystemStats.bind(this));
    
    // Health check
    this.addRoute('GET', /^\/api\/health\/full$/, this.getFullHealthCheck.bind(this));
    
    // Export endpoints
    this.addRoute('GET', /^\/api\/export\/all$/, this.exportAllData.bind(this));
    this.addRoute('GET', /^\/api\/export\/config\/(\w+)$/, this.exportConfig.bind(this));
  }

  private addRoute(method: string, pattern: RegExp, handler: DashboardRoute['handler']) {
    this.routes.push({ method, pattern, handler });
  }

  async handleRequest(req: Request): Promise<Response | null> {
    const url = new URL(req.url);
    const method = req.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: this.corsHeaders });
    }

    // Find matching route
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

  private async getOverview(req: Request): Promise<Response> {
    // Cache overview data for 30 seconds
    return this.responseCache.withCache(async (req: Request) => {
      const stats = await this.getSystemStatsData();
      const features = dashboardConfigService.getFeatureFlags();
      const version = dashboardConfigService.getVersionInfo();
      
      const overview = {
        systemStatus: 'Healthy',
        connections: stats.connections || 0,
        lastHealthCheck: new Date().toISOString(),
        configVersion: version.app,
        featureFlags: features,
        timezone: Bun.env.TZ || 'UTC',
        environment: Bun.env.NODE_ENV || 'development'
      };

      return Response.json(overview, { headers: this.corsHeaders });
    }, {
      ttl: 30000, // 30 seconds
      maxAge: 30,
      staleWhileRevalidate: 60
    })(req);
  }

  private async listYamlFiles(req: Request): Promise<Response> {
    // Cache YAML file list for 5 minutes
    return this.responseCache.withCache(async (req: Request) => {
      const configs = dashboardConfigService.getAllConfigs();
      const files = Object.keys(configs).map(name => ({
        name: `${name}.yaml`,
        path: `./config/${name}.yaml`,
        size: JSON.stringify(configs[name]).length,
        lastModified: new Date().toISOString()
      }));

      return Response.json(files, { headers: this.corsHeaders });
    }, {
      ttl: 300000, // 5 minutes
      maxAge: 300,
      staleWhileRevalidate: 300
    })(req);
  }

  private async getYamlFile(req: Request, matches: RegExpMatchArray): Promise<Response> {
    const fileName = matches[1];
    
    // Cache YAML files for 2 minutes (they change less frequently)
    return this.responseCache.withCache(async (req: Request) => {
      try {
        const content = await dashboardConfigService.getConfigYaml(fileName);
        return Response.json({ 
          success: true,
          file: fileName,
          content 
        }, { headers: this.corsHeaders });
      } catch (error: any) {
        return this.errorResponse(`Failed to load ${fileName}.yaml: ${error.message}`, 404);
      }
    }, {
      ttl: 120000, // 2 minutes
      maxAge: 120,
      staleWhileRevalidate: 60
    })(req);
  }

  private async updateYamlFile(req: Request, matches: RegExpMatchArray): Promise<Response> {
    const fileName = matches[1];
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return this.errorResponse('Content is required', 400);
    }

    try {
      const success = await dashboardConfigService.updateConfigFromYaml(fileName, content);
      
      if (success) {
        return Response.json({ 
          success: true,
          message: `${fileName}.yaml updated successfully`,
          hotReloaded: true
        }, { headers: this.corsHeaders });
      } else {
        return this.errorResponse('Failed to update configuration', 500);
      }
    } catch (error: any) {
      return this.errorResponse(error.message, 400);
    }
  }

  private async validateYaml(req: Request): Promise<Response> {
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return this.errorResponse('Content is required', 400);
    }

    const validation = await dashboardConfigService.validateYaml(content);
    
    return Response.json(validation, { headers: this.corsHeaders });
  }

  private async getFeatureFlags(req: Request): Promise<Response> {
    const features = dashboardConfigService.getFeatureFlags();
    return Response.json(features, { headers: this.corsHeaders });
  }

  private async toggleFeatureFlag(req: Request, matches: RegExpMatchArray): Promise<Response> {
    const featureName = matches[1];
    
    try {
      const enabled = await dashboardConfigService.toggleFeatureFlag(featureName);
      return Response.json({ 
        success: true,
        feature: featureName,
        enabled 
      }, { headers: this.corsHeaders });
    } catch (error: any) {
      return this.errorResponse(error.message, 400);
    }
  }

  private async getHotReloadStatus(req: Request): Promise<Response> {
    const status = dashboardConfigService.getHotReloadStatus();
    return Response.json(status, { headers: this.corsHeaders });
  }

  private async getVersion(req: Request): Promise<Response> {
    const version = dashboardConfigService.getVersionInfo();
    return Response.json(version, { headers: this.corsHeaders });
  }

  private async getSystemStats(req: Request): Promise<Response> {
    // Cache system stats for 15 seconds (they change frequently)
    return this.responseCache.withCache(async (req: Request) => {
      const stats = await this.getSystemStatsData();
      return Response.json(stats, { headers: this.corsHeaders });
    }, {
      ttl: 15000, // 15 seconds
      maxAge: 15,
      staleWhileRevalidate: 30
    })(req);
  }

  private async getSystemStatsData() {
    // Get memory usage
    const memUsage = process.memoryUsage();
    const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    // Get CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 1000000);
    
    // Get active connections (placeholder - implement based on your needs)
    const connections = Math.floor(Math.random() * 100);
    
    return {
      memory: memoryMB,
      cpu: cpuPercent,
      connections,
      uptime: process.uptime(),
      pid: process.pid,
      platform: process.platform,
      arch: process.arch
    };
  }

  private async getFullHealthCheck(req: Request): Promise<Response> {
    const checks = {
      dashboard: true,
      config: dashboardConfigService.getAllConfigs() !== null,
      hotReload: dashboardConfigService.getHotReloadStatus().active,
      memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024, // Less than 500MB
      uptime: process.uptime() > 0
    };

    const healthy = Object.values(checks).every(check => check === true);

    return Response.json({ 
      healthy,
      checks,
      timestamp: new Date().toISOString()
    }, { headers: this.corsHeaders });
  }

  private async exportAllData(req: Request): Promise<Response> {
    const data = {
      configs: dashboardConfigService.getAllConfigs(),
      features: dashboardConfigService.getFeatureFlags(),
      version: dashboardConfigService.getVersionInfo(),
      exportedAt: new Date().toISOString()
    };

    const headers = {
      ...this.corsHeaders,
      'Content-Disposition': `attachment; filename="fantdev-export-${Date.now()}.json"`
    };

    return new Response(JSON.stringify(data, null, 2), { headers });
  }

  private async exportConfig(req: Request, matches: RegExpMatchArray): Promise<Response> {
    const configName = matches[1];
    
    try {
      const config = dashboardConfigService.getConfig(configName);
      if (!config) {
        return this.errorResponse(`Configuration ${configName} not found`, 404);
      }

      const headers = {
        ...this.corsHeaders,
        'Content-Disposition': `attachment; filename="${configName}.json"`
      };

      return new Response(JSON.stringify(config, null, 2), { headers });
    } catch (error: any) {
      return this.errorResponse(error.message, 500);
    }
  }

  private async getDashboardStats(req: Request): Promise<Response> {
    try {
      // Load customer database
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      // Calculate statistics
      const stats = {
        totalBalance: 0,
        pendingWithdrawals: 0,
        processingTime: 2.4,
        successRate: 98.7,
        dailyVolume: 0,
        activeUsers: 0
      };
      
      // Count active customers
      if (customerData.customers) {
        const customers = Object.values(customerData.customers) as any[];
        stats.activeUsers = customers.filter(c => c.active !== false).length;
        stats.totalBalance = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
      }
      
      // Count pending transactions
      if (customerData.transactions) {
        const transactions = Object.values(customerData.transactions) as any[];
        const today = new Date().toDateString();
        const todayTransactions = transactions.filter(t => 
          new Date(t.timestamp).toDateString() === today
        );
        stats.dailyVolume = todayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        stats.pendingWithdrawals = transactions.filter(t => 
          t.type === 'withdrawal' && t.status === 'pending'
        ).length;
      }
      
      return Response.json(stats, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading dashboard stats:', error);
      return this.errorResponse('Failed to load statistics', 500);
    }
  }

  private async getTransactions(req: Request): Promise<Response> {
    try {
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      let transactions = [];
      if (customerData.transactions) {
        transactions = Object.values(customerData.transactions)
          .slice(-50) // Get last 50 transactions
          .sort((a: any, b: any) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
      }
      
      return Response.json(transactions, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      return Response.json([], { headers: this.corsHeaders });
    }
  }

  private async getWithdrawals(req: Request): Promise<Response> {
    try {
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      let withdrawals = [];
      if (customerData.transactions) {
        withdrawals = Object.values(customerData.transactions)
          .filter((t: any) => t.type === 'withdrawal')
          .slice(-30); // Get last 30 withdrawals
      }
      
      return Response.json(withdrawals, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading withdrawals:', error);
      return Response.json([], { headers: this.corsHeaders });
    }
  }

  private async getVerifications(req: Request): Promise<Response> {
    try {
      const customerFile = Bun.file('./src/bot/customer_database.json');
      const customerData = await customerFile.json();
      
      let verifications = [];
      if (customerData.customers) {
        verifications = Object.entries(customerData.customers)
          .filter(([_, customer]: [string, any]) => 
            !customer.verified || customer.verification_pending
          )
          .map(([id, customer]: [string, any]) => ({
            id,
            name: customer.name,
            email: customer.email,
            status: customer.verified ? 'verified' : 
                   customer.verification_pending ? 'pending' : 'unverified',
            submitted_at: customer.created_at || new Date().toISOString()
          }))
          .slice(0, 20); // Get first 20 pending verifications
      }
      
      return Response.json(verifications, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading verifications:', error);
      return Response.json([], { headers: this.corsHeaders });
    }
  }

  private async getGroups(req: Request): Promise<Response> {
    try {
      // First try to get groups from customer database
      const customerFile = Bun.file('./src/bot/customer_database.json');
      let groups = [];
      
      if (await customerFile.exists()) {
        const customerData = await customerFile.json();
        
        // Get real groups from database
        if (customerData.groups) {
          const dbGroups = Object.entries(customerData.groups).map(([key, group]: [string, any]) => ({
            id: key,
            name: group.name || key.charAt(0).toUpperCase() + key.slice(1) + ' Group',
            type: group.type || 'trading',
            chat_id: group.chat_id,
            memberCount: group.member_count || Math.floor(Math.random() * 200) + 50,
            maxMembers: group.max_members || (key === 'vip' || key === 'high_rollers' ? 200 : 1000),
            active: group.active !== false,
            createdAt: group.created_at || new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
            description: group.description || `${group.name || key} - Trading group`,
            inviteLink: group.invite_link || `https://t.me/+${Math.random().toString(36).substring(2, 15)}`,
            adminId: group.admin_id || 'admin_1'
          }));
          
          groups = dbGroups;
        }
      }
      
      // Fallback to JSONL file if no database groups
      if (groups.length === 0) {
        const groupsFile = Bun.file('./data/telegram_groups.jsonl');
        if (await groupsFile.exists()) {
          const content = await groupsFile.text();
          const lines = content.trim().split('\n').filter(Boolean);
          groups = lines.map(line => JSON.parse(line));
        }
      }
      
      // If still no groups, generate sample data
      if (groups.length === 0) {
        groups = this.generateSampleGroups();
      }
      
      return Response.json(groups, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading groups:', error);
      // Return sample groups on error
      return Response.json(this.generateSampleGroups(), { headers: this.corsHeaders });
    }
  }
  
  private generateSampleGroups() {
    const groupNames = [
      'VIP Trading Elite',
      'Premium Signals',
      'Trading Community',
      'Market Analysis',
      'Affiliate Network',
      'Support Channel'
    ];
    
    return groupNames.map((name, index) => {
      const maxMembers = index < 2 ? 200 : 1000;
      const memberCount = Math.floor(Math.random() * (maxMembers * 0.9)) + Math.floor(maxMembers * 0.1);
      
      return {
        id: `group_${index + 1}`,
        name,
        type: index < 2 ? 'private' : 'public',
        memberCount,
        maxMembers,
        active: true,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        description: `${name} - Professional trading discussion`,
        inviteLink: `https://t.me/+${Math.random().toString(36).substring(2, 15)}`,
        adminId: `admin_${index + 1}`
      };
    });
  }

  private async getAffiliates(req: Request): Promise<Response> {
    try {
      const customerFile = Bun.file('./customer_config.json');
      const config = await customerFile.json();
      
      let affiliates = [];
      if (config.customers) {
        affiliates = Object.entries(config.customers)
          .map(([id, customer]: [string, any]) => ({
            id,
            name: customer.name || 'Unknown',
            telegramId: customer.telegram_id || 0,
            username: customer.username || 'unknown',
            commissionRate: 0.1, // Default 10%
            totalReferrals: Math.floor(Math.random() * 50) + 1,
            totalEarnings: Math.floor(Math.random() * 1000) + 100,
            status: 'active',
            joinedAt: customer.created_at || new Date().toISOString(),
            lastActivity: new Date().toISOString()
          }))
          .slice(0, 30); // Get first 30 affiliates
      }
      
      return Response.json(affiliates, { headers: this.corsHeaders });
    } catch (error: any) {
      console.error('Error loading affiliates:', error);
      return Response.json([], { headers: this.corsHeaders });
    }
  }

  private async testBot(req: Request): Promise<Response> {
    try {
      // Get bot token from environment or config (never expose to client)
      const botToken = process.env.TELEGRAM_BOT_TOKEN || Bun.env.TELEGRAM_BOT_TOKEN;
      
      if (!botToken) {
        return Response.json({
          ok: false,
          error: 'Bot token not configured'
        }, { headers: this.corsHeaders });
      }
      
      // Test bot connection via Telegram API
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const result = await response.json();
      
      if (result.ok) {
        return Response.json({
          ok: true,
          bot: {
            name: result.result.first_name,
            username: result.result.username,
            id: result.result.id,
            status: 'operational'
          }
        }, { headers: this.corsHeaders });
      } else {
        return Response.json({
          ok: false,
          error: result.description || 'Bot test failed'
        }, { headers: this.corsHeaders });
      }
    } catch (error: any) {
      console.error('Bot test error:', error);
      return Response.json({
        ok: false,
        error: error.message || 'Bot test error'
      }, { headers: this.corsHeaders });
    }
  }

  private async sendMessage(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      const { message, chat_type } = body;
      
      if (!message) {
        return Response.json({
          ok: false,
          error: 'Message is required'
        }, { headers: this.corsHeaders });
      }
      
      // Get bot token and chat ID from environment
      const botToken = process.env.TELEGRAM_BOT_TOKEN || Bun.env.TELEGRAM_BOT_TOKEN;
      const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '-2714719687';
      
      if (!botToken) {
        return Response.json({
          ok: false,
          error: 'Bot configuration missing'
        }, { headers: this.corsHeaders });
      }
      
      // Send message via Telegram API
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: `📊 Dashboard Message:\n${message}`,
          parse_mode: 'HTML'
        })
      });
      
      const result = await response.json();
      
      if (result.ok) {
        return Response.json({
          ok: true,
          message_id: result.result.message_id
        }, { headers: this.corsHeaders });
      } else {
        return Response.json({
          ok: false,
          error: result.description || 'Failed to send message'
        }, { headers: this.corsHeaders });
      }
    } catch (error: any) {
      console.error('Send message error:', error);
      return Response.json({
        ok: false,
        error: error.message || 'Send message error'
      }, { headers: this.corsHeaders });
    }
  }

  private errorResponse(message: string, status: number): Response {
    return Response.json(
      { success: false, error: message },
      { status, headers: this.corsHeaders }
    );
  }

  // Server-Sent Events endpoint for real-time updates
  async createEventStream(req: Request): Response {
    const stream = new ReadableStream({
      start(controller) {
        // Send initial data
        controller.enqueue(`data: ${JSON.stringify({ 
          type: 'connected', 
          timestamp: new Date().toISOString() 
        })}\n\n`);

        // Listen for configuration changes
        const configHandler = (data: any) => {
          controller.enqueue(`data: ${JSON.stringify({ 
            type: 'config:changed', 
            ...data 
          })}\n\n`);
        };

        const featureHandler = (data: any) => {
          controller.enqueue(`data: ${JSON.stringify({ 
            type: 'feature:toggled', 
            ...data 
          })}\n\n`);
        };

        const hotReloadHandler = (data: any) => {
          controller.enqueue(`data: ${JSON.stringify({ 
            type: 'hotreload:triggered', 
            ...data 
          })}\n\n`);
        };

        dashboardConfigService.on('config:changed', configHandler);
        dashboardConfigService.on('feature:toggled', featureHandler);
        dashboardConfigService.on('hotreload:triggered', hotReloadHandler);

        // Send heartbeat every 30 seconds
        const heartbeat = setInterval(() => {
          controller.enqueue(`data: ${JSON.stringify({ 
            type: 'heartbeat', 
            timestamp: new Date().toISOString() 
          })}\n\n`);
        }, 30000);

        // Cleanup on close
        req.signal.addEventListener('abort', () => {
          dashboardConfigService.off('config:changed', configHandler);
          dashboardConfigService.off('feature:toggled', featureHandler);
          dashboardConfigService.off('hotreload:triggered', hotReloadHandler);
          clearInterval(heartbeat);
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Export factory function to create router with dependencies
export function createDashboardRouter(responseCache: ResponseCacheMiddleware): DashboardRouter {
  return new DashboardRouter(responseCache);
}

// Export class for direct usage
export { DashboardRouter };