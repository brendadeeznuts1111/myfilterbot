#!/usr/bin/env bun

/**
 * Documentation Feedback Analysis Script
 * Analyzes user feedback and generates insights for documentation improvement
 * @version 1.0.0
 */

interface FeedbackEntry {
  rating: number;
  feedback: string;
  context?: string;
  page: string;
  timestamp: string;
  userAgent: string;
}

interface FeedbackAnalysis {
  totalFeedback: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  pageAnalysis: Record<string, {
    count: number;
    averageRating: number;
    commonIssues: string[];
  }>;
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
  commonThemes: string[];
  recommendations: string[];
}

class FeedbackAnalyzer {
  private feedback: FeedbackEntry[] = [];

  /**
   * Load feedback from various sources
   */
  async loadFeedback(): Promise<void> {
    console.log('📊 Loading feedback data...');

    // Load from localStorage simulation (in real app, this would be from database)
    const simulatedFeedback: FeedbackEntry[] = [
      {
        rating: 5,
        feedback: "Great documentation! Very clear and easy to follow.",
        page: "/docs/setup/QUICKSTART.md",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        userAgent: "Mozilla/5.0..."
      },
      {
        rating: 4,
        feedback: "Good overall, but could use more examples for advanced configuration.",
        page: "/docs/api/API_DOCUMENTATION.md",
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        userAgent: "Mozilla/5.0..."
      },
      {
        rating: 3,
        feedback: "Installation instructions work but are a bit confusing for beginners.",
        page: "/README.md",
        timestamp: new Date(Date.now() - 259200000).toISOString(),
        userAgent: "Mozilla/5.0..."
      },
      {
        rating: 5,
        feedback: "Perfect! Everything worked exactly as documented.",
        page: "/docs/setup/QUICKSTART.md",
        timestamp: new Date(Date.now() - 345600000).toISOString(),
        userAgent: "Mozilla/5.0..."
      },
      {
        rating: 2,
        feedback: "TypeScript examples don't compile. Need better type definitions.",
        page: "/docs/development/PROJECT_STANDARDS.md",
        timestamp: new Date(Date.now() - 432000000).toISOString(),
        userAgent: "Mozilla/5.0..."
      },
      {
        rating: 4,
        feedback: "API documentation is comprehensive but could use more real-world examples.",
        page: "/docs/api/API_DOCUMENTATION.md",
        timestamp: new Date(Date.now() - 518400000).toISOString(),
        userAgent: "Mozilla/5.0..."
      },
      {
        rating: 5,
        feedback: "Love the new style guide! Very professional.",
        page: "/docs/DOCUMENTATION_STYLE_GUIDE.md",
        timestamp: new Date(Date.now() - 604800000).toISOString(),
        userAgent: "Mozilla/5.0..."
      }
    ];

    this.feedback = simulatedFeedback;
    console.log(`✅ Loaded ${this.feedback.length} feedback entries`);
  }

  /**
   * Analyze feedback and generate insights
   */
  analyzeFeedback(): FeedbackAnalysis {
    console.log('🔍 Analyzing feedback...');

    const totalFeedback = this.feedback.length;
    const averageRating = this.feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback;

    // Rating distribution
    const ratingDistribution: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = this.feedback.filter(f => f.rating === i).length;
    }

    // Page analysis
    const pageAnalysis: Record<string, any> = {};
    const pageGroups = this.groupBy(this.feedback, 'page');

    for (const [page, entries] of Object.entries(pageGroups)) {
      const pageRating = entries.reduce((sum: number, f: FeedbackEntry) => sum + f.rating, 0) / entries.length;
      const issues = this.extractIssues(entries);

      pageAnalysis[page] = {
        count: entries.length,
        averageRating: pageRating,
        commonIssues: issues
      };
    }

    // Sentiment analysis (simplified)
    const sentimentAnalysis = {
      positive: this.feedback.filter(f => f.rating >= 4).length,
      neutral: this.feedback.filter(f => f.rating === 3).length,
      negative: this.feedback.filter(f => f.rating <= 2).length
    };

    // Common themes
    const commonThemes = this.extractThemes();

    // Recommendations
    const recommendations = this.generateRecommendations();

