/**
 * Notification History Service
 * Persistent storage and retrieval of notification history with stream optimization
 */

import { DatabaseOperations, spawnPythonJSON } from '../utils/spawn-utils';
import { StreamUtils, fetchJSON } from '../utils/stream-helpers';
import type { StreamNotification, NotificationPreferences } from './enhanced_notification_service';

export interface NotificationHistoryEntry {
  id: string;
  notificationId: string;
  userId: string;
  userType: 'admin' | 'customer';
  title: string;
  message: string;
  type: string;
  priority: string;
  channels: string[];
  metadata: Record<string, any>;
  createdAt: string;
  readAt?: string;
  dismissedAt?: string;
  deliveryStatus: 'pending' | 'delivered' | 'failed' | 'expired';
  deliveryLatency?: number;
  streamOptimized: boolean;
  deliveryResults: DeliveryResult[];
}

export interface DeliveryResult {
  channel: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
  latency: number;
  error?: string;
  retryCount: number;
}

export interface NotificationAnalytics {
  totalNotifications: number;
  deliveredNotifications: number;
  readNotifications: number;
  averageReadTime: number;
  averageDeliveryLatency: number;
  channelPerformance: Record<string, {
    delivered: number;
    failed: number;
    averageLatency: number;
  }>;
  typeBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  streamOptimizedPercentage: number;
  timeSeriesData: {
    date: string;
    notifications: number;
    delivered: number;
    averageLatency: number;
  }[];
}

export interface HistoryQueryOptions {
  userId?: string;
  userType?: 'admin' | 'customer';
  type?: string;
  priority?: string;
  deliveryStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  includeRead?: boolean;
  includeMetadata?: boolean;
  streamOptimized?: boolean;
}

