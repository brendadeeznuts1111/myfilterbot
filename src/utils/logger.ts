/**
 * Centralized Logging System
 * Provides structured logging with multiple levels and outputs
 */

import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogContext {
  service?: string;
  userId?: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  metadata?: Record<string, any>;
}

class Logger {
  private level: LogLevel;
  private service: string;
  private logDir: string;
  private errorLogPath: string;
  private accessLogPath: string;
  private debugLogPath: string;
  private logToFile: boolean;
  private logToConsole: boolean;

  constructor(
    service: string = 'default',
    options?: {
      level?: LogLevel;
      logToFile?: boolean;
      logToConsole?: boolean;
      logDir?: string;
    }
  ) {
    this.service = service;
    this.level = options?.level ?? LogLevel.INFO;
    this.logToFile = options?.logToFile ?? true;
    this.logToConsole = options?.logToConsole ?? true;
    this.logDir = options?.logDir ?? join(process.cwd(), 'logs');

    // Create log directory if it doesn't exist
    if (this.logToFile && !existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }

    // Set up log file paths
    const timestamp = new Date().toISOString().split('T')[0];
    this.errorLogPath = join(this.logDir, `error-${timestamp}.log`);
    this.accessLogPath = join(this.logDir, `access-${timestamp}.log`);
    this.debugLogPath = join(this.logDir, `debug-${timestamp}.log`);
  }

  private formatMessage(
    level: string,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.service,
      message,
      ...context,
      // Convert error to serializable format
      ...(context?.error && {
        error: {
          name: context.error.name,
          message: context.error.message,
          stack: context.error.stack,
        },
      }),
    };

    return JSON.stringify(logEntry);
  }

  private writeToFile(filePath: string, message: string) {
    if (this.logToFile) {
      try {
        appendFileSync(filePath, message + '\n');
      } catch (err) {
        console.error('Failed to write to log file:', err);
      }
    }
  }

  private log(
    level: LogLevel,
    levelName: string,
    message: string,
    context?: LogContext
  ) {
    if (level < this.level) return;

    const formattedMessage = this.formatMessage(levelName, message, context);

    // Console output with color coding
    if (this.logToConsole) {
      const colors = {
        DEBUG: '\x1b[36m', // Cyan
        INFO: '\x1b[32m', // Green
        WARN: '\x1b[33m', // Yellow
        ERROR: '\x1b[31m', // Red
        FATAL: '\x1b[35m', // Magenta
      };
      const reset = '\x1b[0m';
      const color = colors[levelName] || reset;

      console.log(`${color}[${levelName}]${reset} ${message}`, context || '');
    }

    // File output based on level
    switch (level) {
      case LogLevel.DEBUG:
        this.writeToFile(this.debugLogPath, formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        this.writeToFile(this.errorLogPath, formattedMessage);
        break;
      default:
        this.writeToFile(this.accessLogPath, formattedMessage);
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }

  error(message: string, error?: Error | LogContext, context?: LogContext) {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, 'ERROR', message, { ...context, error });
    } else {
      this.log(LogLevel.ERROR, 'ERROR', message, error);
    }
  }

  fatal(message: string, error?: Error, context?: LogContext) {
    this.log(LogLevel.FATAL, 'FATAL', message, { ...context, error });
  }

  // Special method for HTTP request logging
  logRequest(req: Request, res: Response | null, duration: number) {
    const url = new URL(req.url);
    const context: LogContext = {
      method: req.method,
      path: url.pathname,
      statusCode: res ? (res as any).status : 0,
      duration,
      metadata: {
        query: Object.fromEntries(url.searchParams),
        headers: Object.fromEntries(req.headers.entries()),
      },
    };

    const message = `${req.method} ${url.pathname} ${res ? (res as any).status : 'N/A'} - ${duration}ms`;
    this.info(message, context);
  }

  // Create child logger with additional context
  child(additionalContext: Partial<LogContext>): Logger {
    const childLogger = new Logger(this.service, {
      level: this.level,
      logToFile: this.logToFile,
      logToConsole: this.logToConsole,
      logDir: this.logDir,
    });

    // Override log method to include additional context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level, levelName, message, context) => {
      originalLog(level, levelName, message, {
        ...additionalContext,
        ...context,
      });
    };

    return childLogger;
  }
}

// Create singleton instances for each service
export const loggers = {
  main: new Logger('main'),
  admin: new Logger('admin'),
  api: new Logger('api'),
  websocket: new Logger('websocket'),
  unified: new Logger('unified'),
  database: new Logger('database'),
  auth: new Logger('auth'),
};

// Export default logger
export default loggers.main;
