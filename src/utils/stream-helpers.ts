/**
 * Stream Helper Utilities
 * Leverages Bun v1.2.21+ ReadableStream enhancements for cleaner code
 *
 * New features:
 * - ReadableStream.prototype.text()
 * - ReadableStream.prototype.json()
 * - ReadableStream.prototype.bytes()
 * - ReadableStream.prototype.blob()
 */

export interface StreamOptions {
  timeout?: number;
  signal?: AbortSignal;
  maxSize?: number;
}

export interface StreamResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  size?: number;
  duration?: number;
}

/**
 * Safely consume a ReadableStream as JSON with error handling
 */
export async function consumeStreamAsJSON<T = unknown>(
  stream: ReadableStream,
  _options: StreamOptions = {}
): Promise<StreamResult<T>> {
  const startTime = performance.now();

  try {
    // Use Bun's optimized direct consumption
    const data = await stream.json();
    const duration = performance.now() - startTime;

    return {
      success: true,
      data,
      duration,
      size: JSON.stringify(data).length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to parse stream as JSON',
      duration: performance.now() - startTime,
    };
  }
}

/**
 * Safely consume a ReadableStream as text with error handling
 */
export async function consumeStreamAsText(
  stream: ReadableStream,
  _options: StreamOptions = {}
): Promise<StreamResult<string>> {
  const startTime = performance.now();

  try {
    // Use Bun's optimized direct consumption
    const text = await stream.text();
    const duration = performance.now() - startTime;

    return {
      success: true,
      data: text,
      duration,
      size: text.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to read stream as text',
      duration: performance.now() - startTime,
    };
  }
}

/**
 * Safely consume a ReadableStream as bytes with error handling
 */
export async function consumeStreamAsBytes(
  stream: ReadableStream,
  _options: StreamOptions = {}
): Promise<StreamResult<Uint8Array>> {
  const startTime = performance.now();

  try {
    // Use Bun's optimized direct consumption
    const bytes = await stream.bytes();
    const duration = performance.now() - startTime;

    return {
      success: true,
      data: bytes,
      duration,
      size: bytes.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to read stream as bytes',
      duration: performance.now() - startTime,
    };
  }
}

/**
 * Enhanced fetch with direct stream consumption
 * Replaces the pattern: const response = await fetch(); const data = await response.json()
 */
export async function fetchJSON<T = unknown>(
  input: string | URL | Request,
  init?: Record<string, unknown>,
  _options: StreamOptions = {}
): Promise<StreamResult<T>> {
  const startTime = performance.now();

  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        duration: performance.now() - startTime,
      };
    }

    // Direct stream consumption without Response wrapper
    const data = await response.body?.json();
    const duration = performance.now() - startTime;

    return {
      success: true,
      data,
      duration,
      size: response.headers.get('content-length')
        ? parseInt(response.headers.get('content-length')!)
        : undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Fetch operation failed',
      duration: performance.now() - startTime,
    };
  }
}

/**
 * Enhanced fetch for text content
 */
export async function fetchText(
  input: string | URL | Request,
  init?: Record<string, unknown>,
  _options: StreamOptions = {}
): Promise<StreamResult<string>> {
  const startTime = performance.now();

  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        duration: performance.now() - startTime,
      };
    }

    // Direct stream consumption
    const text = await response.body?.text();
    const duration = performance.now() - startTime;

    return {
      success: true,
      data: text || '',
      duration,
      size: text?.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Fetch operation failed',
      duration: performance.now() - startTime,
    };
  }
}

/**
 * Stream utilities for common operations
 */
export class StreamUtils {
  /**
   * Convert a string to a ReadableStream
   */
  static fromString(text: string): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    });
  }

  /**
   * Convert JSON object to a ReadableStream
   */
  static fromJSON(obj: any): ReadableStream<Uint8Array> {
    const json = JSON.stringify(obj);
    return StreamUtils.fromString(json);
  }

  /**
   * Measure stream consumption performance
   */
  static async measureConsumption<T>(
    streamConsumer: () => Promise<T>,
    label = 'Stream Operation'
  ): Promise<{ result: T; duration: number; label: string }> {
    const start = performance.now();
    const result = await streamConsumer();
    const duration = performance.now() - start;

    console.log(`[StreamUtils] ${label}: ${duration.toFixed(2)}ms`);

    return { result, duration, label };
  }
}

/**
 * Performance comparison utilities
 */
export class StreamBenchmark {
  private results: Array<{ method: string; duration: number; size?: number }> =
    [];

  /**
   * Compare old vs new stream consumption methods
   */
  async compareStreamMethods(
    stream1: ReadableStream,
    stream2: ReadableStream,
    _testData: unknown
  ) {
    // Old method (using Response wrapper)
    const oldStart = performance.now();
    try {
      const oldResponse = new Response(stream1);
      const oldData = await oldResponse.json();
      const oldDuration = performance.now() - oldStart;

      this.results.push({
        method: 'Response wrapper',
        duration: oldDuration,
        size: JSON.stringify(oldData).length,
      });
    } catch (error) {
      console.error('Old method failed:', error);
    }

    // New method (direct consumption)
    const newStart = performance.now();
    try {
      const newData = await stream2.json();
      const newDuration = performance.now() - newStart;

      this.results.push({
        method: 'Direct consumption',
        duration: newDuration,
        size: JSON.stringify(newData).length,
      });
    } catch (error) {
      console.error('New method failed:', error);
    }

    return this.results;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    if (this.results.length < 2) return null;

    const old = this.results[0];
    const current = this.results[1];

    if (!old || !current) return null;

    const improvement =
      ((old.duration - current.duration) / old.duration) * 100;

    return {
      oldMethod: old,
      newMethod: current,
      improvementPercent: improvement.toFixed(2),
      summary:
        improvement > 0
          ? `New method is ${improvement.toFixed(2)}% faster`
          : `Old method was ${Math.abs(improvement).toFixed(2)}% faster`,
    };
  }

  /**
   * Clear results
   */
  reset() {
    this.results = [];
  }
}

export default {
  consumeStreamAsJSON,
  consumeStreamAsText,
  consumeStreamAsBytes,
  fetchJSON,
  fetchText,
  StreamUtils,
  StreamBenchmark,
};
