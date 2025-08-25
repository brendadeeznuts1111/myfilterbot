/**
 * Bun Log Processor - ANSI Escape Code Handling
 * Uses Bun v1.2.21+ stripANSI for high-performance log cleaning
 */

import { stripANSI } from 'bun';

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  rawMessage?: string;
  metadata?: Record<string, any>;
}

export interface ProcessedLog {
  clean: string;
  hasAnsi: boolean;
  originalLength: number;
  cleanedLength: number;
  savedBytes: number;
}

export class BunLogProcessor {
  private static instance: BunLogProcessor;

  private constructor() {}

  static getInstance(): BunLogProcessor {
    if (!BunLogProcessor.instance) {
      BunLogProcessor.instance = new BunLogProcessor();
    }
    return BunLogProcessor.instance;
  }

  /**
   * Clean ANSI escape codes from log message using native Bun.stripANSI
   */
  cleanLogMessage(message: string): ProcessedLog {
    const originalLength = message.length;
    const clean = stripANSI(message);
    const cleanedLength = clean.length;
    const hasAnsi = originalLength !== cleanedLength;
    
    return {
      clean,
      hasAnsi,
      originalLength,
      cleanedLength,
      savedBytes: originalLength - cleanedLength
    };
  }

  /**
   * Process log entry and clean ANSI codes
   */
  processLogEntry(rawMessage: string, level: LogEntry['level'] = 'info', metadata?: Record<string, any>): LogEntry {
    const processed = this.cleanLogMessage(rawMessage);
    
    return {
      timestamp: new Date().toISOString(),
      level,
      message: processed.clean,
      rawMessage: processed.hasAnsi ? rawMessage : undefined, // Only store raw if it had ANSI
      metadata: {
        ...metadata,
        ansiCleaned: processed.hasAnsi,
        bytesReduced: processed.savedBytes
      }
    };
  }

  /**
   * Batch process multiple log messages
   */
  batchCleanLogs(messages: string[]): ProcessedLog[] {
    return messages.map(message => this.cleanLogMessage(message));
  }

  /**
   * Clean terminal output for storage/transmission
   */
  prepareForStorage(terminalOutput: string): {
    cleaned: string;
    compressionInfo: {
      originalSize: number;
      cleanedSize: number;
      compressionRatio: number;
    };
  } {
    const processed = this.cleanLogMessage(terminalOutput);
    
    return {
      cleaned: processed.clean,
      compressionInfo: {
        originalSize: processed.originalLength,
        cleanedSize: processed.cleanedLength,
        compressionRatio: processed.originalLength > 0 
          ? processed.savedBytes / processed.originalLength 
          : 0
      }
    };
  }

  /**
   * Extract and clean log levels from colored output
   */
  extractLogLevel(message: string): { level: LogEntry['level']; cleanMessage: string } {
    const cleaned = stripANSI(message);
    
    // Common log level patterns
    const levelPatterns = {
      error: /\b(ERROR|ERR|FATAL)\b/i,
      warn: /\b(WARN|WARNING)\b/i,
      info: /\b(INFO|LOG)\b/i,
      debug: /\b(DEBUG|DBG|TRACE)\b/i
    };

    for (const [level, pattern] of Object.entries(levelPatterns)) {
      if (pattern.test(cleaned)) {
        return {
          level: level as LogEntry['level'],
          cleanMessage: cleaned
        };
      }
    }

    return {
      level: 'info',
      cleanMessage: cleaned
    };
  }

