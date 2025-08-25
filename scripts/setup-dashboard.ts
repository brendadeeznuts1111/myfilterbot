#!/usr/bin/env bun
/**
 * Dashboard Setup Script
 * Ensures all dashboard components are properly configured and running
 */

import { $ } from 'bun';

const PORTS = {
  admin: 3001,
  bot: 3004,
  worker: 8787
};

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

async function checkPort(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/`, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(1000)
    });
    return true;
  } catch {
    return false;
  }
}

async function checkDashboardAPI(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3001/api/dashboard/stats', {
      signal: AbortSignal.timeout(2000)
    });
    const data = await response.json();
    return response.ok && data !== null;
  } catch {
    return false;
  }
}

async function ensureDataFiles() {
  log('\n📁 Checking data files...', COLORS.cyan);
  
  // Ensure data directory exists
  const dataDir = './data';
  try {
    await $`mkdir -p ${dataDir}`;
    log('✅ Data directory exists', COLORS.green);
  } catch (error) {
    log('❌ Failed to create data directory', COLORS.red);
  }
  
  // Check customer database
  const customerDb = Bun.file('./src/bot/customer_database.json');
  if (await customerDb.exists()) {
    const data = await customerDb.json();
    const customerCount = Object.keys(data.customers || {}).length;
    log(`✅ Customer database found (${customerCount} customers)`, COLORS.green);
  } else {
    log('⚠️ Customer database not found - creating sample...', COLORS.yellow);
    const sampleData = {
      customers: {},
      transactions: [],
      sessions: {}
    };
    await Bun.write('./src/bot/customer_database.json', JSON.stringify(sampleData, null, 2));
  }
  
  // Check telegram groups file
  const groupsFile = Bun.file('./data/telegram_groups.jsonl');
  if (!await groupsFile.exists()) {
    log('⚠️ Telegram groups file not found - creating sample...', COLORS.yellow);
    const sampleGroups = [
      { id: 'group_1', name: 'VIP Trading', type: 'private', memberCount: 150, maxMembers: 200, active: true, createdAt: new Date().toISOString() },
      { id: 'group_2', name: 'Signals Channel', type: 'public', memberCount: 500, maxMembers: 1000, active: true, createdAt: new Date().toISOString() }
    ];
    const content = sampleGroups.map(g => JSON.stringify(g)).join('\n');
    await Bun.write('./data/telegram_groups.jsonl', content);
  } else {
    log('✅ Telegram groups file exists', COLORS.green);
  }
}

async function main() {
  log('\n🚀 FantDev Dashboard Setup', COLORS.bright + COLORS.blue);
  log('================================\n', COLORS.blue);
  
  // Check data files
  await ensureDataFiles();
  
  // Check services
  log('\n🔍 Checking services...', COLORS.cyan);
  
  const adminRunning = await checkPort(PORTS.admin);
  const botRunning = await checkPort(PORTS.bot);
  const apiWorking = await checkDashboardAPI();
  
  log(`\nAdmin Server (${PORTS.admin}): ${adminRunning ? '✅ Running' : '❌ Not running'}`, 
      adminRunning ? COLORS.green : COLORS.red);
  
  log(`Bot Service (${PORTS.bot}): ${botRunning ? '✅ Running' : '❌ Not running'}`, 
      botRunning ? COLORS.green : COLORS.red);
  
  log(`Dashboard API: ${apiWorking ? '✅ Working' : '❌ Not responding'}`, 
      apiWorking ? COLORS.green : COLORS.red);
  
  // Provide instructions if services are not running
  if (!adminRunning || !apiWorking) {
    log('\n⚠️ Some services are not running!', COLORS.yellow);
    log('\nTo start the dashboard, run:', COLORS.cyan);
    log('  bun run dev:server', COLORS.bright);
    log('\nOr to start all services:', COLORS.cyan);
    log('  bun run dev', COLORS.bright);
  }
  
  // Dashboard URLs
  log('\n🌐 Dashboard URLs:', COLORS.cyan);
  log(`  Main Dashboard: ${COLORS.bright}http://localhost:${PORTS.admin}/dashboard`, COLORS.green);
  log(`  Admin Portal: ${COLORS.bright}http://localhost:${PORTS.admin}/`, COLORS.green);
  log(`  API Endpoint: ${COLORS.bright}http://localhost:${PORTS.admin}/api/dashboard/stats`, COLORS.green);
  log(`  Static Dashboard: ${COLORS.bright}file://${process.cwd()}/public/portals/dashboard.html`, COLORS.green);
  
  // Test API if running
  if (apiWorking) {
    log('\n📊 Dashboard Statistics:', COLORS.cyan);
    try {
      const response = await fetch('http://localhost:3001/api/dashboard/stats');
      const stats = await response.json();
      
      log(`  Groups: ${stats.groups?.total || 0}`, COLORS.reset);
      log(`  Affiliates: ${stats.affiliates?.total || 0}`, COLORS.reset);
      log(`  Bot Status: ${stats.bot?.status || 'unknown'}`, COLORS.reset);
      log(`  System Memory: ${stats.system?.memory || 0} MB`, COLORS.reset);
    } catch (error) {
      log('  Failed to fetch statistics', COLORS.red);
    }
  }
  
  log('\n✨ Setup complete!', COLORS.green + COLORS.bright);
  
  // Open dashboard if requested
  const args = process.argv.slice(2);
  if (args.includes('--open')) {
    log('\n🌐 Opening dashboard in browser...', COLORS.cyan);
    await $`open http://localhost:${PORTS.admin}/dashboard`;
  }
}

// Run the setup
main().catch(console.error);