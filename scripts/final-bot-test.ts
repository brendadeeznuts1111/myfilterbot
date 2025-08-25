#!/usr/bin/env bun
/**
 * Final Comprehensive Bot Integration Test
 * Tests the complete Firesupportcs_bot integration with dashboard
 */

console.log('🎯 Final Bot Integration Test');
console.log('=============================\n');

const BOT_TOKEN = "8039557687:AAEaDQUYya1H0y7qv4tmhYsCSqGrzpS-heU";
const DASHBOARD_URL = "http://localhost:3001";

// Test 1: Dashboard API Integration
console.log('1️⃣ Testing Dashboard API Integration...');
try {
  const response = await fetch(`${DASHBOARD_URL}/api/dashboard/stats`);
  const stats = await response.json();
  
  if (stats.bot) {
    console.log('✅ Dashboard bot integration working');
    console.log(`✅ Bot Name: ${stats.bot.name}`);
    console.log(`✅ Bot Username: ${stats.bot.username}`);
    console.log(`✅ Bot Status: ${stats.bot.status}`);
    console.log(`✅ Bot Commands: ${stats.bot.commands}`);
    console.log(`✅ Bot URL: ${stats.bot.url}`);
  } else {
    console.error('❌ Bot information not found in dashboard stats');
  }
} catch (error: any) {
  console.error('❌ Dashboard API test failed:', error.message);
}

// Test 2: Direct Bot API Test
console.log('\n2️⃣ Testing Direct Bot API...');
try {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
  const result = await response.json();
  
  if (result.ok) {
    console.log('✅ Direct bot API connection successful');
    console.log(`✅ Bot can join groups: ${result.result.can_join_groups}`);
    console.log(`✅ Bot can read messages: ${result.result.can_read_all_group_messages}`);
    console.log(`✅ Inline queries: ${result.result.supports_inline_queries}`);
  } else {
    console.error('❌ Direct bot API failed:', result.description);
  }
} catch (error: any) {
  console.error('❌ Direct bot API test failed:', error.message);
}

// Test 3: Dashboard Bot Test Endpoint
console.log('\n3️⃣ Testing Dashboard Bot Test Endpoint...');
try {
  const response = await fetch(`${DASHBOARD_URL}/api/dashboard/bot/test`);
  const result = await response.json();
  
  if (result.ok) {
    console.log('✅ Dashboard bot test endpoint working');
    console.log(`✅ API integration successful`);
  } else {
    console.error('❌ Dashboard bot test failed:', result.description || result.error);
  }
} catch (error: any) {
  console.error('❌ Dashboard bot test endpoint failed:', error.message);
}

// Test 4: Webhook Information
console.log('\n4️⃣ Checking Current Webhook Status...');
try {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const webhookInfo = await response.json();
  
  if (webhookInfo.ok) {
    console.log('✅ Webhook info retrieved successfully');
    console.log(`✅ Current URL: ${webhookInfo.result.url || 'Not set'}`);
    console.log(`✅ Pending updates: ${webhookInfo.result.pending_update_count}`);
    
    if (webhookInfo.result.last_error_date) {
      console.log(`⚠️ Last error: ${webhookInfo.result.last_error_message}`);
    } else {
      console.log('✅ No webhook errors');
    }
  }
} catch (error: any) {
  console.error('❌ Webhook info failed:', error.message);
}

// Test 5: Configuration Verification
console.log('\n5️⃣ Verifying Configuration Files...');
try {
  const { YAML } = await import('bun');
  
  // Check Telegram config
  const telegramFile = Bun.file('./config/telegram.yaml');
  if (await telegramFile.exists()) {
    const config = YAML.parse(await telegramFile.text());
    
    console.log('✅ Telegram YAML config loaded');
    if (config.telegram.bot.token === BOT_TOKEN) {
      console.log('✅ Bot token matches in config');
    } else {
      console.error('❌ Bot token mismatch in config');
    }
    
    if (config.telegram.bot.username === 'Firesupportcs_bot') {
      console.log('✅ Bot username matches in config');
    } else {
      console.error('❌ Bot username mismatch in config');
    }
  }
  
  // Check bot service file
  const serviceFile = Bun.file('./src/telegram_bot_service.ts');
  if (await serviceFile.exists()) {
    const content = await serviceFile.text();
    if (content.includes(BOT_TOKEN)) {
      console.log('✅ Bot service file updated with new token');
    } else {
      console.error('❌ Bot service file not updated');
    }
  }
  
} catch (error: any) {
  console.error('❌ Configuration verification failed:', error.message);
}

// Test 6: End-to-End Integration
console.log('\n6️⃣ End-to-End Integration Summary...');

const integrationChecks = {
  'Dashboard Running': false,
  'Bot API Working': false,
  'Dashboard Bot Data': false,
  'Configuration Updated': false,
  'Webhook Ready': false
};

try {
  // Check dashboard
  const dashResponse = await fetch(`${DASHBOARD_URL}/api/dashboard/stats`);
  if (dashResponse.ok) {
    integrationChecks['Dashboard Running'] = true;
    
    const stats = await dashResponse.json();
    if (stats.bot && stats.bot.username === '@Firesupportcs_bot') {
      integrationChecks['Dashboard Bot Data'] = true;
    }
  }
  
  // Check bot API
  const botResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
  if (botResponse.ok) {
    const result = await botResponse.json();
    if (result.ok) {
      integrationChecks['Bot API Working'] = true;
    }
  }
  
  // Check config
  const { YAML } = await import('bun');
  const configFile = Bun.file('./config/telegram.yaml');
  if (await configFile.exists()) {
    const config = YAML.parse(await configFile.text());
    if (config.telegram.bot.token === BOT_TOKEN && config.telegram.bot.username === 'Firesupportcs_bot') {
      integrationChecks['Configuration Updated'] = true;
    }
  }
  
  // Check webhook readiness
  const webhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  if (webhookResponse.ok) {
    integrationChecks['Webhook Ready'] = true;
  }
  
} catch (error) {
  console.error('Integration check error:', error.message);
}

// Display results
console.log('\n✅ Integration Status:');
Object.entries(integrationChecks).forEach(([check, status]) => {
  console.log(`   ${status ? '✅' : '❌'} ${check}`);
});

const successCount = Object.values(integrationChecks).filter(Boolean).length;
const totalChecks = Object.keys(integrationChecks).length;

console.log(`\n🎯 Integration Score: ${successCount}/${totalChecks} (${Math.round(successCount/totalChecks*100)}%)`);

if (successCount === totalChecks) {
  console.log('\n🚀 PERFECT INTEGRATION! All systems operational.');
  console.log('\n📱 Your bot is ready:');
  console.log('   🤖 Bot: https://t.me/Firesupportcs_bot');
  console.log('   🎛️ Dashboard: http://localhost:3001/dashboard');
  console.log('   📊 Bot Management: Bot Management tab in dashboard');
  console.log('\n🎯 Next Steps:');
  console.log('   1. Start bot service: bun run src/telegram_bot_service.ts');
  console.log('   2. Test /start command in Telegram');
  console.log('   3. Set webhook if needed via dashboard');
} else {
  console.log('\n⚠️ Some integration issues detected. Check logs above.');
}

console.log('\n=============================');