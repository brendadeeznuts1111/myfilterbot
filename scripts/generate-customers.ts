#!/usr/bin/env bun

/**
 * Generate 3000+ customers for Fantasy402 Trading Platform
 */

import { writeFileSync } from 'fs';

// Customer name lists for realistic generation
const firstNames = [
  'John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'James', 'Lisa', 'Robert', 'Maria',
  'William', 'Patricia', 'Richard', 'Jennifer', 'Charles', 'Linda', 'Joseph', 'Barbara',
  'Thomas', 'Susan', 'Christopher', 'Jessica', 'Daniel', 'Karen', 'Matthew', 'Nancy',
  'Anthony', 'Betty', 'Donald', 'Helen', 'Mark', 'Sandra', 'Paul', 'Donna', 'Steven', 'Carol',
  'Andrew', 'Ruth', 'Kenneth', 'Sharon', 'Joshua', 'Michelle', 'Kevin', 'Laura', 'Brian', 'Amy'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
];

const countries = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'KR', 'SG', 'HK', 'AE', 'CH'];

// Agent assignments (5 agents, each handles ~600 customers)
const agents = ['A100', 'A101', 'A102', 'A104']; // A103 is suspended
const groups = ['-2714719687', '-2814729688', '-2914739689'];

function generateCustomers(count: number) {
  const customers: any = {};
  const database: any = {};
  
  for (let i = 1; i <= count; i++) {
    const customerId = `BB${String(i).padStart(4, '0')}`;
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}${Math.floor(Math.random() * 99)}`;
    
    // Determine customer tier based on distribution
    // 5% VIP, 15% Gold, 30% Silver, 50% Basic
    const rand = Math.random();
    let balance, tier, active;
    
    if (rand < 0.05) {
      // VIP (5%)
      balance = Math.floor(Math.random() * 90000) + 10000; // $10k - $100k
      tier = 'vip';
      active = true;
    } else if (rand < 0.20) {
      // Gold (15%)
      balance = Math.floor(Math.random() * 5000) + 5000; // $5k - $10k
      tier = 'gold';
      active = true;
    } else if (rand < 0.50) {
      // Silver (30%)
      balance = Math.floor(Math.random() * 4000) + 1000; // $1k - $5k
      tier = 'silver';
      active = Math.random() > 0.1; // 90% active
    } else {
      // Basic (50%)
      balance = Math.floor(Math.random() * 1000); // $0 - $1k
      tier = 'basic';
      active = Math.random() > 0.3; // 70% active
    }
    
    // Config data
    customers[customerId] = {
      password: `pass${Math.floor(Math.random() * 999999)}`,
      telegram_id: 100000000 + i,
      telegram_username: `@${username}`,
      active: active,
      keywords: generateKeywords(),
      group_chat_id: groups[Math.floor(Math.random() * groups.length)],
      agent_id: agents[Math.floor(Math.random() * agents.length)],
      tier: tier,
      country: countries[Math.floor(Math.random() * countries.length)],
      created_at: generateRandomDate()
    };
    
    // Database data
    database[customerId] = {
      balance: balance,
      weekly_pnl: generatePnL(balance),
      total_deposits: balance * (1 + Math.random()),
      total_withdrawals: balance * Math.random() * 0.3,
      phone: generatePhone(),
      email: `${username}@example.com`,
      last_activity: generateRecentDate(),
      total_bets: Math.floor(Math.random() * 1000),
      win_rate: (Math.random() * 0.3 + 0.35).toFixed(2), // 35-65% win rate
      fraud_score: Math.floor(Math.random() * 50), // Most are low risk
      kyc_verified: tier === 'vip' || tier === 'gold',
      registration_ip: generateIP()
    };
  }
  
  return { customers, database };
}

function generateKeywords(): string[] {
  const allKeywords = [
    'trading', 'crypto', 'forex', 'stocks', 'options', 'futures',
    'bitcoin', 'ethereum', 'defi', 'nft', 'sports', 'casino',
    'poker', 'blackjack', 'roulette', 'slots', 'lottery', 'betting'
  ];
  
  const count = Math.floor(Math.random() * 3) + 1;
  const keywords: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const keyword = allKeywords[Math.floor(Math.random() * allKeywords.length)];
    if (!keywords.includes(keyword)) {
      keywords.push(keyword);
    }
  }
  
  return keywords;
}

function generatePnL(balance: number): number {
  // Generate realistic P&L based on balance
  const volatility = Math.random() * 0.4 - 0.2; // -20% to +20%
  return Math.round(balance * volatility * 100) / 100;
}

function generatePhone(): string {
  const country = Math.floor(Math.random() * 3) + 1;
  const area = Math.floor(Math.random() * 900) + 100;
  const num1 = Math.floor(Math.random() * 900) + 100;
  const num2 = Math.floor(Math.random() * 9000) + 1000;
  return `+${country}-${area}-${num1}-${num2}`;
}

function generateRandomDate(): string {
  const start = new Date(2023, 0, 1);
  const end = new Date();
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString();
}

function generateRecentDate(): string {
  const hoursAgo = Math.floor(Math.random() * 72); // Within last 3 days
  const date = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return date.toISOString();
}

function generateIP(): string {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

// Generate 3142 customers
console.log('🎲 Generating 3142 customers for Fantasy402 Trading Platform...');
const { customers, database } = generateCustomers(3142);

// Add group chats
const groupChats = {
  main_group: {
    chat_id: "-2714719687",
    name: "Main Trading Group",
    members: 2500,
    type: "public"
  },
  vip_group: {
    chat_id: "-2814729688",
    name: "VIP Trading Group",
    members: 150,
    type: "private"
  },
  alerts_group: {
    chat_id: "-2914739689",
    name: "System Alerts",
    members: 10,
    type: "admin"
  }
};

// Create final config and database objects
const configData = {
  customers,
  group_chats: groupChats,
  generated_at: new Date().toISOString(),
  total_customers: Object.keys(customers).length
};

const databaseData = {
  customers: database,
  statistics: {
    total_customers: Object.keys(database).length,
    total_balance: Object.values(database).reduce((sum: number, c: any) => sum + c.balance, 0),
    active_customers: Object.entries(customers).filter(([_, c]: [string, any]) => c.active).length,
    vip_customers: Object.entries(customers).filter(([_, c]: [string, any]) => c.tier === 'vip').length,
    verified_customers: Object.values(database).filter((c: any) => c.kyc_verified).length
  },
  updated_at: new Date().toISOString()
};

// Write files
writeFileSync('customer_config.json', JSON.stringify(configData, null, 2));
writeFileSync('customer_database.json', JSON.stringify(databaseData, null, 2));

// Print statistics
console.log('✅ Generated customer files successfully!');
console.log('\n📊 Statistics:');
console.log(`   Total customers: ${configData.total_customers}`);
console.log(`   Active customers: ${databaseData.statistics.active_customers}`);
console.log(`   VIP customers: ${databaseData.statistics.vip_customers}`);
console.log(`   Total balance: $${databaseData.statistics.total_balance.toLocaleString()}`);
console.log(`   Verified (KYC): ${databaseData.statistics.verified_customers}`);
console.log('\n📁 Files created:');
console.log('   - customer_config.json');
console.log('   - customer_database.json');
console.log('\n🚀 Restart the admin server to load the new customers!');