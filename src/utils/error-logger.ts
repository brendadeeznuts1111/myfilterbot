/**
 * Centralized Error Logging Utility
 * Provides consistent error logging and handling across the application
 */

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  url?: string;
  method?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}

export interface LoggedError {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  context: ErrorContext;
  handled: boolean;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private errorLog: LoggedError[] = [];
  private maxLogSize = 1000;

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with structured context
   */
  logError(
    error: Error | string,
    context: ErrorContext = {},
    level: 'error' | 'warn' | 'info' = 'error'
  ): LoggedError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    
    const loggedError: LoggedError = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      level,
      message: errorMessage,
      stack,
      context,
      handled: true
    };

    // Add to internal log
    this.errorLog.unshift(loggedError);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Console logging with structured format
    const logMethod = level === 'error' ? console.error : 
                     level === 'warn' ? console.warn : console.log;
    
    logMethod(`[${level.toUpperCase()}] ${errorMessage}`, {
      id: loggedError.id,
      timestamp: loggedError.timestamp,
      context,
      stack: stack?.split('\n').slice(0, 5).join('\n') // First 5 lines only
    });

    return loggedError;
  }

  /**
   * Log database operation errors
   */
  logDatabaseError(
    error: Error | string,
    operation: string,
    table?: string,
    query?: string
  ): LoggedError {
    return this.logError(error, {
      component: 'database',
      action: operation,
      table,
      query: query?.substring(0, 200) + (query && query.length > 200 ? '...' : '')
    });
  }

  /**
   * Log API request errors
   */
  logApiError(
    error: Error | string,
    req: Request,
    context: ErrorContext = {}
  ): LoggedError {
    const url = new URL(req.url);
    return this.logError(error, {
      component: 'api',
      url: url.pathname,
      method: req.method,
      ...context
    });
  }

  /**
   * Log service errors
   */
  logServiceError(
    error: Error | string,
    service: string,
    action: string,
    context: ErrorContext = {}
  ): LoggedError {
    return this.logError(error, {
      component: 'service',
      service,
      action,
      ...context
    });
  }

  /**
   * Log configuration errors
   */
  logConfigError(
    error: Error | string,
    configFile: string,
    operation: 'load' | 'save' | 'validate'
  ): LoggedError {
    return this.logError(error, {
      component: 'config',
      configFile,
      operation
    });
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 50, level?: 'error' | 'warn' | 'info'): LoggedError[] {
    let filtered = this.errorLog;
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    return filtered.slice(0, limit);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byLevel: Record<string, number>;
    byComponent: Record<string, number>;
    recentHour: number;
    recentDay: number;
  } {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);

    const byLevel: Record<string, number> = {};
    const byComponent: Record<string, number> = {};
    let recentHour = 0;
    let recentDay = 0;

    for (const error of this.errorLog) {
      const timestamp = new Date(error.timestamp).getTime();
      
      // Count by level
      byLevel[error.level] = (byLevel[error.level] || 0) + 1;
      
      // Count by component
      const component = error.context.component || 'unknown';
      byComponent[component] = (byComponent[component] || 0) + 1;
      
      // Count recent errors
      if (timestamp > hourAgo) recentHour++;
      if (timestamp > dayAgo) recentDay++;
    }

    return {
      total: this.errorLog.length,
      byLevel,
      byComponent,
      recentHour,
      recentDay
    };
  }

  /**
   * Clear error logs
   */
  clearLogs(): void {
    this.errorLog = [];
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logError(error, {
        component: 'process',
        action: 'uncaughtException',
        fatal: true
      });
      
      console.error('🚨 Uncaught Exception - Application may crash:', error);
      
      // In production, we might want to gracefully shutdown
      if (process.env.NODE_ENV === 'production') {
        setTimeout(() => {
          process.exit(1);
        }, 1000);
      }
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logError(
        reason instanceof Error ? reason : new Error(String(reason)),
        {
          component: 'process',
          action: 'unhandledRejection',
          promise: promise.toString()
        }
      );
      
      console.error('🚨 Unhandled Promise Rejection:', reason);
    });

    // Handle warnings
    process.on('warning', (warning) => {
      this.logError(warning.message, {
        component: 'process',
        action: 'warning',
        warningName: warning.name,
        warningCode: (warning as any).code
      }, 'warn');
    });
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();

// Convenience functions
export const logError = (error: Error | string, context?: ErrorContext) => 
  errorLogger.logError(error, context);

export const logDatabaseError = (error: Error | string, operation: string, table?: string, query?: string) =>
  errorLogger.logDatabaseError(error, operation, table, query);

export const logApiError = (error: Error | string, req: Request, context?: ErrorContext) =>
  errorLogger.logApiError(error, req, context);

export const logServiceError = (error: Error | string, service: string, action: string, context?: ErrorContext) =>
  errorLogger.logServiceError(error, service, action, context);

export const logConfigError = (error: Error | string, configFile: string, operation: 'load' | 'save' | 'validate') =>
  errorLogger.logConfigError(error, configFile, operation);

export default errorLogger;