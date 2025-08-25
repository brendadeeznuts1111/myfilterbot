/**
 * Session Manager for Bun with Native Redis Support
 * Uses Bun's built-in Redis client for high-performance session management
 */

import { redis, RedisClient } from "bun";
// Use Bun native crypto for better performance (avoids Node.js polyfill)

// Session data interface
interface UserSession {
  sessionId: string;
  telegramId: number;
  customerId: string;
  username: string;
  loginTime: string;
  lastActivity: string;
  ipAddress?: string;
  deviceInfo?: string;
  isActive: boolean;
  isAdmin: boolean;
  permissions: Record<string, boolean>;
  metadata: Record<string, any>;
}

// Chat info interface  
interface ChatInfo {
  chatId: number;
  chatType: string;
  title?: string;
  username?: string;
  shortlink: string;
  telegramUrl?: string;
  firstSeen: string;
  lastActivity: string;
  memberCount?: number;
  isActive: boolean;
  isAdmin: boolean;
  permissions: Record<string, boolean>;
  metadata: Record<string, any>;
}

export class SessionManager {
  private client: RedisClient;
  private sessionTimeout = 86400; // 24 hours
  private rememberMeTimeout = 2592000; // 30 days
  private jwtSecret: string;

  constructor(redisUrl?: string) {
    // Use Bun's native Redis client
    // Use Bun.env for optimal performance (native to Bun runtime)
    this.client = new RedisClient(redisUrl || Bun.env.REDIS_URL || "redis://localhost:6379", {
      connectionTimeout: 5000,
      idleTimeout: 30000,
      autoReconnect: true,
      maxRetries: 10,
      enableAutoPipelining: true,
    });

    // Use Bun native crypto for better performance
    this.jwtSecret = Bun.env.JWT_SECRET || this.generateSecretKey();
    
    // Set up connection handlers
    this.client.onconnect = () => {
      console.log("✅ Redis connected for session management");
    };

    this.client.onclose = (error) => {
      console.error("❌ Redis disconnected:", error);
    };
  }

