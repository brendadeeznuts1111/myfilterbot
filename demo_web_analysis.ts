#!/usr/bin/env bun
/**
 * Live Web Analysis Demonstration
 * Shows the HTMLRewriter-based web analysis system working with real websites
 * Demonstrates trading signal detection, market sentiment analysis, and competitor monitoring
 */

import { HTMLAnalyzer, analyzeTradingWebsite } from './src/html_analyzer';
import { WebAnalysisManager, createTradingWebAnalyzer } from './src/web_analysis_manager';

// Demo configuration
const DEMO_URLS = {
  // Safe public websites for demonstration
  example: 'https://example.com',
  httpbin: 'https://httpbin.org/html',
  jsonPlaceholder: 'https://jsonplaceholder.typicode.com',
  // Note: Using safe test endpoints to avoid rate limiting real crypto sites
};

async function demonstrateBasicAnalysis() {
  console.log('🔍 === HTMLRewriter Basic Analysis Demo ===\n');
  
  const analyzer = new HTMLAnalyzer();
  
  console.log('📊 Analyzing example.com for links and content...');
  try {
    // Link extraction demo
    const linkAnalysis = await analyzer.extractLinks(DEMO_URLS.example);
    console.log(`✅ Found ${linkAnalysis.links.length} links`);
    console.log(`📈 Trading-related links: ${linkAnalysis.tradingLinks.length}`);
    console.log(`📰 News links: ${linkAnalysis.newsLinks.length}`);
    console.log(`💬 Social media links: ${linkAnalysis.socialLinks.length}`);
    
    if (linkAnalysis.links.length > 0) {
      console.log(`🔗 Sample links: ${linkAnalysis.links.slice(0, 3).join(', ')}`);
    }
    
    console.log('');
    
    // Content analysis demo  
    console.log('📝 Analyzing content metrics...');
    const contentMetrics = await analyzer.analyzeContent(DEMO_URLS.example, DEMO_URLS.example);
    console.log(`🔗 Total links found: ${contentMetrics.totalLinks}`);
    console.log(`🏠 Internal links: ${contentMetrics.internalLinks}`);
    console.log(`🌐 External links: ${contentMetrics.externalLinks}`);
    console.log(`💰 Trading keywords: ${contentMetrics.tradingKeywords}`);
    console.log(`😊 Sentiment: ${contentMetrics.sentiment}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

async function demonstrateAdvancedAnalysis() {
  console.log('🚀 === Advanced Web Analysis Demo ===\n');
  
  console.log('🔬 Running comprehensive website analysis...');
  
  try {
    const fullAnalysis = await analyzeTradingWebsite(DEMO_URLS.httpbin);
    
    console.log(`📊 Analysis Results for: ${fullAnalysis.url}`);
    console.log(`⏰ Analyzed at: ${fullAnalysis.timestamp}`);
    console.log('');
    
    // Display link analysis results
    const links = fullAnalysis.analysis.links;
    console.log('🔗 Link Analysis:');
    console.log(`   Total links: ${links.links.length}`);
    console.log(`   Trading links: ${links.tradingLinks.length}`);
    console.log(`   News links: ${links.newsLinks.length}`);
    console.log(`   Social links: ${links.socialLinks.length}`);
    console.log('');
    
    // Display content metrics
    const metrics = fullAnalysis.analysis.metrics;
    console.log('📈 Content Metrics:');
    console.log(`   Links: ${metrics.totalLinks} (${metrics.internalLinks} internal, ${metrics.externalLinks} external)`);
    console.log(`   Trading relevance: ${metrics.tradingKeywords} keywords found`);
    console.log(`   Sentiment: ${metrics.sentiment}`);
    console.log('');
    
    // Display trading data
    const trading = fullAnalysis.analysis.tradingData;
    console.log('💹 Trading Data:');
    console.log(`   Prices extracted: ${Object.keys(trading.prices).length}`);
    console.log(`   Signals found: ${trading.signals.length}`);
    console.log(`   Technical indicators: ${Object.keys(trading.indicators).length}`);
    
    if (trading.signals.length > 0) {
      console.log(`   Sample signals: ${trading.signals.slice(0, 2).join(', ')}`);
    }
    console.log('');
    
    // Display contact information
    const contacts = fullAnalysis.analysis.contacts;
    console.log('📧 Contact Information:');
    console.log(`   Email addresses: ${contacts.emails.length}`);
    console.log(`   Phone numbers: ${contacts.phones.length}`);
    console.log(`   Social profiles: ${contacts.socialProfiles.length}`);
    
    if (contacts.emails.length > 0) {
      console.log(`   Sample emails: ${contacts.emails.slice(0, 2).join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Advanced analysis failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

async function demonstrateWebAnalysisManager() {
  console.log('⚡ === Web Analysis Manager Demo ===\n');
  
  const manager = createTradingWebAnalyzer();
  
  console.log('🎯 Setting up web analysis manager...');
  console.log(`📊 Configuration: ${manager.getMonitoringStats().totalTargets} monitoring targets`);
  
  try {
    // Demonstrate single URL analysis
    console.log('\n🔍 Analyzing single URL...');
    const taskId1 = await manager.analyzeUrl(DEMO_URLS.example, 'content', 'high');
    console.log(`✅ Task submitted: ${taskId1}`);
    
    // Demonstrate batch analysis
    console.log('\n📦 Analyzing multiple URLs in batch...');
    const batchUrls = [
      { url: DEMO_URLS.example, type: 'content' as const },
      { url: DEMO_URLS.httpbin, type: 'links' as const }
    ];
    
    const batchTaskIds = await manager.analyzeBatch(batchUrls);
    console.log(`✅ Batch tasks submitted: ${batchTaskIds.length} tasks`);
    console.log(`   Task IDs: ${batchTaskIds.join(', ')}`);
    
    // Show monitoring statistics
    console.log('\n📈 Current Monitoring Stats:');
    const stats = manager.getMonitoringStats();
    console.log(`   Total targets: ${stats.totalTargets}`);
    console.log(`   Active targets: ${stats.activeTargets}`);
    console.log(`   Target types: ${JSON.stringify(stats.targetsByType)}`);
    
    // Show worker status
    console.log('\n🛠️  Worker Status:');
    const workerStatus = await manager.getWorkerStatus();
    workerStatus.forEach((status, index) => {
      if (status.error) {
        console.log(`   Worker ${index}: ${status.error}`);
      } else {
        console.log(`   Worker ${index}: Active`);
      }
    });
    
    // Wait a moment for some results
    console.log('\n⏳ Waiting for analysis results...');
    setTimeout(async () => {
      try {
        const result1 = manager.getResult(taskId1);
        if (result1) {
          console.log(`✅ Result ready: ${result1.success ? 'Success' : 'Failed'}`);
          if (result1.success && result1.data) {
            console.log(`   Analysis type: ${result1.type}`);
            console.log(`   URL: ${result1.url}`);
            console.log(`   Data keys: ${Object.keys(result1.data).join(', ')}`);
          }
        } else {
          console.log('⏱️  Result still processing...');
        }
      } catch (error) {
        console.log('⚠️  Error checking results:', error.message);
      }
      
      // Cleanup
      console.log('\n🧹 Cleaning up...');
      manager.destroy();
      console.log('✅ Demo completed successfully!');
    }, 2000);
    
  } catch (error) {
    console.error('❌ Manager demo failed:', error.message);
    manager.destroy();
  }
}

async function demonstrateIntegrationScenario() {
  console.log('🏢 === Trading Bot Integration Scenario ===\n');
  
  console.log('📈 Simulating real-world trading bot web analysis...');
  
  const analyzer = new HTMLAnalyzer();
  
  // Simulate monitoring competitor platforms
  console.log('\n🔍 Competitor Analysis Simulation:');
  const competitorData = await analyzer.monitorCompetitor(DEMO_URLS.example);
  console.log(`   Features detected: ${competitorData.features.length}`);
  console.log(`   Pricing info: ${Object.keys(competitorData.pricing).length} plans`);
  console.log(`   Announcements: ${competitorData.announcements.length}`);
  console.log(`   Last checked: ${competitorData.timestamp}`);
  
  // Simulate extracting contact information for business development
  console.log('\n📧 Contact Intelligence:');
  const contactInfo = await analyzer.extractContacts(DEMO_URLS.httpbin);
  console.log(`   Business emails: ${contactInfo.emails.length}`);
  console.log(`   Contact numbers: ${contactInfo.phones.length}`);
  console.log(`   Social presence: ${contactInfo.socialProfiles.length}`);
  
  // Simulate trading signal detection (using mock data structure)
  console.log('\n💹 Trading Signal Analysis:');
  const tradingData = await analyzer.extractTradingData(DEMO_URLS.httpbin);
  console.log(`   Price points tracked: ${Object.keys(tradingData.prices).length}`);
  console.log(`   Trading signals: ${tradingData.signals.length}`);
  console.log(`   Technical indicators: ${Object.keys(tradingData.indicators).length}`);
  
  console.log('\n🎯 Integration Benefits:');
  console.log('   ✅ Real-time competitive intelligence');
  console.log('   ✅ Automated market sentiment tracking');
  console.log('   ✅ Business development contact discovery');
  console.log('   ✅ Trading signal aggregation from multiple sources');
  console.log('   ✅ Enhanced customer portal with live market data');
  
  console.log('\n' + '='.repeat(60) + '\n');
}

async function main() {
  console.log('🌟 WEB ANALYSIS SYSTEM DEMONSTRATION 🌟\n');
  console.log('This demo shows the HTMLRewriter-based web analysis system');
  console.log('working with real websites and integration scenarios.\n');
  
  try {
    // Run all demonstrations
    await demonstrateBasicAnalysis();
    await demonstrateAdvancedAnalysis(); 
    await demonstrateWebAnalysisManager();
    await demonstrateIntegrationScenario();
    
    console.log('🎉 === DEMONSTRATION COMPLETED SUCCESSFULLY ===');
    console.log('\nThe web analysis system is ready for integration with your trading bot!');
    console.log('\nKey Features Demonstrated:');
    console.log('• HTMLRewriter-based content extraction');
    console.log('• Trading signal detection and sentiment analysis'); 
    console.log('• Competitor monitoring and intelligence gathering');
    console.log('• Contact information extraction for business development');
    console.log('• Worker-based concurrent analysis with Bun optimization');
    console.log('• Integration points with existing customer portal system');
    
  } catch (error) {
    console.error('\n❌ Demo failed with error:', error);
    process.exit(1);
  }
}

// Run the demonstration
if (import.meta.main) {
  main().catch(console.error);
}

export { main as runWebAnalysisDemo };