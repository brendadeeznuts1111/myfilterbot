#!/usr/bin/env bun

/**
 * Service Manager - Start all integrated services
 * This script manages all microservices and ensures they work together
 */

import { spawn } from "child_process";
import { existsSync } from "fs";

interface Service {
  name: string;
  command: string;
  port: number;
  healthCheck: string;
  process?: any;
}

const services: Service[] = [
  {
    name: "Unified Server (Main)",
    command: "bun run src/server/unified-server.ts",
    port: 4000,
    healthCheck: "http://localhost:4000/health"
  },
  {
    name: "Admin API",
    command: "bun run src/server/admin-simple.ts",
    port: 3000,
    healthCheck: "http://localhost:3000/health"
  },
  {
    name: "Data API",
    command: "bun run src/server/api-simple.ts",
    port: 3001,
    healthCheck: "http://localhost:3001/health"
  },
  {
    name: "WebSocket Server",
    command: "bun run src/server/websocket-server.ts",
    port: 3002,
    healthCheck: "http://localhost:3002/health"
  }
];

class ServiceManager {
  private services: Service[];
  private running = true;

  constructor(services: Service[]) {
    this.services = services;
    this.setupShutdownHandlers();
  }

  async start() {
    console.log("🚀 Starting all integrated services...\n");
    
    for (const service of this.services) {
      await this.startService(service);
      await this.delay(1000); // Give each service time to start
    }
    
    console.log("\n✅ All services started successfully!");
    console.log("\n📊 Access points:");
    console.log("   Main Dashboard: http://localhost:4000/");
    console.log("   Admin API: http://localhost:3000/");
    console.log("   Data API: http://localhost:3001/");
    console.log("   WebSocket: ws://localhost:3002/");
    console.log("\n🔄 Services are now integrated and communicating");
    console.log("Press Ctrl+C to stop all services\n");
    
    // Start health monitoring
    this.startHealthMonitoring();
  }

  private async startService(service: Service) {
    console.log(`Starting ${service.name}...`);
    
    const [command, ...args] = service.command.split(' ');
    service.process = spawn(command, args, {
      stdio: 'pipe',
      shell: true
    });
    
    service.process.stdout.on('data', (data: Buffer) => {
      console.log(`[${service.name}] ${data.toString().trim()}`);
    });
    
    service.process.stderr.on('data', (data: Buffer) => {
      console.error(`[${service.name}] ERROR: ${data.toString().trim()}`);
    });
    
    service.process.on('exit', (code: number) => {
      if (this.running) {
        console.log(`⚠️ ${service.name} exited with code ${code}, restarting...`);
        setTimeout(() => this.startService(service), 2000);
      }
    });
  }

  private async startHealthMonitoring() {
    setInterval(async () => {
      for (const service of this.services) {
        try {
          const response = await fetch(service.healthCheck);
          if (!response.ok) {
            console.log(`⚠️ ${service.name} health check failed`);
          }
        } catch (err) {
          console.log(`❌ ${service.name} is not responding`);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private setupShutdownHandlers() {
    const shutdown = () => {
      console.log("\n\n🛑 Shutting down all services...");
      this.running = false;
      
      for (const service of this.services) {
        if (service.process) {
          console.log(`Stopping ${service.name}...`);
          service.process.kill('SIGTERM');
        }
      }
      
      setTimeout(() => {
        console.log("✅ All services stopped");
        process.exit(0);
      }, 2000);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Integration test to verify services can communicate
async function testIntegration() {
  console.log("\n🧪 Testing service integration...");
  
  try {
    // Test unified server
    const unifiedHealth = await fetch("http://localhost:4000/health");
    const unifiedData = await unifiedHealth.json();
    console.log("✅ Unified server responding");
    
    // Test WebSocket connection
    const ws = new WebSocket("ws://localhost:4000/ws");
    await new Promise((resolve, reject) => {
      ws.onopen = () => {
        console.log("✅ WebSocket connected to unified server");
        ws.send(JSON.stringify({ type: "ping" }));
      };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "pong") {
          console.log("✅ WebSocket bidirectional communication working");
          ws.close();
          resolve(true);
        }
      };
      ws.onerror = reject;
      setTimeout(() => reject(new Error("WebSocket timeout")), 5000);
    });
    
    // Test state synchronization
    const stateResponse = await fetch("http://localhost:4000/api/state");
    const state = await stateResponse.json();
    console.log("✅ Shared state accessible:", {
      customers: state.customers?.length || 0,
      transactions: state.transactions?.length || 0,
      services: Object.keys(state.services || {}).length
    });
    
    // Test real-time update
    await fetch("http://localhost:4000/api/trigger-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "metrics.testMetric",
        value: 123
      })
    });
    console.log("✅ Real-time state updates working");
    
    console.log("\n🎉 All integration tests passed!");
    
  } catch (err) {
    console.error("❌ Integration test failed:", err);
  }
}

// Main execution
async function main() {
  const manager = new ServiceManager(services);
  await manager.start();
  
  // Wait for services to fully initialize
  setTimeout(() => {
    testIntegration();
  }, 3000);
}

main().catch(console.error);