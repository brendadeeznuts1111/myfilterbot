/**
 * Standardized Error Handling Utilities
 * Provides consistent error handling patterns across the application
 */

import { MESSAGE_CONFIG } from '@config/app_constants';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  DATABASE = 'database',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

export interface ErrorContext {
  operation?: string;
  userId?: string;
  endpoint?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  jitter: boolean;
}

export interface ErrorResult {
  success: boolean;
  data?: unknown;
  error?: {
    id: string;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    context?: ErrorContext;
    retryable: boolean;
  };
}

export class StandardizedErrorHandler {
  private static instance: StandardizedErrorHandler;
  private errorLog: Map<string, unknown> = new Map();

  private constructor() {}

  public static getInstance(): StandardizedErrorHandler {
    if (!StandardizedErrorHandler.instance) {
      StandardizedErrorHandler.instance = new StandardizedErrorHandler();
    }
    return StandardizedErrorHandler.instance;
  }

  /**
   * Execute operation with standardized error handling
   */
  public async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    retryConfig?: Partial<RetryConfig>
  ): Promise<ErrorResult> {
    const config: RetryConfig = {
      maxAttempts: MESSAGE_CONFIG.MAX_RETRY_ATTEMPTS,
      baseDelay: MESSAGE_CONFIG.RETRY_DELAY * 1000,
      maxDelay: 30000,
      exponentialBackoff: true,
      jitter: true,
      ...retryConfig,
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const errorInfo = this.classifyError(lastError);

        // Log error
        const errorId = this.logError(
          lastError,
          errorInfo.category,
          errorInfo.severity,
          {
            ...context,
            attempt,
            maxAttempts: config.maxAttempts,
          }
        );

        // Check if we should retry
        if (attempt < config.maxAttempts && errorInfo.retryable) {
          const delay = this.calculateDelay(attempt, config);
          console.warn(
            `🔄 Retrying operation after ${delay}ms (attempt ${attempt}/${config.maxAttempts})`
          );
          await this.delay(delay);
          continue;
        }

        // Max attempts reached or non-retryable error
        return {
          success: false,
          error: {
            id: errorId,
            message: lastError.message,
            category: errorInfo.category,
            severity: errorInfo.severity,
            context,
            retryable: errorInfo.retryable,
          },
        };
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      success: false,
      error: {
        id: 'unknown',
        message: 'Unknown error occurred',
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
      },
    };
  }

  /**
   * Classify error by type and determine retry strategy
   */
  private classifyError(error: Error): {
    category: ErrorCategory;
    severity: ErrorSeverity;
    retryable: boolean;
  } {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('timeout') ||
      name.includes('timeout')
    ) {
      return {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
      };
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('429')) {
      return {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.LOW,
        retryable: true,
      };
    }

    // Authentication errors
    if (
      message.includes('unauthorized') ||
      message.includes('401') ||
      message.includes('forbidden') ||
      message.includes('403')
    ) {
      return {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        retryable: false,
      };
    }

    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('400')
    ) {
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retryable: false,
      };
    }

    // Database errors
    if (
      message.includes('database') ||
      message.includes('sql') ||
      message.includes('connection')
    ) {
      return {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        retryable: true,
      };
    }

    // Server errors (5xx)
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    ) {
      return {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retryable: true,
      };
    }

    // Default classification
    return {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
    };
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay;

    if (config.exponentialBackoff) {
      delay = Math.min(
        config.baseDelay * Math.pow(2, attempt - 1),
        config.maxDelay
      );
    }

    if (config.jitter) {
      // Add random jitter (±25% of delay)
      const jitterAmount = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.max(delay, 0);
  }

  /**
   * Log error with unique ID and context
   */
  private logError(
    error: Error,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorContext
  ): string {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const errorRecord = {
      id: errorId,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      category,
      severity,
      context,
    };

    this.errorLog.set(errorId, errorRecord);

    // Log to console with appropriate level
    const logMessage = `[${severity.toUpperCase()}] ${category}: ${error.message}`;

    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error(logMessage, { errorId, context });
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(logMessage, { errorId, context });
        break;
      case ErrorSeverity.LOW:
        console.info(logMessage, { errorId, context });
        break;
    }

    return errorId;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
  } {
    const stats = {
      total: this.errorLog.size,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
    };

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      stats.byCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    // Count errors
    this.errorLog.forEach(error => {
      stats.byCategory[error.category]++;
      stats.bySeverity[error.severity]++;
    });

    return stats;
  }

  /**
   * Clear error log (for testing or maintenance)
   */
  public clearErrorLog(): void {
    this.errorLog.clear();
  }
}

// Export singleton instance
export const errorHandler = StandardizedErrorHandler.getInstance();

// Convenience function for simple error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  retryConfig?: Partial<RetryConfig>
): Promise<ErrorResult> {
  return errorHandler.executeWithErrorHandling(operation, context, retryConfig);
}