    return {
      totalFeedback,
      averageRating,
      ratingDistribution,
      pageAnalysis,
      sentimentAnalysis,
      commonThemes,
      recommendations
    };
  }

  /**
   * Group feedback by a property
   */
  private groupBy(array: FeedbackEntry[], key: keyof FeedbackEntry): Record<string, FeedbackEntry[]> {
    return array.reduce((groups, item) => {
      const group = item[key] as string;
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, FeedbackEntry[]>);
  }

  /**
   * Extract common issues from feedback
   */
  private extractIssues(entries: FeedbackEntry[]): string[] {
    const issues: string[] = [];
    const keywords = ['error', 'bug', 'broken', 'confusing', 'unclear', 'missing', 'difficult'];

    entries.forEach(entry => {
      if (entry.feedback && entry.rating <= 3) {
        const feedback = entry.feedback.toLowerCase();
        keywords.forEach(keyword => {
          if (feedback.includes(keyword)) {
            issues.push(`Contains "${keyword}"`);
          }
        });
      }
    });

    return [...new Set(issues)]; // Remove duplicates
  }

  /**
   * Extract common themes from feedback
   */
  private extractThemes(): string[] {
    const themes: string[] = [];
    const allFeedback = this.feedback.map(f => f.feedback).join(' ').toLowerCase();

    const themeKeywords = {
      'examples': ['example', 'examples', 'sample'],
      'clarity': ['clear', 'confusing', 'unclear', 'understand'],
      'completeness': ['missing', 'incomplete', 'more', 'additional'],
      'technical_issues': ['error', 'bug', 'broken', 'compile', 'typescript'],
      'installation': ['install', 'setup', 'configuration', 'config']
    };

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      const mentions = keywords.filter(keyword => allFeedback.includes(keyword)).length;
      if (mentions >= 2) {
        themes.push(theme.replace('_', ' '));
      }
    }

    return themes;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const lowRatingFeedback = this.feedback.filter(f => f.rating <= 2);

    if (lowRatingFeedback.length > 0) {
      recommendations.push('Address critical issues causing low ratings');
    }

    const avgRating = this.feedback.reduce((sum, f) => sum + f.rating, 0) / this.feedback.length;
    if (avgRating < 4) {
      recommendations.push('Focus on improving overall documentation quality');
    }

    const exampleMentions = this.feedback.filter(f =>
      f.feedback.toLowerCase().includes('example')
    ).length;
    if (exampleMentions >= 2) {
      recommendations.push('Add more practical examples throughout documentation');
    }

    const typescriptIssues = this.feedback.filter(f =>
      f.feedback.toLowerCase().includes('typescript')
    ).length;
    if (typescriptIssues > 0) {
      recommendations.push('Fix TypeScript compilation issues in examples');
    }

    return recommendations;
  }

  /**
   * Generate feedback report
   */
  async generateReport(analysis: FeedbackAnalysis): Promise<void> {
    console.log('📋 Generating feedback report...');

    const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation Feedback Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { display: inline-block; margin-right: 30px; text-align: center; }
        .metric-value { font-size: 32px; font-weight: bold; color: #007bff; }
        .metric-label { font-size: 14px; color: #666; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin-bottom: 10px; }
        .theme { background: #d4edda; border: 1px solid #c3e6cb; padding: 10px; border-radius: 4px; margin: 5px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Documentation Feedback Analysis Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="card">
            <h2>📈 Overview Metrics</h2>
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value">${analysis.totalFeedback}</div>
                    <div class="metric-label">Total Feedback</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${analysis.averageRating.toFixed(1)}</div>
                    <div class="metric-label">Average Rating</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${analysis.sentimentAnalysis.positive}</div>
                    <div class="metric-label">Positive Reviews</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>🎯 Common Themes</h2>
            ${analysis.commonThemes.map(theme => `<span class="theme">${theme}</span>`).join('')}
        </div>

        <div class="card">
            <h2>💡 Recommendations</h2>
            ${analysis.recommendations.map(rec => `<div class="recommendation">• ${rec}</div>`).join('')}
        </div>
    </div>
</body>
</html>`;

    await Bun.write('docs/feedback-analysis-report.html', reportHtml);
    console.log('📊 Report generated: docs/feedback-analysis-report.html');
  }
}

// Main execution
async function main() {
  try {
    const analyzer = new FeedbackAnalyzer();
    await analyzer.loadFeedback();
    const analysis = analyzer.analyzeFeedback();

    console.log('\n📊 Feedback Analysis Summary:');
    console.log(`Total Feedback: ${analysis.totalFeedback}`);
    console.log(`Average Rating: ${analysis.averageRating.toFixed(1)}/5`);
    console.log(`Positive Sentiment: ${analysis.sentimentAnalysis.positive}/${analysis.totalFeedback}`);
    console.log(`Common Themes: ${analysis.commonThemes.join(', ')}`);

    await analyzer.generateReport(analysis);

  } catch (error) {
    console.error('❌ Feedback analysis failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}