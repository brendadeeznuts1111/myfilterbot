import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useEffect,
  useRef,
  useMemo
} from 'react';
import { useWebSocketSubscription } from '../hooks/useWebSocket';
import { useTheme } from '../hooks/useTheme';

// Enhanced notification types
export type NotificationType = 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'transaction'
  | 'balance_update'
  | 'security_alert'
  | 'system_update'
  | 'trade_signal'
  | 'web_analysis'
  | 'market_alert';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface StreamNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  duration?: number;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, any>;
  streamOptimized?: boolean;
  deliveryLatency?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  persistent?: boolean;
}

interface NotificationPreferences {
  enabled: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  quietHours: { start: string; end: string };
  typePreferences: Record<NotificationType, {
    enabled: boolean;
    priority: NotificationPriority;
    showDesktop: boolean;
    sound: boolean;
  }>;
}

interface NotificationStats {
  totalReceived: number;
  totalRead: number;
  averageDisplayTime: number;
  streamOptimizedCount: number;
  realtimeDeliveryCount: number;
}

interface NotificationContextType {
  notifications: StreamNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  stats: NotificationStats;
  addNotification: (notification: Omit<StreamNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  testNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function EnhancedNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<StreamNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    soundEnabled: true,
    desktopNotifications: true,
    quietHours: { start: '22:00', end: '08:00' },
    typePreferences: {
      success: { enabled: true, priority: 'medium', showDesktop: false, sound: false },
      error: { enabled: true, priority: 'high', showDesktop: true, sound: true },
      warning: { enabled: true, priority: 'medium', showDesktop: true, sound: true },
      info: { enabled: true, priority: 'low', showDesktop: false, sound: false },
      transaction: { enabled: true, priority: 'high', showDesktop: true, sound: true },
      balance_update: { enabled: true, priority: 'medium', showDesktop: true, sound: false },
      security_alert: { enabled: true, priority: 'critical', showDesktop: true, sound: true },
      system_update: { enabled: true, priority: 'medium', showDesktop: false, sound: false },
      trade_signal: { enabled: true, priority: 'high', showDesktop: true, sound: true },
      web_analysis: { enabled: true, priority: 'medium', showDesktop: false, sound: false },
      market_alert: { enabled: true, priority: 'high', showDesktop: true, sound: true }
    }
  });
  
  const [stats, setStats] = useState<NotificationStats>({
    totalReceived: 0,
    totalRead: 0,
    averageDisplayTime: 0,
    streamOptimizedCount: 0,
    realtimeDeliveryCount: 0
  });

  const notificationRef = useRef<Map<string, { addedAt: number; readAt?: number }>>(new Map());
  const soundRef = useRef<HTMLAudioElement>();

  // Initialize notification sounds
  useEffect(() => {
    soundRef.current = new Audio('/sounds/notification.mp3');
    soundRef.current.volume = 0.5;
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.metadata?.read).length;
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<StreamNotification, 'id' | 'timestamp'>) => {
    if (!preferences.enabled) return;

    const typePrefs = preferences.typePreferences[notification.type];
    if (!typePrefs?.enabled) return;

    // Check quiet hours
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const quietStart = parseInt(preferences.quietHours.start.replace(':', ''));
    const quietEnd = parseInt(preferences.quietHours.end.replace(':', ''));
    
    const isQuietTime = (quietStart > quietEnd) 
      ? (currentTime >= quietStart || currentTime <= quietEnd)
      : (currentTime >= quietStart && currentTime <= quietEnd);

    if (isQuietTime && notification.priority !== 'critical') {
      return; // Skip non-critical notifications during quiet hours
    }

    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const timestamp = new Date().toISOString();
    
    const newNotification: StreamNotification = {
      id,
      timestamp,
      dismissible: true,
      ...notification,
      duration: notification.duration ?? getDurationByPriority(notification.priority)
    };
    
    setNotifications(prev => {
      // Remove old notifications if we have too many (keep last 50)
      const updated = [...prev, newNotification];
      if (updated.length > 50) {
        const removed = updated.splice(0, updated.length - 50);
        removed.forEach(n => notificationRef.current.delete(n.id));
      }
      return updated;
    });

    // Track notification timing
    notificationRef.current.set(id, { addedAt: Date.now() });

    // Update stats
    setStats(prev => ({
      ...prev,
      totalReceived: prev.totalReceived + 1,
      streamOptimizedCount: prev.streamOptimizedCount + (notification.streamOptimized ? 1 : 0),
      realtimeDeliveryCount: prev.realtimeDeliveryCount + 1
    }));

    // Play sound if enabled
    if (preferences.soundEnabled && typePrefs.sound && soundRef.current) {
      soundRef.current.play().catch(() => {
        // Ignore audio play errors
      });
    }

    // Show desktop notification if enabled
    if (preferences.desktopNotifications && typePrefs.showDesktop && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: id
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
              tag: id
            });
          }
        });
      }
    }

    // Auto remove after duration (unless persistent)
    if (newNotification.duration && newNotification.duration > 0 && !newNotification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, [preferences]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Update display time stats
    const notifData = notificationRef.current.get(id);
    if (notifData) {
      const displayTime = Date.now() - notifData.addedAt;
      setStats(prev => ({
        ...prev,
        averageDisplayTime: (prev.averageDisplayTime + displayTime) / 2
      }));
      notificationRef.current.delete(id);
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, metadata: { ...n.metadata, read: true } } : n
    ));
    
    // Track read time
    const notifData = notificationRef.current.get(id);
    if (notifData) {
      notifData.readAt = Date.now();
      setStats(prev => ({ ...prev, totalRead: prev.totalRead + 1 }));
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, metadata: { ...n.metadata, read: true } })));
    
    const unreadCount = notifications.filter(n => !n.metadata?.read).length;
    setStats(prev => ({ ...prev, totalRead: prev.totalRead + unreadCount }));
  }, [notifications]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    notificationRef.current.clear();
  }, []);

  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
    
    // Save to localStorage
    localStorage.setItem('notification_preferences', JSON.stringify({ ...preferences, ...newPreferences }));
  }, [preferences]);

  const testNotification = useCallback(() => {
    addNotification({
      type: 'info',
      priority: 'medium',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working correctly.',
      streamOptimized: true,
      deliveryLatency: 15
    });
  }, [addNotification]);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notification_preferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse notification preferences:', error);
      }
    }
  }, []);

  // Listen for WebSocket notifications with stream optimization
  useWebSocketSubscription('notification', (data) => {
    if (data && typeof data === 'object') {
      addNotification({
        type: data.type || 'info',
        priority: data.priority || 'medium',
        title: data.title || 'Notification',
        message: data.message || '',
        duration: data.duration,
        metadata: data.metadata || {},
        streamOptimized: data.streamOptimized || false,
        deliveryLatency: data.deliveryLatency
      });
    }
  });

  // Listen for batch notifications
  useWebSocketSubscription('notification_batch', (data) => {
    if (data?.notifications && Array.isArray(data.notifications)) {
      data.notifications.forEach((notificationData: any) => {
        addNotification({
          type: notificationData.type || 'info',
          priority: notificationData.priority || 'medium',
          title: notificationData.title || 'Notification',
          message: notificationData.message || '',
          metadata: notificationData.metadata || {},
          streamOptimized: true
        });
      });
    }
  });

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      preferences,
      stats,
      addNotification,
      removeNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
      updatePreferences,
      testNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

