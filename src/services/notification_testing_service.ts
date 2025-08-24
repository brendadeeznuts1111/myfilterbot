/**
 * Notification Testing and Delivery Confirmation Service
 * Comprehensive testing suite with stream optimization and delivery validation
 */

import { enhancedNotificationService, StreamNotification, NotificationType, NotificationPriority } from './enhanced_notification_service';
import { notificationTemplateService } from './notification_template_service';
import { getEnhancedWebSocketService } from './enhanced_websocket_service';
import { StreamUtils, fetchJSON, StreamBenchmark } from '../utils/stream-helpers';
import { spawnPythonJSON, DatabaseOperations } from '../utils/spawn-utils';

export interface TestNotificationOptions {
  userId: string;
  userType: 'admin' | 'customer';
  type: NotificationType;
  priority: NotificationPriority;
  channels: string[];
  templateId?: string;
  variables?: Record<string, any>;
  streamOptimized?: boolean;
  expectedDeliveryTime?: number;
  validateDelivery?: boolean;
}

export interface TestResult {
  id: string;
  testName: string;
  status: 'passed' | 'failed' | 'partial';
  startTime: string;
  endTime: string;
  duration: number;
  notification?: StreamNotification;
  deliveryResults: DeliveryTestResult[];
  performanceMetrics: PerformanceMetrics;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface DeliveryTestResult {
  channel: string;
  status: 'delivered' | 'failed' | 'timeout' | 'not_attempted';
  latency: number;
  expectedLatency?: number;
  streamOptimized: boolean;
  error?: string;
  confirmationReceived: boolean;
  deliveryMetadata: Record<string, any>;
}

export interface PerformanceMetrics {
  notificationCreationTime: number;
  templateRenderingTime: number;
  totalDeliveryTime: number;
  streamOptimizedChannels: number;
  averageChannelLatency: number;
  memoryUsage: number;
  throughput: number;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: NotificationTest[];
  config: TestConfig;
  createdAt: string;
  updatedBy: string;
}

export interface NotificationTest {
  id: string;
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'performance' | 'stress' | 'delivery';
  options: TestNotificationOptions;
  expectations: TestExpectations;
  enabled: boolean;
}

export interface TestExpectations {
  shouldSucceed: boolean;
  maxDeliveryTime?: number;
  minSuccessfulChannels?: number;
  maxAcceptableFailures?: number;
  expectedStreamOptimizationRate?: number;
  performanceBenchmarks?: {
    maxCreationTime?: number;
    maxRenderingTime?: number;
    maxTotalLatency?: number;
    minThroughput?: number;
  };
}

export interface TestConfig {
  timeout: number;
  retryAttempts: number;
  concurrentTests: number;
  streamOptimizationPreference: boolean;
  generateReports: boolean;
  validateDeliveryConfirmation: boolean;
}

export class NotificationTestingService {
  private activeTests = new Map<string, TestResult>();
  private testHistory: TestResult[] = [];
  private testSuites = new Map<string, TestSuite>();
  private streamBenchmark = new StreamBenchmark();
  private deliveryConfirmations = new Map<string, any>();

  constructor() {
    this.initializeDefaultTestSuites();
    this.startDeliveryConfirmationMonitoring();
  }

  /**
   * Initialize default test suites
   */
  private async initializeDefaultTestSuites() {
    const defaultSuites: Partial<TestSuite>[] = [
      {
        name: 'Basic Functionality Tests',
        description: 'Core notification system functionality validation',
        tests: [
          {
            id: 'basic_web_notification',
            name: 'Basic Web Notification',
            description: 'Test basic web notification delivery',
            type: 'unit',
            options: {
              userId: 'test_user_001',
              userType: 'customer',
              type: NotificationType.SYSTEM_UPDATE,
              priority: NotificationPriority.MEDIUM,
              channels: ['web'],
              streamOptimized: true
            },
            expectations: {
              shouldSucceed: true,
              maxDeliveryTime: 500,
              minSuccessfulChannels: 1
            },
            enabled: true
          },
          {
            id: 'multi_channel_delivery',
            name: 'Multi-Channel Delivery',
            description: 'Test notification delivery across multiple channels',
            type: 'integration',
            options: {
              userId: 'test_user_002',
              userType: 'admin',
              type: NotificationType.SECURITY_ALERT,
              priority: NotificationPriority.HIGH,
              channels: ['web', 'websocket', 'telegram'],
              streamOptimized: true
            },
            expectations: {
              shouldSucceed: true,
              maxDeliveryTime: 2000,
              minSuccessfulChannels: 2,
              expectedStreamOptimizationRate: 80
            },
            enabled: true
          }
        ],
        config: {
          timeout: 10000,
          retryAttempts: 2,
          concurrentTests: 5,
          streamOptimizationPreference: true,
          generateReports: true,
          validateDeliveryConfirmation: true
        }
      },
      {
        name: 'Performance Tests',
        description: 'Performance and scalability validation',
        tests: [
          {
            id: 'high_volume_delivery',
            name: 'High Volume Delivery',
            description: 'Test system under high notification volume',
            type: 'performance',
            options: {
              userId: 'perf_test_user',
              userType: 'customer',
              type: NotificationType.TRANSACTION,
              priority: NotificationPriority.HIGH,
              channels: ['websocket', 'web'],
              streamOptimized: true
            },
            expectations: {
              shouldSucceed: true,
              maxDeliveryTime: 1000,
              performanceBenchmarks: {
                maxCreationTime: 50,
                maxRenderingTime: 100,
                maxTotalLatency: 800,
                minThroughput: 100
              }
            },
            enabled: true
          }
        ],
        config: {
          timeout: 30000,
          retryAttempts: 1,
          concurrentTests: 10,
          streamOptimizationPreference: true,
          generateReports: true,
          validateDeliveryConfirmation: false
        }
      }
    ];

    for (const suiteData of defaultSuites) {
      await this.createTestSuite(suiteData as TestSuite, 'system');
    }

    console.log('✅ Default notification test suites initialized');
  }

