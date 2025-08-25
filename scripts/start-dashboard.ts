#!/usr/bin/env bun
/**
 * Dashboard Startup Script
 * Launches the complete Telegram & Affiliate Management Dashboard
 */

console.log('🚀 Starting FantDev Trading Dashboard...');
console.log('=====================================');

// Ensure data directories exist
import { existsSync, mkdirSync } from 'fs';

const dataDir = './data';
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const configDir = './config';
if (!existsSync(configDir)) {
  mkdirSync(configDir, { recursive: true });
}

// Create sample data files if they don't exist
const sampleFiles = [
  'telegram_groups.jsonl',
  'telegram_messages.jsonl', 
  'customer_config.json'
];

for (const file of sampleFiles) {
  const filePath = `${dataDir}/${file}`;
  if (!existsSync(filePath)) {
    if (file === 'customer_config.json') {
      const sampleConfig = {
        customers: {
          BB0001: {
            agent_id: 'A100',
            telegram_id: 123456789,
            telegram_username: 'customer1',
            active: true,
            tier: 'vip',
            country: 'US'
          },
          BB0002: {
            agent_id: 'A101', 
            telegram_id: 987654321,
            telegram_username: 'customer2',
            active: true,
            tier: 'basic',
            country: 'CA'
          }
        }
      };
      await Bun.write(filePath, JSON.stringify(sampleConfig, null, 2));
    } else {
      await Bun.write(filePath, '');
    }
    console.log(`✅ Created sample file: ${file}`);
  }
}

// Import and start the dashboard server
try {
  console.log('📊 Initializing dashboard services...');
  
  // The import will automatically start the server
  await import('../src/server/dashboard-server');
  
  console.log('=====================================');
  console.log('✅ Dashboard fully operational!');
  console.log('');
  console.log('📱 Access the dashboard:');
  console.log('   🌐 http://localhost:3001');
  console.log('   🎛️ http://localhost:3001/dashboard');
  console.log('');
  console.log('🔗 API endpoints available:');
  console.log('   📊 /api/dashboard/stats');
  console.log('   👥 /api/dashboard/groups'); 
  console.log('   🤝 /api/dashboard/affiliates');
  console.log('   ⚙️ /api/yaml/*');
  console.log('   🏥 /api/health/full');
  console.log('');
  console.log('⚡ Features enabled:');
  console.log('   • Telegram Group Management');
  console.log('   • Affiliate Program Management');
  console.log('   • Real-time Statistics');
  console.log('   • YAML Configuration Editor');
  console.log('   • Native Bun v1.2.21 Performance');
  console.log('   • Hot Reload Development');
  console.log('');
  console.log('🎯 Dashboard ready for production use!');
  console.log('=====================================');

} catch (error) {
  console.error('❌ Failed to start dashboard:', error);
  process.exit(1);
}