/**
 * Notification API (TypeScript/Bun)
 * High-performance equivalent of notification_api.py
 * Handles real-time notifications, preferences, and delivery
 */

interface NotificationData {
  id: string;
  user_id: string;
  user_type: 'customer' | 'admin';
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  created_at: string;
  read_at?: string;
  delivered_at?: string;
  expires_at?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'expired';
}

enum NotificationType {
  TRANSACTION = 'transaction',
  BALANCE_ALERT = 'balance_alert',
  SECURITY_ALERT = 'security_alert',
  SYSTEM_UPDATE = 'system_update',
  PROMOTION = 'promotion',
  ACCOUNT_UPDATE = 'account_update',
  WITHDRAWAL_STATUS = 'withdrawal_status',
  DEPOSIT_CONFIRMATION = 'deposit_confirmation',
}

enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

enum NotificationChannel {
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
  SMS = 'sms',
}

interface NotificationPreferences {
  user_id: string;
  channels: {
    [key in NotificationChannel]: boolean;
  };
  types: {
    [key in NotificationType]: {
      enabled: boolean;
      channels: NotificationChannel[];
      quiet_hours?: {
        start: string; // HH:mm format
        end: string; // HH:mm format
        timezone: string;
      };
    };
  };
  language: string;
  updated_at: string;
}

interface NotificationTemplate {
  id: string;
  type: NotificationType;
  language: string;
  title_template: string;
  message_template: string;
  variables: string[];
}

