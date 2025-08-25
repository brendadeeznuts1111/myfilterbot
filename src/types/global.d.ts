/**
 * Global type declarations for Fantdev Trading Bot
 * @version 2.1.0
 */

// React DOM Client types
declare module 'react-dom/client' {
  import { ReactNode } from 'react';

  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  export function createRoot(container: Element | DocumentFragment): Root;
  export function hydrateRoot(container: Element, initialChildren: ReactNode): Root;
}

// Testing library types
declare module '@testing-library/react' {
  export * from '@testing-library/react/types';
  export function render(ui: React.ReactElement, options?: any): any;
  export const screen: {
    getByTestId: (id: string) => HTMLElement;
    getByText: (text: string) => HTMLElement;
    getByRole: (role: string) => HTMLElement;
  };
}

// Vitest globals
declare global {
  const vi: {
    mock: (path: string, factory?: () => any) => void;
    fn: (implementation?: (...args: any[]) => any) => any;
  };

  interface Window {
    vi: typeof vi;
  }
}

// YAML module types
declare module '*.yaml' {
  const content: any;
  export default content;
  export const server: any;
  export const paths: any;
}

declare module '*.yml' {
  const content: any;
  export default content;
  export const server: any;
  export const paths: any;
}

// Bun YAML support
declare module 'bun' {
  export const YAML: {
    parse: (text: string) => any;
    stringify: (value: any) => string;
  };
}

// API Client types
declare module '../lib/api-client' {
  export class EnhancedApiClient {
    constructor(config?: any);
    get(endpoint: string): Promise<any>;
    post(endpoint: string, data?: any): Promise<any>;
  }

  export function createApiClient(config?: any): EnhancedApiClient;
  export const customerAPI: any;
}

// Hook types
declare module '../hooks/useMediaQuery' {
  export default function useMediaQuery(query: string): boolean;
}

declare module '../hooks/useAPI' {
  export function useAPI<T = any>(endpoint: string, options?: any): {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
  };
}

declare module '../hooks/useAuth' {
  export function useAuth(): {
    user: any;
    login: (credentials: any) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
  };
}

declare module '../hooks/useTheme' {
  export function useTheme(): {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
  };
}

declare module '../hooks/useEnhancedAPI' {
  export function useDashboardData(): any;
}

// Shared analytics types
declare module '../shared/analytics-types' {
  export interface AnalyticsData {
    balance_trend: number[];
    [key: string]: any;
  }

  export interface TransactionData {
    type: string;
    status: string;
    tags?: string[];
    [key: string]: any;
  }

  export interface KPIData {
    label: string;
    value: any;
    [key: string]: any;
  }
}

// Component types
declare module './analytics/EquityCurveChart' {
  export function EquityCurveChart(props: any): JSX.Element;
}

declare module './analytics/PerformanceKPI' {
  export function PerformanceKPI(props: any): JSX.Element;
}

declare module './analytics/RecentActivity' {
  export function RecentActivity(props: any): JSX.Element;
}

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
    }
  }
}

// Performance API
declare global {
  interface Performance {
    now(): number;
  }

  const performance: Performance;
}

// Node.js timeout types
declare global {
  type NodeJS_Timeout = ReturnType<typeof setTimeout>;
}

export {};