export class NotificationHistoryService {
  private cacheMap = new Map<string, NotificationHistoryEntry[]>();
  private analyticsCache: { data: NotificationAnalytics; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;

  constructor() {
    this.initializeDatabase();
    this.startCleanupScheduler();
  }

  /**
   * Initialize database schema for notification history
   */
  private async initializeDatabase() {
    try {
      const result = await DatabaseOperations.initializeNotificationHistory();
      if (result.success) {
        console.log('✅ Notification history database initialized');
      } else {
        console.error('❌ Failed to initialize notification history database:', result.error);
      }
    } catch (error: any) {
      console.error('Database initialization error:', error);
    }
  }

  /**
   * Store notification in history with stream optimization
   */
  async storeNotification(notification: StreamNotification): Promise<boolean> {
    try {
      const historyEntry: NotificationHistoryEntry = {
        id: `hist_${notification.id}`,
        notificationId: notification.id,
        userId: notification.userId,
        userType: notification.userType,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        channels: notification.channels,
        metadata: notification.metadata || {},
        createdAt: notification.timestamp,
        deliveryStatus: 'pending',
        deliveryLatency: notification.deliveryLatency,
        streamOptimized: notification.streamOptimized || false,
        deliveryResults: []
      };

      // Use stream-optimized database operation
      const result = await DatabaseOperations.storeNotificationHistory(historyEntry);
      
      if (result.success) {
        // Update cache
        this.updateCache(historyEntry);
        console.log(`📚 Notification stored in history: ${notification.id}`);
        return true;
      } else {
        console.error('Failed to store notification in history:', result.error);
        return false;
      }
    } catch (error: any) {
      console.error('Error storing notification history:', error);
      return false;
    }
  }

  /**
   * Update notification delivery status with stream optimization
   */
  async updateDeliveryStatus(
    notificationId: string,
    deliveryResults: DeliveryResult[],
    deliveryStatus: 'delivered' | 'failed' | 'expired'
  ): Promise<boolean> {
    try {
      const updateData = {
        notificationId,
        deliveryStatus,
        deliveryResults,
        updatedAt: new Date().toISOString()
      };

      const result = await DatabaseOperations.updateNotificationDeliveryStatus(updateData);
      
      if (result.success) {
        // Update cache
        this.invalidateCacheForNotification(notificationId);
        console.log(`📊 Delivery status updated for ${notificationId}: ${deliveryStatus}`);
        return true;
      } else {
        console.error('Failed to update delivery status:', result.error);
        return false;
      }
    } catch (error: any) {
      console.error('Error updating delivery status:', error);
      return false;
    }
  }

  /**
   * Mark notification as read with stream optimization
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await DatabaseOperations.markNotificationAsRead({
        notificationId,
        userId,
        readAt: new Date().toISOString()
      });

      if (result.success) {
        this.invalidateCacheForNotification(notificationId);
        console.log(`👁️ Notification marked as read: ${notificationId}`);
        return true;
      } else {
        console.error('Failed to mark notification as read:', result.error);
        return false;
      }
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Get notification history with stream-optimized querying
   */
  async getHistory(options: HistoryQueryOptions = {}): Promise<{
    notifications: NotificationHistoryEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(options);
      const cached = this.cacheMap.get(cacheKey);
      
      if (cached && this.isCacheValid(cacheKey)) {
        return {
          notifications: cached,
          total: cached.length,
          hasMore: false // Cache doesn't track this accurately
        };
      }

      // Query database with stream optimization
      const result = await DatabaseOperations.getNotificationHistory(options);
      
      if (result.success && result.data) {
        const notifications = result.data.notifications || [];
        const total = result.data.total || notifications.length;
        const hasMore = result.data.hasMore || false;

        // Update cache
        if (notifications.length <= this.MAX_CACHE_SIZE) {
          this.cacheMap.set(cacheKey, notifications);
        }

        console.log(`📖 Retrieved ${notifications.length}/${total} history entries (${result.duration?.toFixed(2)}ms)`);
        
        return { notifications, total, hasMore };
      } else {
        console.error('Failed to get notification history:', result.error);
        return { notifications: [], total: 0, hasMore: false };
      }
    } catch (error: any) {
      console.error('Error getting notification history:', error);
      return { notifications: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get notification analytics with stream optimization
   */
  async getAnalytics(
    userId?: string, 
    userType?: 'admin' | 'customer',
    dateFrom?: string,
    dateTo?: string
  ): Promise<NotificationAnalytics | null> {
    try {
      // Check cache
      const cacheKey = `analytics_${userId || 'all'}_${userType || 'all'}_${dateFrom || ''}_${dateTo || ''}`;
      
      if (this.analyticsCache && Date.now() - this.analyticsCache.timestamp < this.CACHE_TTL) {
        return this.analyticsCache.data;
      }

      // Query analytics with stream optimization
      const result = await DatabaseOperations.getNotificationAnalytics({
        userId,
        userType,
        dateFrom,
        dateTo
      });

      if (result.success && result.data) {
        const analytics = result.data as NotificationAnalytics;
        
        // Cache the result
        this.analyticsCache = {
          data: analytics,
          timestamp: Date.now()
        };

        console.log(`📊 Analytics retrieved (${result.duration?.toFixed(2)}ms):`, {
          total: analytics.totalNotifications,
          delivered: analytics.deliveredNotifications,
          readRate: `${((analytics.readNotifications / analytics.totalNotifications) * 100).toFixed(1)}%`,
          streamOptimized: `${analytics.streamOptimizedPercentage.toFixed(1)}%`
        });

        return analytics;
      } else {
        console.error('Failed to get analytics:', result.error);
        return null;
      }
    } catch (error: any) {
      console.error('Error getting analytics:', error);
      return null;
    }
  }

  /**
   * Export notification history with stream optimization
   */
  async exportHistory(
    options: HistoryQueryOptions & { format: 'json' | 'csv' | 'xlsx' }
  ): Promise<{ success: boolean; data?: string | Buffer; filename?: string; error?: string }> {
    try {
      const { format, ...queryOptions } = options;
      
      // Get history data
      const historyResult = await this.getHistory(queryOptions);
      
      if (historyResult.notifications.length === 0) {
        return {
          success: false,
          error: 'No notifications found for the specified criteria'
        };
      }

      // Use stream optimization for export processing
      const exportData = {
        notifications: historyResult.notifications,
        format,
        timestamp: new Date().toISOString(),
        totalRecords: historyResult.total
      };

      const result = await spawnPythonJSON('./src/services/notification_export.py', [
        JSON.stringify(exportData)
      ]);

      if (result.success && result.data) {
        const filename = `notifications_export_${Date.now()}.${format}`;
        
        console.log(`📤 History exported: ${historyResult.notifications.length} records (${result.duration?.toFixed(2)}ms)`);
        
        return {
          success: true,
          data: result.data.exportData,
          filename,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Export failed'
        };
      }
    } catch (error: any) {
      console.error('Error exporting history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up old notifications based on retention policy
   */
  async cleanupOldNotifications(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
      
      const result = await DatabaseOperations.cleanupOldNotifications({
        cutoffDate,
        retentionDays
      });

      if (result.success) {
        const cleaned = result.data?.cleaned || 0;
        
        // Clear relevant caches
        this.clearCache();
        this.analyticsCache = null;
        
        console.log(`🧹 Cleaned up ${cleaned} old notifications (older than ${retentionDays} days)`);
        return cleaned;
      } else {
        console.error('Failed to cleanup old notifications:', result.error);
        return 0;
      }
    } catch (error: any) {
      console.error('Error cleaning up old notifications:', error);
      return 0;
    }
  }

  /**
   * Get notification delivery statistics
   */
  async getDeliveryStatistics(dateFrom?: string, dateTo?: string): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageLatency: number;
    channelStats: Record<string, {
      total: number;
      successful: number;
      averageLatency: number;
    }>;
    streamOptimizedStats: {
      total: number;
      percentage: number;
      averageLatency: number;
    };
  } | null> {
    try {
      const result = await DatabaseOperations.getDeliveryStatistics({
        dateFrom,
        dateTo
      });

      if (result.success && result.data) {
        console.log(`📈 Delivery statistics retrieved (${result.duration?.toFixed(2)}ms)`);
        return result.data;
      } else {
        console.error('Failed to get delivery statistics:', result.error);
        return null;
      }
    } catch (error: any) {
      console.error('Error getting delivery statistics:', error);
      return null;
    }
  }

  /**
   * Search notifications with full-text search
   */
  async searchNotifications(
    query: string,
    options: HistoryQueryOptions = {}
  ): Promise<NotificationHistoryEntry[]> {
    try {
      const searchOptions = {
        ...options,
        query,
        searchFields: ['title', 'message', 'metadata']
      };

      const result = await DatabaseOperations.searchNotifications(searchOptions);

      if (result.success && result.data) {
        console.log(`🔍 Search completed: ${result.data.length} results for "${query}" (${result.duration?.toFixed(2)}ms)`);
        return result.data;
      } else {
        console.error('Failed to search notifications:', result.error);
        return [];
      }
    } catch (error: any) {
      console.error('Error searching notifications:', error);
      return [];
    }
  }

  /**
   * Generate cache key for options
   */
  private generateCacheKey(options: HistoryQueryOptions): string {
    return `history_${JSON.stringify(options)}`;
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(cacheKey: string): boolean {
    // Simple time-based cache validation
    return true; // Could implement more sophisticated cache validation
  }

  /**
   * Update cache with new entry
   */
  private updateCache(entry: NotificationHistoryEntry) {
    // Update relevant cache entries
    for (const [key, entries] of this.cacheMap.entries()) {
      if (this.shouldUpdateCacheEntry(key, entry)) {
        entries.unshift(entry);
        // Limit cache size
        if (entries.length > this.MAX_CACHE_SIZE) {
          entries.pop();
        }
      }
    }
  }

  /**
   * Check if cache entry should be updated with new notification
   */
  private shouldUpdateCacheEntry(cacheKey: string, entry: NotificationHistoryEntry): boolean {
    try {
      const options = JSON.parse(cacheKey.replace('history_', '')) as HistoryQueryOptions;
      
      if (options.userId && options.userId !== entry.userId) return false;
      if (options.userType && options.userType !== entry.userType) return false;
      if (options.type && options.type !== entry.type) return false;
      if (options.priority && options.priority !== entry.priority) return false;
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Invalidate cache for specific notification
   */
  private invalidateCacheForNotification(notificationId: string) {
    for (const [key, entries] of this.cacheMap.entries()) {
      const index = entries.findIndex(entry => entry.notificationId === notificationId);
      if (index !== -1) {
        entries.splice(index, 1);
      }
    }
  }

  /**
   * Clear all cache
   */
  private clearCache() {
    this.cacheMap.clear();
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler() {
    // Clean up old notifications every 6 hours
    setInterval(async () => {
      await this.cleanupOldNotifications();
    }, 6 * 60 * 60 * 1000);

    // Clear cache every hour to prevent memory buildup
    setInterval(() => {
      this.clearCache();
      this.analyticsCache = null;
    }, 60 * 60 * 1000);

    console.log('🔄 Notification history cleanup scheduler started');
  }
}

// Export singleton instance
export const notificationHistoryService = new NotificationHistoryService();