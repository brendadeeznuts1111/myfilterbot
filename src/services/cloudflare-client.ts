import type { ChatInfo, ShortlinkData, APIResponse } from '@shared/types';
import { fetchJSON } from '../utils/stream-helpers';

export class CloudflareWorkerClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(workerUrl: string, apiKey?: string) {
    this.baseUrl = workerUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
    };
  }

  // Chat tracking methods
  async getAllChats(): Promise<ChatInfo[]> {
    try {
      // Use optimized stream consumption
      const result = await fetchJSON<APIResponse<{ chats: ChatInfo[] }>>(
        `${this.baseUrl}/api/chats`,
        { headers: this.headers }
      );
      
      if (!result.success) {
        console.error('Failed to fetch chats:', result.error);
        return [];
      }
      
      return result.data?.data?.chats || [];
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      return [];
    }
  }

  async getChat(chatId: string): Promise<ChatInfo | null> {
    try {
      // Use optimized stream consumption
      const result = await fetchJSON<APIResponse<{ chat: ChatInfo }>>(
        `${this.baseUrl}/api/chat/${chatId}`,
        { headers: this.headers }
      );
      
      if (!result.success) {
        console.error('Failed to fetch chat:', result.error);
        return null;
      }
      
      return result.data?.data?.chat || null;
    } catch (error) {
      console.error('Failed to fetch chat:', error);
      return null;
    }
  }

  async getChatStatistics(): Promise<any> {
    try {
      // Use optimized stream consumption
      const result = await fetchJSON<APIResponse<{ stats: any }>>(
        `${this.baseUrl}/api/stats`,
        { headers: this.headers }
      );
      
      if (!result.success) {
        console.error('Failed to fetch statistics:', result.error);
        return {};
      }
      
      return result.data?.data?.stats || {};
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      return {};
    }
  }

  // Shortlink methods
  async createShortlink(
    url: string, 
    customCode?: string, 
    metadata?: Record<string, any>
  ): Promise<ShortlinkData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/shortlink`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ url, customCode, metadata })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to create shortlink:', error);
        return null;
      }
      
      const data = await response.json() as {
        success: boolean;
        shortCode: string;
        shortUrl: string;
        targetUrl: string;
      };
      
      if (data.success) {
        return {
          shortCode: data.shortCode,
          url: data.targetUrl,
          clicks: 0,
          createdAt: new Date().toISOString(),
          metadata
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to create shortlink:', error);
      return null;
    }
  }

  async getShortlink(shortCode: string): Promise<ShortlinkData | null> {
    try {
      // This would need to be implemented in the worker
      const response = await fetch(`${this.baseUrl}/api/shortlink/${shortCode}`, {
        headers: this.headers
      });
      if (!response.ok) return null;
      const data = await response.json() as APIResponse<ShortlinkData>;
      return data.data || null;
    } catch (error) {
      console.error('Failed to fetch shortlink:', error);
      return null;
    }
  }

  // Webhook management
  async setWebhook(webhookUrl: string, secret: string): Promise<boolean> {
    try {
      // This would call Telegram API to set webhook
      // For now, return true as placeholder
      console.log('Setting webhook:', webhookUrl);
      return true;
    } catch (error) {
      console.error('Failed to set webhook:', error);
      return false;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: this.headers
      });
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance for easy use
export const cloudflareClient = new CloudflareWorkerClient(
  process.env.CLOUDFLARE_WORKER_URL || 'https://telegram-bot-worker.workers.dev'
);