export interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  joinDate: string;
  lastActive: string;
  avatar?: string;
  bots?: number;
  revenue?: string;
}

export interface Bot {
  id: string;
  name: string;
  userId: string;
  status: 'running' | 'stopped' | 'error';
  strategy: string;
  createdAt: string;
  lastTrade: string;
  profit: string;
}

export interface AnalyticsData {
  date: string;
  users: number;
  revenue: number;
  trades: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  activeBots: number;
  growthRate: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
