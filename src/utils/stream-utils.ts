/**
 * Stream Utilities leveraging Bun v1.2.18 ReadableStream improvements
 * New methods: text(), json(), bytes(), blob()
 */

export class StreamProcessor {
  /**
   * Process stream as text using new text() method
   * More efficient than manual conversion
   */
  static async streamToText(stream: ReadableStream): Promise<string> {
    // Bun v1.2.18: Direct text() method on ReadableStream
    return await stream.text();
  }

  /**
   * Process stream as JSON using new json() method
   * Automatically parses JSON from stream
   */
  static async streamToJSON<T = any>(stream: ReadableStream): Promise<T> {
    // Bun v1.2.18: Direct json() method on ReadableStream
    return await stream.json();
  }

  /**
   * Process stream as Uint8Array using new bytes() method
   * Efficient binary data handling
   */
  static async streamToBytes(stream: ReadableStream): Promise<Uint8Array> {
    // Bun v1.2.18: Direct bytes() method on ReadableStream
    return await stream.bytes();
  }

  /**
   * Process stream as Blob using new blob() method
   * Useful for file operations
   */
  static async streamToBlob(stream: ReadableStream): Promise<Blob> {
    // Bun v1.2.18: Direct blob() method on ReadableStream
    return await stream.blob();
  }

  /**
   * Create a stream from various data types
   */
  static createStream(data: string | object | Uint8Array): ReadableStream {
    if (typeof data === 'string') {
      return new Response(data).body!;
    } else if (data instanceof Uint8Array) {
      return new Response(data).body!;
    } else {
      return new Response(JSON.stringify(data)).body!;
    }
  }

  /**
   * Transform stream with automatic type detection
   */
  static async transformStream<T>(
    stream: ReadableStream,
    transformer: (data: T) => T
  ): Promise<ReadableStream> {
    try {
      // Try to parse as JSON first
      const data = (await stream.json()) as T;
      const transformed = transformer(data);
      return this.createStream(transformed);
    } catch {
      // Fall back to text processing
      const text = await stream.text();
      const transformed = transformer(text as any);
      return this.createStream(transformed);
    }
  }
}

/**
 * Example: Efficient API response processing
 */
export class APIStreamProcessor {
  /**
   * Fetch and process JSON response efficiently
   */
  static async fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Use new json() method directly on response body
    return await response.body!.json();
  }

  /**
   * Fetch and process text response efficiently
   */
  static async fetchText(url: string, options?: RequestInit): Promise<string> {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Use new text() method directly on response body
    return await response.body!.text();
  }

  /**
   * Stream large file downloads efficiently
   */
  static async downloadFile(url: string): Promise<Blob> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Use new blob() method for efficient file handling
    return await response.body!.blob();
  }

  /**
   * Process streaming API responses
   */
  static async *streamingAPI<T>(url: string): AsyncGenerator<T> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            yield JSON.parse(line) as T;
          } catch (e) {
            console.warn('Failed to parse streaming line:', line);
          }
        }
      }
    }

    // Process any remaining data
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer) as T;
      } catch (e) {
        console.warn('Failed to parse final buffer:', buffer);
      }
    }
  }
}

/**
 * Example: Server-Sent Events (SSE) handler using streams
 */
export class SSEHandler {
  private controller: ReadableStreamDefaultController | null = null;
  private encoder = new TextEncoder();

  createSSEStream(): ReadableStream {
    return new ReadableStream({
      start: controller => {
        this.controller = controller;
        // Send initial connection message
        this.sendEvent('connected', { timestamp: Date.now() });
      },
      cancel: () => {
        this.controller = null;
      },
    });
  }

  sendEvent(event: string, data: any) {
    if (!this.controller) return;

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.controller.enqueue(this.encoder.encode(message));
  }

  close() {
    this.controller?.close();
    this.controller = null;
  }
}

/**
 * Example usage in a route handler
 */
export function createStreamingEndpoint() {
  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Send data every second
        const interval = setInterval(() => {
          const data = {
            timestamp: Date.now(),
            value: Math.random() * 100,
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        }, 1000);

        // Clean up after 10 seconds
        setTimeout(() => {
          clearInterval(interval);
          controller.close();
        }, 10000);
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    }
  );
}
