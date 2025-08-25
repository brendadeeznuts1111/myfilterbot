/**
 * React component type declarations
 * @version 2.1.0
 */

import { ReactNode, ComponentProps } from 'react';

// Common component prop types
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  id?: string;
  'data-testid'?: string;
}

// Analytics component types
declare module '../web/components/analytics/EquityCurveChart' {
  export interface EquityCurveChartProps extends BaseComponentProps {
    data: Array<{ date: string; balance: number }>;
    timeframe?: string;
    height?: number;
    showGrid?: boolean;
  }

  export function EquityCurveChart(props: EquityCurveChartProps): JSX.Element;
  export default EquityCurveChart;
}

declare module '../web/components/analytics/PerformanceKPI' {
  export interface PerformanceKPIProps extends BaseComponentProps {
    label: string;
    value: string | number;
    change?: number;
    format?: 'currency' | 'percentage' | 'number';
    trend?: 'up' | 'down' | 'neutral';
  }

  export function PerformanceKPI(props: PerformanceKPIProps): JSX.Element;
  export default PerformanceKPI;
}

declare module '../web/components/analytics/RecentActivity' {
  export interface RecentActivityProps extends BaseComponentProps {
    activities: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string;
      amount?: number;
    }>;
    maxItems?: number;
  }

  export function RecentActivity(props: RecentActivityProps): JSX.Element;
  export default RecentActivity;
}

// Dashboard components
declare module '../web/components/Dashboard' {
  export interface DashboardProps extends BaseComponentProps {
    customerId?: string;
    refreshInterval?: number;
  }

  export function Dashboard(props: DashboardProps): JSX.Element;
  export default Dashboard;
}

declare module '../web/components/CustomerDashboard' {
  export interface CustomerDashboardProps extends BaseComponentProps {
    customerId: string;
    showBalance?: boolean;
    showTransactions?: boolean;
  }

  export function CustomerDashboard(props: CustomerDashboardProps): JSX.Element;
  export default CustomerDashboard;
}

// Error boundary
declare module '../web/components/ErrorBoundary' {
  export interface ErrorBoundaryProps extends BaseComponentProps {
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: any) => void;
  }

  export class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
    constructor(props: ErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): any;
    componentDidCatch(error: Error, errorInfo: any): void;
    render(): ReactNode;
  }

  export default ErrorBoundary;
}

// Layout components
declare module '../web/components/Layout' {
  export interface LayoutProps extends BaseComponentProps {
    title?: string;
    sidebar?: boolean;
    header?: boolean;
  }

  export function Layout(props: LayoutProps): JSX.Element;
  export default Layout;
}

// Form components
declare module '../web/components/forms/LoginForm' {
  export interface LoginFormProps extends BaseComponentProps {
    onSubmit: (credentials: { username: string; password: string }) => void;
    loading?: boolean;
    error?: string;
  }

  export function LoginForm(props: LoginFormProps): JSX.Element;
  export default LoginForm;
}

// Common UI components
declare module '../web/components/ui/Button' {
  export interface ButtonProps extends BaseComponentProps {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }

  export function Button(props: ButtonProps): JSX.Element;
  export default Button;
}

declare module '../web/components/ui/Modal' {
  export interface ModalProps extends BaseComponentProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }

  export function Modal(props: ModalProps): JSX.Element;
  export default Modal;
}

declare module '../web/components/ui/LoadingSpinner' {
  export interface LoadingSpinnerProps extends BaseComponentProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
  }

  export function LoadingSpinner(props: LoadingSpinnerProps): JSX.Element;
  export default LoadingSpinner;
}