  /**
   * Process streaming log data (useful for real-time log processing)
   */
  async processLogStream(
    logStream: ReadableStream<string>,
    onLogEntry: (entry: LogEntry) => void
  ): Promise<void> {
    const reader = logStream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Split by newlines and process each line
        const lines = value.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const { level, cleanMessage } = this.extractLogLevel(line);
          const logEntry = this.processLogEntry(line, level);
          onLogEntry(logEntry);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Format clean logs for different outputs
   */
  formatForOutput(entry: LogEntry, format: 'json' | 'text' | 'structured' = 'text'): string {
    switch (format) {
      case 'json':
        return JSON.stringify({
          timestamp: entry.timestamp,
          level: entry.level,
          message: entry.message,
          ...entry.metadata
        });
        
      case 'structured':
        const metaStr = entry.metadata 
          ? ` ${Object.entries(entry.metadata).map(([k, v]) => `${k}=${v}`).join(' ')}`
          : '';
        return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${metaStr}`;
        
      case 'text':
      default:
        return `${entry.message}`;
    }
  }

  /**
   * Get statistics about ANSI cleaning performance
   */
  getBenchmarkStats(messages: string[]): {
    totalMessages: number;
    messagesWithAnsi: number;
    totalBytesReduced: number;
    averageCompressionRatio: number;
    processingTimeMs: number;
  } {
    const startTime = performance.now();
    
    let messagesWithAnsi = 0;
    let totalBytesReduced = 0;
    
    const results = messages.map(message => {
      const processed = this.cleanLogMessage(message);
      if (processed.hasAnsi) {
        messagesWithAnsi++;
        totalBytesReduced += processed.savedBytes;
      }
      return processed;
    });
    
    const processingTime = performance.now() - startTime;
    const totalOriginalBytes = results.reduce((sum, r) => sum + r.originalLength, 0);
    
    return {
      totalMessages: messages.length,
      messagesWithAnsi,
      totalBytesReduced,
      averageCompressionRatio: totalOriginalBytes > 0 
        ? totalBytesReduced / totalOriginalBytes 
        : 0,
      processingTimeMs: processingTime
    };
  }

  /**
   * Clean logs from various common sources
   */
  cleanSourceLogs(source: 'docker' | 'systemd' | 'pm2' | 'generic', logs: string[]): ProcessedLog[] {
    // Could add source-specific parsing logic here
    return this.batchCleanLogs(logs);
  }

  /**
   * Prepare logs for database storage (clean + compress)
   */
  prepareForDatabase(logEntry: LogEntry): {
    message: string;
    hasAnsi: boolean;
    bytesReduced: number;
    originalMessage?: string;
  } {
    const processed = this.cleanLogMessage(logEntry.message);
    
    return {
      message: processed.clean,
      hasAnsi: processed.hasAnsi,
      bytesReduced: processed.savedBytes,
      originalMessage: processed.hasAnsi ? logEntry.rawMessage : undefined
    };
  }

  /**
   * Health check for the log processor
   */
  healthCheck(): {
    available: boolean;
    performance: {
      stripAnsiAvailable: boolean;
      sampleProcessingTime: number;
    };
  } {
    try {
      const testMessage = '\x1b[31mError:\x1b[0m Something went wrong';
      const startTime = performance.now();
      const cleaned = stripANSI(testMessage);
      const processingTime = performance.now() - startTime;
      
      return {
        available: true,
        performance: {
          stripAnsiAvailable: cleaned === 'Error: Something went wrong',
          sampleProcessingTime: processingTime
        }
      };
    } catch (error) {
      return {
        available: false,
        performance: {
          stripAnsiAvailable: false,
          sampleProcessingTime: 0
        }
      };
    }
  }
}

// Singleton instance
export const bunLogProcessor = BunLogProcessor.getInstance();

// Convenience functions
export const cleanLogMessage = (message: string) => 
  bunLogProcessor.cleanLogMessage(message);

export const processLogEntry = (rawMessage: string, level?: LogEntry['level'], metadata?: Record<string, any>) => 
  bunLogProcessor.processLogEntry(rawMessage, level, metadata);

export const batchCleanLogs = (messages: string[]) => 
  bunLogProcessor.batchCleanLogs(messages);

export const prepareForStorage = (terminalOutput: string) => 
  bunLogProcessor.prepareForStorage(terminalOutput);

// Direct access to Bun's stripANSI for simple use cases
export { stripANSI } from 'bun';

export default bunLogProcessor;