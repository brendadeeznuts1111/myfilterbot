/**
 * Optimized Upload Handler
 * Leverages Bun v1.2.18's reduced memory usage for large fetch() and S3 uploads
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { StreamProcessor } from './stream-utils';

export interface UploadOptions {
  chunkSize?: number;
  maxConcurrent?: number;
  compress?: boolean;
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  size: number;
  duration: number;
  error?: string;
}

export class OptimizedUploader {
  private s3Client?: S3Client;
  private metrics = {
    totalUploads: 0,
    totalBytes: 0,
    failedUploads: 0,
    averageSpeed: 0,
  };

  constructor(
    private config?: {
      s3Region?: string;
      s3Bucket?: string;
      apiEndpoint?: string;
    }
  ) {
    if (config?.s3Region) {
      this.initS3Client();
    }
  }

  private initS3Client() {
    this.s3Client = new S3Client({
      region: this.config?.s3Region || 'us-east-1',
      // Use environment credentials
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          }
        : undefined,
    });
  }

  /**
   * Upload large file with optimized memory usage
   * Bun v1.2.18: Reduced memory for large uploads
   */
  async uploadLargeFile(
    file: File | Blob,
    destination: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const startTime = performance.now();
    const fileSize = file.size;

    try {
      // For very large files, use streaming upload
      if (fileSize > 50 * 1024 * 1024) {
        // > 50MB
        return await this.streamingUpload(file, destination, options);
      }

      // For medium files, use standard upload with optimized fetch
      const formData = new FormData();
      formData.append('file', file);
      formData.append('destination', destination);

      const response = await fetch(this.config?.apiEndpoint || '/api/upload', {
        method: 'POST',
        body: formData,
        // Bun v1.2.18: Optimized for large uploads
        duplex: 'half',
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      const duration = performance.now() - startTime;

      // Update metrics
      this.metrics.totalUploads++;
      this.metrics.totalBytes += fileSize;
      this.metrics.averageSpeed = fileSize / (duration / 1000); // bytes/second

      return {
        success: true,
        url: result.url,
        size: fileSize,
        duration,
      };
    } catch (error) {
      this.metrics.failedUploads++;

      return {
        success: false,
        size: fileSize,
        duration: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Streaming upload for very large files
   */
  private async streamingUpload(
    file: File | Blob,
    destination: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    const startTime = performance.now();
    const chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedBytes = 0;

    try {
      // Create multipart upload session
      const sessionResponse = await fetch('/api/upload/multipart/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: destination,
          fileSize: file.size,
          chunkSize,
        }),
      });

      const { uploadId } = await sessionResponse.json();
      const partETags: Array<{ ETag: string; PartNumber: number }> = [];

      // Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const partResponse = await fetch(`/api/upload/multipart/part`, {
          method: 'POST',
          headers: {
            'X-Upload-Id': uploadId,
            'X-Part-Number': String(i + 1),
            'Content-Length': String(chunk.size),
          },
          body: chunk,
          // Optimized for memory usage
          duplex: 'half',
        });

        if (!partResponse.ok) {
          throw new Error(`Failed to upload part ${i + 1}`);
        }

        const { etag } = await partResponse.json();
        partETags.push({ ETag: etag, PartNumber: i + 1 });

        uploadedBytes += chunk.size;
        options.onProgress?.(uploadedBytes / file.size);
      }

      // Complete multipart upload
      const completeResponse = await fetch('/api/upload/multipart/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          parts: partETags,
        }),
      });

      const result = await completeResponse.json();
      const duration = performance.now() - startTime;

      return {
        success: true,
        url: result.url,
        size: file.size,
        duration,
      };
    } catch (error) {
      return {
        success: false,
        size: file.size,
        duration: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload to S3 with optimized memory usage
   */
  async uploadToS3(file: File | Blob, key: string): Promise<UploadResult> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const startTime = performance.now();

    try {
      // Convert file to buffer for S3
      const buffer = await file.arrayBuffer();

      const command = new PutObjectCommand({
        Bucket: this.config?.s3Bucket,
        Key: key,
        Body: new Uint8Array(buffer),
        ContentType: file.type || 'application/octet-stream',
        ContentLength: file.size,
      });

      await this.s3Client.send(command);

      const duration = performance.now() - startTime;
      const url = `https://${this.config?.s3Bucket}.s3.amazonaws.com/${key}`;

      return {
        success: true,
        url,
        size: file.size,
        duration,
      };
    } catch (error) {
      return {
        success: false,
        size: file.size,
        duration: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parallel upload for multiple files
   */
  async uploadMultiple(
    files: Array<File | Blob>,
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    const maxConcurrent = options.maxConcurrent || 3;
    const results: UploadResult[] = [];

    // Process in batches
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      const batchPromises = batch.map((file, index) =>
        this.uploadLargeFile(file, `file_${i + index}_${Date.now()}`, options)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get upload metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate:
        this.metrics.totalUploads > 0
          ? (this.metrics.totalUploads - this.metrics.failedUploads) /
            this.metrics.totalUploads
          : 0,
      averageSpeedMBps: this.metrics.averageSpeed / (1024 * 1024),
    };
  }
}

/**
 * Express/Hono route handler for optimized uploads
 */
export function createUploadHandler() {
  const uploader = new OptimizedUploader({
    apiEndpoint: process.env.UPLOAD_API_ENDPOINT,
  });

  return {
    // Single file upload
    async handleUpload(req: Request): Promise<Response> {
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return Response.json({ error: 'No file provided' }, { status: 400 });
      }

      const result = await uploader.uploadLargeFile(file, file.name);

      if (result.success) {
        return Response.json({
          success: true,
          url: result.url,
          size: result.size,
          uploadTime: result.duration,
        });
      } else {
        return Response.json({ error: result.error }, { status: 500 });
      }
    },

    // Multipart upload initialization
    async initMultipart(req: Request): Promise<Response> {
      const { filename, fileSize, chunkSize } = await req.json();
      const uploadId = crypto.randomUUID();

      // Store upload session (in production, use Redis/DB)
      return Response.json({
        uploadId,
        chunkSize,
        totalChunks: Math.ceil(fileSize / chunkSize),
      });
    },

    // Handle upload metrics
    async getMetrics(): Promise<Response> {
      return Response.json(uploader.getMetrics());
    },
  };
}
