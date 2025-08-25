#!/usr/bin/env bun
/**
 * Development server with Bun --define optimizations
 * Starts the development environment with appropriate defines
 */

import { spawn } from 'bun';
import { $ } from 'bun';

const defines = require('../config/bun-defines.js');

async function startDev() {
  console.log('🚀 Starting development environment with Bun defines...\n');

  // Get development defines
  const devDefines = defines.development;
  
  // Format defines for CLI
  const defineFlags = Object.entries(devDefines)
    .flatMap(([key, value]) => ['--define', `${key}=${JSON.stringify(value)}`]);

  console.log('🔧 Using development defines:');
  console.log('  - NODE_ENV: development');
  console.log('  - Console logs: enabled');
  console.log('  - Debug mode: enabled');
  console.log('  - Dev tools: enabled\n');

  // Start services
  const services = [
    {
      name: 'Bot',
      command: ['python3', 'src/bot/main.py'],
      color: '\x1b[32m', // Green
    },
    {
      name: 'Admin Server',
      command: ['bun', ...defineFlags, '--hot', 'src/server/admin/index.ts'],
      color: '\x1b[34m', // Blue
    },
    {
      name: 'Dev Server',
      command: ['bun', ...defineFlags, 'run', 'src/dev-server.ts'],
      color: '\x1b[35m', // Magenta
    },
    {
      name: 'Admin Mobile',
      command: ['bun', ...defineFlags, '--hot', 'src/client/admin-mobile/dev-server.ts'],
      color: '\x1b[36m', // Cyan
    },
  ];

  const processes = [];

  // Function to prefix output with service name
  function prefixOutput(name, color) {
    return (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          console.log(`${color}[${name}]\x1b[0m ${line}`);
        }
      });
    };
  }

  // Start each service
  for (const service of services) {
    console.log(`🚀 Starting ${service.name}...`);
    
    try {
      const proc = spawn({
        cmd: service.command,
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: 'inherit',
      });

      // Handle output
      proc.stdout?.on('data', prefixOutput(service.name, service.color));
      proc.stderr?.on('data', prefixOutput(service.name, service.color));

      // Handle exit
      proc.on('exit', (code) => {
        console.log(`${service.color}[${service.name}]\x1b[0m Process exited with code ${code}`);
        
        // If one service fails, kill all others
        if (code !== 0) {
          console.error(`\n❌ ${service.name} failed. Shutting down all services...`);
          cleanup();
          process.exit(1);
        }
      });

      processes.push(proc);
    } catch (error) {
      console.error(`❌ Failed to start ${service.name}:`, error);
      cleanup();
      process.exit(1);
    }
  }

  console.log('\n✅ All services started successfully!');
  console.log('\n📋 Service URLs:');
  console.log('  - Admin Portal: http://localhost:3003');
  console.log('  - Customer Portal: http://localhost:5000');
  console.log('  - Dev Server: http://localhost:3006');
  console.log('  - Admin Mobile: http://localhost:3007');
  console.log('\n💡 Press Ctrl+C to stop all services\n');

  // Cleanup function
  function cleanup() {
    console.log('\n🛑 Stopping all services...');
    processes.forEach(proc => {
      try {
        proc.kill();
      } catch {
        // Ignore errors
      }
    });
  }

  // Handle interrupts
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  // Keep the process running
  await new Promise(() => {});
}

// Run dev environment
startDev().catch(error => {
  console.error('Failed to start development environment:', error);
  process.exit(1);
});