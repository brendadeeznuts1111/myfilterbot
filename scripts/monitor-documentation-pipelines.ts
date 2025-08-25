#!/usr/bin/env bun

/**
 * Documentation Pipeline Monitoring Script
 * Monitors GitHub Actions workflows for documentation validation
 * @version 1.0.0
 */

interface PipelineStatus {
  workflow: string;
  status: 'success' | 'failure' | 'pending' | 'cancelled';
  lastRun: string;
  duration: number;
  conclusion: string | null;
  url: string;
}

interface MonitoringReport {
  timestamp: string;
  overallHealth: 'healthy' | 'warning' | 'critical';
  pipelines: PipelineStatus[];
  summary: {
    totalRuns: number;
    successRate: number;
    averageDuration: number;
    failureCount: number;
  };
  alerts: string[];
}

class DocumentationPipelineMonitor {
  private owner: string;
  private repo: string;

  constructor() {
    this.owner = 'brendadeeznuts1111';
    this.repo = 'myfilterbot';
  }

  /**
   * Monitor documentation-related workflows
   */
  async monitorPipelines(): Promise<MonitoringReport> {
    console.log('🔍 Monitoring documentation pipelines...');

    const workflows = [
      'documentation-validation.yml',
      'documentation-review-reminders.yml'
    ];

    const pipelines: PipelineStatus[] = [];
    const alerts: string[] = [];

    // Simulate pipeline status for demonstration
    for (const workflow of workflows) {
      const status = this.simulateWorkflowStatus(workflow);
      pipelines.push(status);

      // Check for alerts
      if (status.status === 'failure') {
        alerts.push(`❌ ${workflow} failed on last run`);
      }
      if (status.duration > 600) { // 10 minutes
        alerts.push(`⏰ ${workflow} taking longer than expected (${status.duration}s)`);
      }
    }

    // Calculate summary metrics
    const totalRuns = pipelines.length;
    const successCount = pipelines.filter(p => p.status === 'success').length;
    const successRate = totalRuns > 0 ? (successCount / totalRuns) * 100 : 0;
    const averageDuration = pipelines.reduce((sum, p) => sum + p.duration, 0) / totalRuns;
    const failureCount = pipelines.filter(p => p.status === 'failure').length;

    // Determine overall health
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (failureCount > 0) {
      overallHealth = 'critical';
    } else if (successRate < 90) {
      overallHealth = 'warning';
    }

    const report: MonitoringReport = {
      timestamp: new Date().toISOString(),
      overallHealth,
      pipelines,
      summary: {
        totalRuns,
        successRate,
        averageDuration,
        failureCount
      },
      alerts
    };

    return report;
  }

  /**
   * Simulate workflow status (replace with actual GitHub API calls when token is available)
   */
  private simulateWorkflowStatus(workflowFile: string): PipelineStatus {
    const now = new Date();
    const lastRun = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000); // Random time in last 24h
    const duration = Math.floor(Math.random() * 300) + 30; // 30-330 seconds
    const isSuccess = Math.random() > 0.1; // 90% success rate

    return {
      workflow: workflowFile,
      status: isSuccess ? 'success' : 'failure',
      lastRun: lastRun.toISOString(),
      duration,
      conclusion: isSuccess ? 'success' : 'failure',
      url: `https://github.com/${this.owner}/${this.repo}/actions`
    };
  }

  /**
   * Generate monitoring dashboard
   */
  async generateDashboard(report: MonitoringReport): Promise<void> {
    const dashboardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation Pipeline Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-healthy { border-left: 4px solid #28a745; }
        .status-warning { border-left: 4px solid #ffc107; }
        .status-critical { border-left: 4px solid #dc3545; }
        .metric { display: inline-block; margin-right: 30px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; }
        .metric-label { font-size: 14px; color: #666; }
        .pipeline { padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 10px; }
        .pipeline-success { background: #f8f9fa; border-color: #28a745; }
        .pipeline-failure { background: #fff5f5; border-color: #dc3545; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin-bottom: 10px; }
        .timestamp { color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Documentation Pipeline Dashboard</h1>
            <p class="timestamp">Last updated: ${report.timestamp}</p>
        </div>

        <div class="status-card status-${report.overallHealth}">
            <h2>Overall Health: ${report.overallHealth.toUpperCase()}</h2>
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value">${report.summary.successRate.toFixed(1)}%</div>
                    <div class="metric-label">Success Rate</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${report.summary.averageDuration}s</div>
                    <div class="metric-label">Avg Duration</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${report.summary.failureCount}</div>
                    <div class="metric-label">Failures</div>
                </div>
            </div>
        </div>

        ${report.alerts.length > 0 ? `
        <div class="status-card">
            <h3>🚨 Alerts</h3>
            ${report.alerts.map(alert => `<div class="alert">${alert}</div>`).join('')}
        </div>
        ` : ''}

        <div class="status-card">
            <h3>Pipeline Status</h3>
            ${report.pipelines.map(pipeline => `
                <div class="pipeline pipeline-${pipeline.status}">
                    <strong>${pipeline.workflow}</strong> - ${pipeline.status}
                    <br>
                    <small>Last run: ${new Date(pipeline.lastRun).toLocaleString()} | Duration: ${pipeline.duration}s</small>
                    <br>
                    <a href="${pipeline.url}" target="_blank">View Details</a>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    await Bun.write('docs/pipeline-dashboard.html', dashboardHtml);
    console.log('📊 Dashboard generated: docs/pipeline-dashboard.html');
  }

  /**
   * Send alerts if needed
   */
  async sendAlerts(report: MonitoringReport): Promise<void> {
    if (report.alerts.length === 0) {
      console.log('✅ No alerts to send');
      return;
    }

    console.log(`🚨 Sending ${report.alerts.length} alerts...`);

    // Log alerts to console (in production, this would send to Slack/email)
    for (const alert of report.alerts) {
      console.log(`ALERT: ${alert}`);
    }

    // Save alerts to file for tracking
    const alertLog = {
      timestamp: report.timestamp,
      alerts: report.alerts,
      overallHealth: report.overallHealth
    };

    const logFile = 'logs/pipeline-alerts.jsonl';
    const logEntry = JSON.stringify(alertLog) + '\n';

    try {
      await Bun.write(logFile, logEntry, { createPath: true });
    } catch (error) {
      console.error('Failed to write alert log:', error);
    }
  }
}

// Main execution
async function main() {
  try {
    const monitor = new DocumentationPipelineMonitor();
    const report = await monitor.monitorPipelines();

    console.log('\n📊 Pipeline Monitoring Report:');
    console.log(`Overall Health: ${report.overallHealth}`);
    console.log(`Success Rate: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`Average Duration: ${report.summary.averageDuration}s`);
    console.log(`Failures: ${report.summary.failureCount}`);

    await monitor.generateDashboard(report);
    await monitor.sendAlerts(report);

    // Exit with error code if critical issues
    if (report.overallHealth === 'critical') {
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Pipeline monitoring failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}