  /**
   * Create a single test notification
   */
  async createTestNotification(options: TestNotificationOptions): Promise<TestResult> {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();

    const testResult: TestResult = {
      id: testId,
      testName: 'Single Notification Test',
      status: 'failed',
      startTime: new Date().toISOString(),
      endTime: '',
      duration: 0,
      deliveryResults: [],
      performanceMetrics: {
        notificationCreationTime: 0,
        templateRenderingTime: 0,
        totalDeliveryTime: 0,
        streamOptimizedChannels: 0,
        averageChannelLatency: 0,
        memoryUsage: 0,
        throughput: 0
      },
      errors: [],
      warnings: [],
      recommendations: []
    };

    this.activeTests.set(testId, testResult);

    try {
      console.log(`🧪 Starting notification test: ${testId}`);

      // Create test notification
      const createStart = performance.now();
      
      let notification: StreamNotification | null = null;
      
      if (options.templateId) {
        // Use template-based notification
        const template = await notificationTemplateService.getTemplate(options.templateId);
        if (!template) {
          throw new Error(`Template not found: ${options.templateId}`);
        }

        const rendered = await notificationTemplateService.renderTemplate(
          options.templateId,
          options.variables || {},
          options.channels[0] || 'web',
          { userId: options.userId, userType: options.userType }
        );

        if (!rendered) {
          throw new Error('Template rendering failed');
        }

        testResult.performanceMetrics.templateRenderingTime = rendered.renderDuration;

        notification = await enhancedNotificationService.createNotification(
          options.userId,
          options.userType,
          options.type,
          rendered.title,
          rendered.message,
          {
            priority: options.priority,
            customChannels: options.channels as any,
            forceStreamOptimization: options.streamOptimized
          }
        );
      } else {
        // Direct notification creation
        notification = await enhancedNotificationService.createNotification(
          options.userId,
          options.userType,
          options.type,
          `Test ${options.type} Notification`,
          `This is a test notification of type ${options.type} for user ${options.userId}`,
          {
            priority: options.priority,
            customChannels: options.channels as any,
            forceStreamOptimization: options.streamOptimized
          }
        );
      }

      const createEnd = performance.now();
      testResult.performanceMetrics.notificationCreationTime = createEnd - createStart;

      if (!notification) {
        throw new Error('Failed to create notification');
      }

      testResult.notification = notification;

      // Wait for delivery and collect results
      const deliveryResults = await this.waitForDeliveryResults(
        notification.id,
        options.channels,
        options.expectedDeliveryTime || 5000
      );

      testResult.deliveryResults = deliveryResults;

      // Calculate performance metrics
      const totalLatency = Math.max(...deliveryResults.map(r => r.latency));
      const averageLatency = deliveryResults.reduce((sum, r) => sum + r.latency, 0) / deliveryResults.length;
      const streamOptimizedCount = deliveryResults.filter(r => r.streamOptimized).length;
      const successfulDeliveries = deliveryResults.filter(r => r.status === 'delivered').length;

      testResult.performanceMetrics.totalDeliveryTime = totalLatency;
      testResult.performanceMetrics.averageChannelLatency = averageLatency;
      testResult.performanceMetrics.streamOptimizedChannels = streamOptimizedCount;
      testResult.performanceMetrics.throughput = successfulDeliveries / (totalLatency / 1000);

      // Determine test status
      if (successfulDeliveries === options.channels.length) {
        testResult.status = 'passed';
      } else if (successfulDeliveries > 0) {
        testResult.status = 'partial';
        testResult.warnings.push(`Only ${successfulDeliveries}/${options.channels.length} channels delivered successfully`);
      } else {
        testResult.status = 'failed';
        testResult.errors.push('No channels delivered successfully');
      }

      // Add performance recommendations
      if (averageLatency > 1000) {
        testResult.recommendations.push('Consider optimizing delivery mechanisms for better performance');
      }

      if (streamOptimizedCount < options.channels.length && options.streamOptimized) {
        testResult.recommendations.push('Some channels did not use stream optimization');
      }

    } catch (error: any) {
      testResult.status = 'failed';
      testResult.errors.push(error.message);
      console.error(`❌ Test ${testId} failed:`, error);
    }

    const endTime = performance.now();
    testResult.duration = endTime - startTime;
    testResult.endTime = new Date().toISOString();

    this.activeTests.delete(testId);
    this.testHistory.push(testResult);

    // Limit history size
    if (this.testHistory.length > 1000) {
      this.testHistory = this.testHistory.slice(-800);
    }

    console.log(`🧪 Test ${testId} completed: ${testResult.status} (${testResult.duration.toFixed(2)}ms)`);
    return testResult;
  }

