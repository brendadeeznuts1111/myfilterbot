/**
 * Error Boundary Component
 * Catches React errors and prevents cascade failures
 */

import React, { Component, ReactNode } from 'react';
import type { Timeout } from 'node';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
  lastErrorTime: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const now = Date.now();
    return {
      hasError: true,
      error,
      lastErrorTime: now,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props;
    const { errorCount, lastErrorTime } = this.state;
    const now = Date.now();

    // Increment error count if errors are happening rapidly
    const timeSinceLastError = now - lastErrorTime;
    const newErrorCount = timeSinceLastError < 5000 ? errorCount + 1 : 1;

    console.error('🚨 Error caught by ErrorBoundary:', {
      error: error.message,
      componentStack: errorInfo.componentStack,
      errorCount: newErrorCount,
      timeSinceLastError,
    });

    // Update error count
    this.setState({ errorCount: newErrorCount });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Auto-reset after 10 seconds if not too many errors
    if (newErrorCount < 5) {
      this.scheduleReset(10000);
    } else {
      console.error(
        '❌ Too many errors detected. Manual intervention required.'
      );
    }
  }

  scheduleReset = (delay: number) => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = setTimeout(() => {
      console.log('🔄 Auto-resetting error boundary...');
      this.resetErrorBoundary();
    }, delay);
  };

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorCount: 0,
      lastErrorTime: 0,
    });
  };

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  render() {
    const { hasError, error, errorCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Check if too many errors
      if (errorCount >= 5) {
        return (
          <div className='min-h-screen bg-red-50 flex items-center justify-center p-4'>
            <div className='bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full'>
              <div className='text-center'>
                <div className='text-6xl mb-4'>🚨</div>
                <h1 className='text-2xl font-bold text-red-600 mb-4'>
                  Critical Error Detected
                </h1>
                <p className='text-gray-600 mb-6'>
                  Multiple errors have occurred in rapid succession. The
                  application has been stopped to prevent further issues.
                </p>
                <div className='bg-red-100 rounded-lg p-4 mb-6'>
                  <p className='text-sm text-red-800 font-mono'>
                    {error.message}
                  </p>
                  <p className='text-xs text-red-600 mt-2'>
                    Error count: {errorCount} errors in the last 5 seconds
                  </p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className='bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors'
                >
                  Reload Application
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Custom fallback or default error UI
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-6 m-4'>
          <div className='flex items-start'>
            <div className='flex-shrink-0'>
              <svg
                className='h-6 w-6 text-yellow-600'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                />
              </svg>
            </div>
            <div className='ml-3 flex-1'>
              <h3 className='text-sm font-medium text-yellow-800'>
                Component Error
              </h3>
              <div className='mt-2 text-sm text-yellow-700'>
                <p>{error.message}</p>
                {errorCount > 1 && (
                  <p className='mt-1 text-xs'>
                    This error has occurred {errorCount} times. Auto-retry in
                    progress...
                  </p>
                )}
              </div>
              <div className='mt-4'>
                <button
                  onClick={this.resetErrorBoundary}
                  className='text-sm font-medium text-yellow-600 hover:text-yellow-500'
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
): React.ComponentType<P> {
  return (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
}