class NotificationAPI {
  private notifications: Map<string, NotificationData[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private deliveryQueue: NotificationData[] = [];

  constructor() {
    this.initializeTemplates();
    this.startDeliveryProcessor();
  }

  private getCurrentUser(
    req: Request
  ): { user_id: string; user_type: 'customer' | 'admin' } | null {
    // Check headers for API access
    const userId =
      req.headers.get('X-User-ID') || req.headers.get('X-Customer-ID');
    const adminId = req.headers.get('X-Admin-ID');
    const userType =
      (req.headers.get('X-User-Type') as 'customer' | 'admin') || 'customer';

    if (adminId) {
      return { user_id: adminId, user_type: 'admin' };
    }

    if (userId) {
      return { user_id: userId, user_type: userType };
    }

    return null;
  }

  private initializeTemplates() {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'transaction_complete',
        type: NotificationType.TRANSACTION,
        language: 'en',
        title_template: 'Transaction Completed',
        message_template:
          'Your {{transaction_type}} of ${{amount}} has been completed successfully.',
        variables: ['transaction_type', 'amount'],
      },
      {
        id: 'low_balance_alert',
        type: NotificationType.BALANCE_ALERT,
        language: 'en',
        title_template: 'Low Balance Alert',
        message_template:
          'Your account balance is ${{balance}}, which is below your threshold of ${{threshold}}.',
        variables: ['balance', 'threshold'],
      },
      {
        id: 'security_login_alert',
        type: NotificationType.SECURITY_ALERT,
        language: 'en',
        title_template: 'New Login Detected',
        message_template:
          "A new login was detected from {{location}} at {{timestamp}}. If this wasn't you, please secure your account.",
        variables: ['location', 'timestamp'],
      },
      {
        id: 'withdrawal_pending',
        type: NotificationType.WITHDRAWAL_STATUS,
        language: 'en',
        title_template: 'Withdrawal Request Received',
        message_template:
          'Your withdrawal request for ${{amount}} is being processed. Expected completion: {{eta}}.',
        variables: ['amount', 'eta'],
      },
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(`${template.type}_${template.language}`, template);
    });
  }

  private startDeliveryProcessor() {
    // Process notification delivery queue every 5 seconds
    setInterval(() => {
      this.processDeliveryQueue();
    }, 5000);
  }

  private async processDeliveryQueue() {
    if (this.deliveryQueue.length === 0) return;

    const batchSize = 10;
    const batch = this.deliveryQueue.splice(0, batchSize);

    for (const notification of batch) {
      try {
        await this.deliverNotification(notification);
      } catch (error) {
        console.error(
          `Failed to deliver notification ${notification.id}:`,
          error
        );
        notification.status = 'failed';
      }
    }
  }

  private async deliverNotification(notification: NotificationData) {
    const preferences = this.preferences.get(notification.user_id);

    if (preferences) {
      const typePrefs = preferences.types[notification.type];
      if (!typePrefs?.enabled) {
        notification.status = 'delivered'; // Skip if disabled
        return;
      }
    }

    // Simulate delivery to different channels
    for (const channel of notification.channels) {
      switch (channel) {
        case NotificationChannel.TELEGRAM:
          await this.deliverToTelegram(notification);
          break;
        case NotificationChannel.EMAIL:
          await this.deliverToEmail(notification);
          break;
        case NotificationChannel.PUSH:
          await this.deliverToPush(notification);
          break;
        case NotificationChannel.IN_APP:
          // In-app notifications are stored and delivered when user checks
          break;
      }
    }

    notification.status = 'delivered';
    notification.delivered_at = new Date().toISOString();
  }

  private async deliverToTelegram(notification: NotificationData) {
    // Integration with Telegram bot would happen here
    console.log(
      `📱 Telegram delivery for ${notification.user_id}: ${notification.title}`
    );
  }

  private async deliverToEmail(notification: NotificationData) {
    // Email service integration would happen here
    console.log(
      `📧 Email delivery for ${notification.user_id}: ${notification.title}`
    );
  }

  private async deliverToPush(notification: NotificationData) {
    // Push notification service integration would happen here
    console.log(
      `🔔 Push delivery for ${notification.user_id}: ${notification.title}`
    );
  }

  // API Route Handlers

  async getNotifications(req: Request): Promise<Response> {
    const user = this.getCurrentUser(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '20'),
      100
    );
    const unreadOnly = url.searchParams.get('unread_only') === 'true';
    const type = url.searchParams.get('type') as NotificationType;

    let userNotifications = this.notifications.get(user.user_id) || [];

    // Apply filters
    if (unreadOnly) {
      userNotifications = userNotifications.filter(n => !n.read_at);
    }

    if (type) {
      userNotifications = userNotifications.filter(n => n.type === type);
    }

    // Sort by creation date (newest first)
    userNotifications.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotifications = userNotifications.slice(
      startIndex,
      endIndex
    );

    return Response.json({
      success: true,
      notifications: paginatedNotifications,
      pagination: {
        page,
        limit,
        total: userNotifications.length,
        total_pages: Math.ceil(userNotifications.length / limit),
        unread_count: userNotifications.filter(n => !n.read_at).length,
      },
    });
  }

  async markAsRead(req: Request): Promise<Response> {
    const user = this.getCurrentUser(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const notificationId = url.pathname.split('/').pop();

    if (!notificationId) {
      return Response.json(
        { error: 'Notification ID required' },
        { status: 400 }
      );
    }

    const userNotifications = this.notifications.get(user.user_id) || [];
    const notification = userNotifications.find(n => n.id === notificationId);

    if (!notification) {
      return Response.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (!notification.read_at) {
      notification.read_at = new Date().toISOString();
      notification.status = 'read';
    }

    return Response.json({
      success: true,
      message: 'Notification marked as read',
      notification,
    });
  }

  async markAllAsRead(req: Request): Promise<Response> {
    const user = this.getCurrentUser(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userNotifications = this.notifications.get(user.user_id) || [];
    const readTime = new Date().toISOString();
    let markedCount = 0;

    userNotifications.forEach(notification => {
      if (!notification.read_at) {
        notification.read_at = readTime;
        notification.status = 'read';
        markedCount++;
      }
    });

    return Response.json({
      success: true,
      message: `${markedCount} notifications marked as read`,
      marked_count: markedCount,
    });
  }

  async getPreferences(req: Request): Promise<Response> {
    const user = this.getCurrentUser(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let preferences = this.preferences.get(user.user_id);

    if (!preferences) {
      // Create default preferences
      preferences = this.createDefaultPreferences(user.user_id);
      this.preferences.set(user.user_id, preferences);
    }

    return Response.json({
      success: true,
      preferences,
    });
  }

  async updatePreferences(req: Request): Promise<Response> {
    const user = this.getCurrentUser(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const updates = await req.json();
      let preferences = this.preferences.get(user.user_id);

      if (!preferences) {
        preferences = this.createDefaultPreferences(user.user_id);
      }

      // Update preferences
      if (updates.channels) {
        preferences.channels = { ...preferences.channels, ...updates.channels };
      }

      if (updates.types) {
        Object.keys(updates.types).forEach(type => {
          if (preferences.types[type as NotificationType]) {
            preferences.types[type as NotificationType] = {
              ...preferences.types[type as NotificationType],
              ...updates.types[type],
            };
          }
        });
      }

      if (updates.language) {
        preferences.language = updates.language;
      }

      preferences.updated_at = new Date().toISOString();
      this.preferences.set(user.user_id, preferences);

      return Response.json({
        success: true,
        message: 'Preferences updated successfully',
        preferences,
      });
    } catch (error) {
      return Response.json(
        {
          error: 'Invalid request data',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 400 }
      );
    }
  }

  async sendNotification(req: Request): Promise<Response> {
    // Admin-only endpoint for sending notifications
    const user = this.getCurrentUser(req);
    if (!user || user.user_type !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const {
        recipient_id,
        recipient_type = 'customer',
        type,
        priority = NotificationPriority.MEDIUM,
        title,
        message,
        data,
        channels = [NotificationChannel.IN_APP],
        expires_at,
      } = await req.json();

      if (!recipient_id || !type || !title || !message) {
        return Response.json(
          {
            error:
              'Missing required fields: recipient_id, type, title, message',
          },
          { status: 400 }
        );
      }

      const notification: NotificationData = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: recipient_id,
        user_type: recipient_type,
        type,
        priority,
        title,
        message,
        data,
        channels,
        created_at: new Date().toISOString(),
        expires_at,
        status: 'pending',
      };

      // Add to user's notifications
      const userNotifications = this.notifications.get(recipient_id) || [];
      userNotifications.unshift(notification);
      this.notifications.set(recipient_id, userNotifications);

      // Add to delivery queue
      this.deliveryQueue.push(notification);

      return Response.json({
        success: true,
        message: 'Notification queued for delivery',
        notification_id: notification.id,
      });
    } catch (error) {
      return Response.json(
        {
          error: 'Invalid request data',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 400 }
      );
    }
  }

  // Helper methods

  private createDefaultPreferences(userId: string): NotificationPreferences {
    return {
      user_id: userId,
      channels: {
        [NotificationChannel.TELEGRAM]: true,
        [NotificationChannel.EMAIL]: true,
        [NotificationChannel.PUSH]: true,
        [NotificationChannel.IN_APP]: true,
        [NotificationChannel.SMS]: false,
      },
      types: {
        [NotificationType.TRANSACTION]: {
          enabled: true,
          channels: [NotificationChannel.TELEGRAM, NotificationChannel.IN_APP],
        },
        [NotificationType.BALANCE_ALERT]: {
          enabled: true,
          channels: [NotificationChannel.TELEGRAM, NotificationChannel.EMAIL],
        },
        [NotificationType.SECURITY_ALERT]: {
          enabled: true,
          channels: [
            NotificationChannel.TELEGRAM,
            NotificationChannel.EMAIL,
            NotificationChannel.PUSH,
          ],
        },
        [NotificationType.SYSTEM_UPDATE]: {
          enabled: true,
          channels: [NotificationChannel.IN_APP],
        },
        [NotificationType.PROMOTION]: {
          enabled: false,
          channels: [NotificationChannel.EMAIL],
        },
        [NotificationType.ACCOUNT_UPDATE]: {
          enabled: true,
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        },
        [NotificationType.WITHDRAWAL_STATUS]: {
          enabled: true,
          channels: [NotificationChannel.TELEGRAM, NotificationChannel.EMAIL],
        },
        [NotificationType.DEPOSIT_CONFIRMATION]: {
          enabled: true,
          channels: [NotificationChannel.TELEGRAM, NotificationChannel.IN_APP],
        },
      },
      language: 'en',
      updated_at: new Date().toISOString(),
    };
  }

  // Method to create sample notifications for testing
  createSampleNotifications(userId: string) {
    const sampleNotifications: NotificationData[] = [
      {
        id: `notif_${Date.now()}_001`,
        user_id: userId,
        user_type: 'customer',
        type: NotificationType.DEPOSIT_CONFIRMATION,
        priority: NotificationPriority.HIGH,
        title: 'Deposit Confirmed',
        message:
          'Your deposit of $500 has been confirmed and added to your account.',
        channels: [NotificationChannel.TELEGRAM, NotificationChannel.IN_APP],
        created_at: new Date(Date.now() - 3600000).toISOString(),
        status: 'delivered',
        delivered_at: new Date(Date.now() - 3600000 + 30000).toISOString(),
      },
      {
        id: `notif_${Date.now()}_002`,
        user_id: userId,
        user_type: 'customer',
        type: NotificationType.BALANCE_ALERT,
        priority: NotificationPriority.MEDIUM,
        title: 'Low Balance Alert',
        message:
          'Your account balance is $150, which is below your alert threshold of $200.',
        channels: [NotificationChannel.IN_APP],
        created_at: new Date(Date.now() - 7200000).toISOString(),
        status: 'delivered',
        delivered_at: new Date(Date.now() - 7200000 + 60000).toISOString(),
      },
    ];

    this.notifications.set(userId, sampleNotifications);
  }
}

// Export singleton instance
export const notificationAPI = new NotificationAPI();
export { NotificationType, NotificationPriority, NotificationChannel };
export type { NotificationData, NotificationPreferences };
