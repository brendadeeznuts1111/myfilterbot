/**
 * @fileoverview Shared types for both bot and Cloudflare Worker
 * @version 2.1.0
 * @author Fantdev Development Team
 */

/**
 * Customer data structure representing a trading bot user
 */
export interface Customer {
  /** Unique customer identifier (e.g., "BB1042") */
  customer_id: string;
  /** Customer password for authentication */
  password: string;
  /** Current account balance in USD */
  balance: number;
  /** Weekly profit/loss in USD */
  weekly_pnl: number;
  /** Optional phone number */
  phone?: string;
  /** Optional Telegram user ID */
  telegram_id?: number;
  /** Optional Telegram username */
  telegram_username?: string;
  /** Whether the customer account is active */
  active: boolean;
  /** ISO timestamp of last activity */
  last_activity?: string;
  /** Total amount deposited (USD) */
  total_deposits?: number;
  /** Total amount withdrawn (USD) */
  total_withdrawals?: number;
}

/**
 * Transaction record representing a customer financial activity
 */
export interface Transaction {
  /** ISO timestamp when transaction occurred */
  timestamp: string;
  /** Customer ID associated with transaction */
  customer_id: string;
  /** Type of transaction */
  type: 'deposit' | 'withdrawal' | 'denied' | 'pending' | 'expired' | 'mention';
  /** Transaction amount in USD (optional for mentions) */
  amount?: number;
  /** Original message text that triggered transaction */
  message: string;
  /** Username or ID of message sender */
  from_user: string;
  /** Telegram chat ID where transaction was detected */
  chat_id: number;
  /** Current status of the transaction */
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
