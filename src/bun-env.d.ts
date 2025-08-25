// Type declarations for Bun-specific ReadableStream extensions
declare module "stream/web" {
  interface ReadableStream<R = any> {
    json(): Promise<any>;
    text(): Promise<string>;
    bytes(): Promise<Uint8Array>;
    blob(): Promise<Blob>;
  }
}