  // Bun Native Crypto Helper Methods
  private generateSecretKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private generateSessionId(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array)).replace(/[+/=]/g, '');
  }

  private generateShortId(): string {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private async createHMAC(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return btoa(String.fromCharCode.apply(null, new Uint8Array(signature))).replace(/[+/=]/g, '');
  }

  async createSession(
    telegramId: number,
    customerId: string,
    username: string,
    rememberMe = false
  ): Promise<{
    success: boolean;
    sessionId?: string;
    sessionToken?: string;
    dashboardToken?: string;
    dashboardUrl?: string;
    expiresIn?: number;
    error?: string;
  }> {
    try {
      // Generate unique session ID
      // Use Bun native crypto for secure session ID generation
      const sessionId = this.generateSessionId();
      const now = new Date().toISOString();
      
      // Create session object
      const session: UserSession = {
        sessionId,
        telegramId,
        customerId,
        username,
        loginTime: now,
        lastActivity: now,
        isActive: true,
        isAdmin: false,
        permissions: await this.getUserPermissions(customerId),
        metadata: { source: 'telegram_bot' }
      };

      // Set timeout based on rememberMe
      const timeout = rememberMe ? this.rememberMeTimeout : this.sessionTimeout;
      
      // Store session in Redis using Bun's native client
      const sessionKey = `session:${sessionId}`;
      await this.client.set(sessionKey, JSON.stringify(session));
      await this.client.expire(sessionKey, timeout);
      
      // Also store user->session mapping
      const userKey = `user_session:${telegramId}`;
      await this.client.set(userKey, sessionId);
      await this.client.expire(userKey, timeout);
      
      // Generate JWT token for dashboard
      const dashboardToken = await this.generateDashboardToken(session);
      const dashboardUrl = `https://fantasy402.com/manager/dashboard?auth=${dashboardToken}`;
      
      return {
        success: true,
        sessionId,
        sessionToken: sessionId,
        dashboardToken,
        dashboardUrl,
        expiresIn: timeout,
      };
    } catch (error) {
      console.error("Error creating session:", error);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  async getSession(sessionId?: string, telegramId?: number): Promise<UserSession | null> {
    try {
      let key: string;
      
      if (sessionId) {
        key = `session:${sessionId}`;
      } else if (telegramId) {
        // Get session ID for user
        const userKey = `user_session:${telegramId}`;
        const storedSessionId = await this.client.get(userKey);
        if (!storedSessionId) return null;
        key = `session:${storedSessionId}`;
      } else {
        return null;
      }
      
      const sessionData = await this.client.get(key);
      if (!sessionData) return null;
      
      return JSON.parse(sessionData) as UserSession;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  async updateActivity(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;
      
      session.lastActivity = new Date().toISOString();
      
      const key = `session:${sessionId}`;
      await this.client.set(key, JSON.stringify(session));
      await this.client.expire(key, this.sessionTimeout);
      
      return true;
    } catch (error) {
      console.error("Error updating activity:", error);
      return false;
    }
  }

  async destroySession(sessionId?: string, telegramId?: number): Promise<boolean> {
    try {
      if (telegramId && !sessionId) {
        const session = await this.getSession(undefined, telegramId);
        if (session) sessionId = session.sessionId;
      }
      
      if (!sessionId) return false;
      
      // Delete session
      await this.client.del(`session:${sessionId}`);
      
      // Delete user mapping if we have telegramId
      if (telegramId) {
        await this.client.del(`user_session:${telegramId}`);
      }
      
      return true;
    } catch (error) {
      console.error("Error destroying session:", error);
      return false;
    }
  }

  private async generateDashboardToken(session: UserSession): Promise<string> {
    // Simple JWT-like token (in production, use proper JWT library)
    const payload = {
      sessionId: session.sessionId,
      customerId: session.customerId,
      telegramId: session.telegramId,
      username: session.username,
      permissions: session.permissions,
      exp: Date.now() + this.sessionTimeout * 1000,
      iat: Date.now()
    };
    
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    // Use Bun native crypto for JWT signing
    const signature = await this.createHMAC(encoded + this.jwtSecret);
    
    return `${encoded}.${signature}`;
  }

  private async getUserPermissions(customerId: string): Promise<Record<string, boolean>> {
    // In production, fetch from database
    return {
      can_view_balance: true,
      can_trade: true,
      can_withdraw: false,
      can_view_history: true,
      is_admin: false
    };
  }

  async close() {
    this.client.close();
  }
}

export class ChatTracker {
  private client: RedisClient;
  private baseShortlinkUrl = "t.me/fantdev_bot";

  constructor(redisUrl?: string) {
    this.client = new RedisClient(redisUrl || process.env.REDIS_URL || "redis://localhost:6379");
  }

  async registerChat(
    chatId: number,
    chatType: string,
    title?: string,
    username?: string,
    memberCount?: number,
    isAdmin = false
  ): Promise<ChatInfo | null> {
    try {
      const chatKey = `chat:${chatId}`;
      
      // Check if chat exists
      const existing = await this.client.get(chatKey);
      if (existing) {
        return await this.updateChatActivity(chatId, title, memberCount);
      }
      
      // Generate shortlink
      const shortlink = await this.generateShortlink(chatId, title || String(chatId));
      
      // Generate Telegram URL
      let telegramUrl: string | undefined;
      if (username) {
        telegramUrl = `https://t.me/${username}`;
      } else if (chatType === 'private') {
        telegramUrl = `tg://user?id=${Math.abs(chatId)}`;
      }
      
      const now = new Date().toISOString();
      
      // Create chat info
      const chatInfo: ChatInfo = {
        chatId,
        chatType,
        title: title || `${chatType} Chat`,
        username,
        shortlink,
        telegramUrl,
        firstSeen: now,
        lastActivity: now,
        memberCount,
        isActive: true,
        isAdmin,
        permissions: this.getDefaultPermissions(chatType, isAdmin),
        metadata: {
          bot_added: now,
          source: 'auto_discovery'
        }
      };
      
      // Store in Redis
      await this.client.set(chatKey, JSON.stringify(chatInfo));
      
      // Store shortlink mapping
      await this.client.set(`shortlink:${shortlink}`, String(chatId));
      
      // Add to active chats set
      await this.client.sadd("active_chats", String(chatId));
      
      console.log(`✅ Registered chat ${chatId} (${chatType}) with shortlink: ${shortlink}`);
      return chatInfo;
      
    } catch (error) {
      console.error(`Error registering chat ${chatId}:`, error);
      return null;
    }
  }

  async updateChatActivity(
    chatId: number,
    title?: string,
    memberCount?: number
  ): Promise<ChatInfo | null> {
    try {
      const chatKey = `chat:${chatId}`;
      const chatData = await this.client.get(chatKey);
      
      if (!chatData) return null;
      
      const chatInfo = JSON.parse(chatData) as ChatInfo;
      chatInfo.lastActivity = new Date().toISOString();
      
      if (title) chatInfo.title = title;
      if (memberCount) chatInfo.memberCount = memberCount;
      
      await this.client.set(chatKey, JSON.stringify(chatInfo));
      
      return chatInfo;
    } catch (error) {
      console.error(`Error updating chat activity ${chatId}:`, error);
      return null;
    }
  }

  async getChat(chatId: number): Promise<ChatInfo | null> {
    try {
      const chatData = await this.client.get(`chat:${chatId}`);
      if (!chatData) return null;
      return JSON.parse(chatData) as ChatInfo;
    } catch (error) {
      console.error(`Error getting chat ${chatId}:`, error);
      return null;
    }
  }

  async getChatByShortlink(shortlink: string): Promise<ChatInfo | null> {
    try {
      const chatId = await this.client.get(`shortlink:${shortlink}`);
      if (!chatId) return null;
      return await this.getChat(Number(chatId));
    } catch (error) {
      console.error(`Error getting chat by shortlink ${shortlink}:`, error);
      return null;
    }
  }

  async getAllChats(activeOnly = true): Promise<ChatInfo[]> {
    try {
      const chatIds = await this.client.smembers("active_chats");
      const chats: ChatInfo[] = [];
      
      for (const chatId of chatIds) {
        const chat = await this.getChat(Number(chatId));
        if (chat && (!activeOnly || chat.isActive)) {
          chats.push(chat);
        }
      }
      
      // Sort by last activity
      return chats.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );
    } catch (error) {
      console.error("Error getting all chats:", error);
      return [];
    }
  }

  async logMessage(
    chatId: number,
    messageId: number,
    userId: number,
    username?: string,
    messageText?: string,
    messageType = "text"
  ) {
    try {
      const messageKey = `message:${chatId}:${messageId}`;
      const messageData = {
        chatId,
        messageId,
        userId,
        username,
        messageText: messageText?.substring(0, 500),
        timestamp: new Date().toISOString(),
        messageType
      };
      
      // Store message with TTL of 7 days
      await this.client.set(messageKey, JSON.stringify(messageData));
      await this.client.expire(messageKey, 604800); // 7 days
      
      // Update chat activity
      await this.updateChatActivity(chatId);
      
      // Track in daily message count
      const dayKey = `messages:${new Date().toISOString().split('T')[0]}`;
      await this.client.hincrby(dayKey, String(chatId), 1);
      
    } catch (error) {
      console.error("Error logging message:", error);
    }
  }

  async getChatStatistics(): Promise<Record<string, any>> {
    try {
      const chatIds = await this.client.smembers("active_chats");
      const chats = await this.getAllChats();
      
      // Get message counts for today
      const today = new Date().toISOString().split('T')[0];
      const todayMessages = await this.client.hgetall(`messages:${today}`);
      
      const chatsByType: Record<string, number> = {};
      let adminChats = 0;
      
      for (const chat of chats) {
        chatsByType[chat.chatType] = (chatsByType[chat.chatType] || 0) + 1;
        if (chat.isAdmin) adminChats++;
      }
      
      return {
        total_chats: chatIds.length,
        active_chats: chats.filter(c => c.isActive).length,
        chats_by_type: chatsByType,
        admin_chats: adminChats,
        todays_messages: Object.values(todayMessages || {}).reduce((a: number, b: any) => a + Number(b), 0),
        active_chats_today: Object.keys(todayMessages || {}).length
      };
    } catch (error) {
      console.error("Error getting chat statistics:", error);
      return {};
    }
  }

  private async generateShortlink(chatId: number, title: string): Promise<string> {
    const base = title.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
    let shortlink = `${base}_${Math.abs(chatId) % 1000}`;
    
    // Check if exists
    const exists = await this.client.exists(`shortlink:${shortlink}`);
    if (exists) {
      // Use Bun native crypto for shortlink generation
      shortlink = `chat_${this.generateShortId()}`;
    }
    
    return shortlink;
  }

  private getDefaultPermissions(chatType: string, isAdmin: boolean): Record<string, boolean> {
    const base = {
      can_send_messages: true,
      can_read_messages: true,
      can_send_alerts: false,
      can_manage_members: false,
      can_view_analytics: false
    };
    
    if (chatType === 'private') {
      base.can_send_alerts = true;
      base.can_view_analytics = true;
    } else if (isAdmin) {
      base.can_send_alerts = true;
      base.can_manage_members = true;
    }
    
    return base;
  }

  async close() {
    this.client.close();
  }
}

// Export singleton instances
export const sessionManager = new SessionManager();
export const chatTracker = new ChatTracker();