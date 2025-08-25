// Shared types for both bot and Cloudflare Worker

export interface Customer {
  customer_id: string;
  password: string;
  balance: number;
  weekly_pnl: number;
  phone?: string;
  telegram_id?: number;
  telegram_username?: string;
  active: boolean;
  last_activity?: string;
  total_deposits?: number;
  total_withdrawals?: number;
}

export interface Transaction {
  timestamp: string;
  customer_id: string;
  type: 'deposit' | 'withdrawal' | 'denied' | 'pending' | 'expired' | 'mention';
  amount?: number;
  message: string;
  from_user: string;
  chat_id: number;
  status: 'completed' | 'pending' | 'failed';
}

export interface ChatInfo {
  chatId: string;
  chatType: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  memberCount?: number;
  description?: string;
  inviteLink?: string;
  dateAdded: string;
  lastActivity: string;
  botStatus: 'member' | 'administrator' | 'left' | 'kicked';
  permissions?: ChatPermissions;
  statistics?: ChatStatistics;
}

export interface ChatPermissions {
  canSendMessages?: boolean;
  canSendMediaMessages?: boolean;
  canSendPolls?: boolean;
  canSendOtherMessages?: boolean;
  canAddWebPagePreviews?: boolean;
  canChangeInfo?: boolean;
  canInviteUsers?: boolean;
  canPinMessages?: boolean;
}

export interface ChatStatistics {
  messagesReceived: number;
  commandsProcessed: number;
  transactionsDetected: number;
  customersTracked: string[];
}

export interface ShortlinkData {
  shortCode: string;
  url: string;
  clicks: number;
  createdAt: string;
  lastAccessed?: string;
  metadata?: Record<string, any>;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WorkerConfig {
  botToken: string;
  adminChatId: string;
  webhookSecret: string;
  workerUrl: string;
  environment: 'development' | 'production';
}
