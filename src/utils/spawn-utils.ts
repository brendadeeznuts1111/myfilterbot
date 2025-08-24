/**
 * Spawn Utilities for System Operations
 * Leverages Bun v1.2.21+ ReadableStream enhancements with Bun.spawn()
 * 
 * Direct stream consumption without Response wrapper:
 * - stdout.json() instead of new Response(stdout).json()
 * - stdout.text() instead of Bun.readableStreamToText(stdout)
 */

import { StreamResult } from './stream-helpers';

export interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  stdin?: ReadableStream | string;
  maxOutputSize?: number;
}

export interface SpawnResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  exitCode?: number;
  duration?: number;
  stdout?: string;
  stderr?: string;
}

/**
 * Execute a Python script and return JSON result
 */
export async function spawnPythonJSON<T = any>(
  scriptPath: string,
  args: string[] = [],
  options: SpawnOptions = {}
): Promise<SpawnResult<T>> {
  const startTime = performance.now();
  
  try {
    const proc = Bun.spawn({
      cmd: ['python3', scriptPath, ...args],
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: options.cwd,
      env: options.env,
      stdin: typeof options.stdin === 'string' ? 
        options.stdin : options.stdin
    });
    
    // Use Bun's optimized direct consumption
    const [stdoutData, stderrData, exitCode] = await Promise.all([
      proc.stdout.json().catch(() => null),
      proc.stderr.text().catch(() => ''),
      proc.exited
    ]);
    
    const duration = performance.now() - startTime;
    
    if (exitCode === 0) {
      return {
        success: true,
        data: stdoutData,
        exitCode,
        duration,
        stderr: stderrData
      };
    } else {
      return {
        success: false,
        error: stderrData || `Process exited with code ${exitCode}`,
        exitCode,
        duration
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Spawn operation failed',
      duration: performance.now() - startTime
    };
  }
}

/**
 * Execute a Python script and return text result
 */
export async function spawnPythonText(
  scriptPath: string,
  args: string[] = [],
  options: SpawnOptions = {}
): Promise<SpawnResult<string>> {
  const startTime = performance.now();
  
  try {
    const proc = Bun.spawn({
      cmd: ['python3', scriptPath, ...args],
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: options.cwd,
      env: options.env
    });
    
    // Direct stream consumption
    const [stdout, stderr, exitCode] = await Promise.all([
      proc.stdout.text(),
      proc.stderr.text(),
      proc.exited
    ]);
    
    const duration = performance.now() - startTime;
    
    if (exitCode === 0) {
      return {
        success: true,
        data: stdout,
        exitCode,
        duration,
        stderr
      };
    } else {
      return {
        success: false,
        error: stderr || `Process exited with code ${exitCode}`,
        exitCode,
        duration,
        stdout
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Spawn operation failed',
      duration: performance.now() - startTime
    };
  }
}

/**
 * Health check system operations
 */
export class SystemOperations {
  /**
   * Get system health status
   */
  static async getHealthStatus(): Promise<SpawnResult<any>> {
    return await spawnPythonJSON('./health_check.py', [], {
      timeout: 30000
    });
  }
  
  /**
   * Get all client information
   */
  static async getAllClients(): Promise<SpawnResult<any>> {
    return await spawnPythonJSON('./show_all_clients.py', [], {
      timeout: 15000
    });
  }
  
  /**
   * Generate test customers
   */
  static async generateTestCustomers(count = 100): Promise<SpawnResult<any>> {
    return await spawnPythonJSON('./generate_2000_customers.py', [count.toString()], {
      timeout: 60000
    });
  }
  
  /**
   * Run integration tests
   */
  static async runIntegrationTests(): Promise<SpawnResult<string>> {
    return await spawnPythonText('./test_integration.py', [], {
      timeout: 120000
    });
  }
  
  /**
   * Run error handling tests
   */
  static async runErrorHandlingTests(): Promise<SpawnResult<string>> {
    return await spawnPythonText('./test_error_handling.py', [], {
      timeout: 60000
    });
  }
}

/**
 * Database operations through spawn
 */
export class DatabaseOperations {
  /**
   * Backup database
   */
  static async backupDatabase(): Promise<SpawnResult<any>> {
    return await spawnPythonJSON('./src/database.py', ['--backup'], {
      timeout: 30000
    });
  }
  
  /**
   * Get database statistics
   */
  static async getDatabaseStats(): Promise<SpawnResult<any>> {
    return await spawnPythonJSON('./src/database.py', ['--stats'], {
      timeout: 10000
    });
  }
  
  /**
   * Validate database integrity
   */
  static async validateDatabase(): Promise<SpawnResult<any>> {
    return await spawnPythonJSON('./src/database.py', ['--validate'], {
      timeout: 15000
    });
  }
}

/**
 * Bot operations through spawn
 */
export class BotOperations {
  /**
   * Get bot status
   */
  static async getBotStatus(): Promise<SpawnResult<any>> {
    return await spawnPythonJSON('./src/telegram_dashboard/bot_status.py', [], {
      timeout: 10000
    });
  }
  
  /**
   * Test bot connection
   */
  static async testBotConnection(): Promise<SpawnResult<string>> {
    return await spawnPythonText('./test_telegram_dashboard.py', ['--quick'], {
      timeout: 30000
    });
  }
}

/**
 * General command execution with stream handling
 */
export async function executeCommand<T = string>(
  command: string,
  args: string[] = [],
  options: SpawnOptions & { expectJSON?: boolean } = {}
): Promise<SpawnResult<T>> {
  const startTime = performance.now();
  
  try {
    const proc = Bun.spawn({
      cmd: [command, ...args],
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: options.cwd,
      env: options.env
    });
    
    const [stdout, stderr, exitCode] = await Promise.all([
      options.expectJSON ? 
        proc.stdout.json().catch(() => null) :
        proc.stdout.text(),
      proc.stderr.text(),
      proc.exited
    ]);
    
    const duration = performance.now() - startTime;
    
    if (exitCode === 0) {
      return {
        success: true,
        data: stdout as T,
        exitCode,
        duration,
        stderr
      };
    } else {
      return {
        success: false,
        error: stderr || `Command exited with code ${exitCode}`,
        exitCode,
        duration,
        stdout: typeof stdout === 'string' ? stdout : JSON.stringify(stdout)
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Command execution failed',
      duration: performance.now() - startTime
    };
  }
}

/**
 * Batch operations for multiple commands
 */
export class BatchOperations {
  private operations: Array<() => Promise<SpawnResult<any>>> = [];
  
  /**
   * Add operation to batch
   */
  add(operation: () => Promise<SpawnResult<any>>) {
    this.operations.push(operation);
    return this;
  }
  
  /**
   * Execute all operations in parallel
   */
  async executeParallel(): Promise<SpawnResult<any>[]> {
    const startTime = performance.now();
    const results = await Promise.all(this.operations.map(op => op()));
    const duration = performance.now() - startTime;
    
    console.log(`[BatchOperations] Executed ${this.operations.length} operations in ${duration.toFixed(2)}ms`);
    
    return results;
  }
  
  /**
   * Execute all operations sequentially
   */
  async executeSequential(): Promise<SpawnResult<any>[]> {
    const startTime = performance.now();
    const results: SpawnResult<any>[] = [];
    
    for (const operation of this.operations) {
      const result = await operation();
      results.push(result);
      
      if (!result.success) {
        console.warn('[BatchOperations] Operation failed, continuing:', result.error);
      }
    }
    
    const duration = performance.now() - startTime;
    console.log(`[BatchOperations] Executed ${this.operations.length} operations sequentially in ${duration.toFixed(2)}ms`);
    
    return results;
  }
  
  /**
   * Clear all operations
   */
  clear() {
    this.operations = [];
    return this;
  }
}

export default {
  spawnPythonJSON,
  spawnPythonText,
  executeCommand,
  SystemOperations,
  DatabaseOperations,
  BotOperations,
  BatchOperations
};