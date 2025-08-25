#!/usr/bin/env bun

/**
 * Test YAML hot reloading functionality
 * Run with: bun --hot src/test-yaml-hot-reload.ts
 */

import appConfig from "../config/app.yaml";
import featuresConfig from "../config/features.yaml";

const server = appConfig.server;
const features = featuresConfig;
import { configManager, isFeatureEnabled } from "./utils/yaml-config";

console.log("🚀 Starting YAML Hot Reload Test Server");
console.log("📝 Edit config/app.yaml or config/features.yaml to see changes in real-time");
console.log("-".repeat(60));

// Display initial configuration
console.log("\n📋 Initial Configuration:");
console.log(`Server Port: ${server.api.port}`);
console.log(`Rate Limit: ${server.api.rateLimit.maxRequests} requests per ${server.api.rateLimit.windowMs}ms`);
console.log(`WebSocket Port: ${server.websocket.port}`);
console.log(`WebSocket Compression: ${server.websocket.compression}`);

// Check feature flags
async function checkFeatures() {
  console.log("\n🎛️ Feature Flags:");
  const featureNames = [
    "newDashboard",
    "darkMode",
    "pushNotifications",
    "advancedTrading",
    "twoFactorAuth",
    "aiPredictions"
  ];

  for (const feature of featureNames) {
    const enabled = await isFeatureEnabled(feature);
    console.log(`  ${enabled ? "✅" : "❌"} ${feature}`);
  }
}

// Initial feature check
await checkFeatures();

// Watch for configuration changes
let configVersion = 1;

// Create a simple HTTP server to demonstrate config usage
const port = parseInt(process.env.API_PORT || '3001');
const host = process.env.API_HOST || 'localhost';

Bun.serve({
  port,
  hostname: host,

  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({
          message: "YAML Config Test Server",
          config: {
            server: server,
            configVersion: configVersion,
            environment: process.env.NODE_ENV || "development"
          }
        }, null, 2),
        {
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (url.pathname === "/features") {
      const featuresStatus: Record<string, boolean> = {};
      
      for (const featureName of Object.keys(features.features || {})) {
        featuresStatus[featureName] = await isFeatureEnabled(featureName);
      }

      return new Response(
        JSON.stringify(featuresStatus, null, 2),
        {
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (url.pathname === "/reload") {
      configVersion++;
      await configManager.reload("app.yaml");
      await configManager.reload("features.yaml");
      
      console.log(`\n🔄 Configuration reloaded (version ${configVersion})`);
      await checkFeatures();
      
      return new Response(
        JSON.stringify({ 
          message: "Configuration reloaded", 
          version: configVersion 
        }),
        {
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response("Not Found", { status: 404 });
  }
});

console.log(`\n✨ Server running at http://localhost:${server.api.port || 3001}`);
console.log("\n📍 Available endpoints:");
console.log("  GET /          - View current configuration");
console.log("  GET /features  - Check feature flags status");
console.log("  GET /reload    - Manually reload configuration");
console.log("\n💡 Tip: Modify YAML files and visit /reload or restart with --hot flag");

// Monitor for file changes (when running with --hot)
if (import.meta.hot) {
  import.meta.hot.accept(async () => {
    configVersion++;
    console.log(`\n♻️ Hot reload detected (version ${configVersion})`);
    await checkFeatures();
  });
}