function getDurationByPriority(priority: NotificationPriority): number {
  switch (priority) {
    case 'critical': return 0; // Persistent
    case 'high': return 10000; // 10 seconds
    case 'medium': return 7000; // 7 seconds
    case 'low': return 5000; // 5 seconds
    default: return 6000;
  }
}

export function useEnhancedNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useEnhancedNotifications must be used within an EnhancedNotificationProvider');
  }
  return context;
}

export function EnhancedNotificationSystem() {
  const { notifications, removeNotification, markAsRead } = useEnhancedNotifications();
  const { theme } = useTheme();

  if (notifications.length === 0) {
    return null;
  }

  // Sort by priority and timestamp
  const sortedNotifications = [...notifications].sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-sm w-full">
      {sortedNotifications.map(notification => (
        <EnhancedNotificationCard
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
          onRead={() => markAsRead(notification.id)}
        />
      ))}
    </div>
  );
}

function EnhancedNotificationCard({ 
  notification, 
  onClose,
  onRead
}: { 
  notification: StreamNotification;
  onClose: () => void;
  onRead: () => void;
}) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 50);
    
    // Mark as read when notification becomes visible
    if (!notification.metadata?.read) {
      setTimeout(() => onRead(), 1000);
    }
  }, [onRead, notification.metadata?.read]);

  const handleClose = () => {
    if (!notification.dismissible) return;
    
    setIsLeaving(true);
    setTimeout(onClose, 300);
  };

  const handleAction = () => {
    if (notification.action) {
      notification.action.onClick();
      handleClose();
    }
  };

  const typeConfig = {
    success: {
      icon: '✅',
      bgColor: theme === 'dark' ? 'bg-green-900/90' : 'bg-green-50',
      borderColor: 'border-green-500',
      textColor: theme === 'dark' ? 'text-green-300' : 'text-green-700',
    },
    error: {
      icon: '❌',
      bgColor: theme === 'dark' ? 'bg-red-900/90' : 'bg-red-50',
      borderColor: 'border-red-500',
      textColor: theme === 'dark' ? 'text-red-300' : 'text-red-700',
    },
    warning: {
      icon: '⚠️',
      bgColor: theme === 'dark' ? 'bg-yellow-900/90' : 'bg-yellow-50',
      borderColor: 'border-yellow-500',
      textColor: theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700',
    },
    info: {
      icon: 'ℹ️',
      bgColor: theme === 'dark' ? 'bg-blue-900/90' : 'bg-blue-50',
      borderColor: 'border-blue-500',
      textColor: theme === 'dark' ? 'text-blue-300' : 'text-blue-700',
    },
    transaction: {
      icon: '💰',
      bgColor: theme === 'dark' ? 'bg-purple-900/90' : 'bg-purple-50',
      borderColor: 'border-purple-500',
      textColor: theme === 'dark' ? 'text-purple-300' : 'text-purple-700',
    },
    balance_update: {
      icon: '📊',
      bgColor: theme === 'dark' ? 'bg-indigo-900/90' : 'bg-indigo-50',
      borderColor: 'border-indigo-500',
      textColor: theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700',
    },
    security_alert: {
      icon: '🚨',
      bgColor: theme === 'dark' ? 'bg-red-900/90' : 'bg-red-50',
      borderColor: 'border-red-600',
      textColor: theme === 'dark' ? 'text-red-200' : 'text-red-800',
    },
    system_update: {
      icon: '🔧',
      bgColor: theme === 'dark' ? 'bg-gray-800/90' : 'bg-gray-50',
      borderColor: 'border-gray-500',
      textColor: theme === 'dark' ? 'text-gray-300' : 'text-gray-700',
    },
    trade_signal: {
      icon: '📈',
      bgColor: theme === 'dark' ? 'bg-emerald-900/90' : 'bg-emerald-50',
      borderColor: 'border-emerald-500',
      textColor: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
    },
    web_analysis: {
      icon: '🌐',
      bgColor: theme === 'dark' ? 'bg-cyan-900/90' : 'bg-cyan-50',
      borderColor: 'border-cyan-500',
      textColor: theme === 'dark' ? 'text-cyan-300' : 'text-cyan-700',
    },
    market_alert: {
      icon: '📊',
      bgColor: theme === 'dark' ? 'bg-orange-900/90' : 'bg-orange-50',
      borderColor: 'border-orange-500',
      textColor: theme === 'dark' ? 'text-orange-300' : 'text-orange-700',
    }
  };

  const config = typeConfig[notification.type] || typeConfig.info;
  
  const priorityIndicator = notification.priority === 'critical' ? '🔥' : 
    notification.priority === 'high' ? '🔴' : 
    notification.priority === 'medium' ? '🟡' : '🟢';

  return (
    <div 
      ref={cardRef}
      className={`transform transition-all duration-300 ${
        isVisible && !isLeaving 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`p-4 rounded-lg border-l-4 shadow-lg backdrop-blur-sm ${
        config.bgColor
      } ${
        config.borderColor
      } ${
        config.textColor
      } ${
        notification.priority === 'critical' ? 'ring-2 ring-red-500 animate-pulse' : ''
      }`}>
        
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xl flex-shrink-0">{config.icon}</span>
            <span className="text-sm">{priorityIndicator}</span>
            {notification.streamOptimized && (
              <span className="text-xs bg-blue-500 text-white px-1 rounded">⚡</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs opacity-60">
              {new Date(notification.timestamp).toLocaleTimeString()}
            </span>
            {notification.dismissible && (
              <button
                onClick={handleClose}
                className="text-lg opacity-60 hover:opacity-100 transition-opacity duration-200"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">{notification.title}</h4>
          <p className="text-sm opacity-90">{notification.message}</p>
          
          {notification.deliveryLatency && (
            <div className="text-xs opacity-60">
              Delivered in {notification.deliveryLatency.toFixed(1)}ms
            </div>
          )}
          
          {notification.action && (
            <button
              onClick={handleAction}
              className="mt-2 text-sm font-medium underline hover:no-underline transition-all duration-200"
            >
              {notification.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}