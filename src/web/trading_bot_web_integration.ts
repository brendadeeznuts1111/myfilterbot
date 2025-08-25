/**
 * Trading Bot Web Analysis Integration
 * Demonstrates how to integrate HTMLRewriter-based analysis with the trading bot system
 */

import { WebAnalysisManager, createTradingWebAnalyzer } from './src/web_analysis_manager';
import type { AnalysisResult } from './src/html_analysis_worker';

// Integration with existing trading bot customer portal
export class TradingBotWebIntegration {
  private webAnalyzer: WebAnalysisManager;
  private competitorData: Map<string, any> = new Map();
  private signalSources: Map<string, any> = new Map();
  private newsFeeds: Map<string, any> = new Map();

  constructor() {
    this.webAnalyzer = createTradingWebAnalyzer();
    this.setupEventListeners();
    this.initializeMonitoring();
  }

  private setupEventListeners() {
    // Listen for analysis results
    globalThis.addEventListener('webAnalysis.result', (event: Event) => {
      const customEvent = event as CustomEvent<AnalysisResult>;
      this.handleAnalysisResult(customEvent.detail);
    });

    // Listen for monitoring progress
    globalThis.addEventListener('webAnalysis.progress', (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Analysis progress:', customEvent.detail);
    });

    // Listen for errors
    globalThis.addEventListener('webAnalysis.error', (event: Event) => {
      const customEvent = event as CustomEvent;
      console.error('Analysis error:', customEvent.detail);
      this.notifyAdminOfError(customEvent.detail);
    });
  }

  private async initializeMonitoring() {
    // Monitor major crypto news sources
    const newsTargets = [
      {
        id: 'coindesk',
        url: 'https://www.coindesk.com',
        type: 'news' as const,
        interval: 30, // 30 minutes
        analysisTypes: ['content', 'links'] as const,
        active: true
      },
      {
        id: 'cointelegraph',
        url: 'https://cointelegraph.com',
        type: 'news' as const,
        interval: 30,
        analysisTypes: ['content', 'links'] as const,
        active: true
      },
      {
        id: 'binance-news',
        url: 'https://www.binance.com/en/news',
        type: 'news' as const,
        interval: 15,
        analysisTypes: ['content', 'links'] as const,
        active: true
      }
    ];

    // Add monitoring targets
    newsTargets.forEach(target => {
      this.webAnalyzer.addMonitoringTarget(target);
    });

    // Monitor competitor trading platforms
    await this.monitorCompetitors([
      'https://www.binance.com',
      'https://www.coinbase.com',
      'https://www.kraken.com',
      'https://www.okx.com'
    ]);

    // Set up signal source monitoring
    await this.webAnalyzer.monitorSignalSources([
      'https://tradingview.com/symbols/BTCUSD/',
      'https://alternative.me/crypto/fear-and-greed-index/'
    ]);
  }

  private async handleAnalysisResult(result: AnalysisResult) {
    if (!result.success) {
      console.error(`Analysis failed for ${result.url}:`, result.error);
      return;
    }

    switch (result.type) {
      case 'competitor':
        await this.processCompetitorData(result);
        break;
      
      case 'content':
        await this.processNewsContent(result);
        break;
      
      case 'trading':
        await this.processTradingSignals(result);
        break;
      
      case 'full':
        await this.processFullAnalysis(result);
        break;
    }
  }

  private async processCompetitorData(result: AnalysisResult) {
    const competitorInfo = {
      url: result.url,
      features: result.data.features || [],
      pricing: result.data.pricing || {},
      announcements: result.data.announcements || [],
      lastUpdated: new Date(result.timestamp)
    };

    this.competitorData.set(result.url, competitorInfo);

    // Check for new features or pricing changes
    const previousData = this.competitorData.get(result.url);
    if (previousData && this.hasSignificantChanges(previousData, competitorInfo)) {
      await this.notifyAdminOfCompetitorChanges(competitorInfo);
    }

    // Update customer portal dashboard
    await this.updateCustomerPortalCompetitorData(competitorInfo);
  }

  private async processNewsContent(result: AnalysisResult) {
    const newsData = {
      url: result.url,
      sentiment: result.data.sentiment || 'neutral',
      tradingKeywords: result.data.tradingKeywords || 0,
      links: result.data.links || [],
      socialLinks: result.data.socialLinks || [],
      lastAnalyzed: new Date(result.timestamp)
    };

    this.newsFeeds.set(result.url, newsData);

    // Alert on significant market sentiment changes
    if (newsData.sentiment === 'negative' && newsData.tradingKeywords > 10) {
      await this.alertCustomersOfMarketNews({
        title: 'Market Alert',
        message: `Negative sentiment detected from ${result.url}`,
        severity: 'warning',
        url: result.url
      });
    }

    // Update enhanced customer portal with news feed
    await this.updateCustomerPortalNews(newsData);
  }

