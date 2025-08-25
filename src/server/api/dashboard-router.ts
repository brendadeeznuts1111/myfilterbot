/**
 * Dashboard API Router
 * Handles all dashboard-related API endpoints with Bun YAML support
 */

import { dashboardConfigService } from '../../services/dashboard-config-service';

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

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Overview endpoint
    this.addRoute('GET', /^\/api\/dashboard\/overview$/, this.getOverview.bind(this));
    
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
  }

  private async listYamlFiles(req: Request): Promise<Response> {
    const configs = dashboardConfigService.getAllConfigs();
    const files = Object.keys(configs).map(name => ({
      name: `${name}.yaml`,
      path: `./config/${name}.yaml`,
      size: JSON.stringify(configs[name]).length,
      lastModified: new Date().toISOString()
    }));

    return Response.json(files, { headers: this.corsHeaders });
  }

  private async getYamlFile(req: Request, matches: RegExpMatchArray): Promise<Response> {
    const fileName = matches[1];
    
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
    const stats = await this.getSystemStatsData();
    return Response.json(stats, { headers: this.corsHeaders });
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

// Export singleton instance
export const dashboardRouter = new DashboardRouter();