  /**
   * Run a test suite
   */
  async runTestSuite(suiteId: string): Promise<{
    suiteId: string;
    results: TestResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      partial: number;
      duration: number;
      averageLatency: number;
      streamOptimizationRate: number;
    };
  }> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite not found: ${suiteId}`);
    }

    const startTime = performance.now();
    const enabledTests = suite.tests.filter(test => test.enabled);
    
    console.log(`🧪 Running test suite: ${suite.name} (${enabledTests.length} tests)`);

    // Run tests with controlled concurrency
    const results: TestResult[] = [];
    const batchSize = suite.config.concurrentTests;
    
    for (let i = 0; i < enabledTests.length; i += batchSize) {
      const batch = enabledTests.slice(i, i + batchSize);
      
      const batchPromises = batch.map(test => 
        this.createTestNotification(test.options).catch(error => ({
          id: `failed_${Date.now()}`,
          testName: test.name,
          status: 'failed' as const,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0,
          deliveryResults: [],
          performanceMetrics: {
            notificationCreationTime: 0,
            templateRenderingTime: 0,
            totalDeliveryTime: 0,
            streamOptimizedChannels: 0,
            averageChannelLatency: 0,
            memoryUsage: 0,
            throughput: 0
          },
          errors: [error.message || 'Unknown error'],
          warnings: [],
          recommendations: []
        }))
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Calculate summary
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const partial = results.filter(r => r.status === 'partial').length;
    
    const totalLatency = results.reduce((sum, r) => sum + r.performanceMetrics.averageChannelLatency, 0);
    const averageLatency = results.length > 0 ? totalLatency / results.length : 0;
    
    const totalStreamOptimized = results.reduce((sum, r) => sum + r.performanceMetrics.streamOptimizedChannels, 0);
    const totalChannels = results.reduce((sum, r) => sum + r.deliveryResults.length, 0);
    const streamOptimizationRate = totalChannels > 0 ? (totalStreamOptimized / totalChannels) * 100 : 0;

    console.log(`📊 Test suite ${suite.name} completed: ${passed}/${results.length} passed (${totalDuration.toFixed(2)}ms)`);

    return {
      suiteId,
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        partial,
        duration: totalDuration,
        averageLatency,
        streamOptimizationRate
      }
    };
  }

  /**
   * Wait for delivery results from all channels
   */
  private async waitForDeliveryResults(
    notificationId: string,
    channels: string[],
    timeout: number
  ): Promise<DeliveryTestResult[]> {
    const results: DeliveryTestResult[] = [];
    const startTime = performance.now();

    // Initialize results for all channels
    for (const channel of channels) {
      results.push({
        channel,
        status: 'not_attempted',
        latency: 0,
        streamOptimized: false,
        confirmationReceived: false,
        deliveryMetadata: {}
      });
    }

    // Wait for delivery confirmations
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const currentTime = performance.now();
        let allCompleted = true;

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          
          if (result.status === 'not_attempted') {
            const confirmation = this.deliveryConfirmations.get(`${notificationId}_${result.channel}`);
            
            if (confirmation) {
              result.status = confirmation.success ? 'delivered' : 'failed';
              result.latency = confirmation.latency || (currentTime - startTime);
              result.streamOptimized = confirmation.streamOptimized || false;
              result.confirmationReceived = true;
              result.deliveryMetadata = confirmation.metadata || {};
              
              if (!confirmation.success) {
                result.error = confirmation.error;
              }
            } else if (currentTime - startTime > timeout) {
              result.status = 'timeout';
              result.latency = timeout;
            } else {
              allCompleted = false;
            }
          }
        }

        if (allCompleted || currentTime - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(results);
        }
      }, 100);
    });
  }

  /**
   * Create test suite
   */
  async createTestSuite(suiteData: Partial<TestSuite>, createdBy: string): Promise<TestSuite> {
    const suite: TestSuite = {
      id: suiteData.id || `suite_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: suiteData.name || 'Unnamed Test Suite',
      description: suiteData.description || '',
      tests: suiteData.tests || [],
      config: {
        timeout: 10000,
        retryAttempts: 2,
        concurrentTests: 3,
        streamOptimizationPreference: true,
        generateReports: true,
        validateDeliveryConfirmation: true,
        ...suiteData.config
      },
      createdAt: new Date().toISOString(),
      updatedBy: createdBy
    };

    this.testSuites.set(suite.id, suite);
    console.log(`📋 Test suite created: ${suite.name} (${suite.tests.length} tests)`);
    
    return suite;
  }

  /**
   * Register delivery confirmation
   */
  registerDeliveryConfirmation(notificationId: string, channel: string, confirmation: any) {
    const key = `${notificationId}_${channel}`;
    this.deliveryConfirmations.set(key, {
      ...confirmation,
      receivedAt: new Date().toISOString()
    });

    // Clean up old confirmations after 5 minutes
    setTimeout(() => {
      this.deliveryConfirmations.delete(key);
    }, 5 * 60 * 1000);
  }

  /**
   * Start monitoring for delivery confirmations
   */
  private startDeliveryConfirmationMonitoring() {
    // This would integrate with your WebSocket service and other delivery channels
    // to receive delivery confirmations
    
    const webSocketService = getEnhancedWebSocketService();
    if (webSocketService) {
      // Integration point for WebSocket delivery confirmations
      console.log('📡 Delivery confirmation monitoring started');
    }

    // Clean up old confirmations every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, confirmation] of this.deliveryConfirmations.entries()) {
        const receivedAt = new Date(confirmation.receivedAt).getTime();
        if (now - receivedAt > 5 * 60 * 1000) {
          this.deliveryConfirmations.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Get test history with filtering
   */
  getTestHistory(filters: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  } = {}): TestResult[] {
    let filtered = [...this.testHistory];

    if (filters.status) {
      filtered = filtered.filter(test => test.status === filters.status);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(test => new Date(test.startTime) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(test => new Date(test.startTime) <= toDate);
    }

    if (filters.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered.reverse(); // Most recent first
  }

  /**
   * Get testing statistics
   */
  getTestingStatistics(): {
    totalTests: number;
    passRate: number;
    averageLatency: number;
    streamOptimizationRate: number;
    mostCommonErrors: { error: string; count: number }[];
    performanceTrends: {
      date: string;
      averageLatency: number;
      passRate: number;
    }[];
  } {
    const recentTests = this.testHistory.slice(-100); // Last 100 tests
    
    const totalTests = recentTests.length;
    const passedTests = recentTests.filter(test => test.status === 'passed').length;
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    
    const totalLatency = recentTests.reduce((sum, test) => 
      sum + test.performanceMetrics.averageChannelLatency, 0);
    const averageLatency = totalTests > 0 ? totalLatency / totalTests : 0;
    
    const totalStreamOptimized = recentTests.reduce((sum, test) => 
      sum + test.performanceMetrics.streamOptimizedChannels, 0);
    const totalChannels = recentTests.reduce((sum, test) => 
      sum + test.deliveryResults.length, 0);
    const streamOptimizationRate = totalChannels > 0 ? 
      (totalStreamOptimized / totalChannels) * 100 : 0;
    
    // Count errors
    const errorCounts = new Map<string, number>();
    recentTests.forEach(test => {
      test.errors.forEach(error => {
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
      });
    });
    
    const mostCommonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalTests,
      passRate,
      averageLatency,
      streamOptimizationRate,
      mostCommonErrors,
      performanceTrends: [] // Would implement trend analysis
    };
  }

  /**
   * Get all test suites
   */
  getTestSuites(): TestSuite[] {
    return Array.from(this.testSuites.values());
  }

  /**
   * Get active tests
   */
  getActiveTests(): TestResult[] {
    return Array.from(this.activeTests.values());
  }
}

// Export singleton instance
export const notificationTestingService = new NotificationTestingService();