  private async processTradingSignals(result: AnalysisResult) {
    const signalData = {
      url: result.url,
      prices: result.data.prices || {},
      signals: result.data.signals || [],
      indicators: result.data.indicators || {},
      timestamp: new Date(result.timestamp)
    };

    this.signalSources.set(result.url, signalData);

    // Process trading signals for customers
    for (const signal of signalData.signals) {
      if (this.isHighConfidenceSignal(signal)) {
        await this.notifyCustomersOfSignal({
          signal,
          source: result.url,
          confidence: this.calculateSignalConfidence(signal),
          timestamp: signalData.timestamp
        });
      }
    }
  }

  private async processFullAnalysis(result: AnalysisResult) {
    // Process all analysis types from a comprehensive scan
    const fullData = result.data;
    
    if (fullData.competitor) {
      await this.processCompetitorData({ ...result, data: fullData.competitor, type: 'competitor' });
    }
    
    if (fullData.content) {
      await this.processNewsContent({ ...result, data: fullData.content, type: 'content' });
    }
    
    if (fullData.trading) {
      await this.processTradingSignals({ ...result, data: fullData.trading, type: 'trading' });
    }

    // Store contact information for potential partnerships
    if (fullData.contacts) {
      await this.storeContactInformation(result.url, fullData.contacts);
    }
  }

  // Integration with existing customer portal
  private async updateCustomerPortalCompetitorData(competitorInfo: any) {
    // Update the enhanced customer portal with competitor insights
    const portalUpdate = {
      type: 'competitor-update',
      data: {
        competitor: competitorInfo.url,
        features: competitorInfo.features.slice(0, 5), // Top 5 features
        hasNewAnnouncements: competitorInfo.announcements.length > 0,
        lastUpdated: competitorInfo.lastUpdated
      }
    };

    // Send to customer portal via WebSocket or direct update
    await this.sendToCustomerPortal(portalUpdate);
  }

  private async updateCustomerPortalNews(newsData: any) {
    const newsUpdate = {
      type: 'news-update',
      data: {
        source: newsData.url,
        sentiment: newsData.sentiment,
        tradingRelevance: newsData.tradingKeywords > 5 ? 'high' : 'medium',
        socialActivity: newsData.socialLinks.length,
        lastUpdated: newsData.lastAnalyzed
      }
    };

    await this.sendToCustomerPortal(newsUpdate);
  }

  private async sendToCustomerPortal(update: any) {
    // Integration with your existing WebSocket system or direct portal update
    try {
      // Example: WebSocket broadcast to enhanced customer portal
      // webSocketManager.broadcast('portal-update', update);
      
      // Example: Direct database update for portal
      // await updatePortalDashboard(update);
      
      console.log('Portal update sent:', update.type);
    } catch (error) {
      console.error('Failed to update customer portal:', error);
    }
  }

  // Customer notification methods
  private async alertCustomersOfMarketNews(alert: {
    title: string;
    message: string;
    severity: string;
    url: string;
  }) {
    // Integration with your Telegram bot notification system
    try {
      // Example: Send to admin chat
      // await telegramBot.sendMessage(adminChatId, alert.message);
      
      // Example: Add to customer portal notifications
      const notification = {
        id: `news-${Date.now()}`,
        type: 'market-alert',
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        source: alert.url,
        timestamp: new Date().toISOString()
      };

      await this.addPortalNotification(notification);
      
    } catch (error) {
      console.error('Failed to send market alert:', error);
    }
  }

  private async notifyCustomersOfSignal(signalInfo: {
    signal: string;
    source: string;
    confidence: number;
    timestamp: Date;
  }) {
    // Only notify of high-confidence signals
    if (signalInfo.confidence < 0.7) return;

    const notification = {
      id: `signal-${Date.now()}`,
      type: 'trading-signal',
      title: 'Trading Signal Detected',
      message: `${signalInfo.signal} (Confidence: ${(signalInfo.confidence * 100).toFixed(1)}%)`,
      source: signalInfo.source,
      timestamp: signalInfo.timestamp.toISOString()
    };

    await this.addPortalNotification(notification);
  }

  private async notifyAdminOfCompetitorChanges(competitorInfo: any) {
    const message = `Competitor changes detected at ${competitorInfo.url}:\n` +
                   `New features: ${competitorInfo.features.length}\n` +
                   `Announcements: ${competitorInfo.announcements.length}`;

    // Send to admin via your existing notification system
    console.log('Admin notification:', message);
  }

