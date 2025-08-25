/**
 * HTML Content Analyzer using Bun's HTMLRewriter API
 * Efficiently extracts trading-related data from web sources
 */

export interface LinkAnalysis {
  links: string[];
  tradingLinks: string[];
  newsLinks: string[];
  socialLinks: string[];
}

export interface ContentMetrics {
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
  tradingKeywords: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export class HTMLAnalyzer {
  private tradingKeywords = [
    'trading', 'forex', 'crypto', 'bitcoin', 'ethereum', 'price', 'market',
    'buy', 'sell', 'profit', 'loss', 'pnl', 'signal', 'analysis'
  ];

  private newsPatterns = [
    'news', 'article', 'report', 'analysis', 'market-update',
    'breaking', 'alert', 'announcement'
  ];

  private socialPatterns = [
    'twitter.com', 'x.com', 'telegram.me', 't.me', 'discord.gg',
    'reddit.com', 'facebook.com', 'linkedin.com'
  ];

  /**
   * Extract all links from HTML content with categorization
   */
  async extractLinks(url: string): Promise<LinkAnalysis> {
    const links = new Set<string>();
    const tradingLinks = new Set<string>();
    const newsLinks = new Set<string>();
    const socialLinks = new Set<string>();

    // Store references for use in handlers
    const tradingKeywords = this.tradingKeywords;
    const newsPatterns = this.newsPatterns;
    const socialPatterns = this.socialPatterns;

    try {
      const response = await fetch(url);
      
      const rewriter = new HTMLRewriter()
        .on("a[href]", {
          element(el) {
            const href = el.getAttribute("href");
            if (href) {
              links.add(href);
              
              // Categorize links
              const lowerHref = href.toLowerCase();
              
              // Check for trading-related links
              if (tradingKeywords.some(keyword => lowerHref.includes(keyword))) {
                tradingLinks.add(href);
              }
              
              // Check for news links
              if (newsPatterns.some(pattern => lowerHref.includes(pattern))) {
                newsLinks.add(href);
              }
              
              // Check for social media links
              if (socialPatterns.some(pattern => lowerHref.includes(pattern))) {
                socialLinks.add(href);
              }
            }
          }
        });

      await rewriter.transform(response).blob();

      return {
        links: [...links],
        tradingLinks: [...tradingLinks],
        newsLinks: [...newsLinks],
        socialLinks: [...socialLinks]
      };
    } catch (error) {
      console.error('Error extracting links:', error);
      return {
        links: [],
        tradingLinks: [],
        newsLinks: [],
        socialLinks: []
      };
    }
  }

  /**
   * Analyze content for trading sentiment and metrics
   */
  async analyzeContent(url: string, baseUrl?: string): Promise<ContentMetrics> {
    let totalLinks = 0;
    let internalLinks = 0;
    let externalLinks = 0;
    let tradingKeywordCount = 0;
    let positiveWords = 0;
    let negativeWords = 0;

    const positiveTerms = ['profit', 'gain', 'up', 'bull', 'bullish', 'green', 'win'];
    const negativeTerms = ['loss', 'down', 'bear', 'bearish', 'red', 'crash', 'drop'];
    
    // Store reference for use in handlers
    const tradingKeywords = this.tradingKeywords;

    try {
      const response = await fetch(url);
      
      const rewriter = new HTMLRewriter()
        .on("a[href]", {
          element(el) {
            const href = el.getAttribute("href");
            if (href) {
              totalLinks++;
              
              // Determine if internal or external
              if (baseUrl) {
                if (href.startsWith('/') || href.includes(baseUrl)) {
                  internalLinks++;
                } else if (href.startsWith('http')) {
                  externalLinks++;
                }
              }
            }
          }
        })
        .on("*", {
          text(text) {
            const content = text.text.toLowerCase();
            
            // Count trading keywords
            tradingKeywords.forEach(keyword => {
              if (content.includes(keyword)) {
                tradingKeywordCount++;
              }
            });
            
            // Sentiment analysis
            positiveTerms.forEach(term => {
              if (content.includes(term)) {
                positiveWords++;
              }
            });
            
            negativeTerms.forEach(term => {
              if (content.includes(term)) {
                negativeWords++;
              }
            });
          }
        });

      await rewriter.transform(response).blob();

      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (positiveWords > negativeWords) {
        sentiment = 'positive';
      } else if (negativeWords > positiveWords) {
        sentiment = 'negative';
      }

      return {
        totalLinks,
        internalLinks,
        externalLinks,
        tradingKeywords: tradingKeywordCount,
        sentiment
      };
    } catch (error) {
      console.error('Error analyzing content:', error);
      return {
        totalLinks: 0,
        internalLinks: 0,
        externalLinks: 0,
        tradingKeywords: 0,
        sentiment: 'neutral'
      };
    }
  }

  /**
   * Extract structured data from trading platforms
   */
  async extractTradingData(url: string) {
    const prices = new Map<string, string>();
    const signals = new Set<string>();
    const indicators = new Map<string, string>();

    try {
      const response = await fetch(url);
      
      const rewriter = new HTMLRewriter()
        // Extract price data
        .on(".price, [class*='price'], [data-price]", {
          element(el) {
            const symbol = el.getAttribute("data-symbol") || 
                          el.getAttribute("data-pair") ||
                          el.getAttribute("class");
            const price = el.getAttribute("data-price") || 
                         el.getAttribute("value");
            
            if (symbol && price) {
              prices.set(symbol, price);
            }
          },
          text(text) {
            // Extract price patterns from text content
            const priceMatch = text.text.match(/\$?[\d,]+\.?\d*/);
            if (priceMatch) {
              const parent = text.lastInTextNode;
              // Would need more context to determine symbol
            }
          }
        })
        // Extract trading signals
        .on(".signal, [class*='signal'], .alert", {
          text(text) {
            const content = text.text.toLowerCase();
            if (content.includes('buy') || content.includes('sell') || content.includes('hold')) {
              signals.add(text.text.trim());
            }
          }
        })
        // Extract technical indicators
        .on("[class*='indicator'], [class*='rsi'], [class*='macd']", {
          element(el) {
            const indicator = el.getAttribute("class") || el.getAttribute("data-indicator");
            const value = el.getAttribute("data-value") || el.getAttribute("value");
            
            if (indicator && value) {
              indicators.set(indicator, value);
            }
          }
        });

      await rewriter.transform(response).blob();

      return {
        prices: Object.fromEntries(prices),
        signals: [...signals],
        indicators: Object.fromEntries(indicators)
      };
    } catch (error) {
      console.error('Error extracting trading data:', error);
      return {
        prices: {},
        signals: [],
        indicators: {}
      };
    }
  }

  /**
   * Monitor competitor sites for changes
   */
  async monitorCompetitor(url: string) {
    const features = new Set<string>();
    const pricing = new Map<string, string>();
    const announcements = new Set<string>();

    try {
      const response = await fetch(url);
      
      const rewriter = new HTMLRewriter()
        .on(".feature, [class*='feature']", {
          text(text) {
            if (text.text.trim()) {
              features.add(text.text.trim());
            }
          }
        })
        .on(".price, [class*='pricing']", {
          element(el) {
            const plan = el.getAttribute("data-plan") || 
                         el.closest('[data-plan]')?.getAttribute('data-plan');
            const price = el.textContent || el.getAttribute('data-price');
            
            if (plan && price) {
              pricing.set(plan, price);
            }
          }
        })
        .on(".announcement, .news, [class*='announce']", {
          text(text) {
            if (text.text.trim() && text.text.length > 10) {
              announcements.add(text.text.trim());
            }
          }
        });

      await rewriter.transform(response).blob();

      return {
        features: [...features],
        pricing: Object.fromEntries(pricing),
        announcements: [...announcements],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error monitoring competitor:', error);
      return {
        features: [],
        pricing: {},
        announcements: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Extract contact information from pages
   */
  async extractContacts(url: string) {
    const emails = new Set<string>();
    const phones = new Set<string>();
    const socialProfiles = new Set<string>();

    try {
      const response = await fetch(url);
      
      const rewriter = new HTMLRewriter()
        .on("a[href^='mailto:']", {
          element(el) {
            const email = el.getAttribute("href")?.replace('mailto:', '');
            if (email) emails.add(email);
          }
        })
        .on("a[href^='tel:']", {
          element(el) {
            const phone = el.getAttribute("href")?.replace('tel:', '');
            if (phone) phones.add(phone);
          }
        })
        .on("a[href*='twitter.com'], a[href*='t.me'], a[href*='discord']", {
          element(el) {
            const href = el.getAttribute("href");
            if (href) socialProfiles.add(href);
          }
        })
        .on("*", {
          text(text) {
            // Extract emails from text
            const emailMatch = text.text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
            if (emailMatch) {
              emailMatch.forEach(email => emails.add(email));
            }
            
            // Extract phone numbers
            const phoneMatch = text.text.match(/\+\d{10,15}|\b\d{3}-\d{3}-\d{4}\b|\(\d{3}\)\s\d{3}-\d{4}/g);
            if (phoneMatch) {
              phoneMatch.forEach(phone => phones.add(phone));
            }
          }
        });

      await rewriter.transform(response).blob();

      return {
        emails: [...emails],
        phones: [...phones],
        socialProfiles: [...socialProfiles]
      };
    } catch (error) {
      console.error('Error extracting contacts:', error);
      return {
        emails: [],
        phones: [],
        socialProfiles: []
      };
    }
  }
}

// Usage examples for the trading bot system
export async function analyzeTradingWebsite(url: string) {
  const analyzer = new HTMLAnalyzer();
  
  const [links, metrics, tradingData, contacts] = await Promise.all([
    analyzer.extractLinks(url),
    analyzer.analyzeContent(url),
    analyzer.extractTradingData(url),
    analyzer.extractContacts(url)
  ]);

  return {
    url,
    analysis: {
      links,
      metrics,
      tradingData,
      contacts
    },
    timestamp: new Date().toISOString()
  };
}

export default HTMLAnalyzer;