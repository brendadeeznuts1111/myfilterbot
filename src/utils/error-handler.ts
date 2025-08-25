/**
 * Centralized Error Handling System
 * Provides graceful error recovery and monitoring
 */

import { loggers } from './logger';

export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',

  // Business logic errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_TRANSACTION = 'INVALID_TRANSACTION',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly metadata?: Record<string, any>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    isOperational: boolean = true,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.metadata = metadata;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCount: Map<ErrorCode, number> = new Map();
  private lastErrors: Array<{ error: AppError; timestamp: Date }> = [];
  private maxErrorHistory = 100;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {
    this.setupUncaughtHandlers();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupUncaughtHandlers() {
    process.on('uncaughtException', (error: Error) => {
      loggers.main.fatal('Uncaught Exception', error);
      // Give time to log before exit
      setTimeout(() => process.exit(1), 1000);
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      loggers.main.error('Unhandled Rejection', new Error(reason));
    });
  }

  handleError(error: Error | AppError, service: string = 'main'): Response {
    const logger = loggers[service] || loggers.main;

    // Track error
    if (error instanceof AppError) {
      this.trackError(error);

      if (error.isOperational) {
        // Operational errors are expected and can be handled gracefully
        logger.warn(`Operational error: ${error.message}`, {
          error,
          metadata: error.metadata,
        });

        return new Response(
          JSON.stringify({
            error: {
              code: error.code,
              message: error.message,
              ...(process.env.NODE_ENV === 'development' && {
                metadata: error.metadata,
              }),
            },
          }),
          {
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Non-operational errors or unknown errors
    logger.error('Unexpected error occurred', error);

    // In production, don't expose internal errors
    const message =
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message;

    return new Response(
      JSON.stringify({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message,
          ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            details: error,
          }),
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private trackError(error: AppError) {
    // Update error count
    const count = this.errorCount.get(error.code) || 0;
    this.errorCount.set(error.code, count + 1);

    // Add to history
    this.lastErrors.push({ error, timestamp: new Date() });
    if (this.lastErrors.length > this.maxErrorHistory) {
      this.lastErrors.shift();
    }

    // Check if we need to trigger circuit breaker
    if (count > 10) {
      this.triggerCircuitBreaker(error.code);
    }
  }

  private triggerCircuitBreaker(errorCode: ErrorCode) {
    const breaker = this.getCircuitBreaker(errorCode);
    breaker.open();
    loggers.main.warn(`Circuit breaker opened for ${errorCode}`);
  }

  getCircuitBreaker(name: string): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(name));
    }
    return this.circuitBreakers.get(name)!;
  }

  getErrorStats() {
    return {
      errorCounts: Object.fromEntries(this.errorCount),
      recentErrors: this.lastErrors.slice(-10),
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(
        ([name, breaker]) => ({
          name,
          state: breaker.getState(),
          failures: breaker.getFailureCount(),
        })
      ),
    };
  }

  clearErrorHistory() {
    this.errorCount.clear();
    this.lastErrors = [];
  }
}

// Circuit Breaker implementation for fault tolerance
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute
  private readonly successThreshold = 3;

  constructor(private name: string) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
        loggers.main.info(`Circuit breaker ${this.name} attempting reset`);
      } else {
        throw new AppError(
          'Service temporarily unavailable',
          ErrorCode.SERVICE_UNAVAILABLE,
          503
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureTime
      ? Date.now() - this.lastFailureTime.getTime() > this.timeout
      : false;
  }

  private onSuccess() {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.close();
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.state === 'half-open' || this.failures >= this.threshold) {
      this.open();
    }
  }

  open() {
    this.state = 'open';
    this.successCount = 0;
    loggers.main.warn(`Circuit breaker ${this.name} opened`);
  }

  close() {
    this.state = 'closed';
    this.failures = 0;
    this.successCount = 0;
    loggers.main.info(`Circuit breaker ${this.name} closed`);
  }

  getState() {
    return this.state;
  }

  getFailureCount() {
    return this.failures;
  }
}

// Middleware for error handling in HTTP requests
export function errorMiddleware(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      const response = await handler(req);

      // Log successful request
      loggers.main.logRequest(req, response, Date.now() - startTime);

      return response;
    } catch (error) {
      // Log error with request context
      const url = new URL(req.url);
      loggers.main.error('Request failed', error as Error, {
        requestId,
        method: req.method,
        path: url.pathname,
        duration: Date.now() - startTime,
      });

      return ErrorHandler.getInstance().handleError(error as Error);
    }
  };
}

// Validation error helper
export function validationError(field: string, message: string): AppError {
  return new AppError(
    `Validation failed: ${message}`,
    ErrorCode.VALIDATION_ERROR,
    400,
    true,
    { field, message }
  );
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();