  private async notifyAdminOfError(error: any) {
    // Integration with your error handling system
    console.error('Web analysis error reported to admin:', error);
  }

  // Utility methods
  private hasSignificantChanges(previous: any, current: any): boolean {
    // Simple change detection - could be more sophisticated
    return (
      previous.features.length !== current.features.length ||
      Object.keys(previous.pricing).length !== Object.keys(current.pricing).length ||
      previous.announcements.length !== current.announcements.length
    );
  }

  private isHighConfidenceSignal(signal: string): boolean {
    const highConfidenceTerms = ['strong buy', 'confirmed breakout', 'major support', 'clear signal'];
    return highConfidenceTerms.some(term => 
      signal.toLowerCase().includes(term.toLowerCase())
    );
  }

  private calculateSignalConfidence(signal: string): number {
    // Simple confidence calculation - could use ML
    const confidenceTerms = {
      'confirmed': 0.9,
      'strong': 0.8,
      'clear': 0.7,
      'likely': 0.6,
      'possible': 0.4,
      'weak': 0.3
    };

    for (const [term, confidence] of Object.entries(confidenceTerms)) {
      if (signal.toLowerCase().includes(term)) {
        return confidence;
      }
    }

    return 0.5; // Default confidence
  }

  private async addPortalNotification(notification: any) {
    // Add notification to customer portal system
    try {
      // Example integration with portal notification system
      // await portalNotificationManager.addNotification(notification);
      console.log('Portal notification added:', notification.type);
    } catch (error) {
      console.error('Failed to add portal notification:', error);
    }
  }

  private async storeContactInformation(url: string, contacts: any) {
    // Store contact information for potential business development
    const contactData = {
      url,
      emails: contacts.emails,
      phones: contacts.phones,
      socialProfiles: contacts.socialProfiles,
      discoveredAt: new Date().toISOString()
    };

    // Store in your database or CRM system
    console.log('Contact information stored for:', url);
  }

  // Public API methods for manual operations
  public async analyzeCompetitorManually(url: string): Promise<string> {
    return await this.webAnalyzer.analyzeUrl(url, 'competitor', 'high');
  }

  public async getCompetitorInsights(): Promise<any[]> {
    return Array.from(this.competitorData.values());
  }

  public async getMarketSentiment(): Promise<{
    overall: string;
    sources: any[];
    lastUpdated: string;
  }> {
    const newsData = Array.from(this.newsFeeds.values());
    const sentiments = newsData.map(news => news.sentiment);
    
    // Calculate overall sentiment
    const positive = sentiments.filter(s => s === 'positive').length;
    const negative = sentiments.filter(s => s === 'negative').length;
    
    let overall = 'neutral';
    if (positive > negative) overall = 'positive';
    if (negative > positive) overall = 'negative';

    return {
      overall,
      sources: newsData.slice(0, 10), // Top 10 sources
      lastUpdated: new Date().toISOString()
    };
  }

  public async getTradingSignalSummary(): Promise<any> {
    const signals = Array.from(this.signalSources.values());
    
    return {
      totalSources: signals.length,
      activeSignals: signals.reduce((sum, source) => sum + source.signals.length, 0),
      latestSignals: signals
        .flatMap(source => source.signals.map((signal: string) => ({
          signal,
          source: source.url,
          timestamp: source.timestamp
        })))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20)
    };
  }

  public getSystemStatus(): any {
    return {
      webAnalyzer: this.webAnalyzer.getMonitoringStats(),
      dataStores: {
        competitors: this.competitorData.size,
        newsFeeds: this.newsFeeds.size,
        signalSources: this.signalSources.size
      },
      lastUpdated: new Date().toISOString()
    };
  }

  public async cleanup() {
    this.webAnalyzer.destroy();
    this.competitorData.clear();
    this.signalSources.clear();
    this.newsFeeds.clear();
  }
}

// Example usage in your trading bot
export async function initializeTradingBotWebAnalysis() {
  const webIntegration = new TradingBotWebIntegration();
  
  // Set up periodic reporting
  setInterval(async () => {
    const sentiment = await webIntegration.getMarketSentiment();
    const signals = await webIntegration.getTradingSignalSummary();
    const competitors = await webIntegration.getCompetitorInsights();
    
    console.log('=== Web Analysis Report ===');
    console.log('Market Sentiment:', sentiment.overall);
    console.log('Active Signals:', signals.activeSignals);
    console.log('Monitored Competitors:', competitors.length);
  }, 60000); // Every minute

  return webIntegration;
}

// Export for integration with your existing bot system
export default TradingBotWebIntegration;