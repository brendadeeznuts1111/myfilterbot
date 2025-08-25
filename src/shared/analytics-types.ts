/**
 * Enhanced Analytics Type Definitions
 * Comprehensive types for the Enhanced Reporting & Analytics system
 */

export interface PerformanceMetrics {
  total_deposits: number;
  total_withdrawals: number;
  net_pnl: number;
  roi_percentage: number;
  win_rate: number;
  max_drawdown: number;
  sharpe_ratio: number;
  profit_factor: number;
  average_win: number;
  average_loss: number;
  largest_win: number;
  largest_loss: number;
}

export interface KPIData {
  label: string;
  value: number | string;
  change?: number;
  changePercent?: number;
  trend: 'up' | 'down' | 'neutral';
  format: 'currency' | 'percentage' | 'number' | 'ratio';
  timeframe: '1d' | '7d' | '30d' | '90d' | 'all';
  target?: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface TransactionData {
  id: string;
  customer_id: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'bonus' | 'fee' | 'adjustment';
  amount: number;
  balance_after: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'processing';
  timestamp: string;
  description: string;
  metadata?: {
    method?: string;
    reference?: string;
    fees?: number;
    exchange_rate?: number;
    original_amount?: number;
    original_currency?: string;
  };
  tags?: string[];
  risk_score?: number;
}

export interface EquityCurveDataPoint {
  timestamp: string;
  balance: number;
  pnl: number;
  cumulative_pnl: number;
  daily_change: number;
  daily_change_percent: number;
  drawdown: number;
  high_water_mark: number;
}

export interface ActivitySummary {
  date: string;
  transactions_count: number;
  total_volume: number;
  net_pnl: number;
  balance_start: number;
  balance_end: number;
  volatility: number;
  major_events: Array<{
    type: 'large_deposit' | 'large_withdrawal' | 'milestone' | 'alert';
    description: string;
    amount?: number;
    timestamp: string;
  }>;
}

export interface AnalyticsTimeSeriesData {
  equity_curve: EquityCurveDataPoint[];
  daily_summary: ActivitySummary[];
  performance_metrics: PerformanceMetrics;
  kpi_data: KPIData[];
  recent_transactions: TransactionData[];
  generated_at: string;
  timeframe: {
    start: string;
    end: string;
    period: '1d' | '7d' | '30d' | '90d' | '1y' | 'all';
  };
}

export interface ChartConfig {
  type: 'line' | 'area' | 'bar' | 'candlestick';
  theme: 'light' | 'dark';
  height: number;
  showGrid: boolean;
  showTooltip: boolean;
  showLegend: boolean;
  colors: {
    primary: string;
    secondary: string;
    positive: string;
    negative: string;
    neutral: string;
  };
  timeFormat: string;
  valueFormat: string;
}

export interface FilterOptions {
  timeframe: '1d' | '7d' | '30d' | '90d' | '1y' | 'all';
  transaction_types: TransactionData['type'][];
  status_filter: TransactionData['status'][];
  amount_range: {
    min: number;
    max: number;
  };
  sort_by: 'timestamp' | 'amount' | 'type' | 'status';
  sort_order: 'asc' | 'desc';
  limit: number;
  offset: number;
}

export interface RealtimeUpdate {
  type: 'transaction' | 'balance' | 'kpi' | 'alert';
  timestamp: string;
  data: TransactionData | EquityCurveDataPoint | KPIData | any;
  customer_id: string;
}

export interface ComponentState {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  autoRefresh: boolean;
  refreshInterval: number;
}

// Utility types for component props
export interface BaseAnalyticsProps {
  customerId: string;
  timeframe?: FilterOptions['timeframe'];
  refreshInterval?: number;
  className?: string;
  onError?: (error: string) => void;
  onDataUpdate?: (data: any) => void;
}

export interface PerformanceKPIProps extends BaseAnalyticsProps {
  kpiKeys?: string[];
  showTargets?: boolean;
  showTrends?: boolean;
  layout: 'grid' | 'list' | 'carousel';
  maxItems?: number;
}

export interface RecentActivityProps extends BaseAnalyticsProps {
  maxItems?: number;
  showFilters?: boolean;
  groupByDate?: boolean;
  highlightLarge?: boolean;
  largeTransactionThreshold?: number;
}

export interface EquityCurveChartProps extends BaseAnalyticsProps {
  chartConfig?: Partial<ChartConfig>;
  showDrawdown?: boolean;
  showBenchmark?: boolean;
  benchmarkData?: EquityCurveDataPoint[];
  annotations?: Array<{
    timestamp: string;
    label: string;
    type: 'info' | 'warning' | 'success' | 'error';
  }>;
}

// API Response types
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  execution_time_ms: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Error types
export interface AnalyticsError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Theme-specific styling
export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  chart: {
    grid: string;
    axis: string;
    tooltip: string;
    positive: string;
    negative: string;
    neutral: string;
  };
}
