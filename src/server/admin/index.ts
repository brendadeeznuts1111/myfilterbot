import { serve } from "bun";
import { execSync } from "child_process";
import appConfig from "../../../config/app.yaml";
import { yamlConfigService, checkFeature } from "../../services/yaml-config-service";

// Get server configuration from YAML
const adminConfig = appConfig.server.admin;
const port = adminConfig.port || 3000;
const host = adminConfig.host || "0.0.0.0";

console.log(`🚀 Admin server starting with YAML configuration`);
console.log(`📍 Host: ${host}:${port}`);
console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);

serve({
  port,
  hostname: host,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Health check endpoint
    if (url.pathname === "/health") {
      const sha = process.env.VERCEL_GIT_COMMIT_SHA || execSync('git rev-parse HEAD').toString().trim();
      
      // Check if enhanced health check feature is enabled
      const enhancedHealth = await checkFeature("enhancedAnalytics");
      
      const healthData: any = { 
        status: "ok", 
        uptime: process.uptime(), 
        version: process.env.npm_package_version, 
        sha,
        config: {
          source: "yaml",
          environment: process.env.NODE_ENV || 'development'
        }
      };
      
      if (enhancedHealth) {
        healthData.monitoring = {
          enabled: appConfig.monitoring?.enabled || false,
          level: appConfig.monitoring?.logging?.level || 'info'
        };
      }
      
      return new Response(JSON.stringify(healthData), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Feature flags endpoint
    if (url.pathname === "/api/features") {
      const userId = url.searchParams.get("userId");
      const features = await yamlConfigService.getFeatureFlags(userId || undefined);
      
      return new Response(JSON.stringify(features), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Config endpoint (dev only)
    if (url.pathname === "/api/config" && process.env.NODE_ENV !== 'production') {
      const config = {
        server: await yamlConfigService.getServerConfig("admin"),
        database: await yamlConfigService.getDatabase(),
        security: await yamlConfigService.getSecurityConfig()
      };
      
      return new Response(JSON.stringify(config, null, 2), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response("404 - Not Found", { status: 404 });
  },
});
