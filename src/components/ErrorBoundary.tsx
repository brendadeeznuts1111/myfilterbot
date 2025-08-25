/**
 * React Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { errorLogger } from '../utils/error-logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to centralized error logger
    const loggedError = errorLogger.logError(error, {
      component: 'react',
      action: 'componentError',
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ErrorBoundary'
    });

    this.setState({
      errorInfo,
      errorId: loggedError.id
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In development, also log to console for debugging
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 React Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-container">
            <div className="error-boundary-icon">⚠️</div>
            <h2 className="error-boundary-title">Something went wrong</h2>
            <p className="error-boundary-description">
              We encountered an unexpected error. The error has been logged and our team has been notified.
            </p>
            
            {this.state.errorId && (
              <p className="error-boundary-id">
                Error ID: <code>{this.state.errorId}</code>
              </p>
            )}

            <div className="error-boundary-actions">
              <button 
                className="error-boundary-button primary"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
              <button 
                className="error-boundary-button secondary"
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
              >
                Try Again
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-boundary-details">
                <summary>Error Details (Development)</summary>
                <pre className="error-boundary-stack">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo && (
                  <pre className="error-boundary-component-stack">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>

          <style jsx>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              padding: 2rem;
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 8px;
              margin: 1rem;
            }

            .error-boundary-container {
              text-align: center;
              max-width: 500px;
            }

            .error-boundary-icon {
              font-size: 3rem;
              margin-bottom: 1rem;
            }

            .error-boundary-title {
              color: #dc3545;
              font-size: 1.5rem;
              font-weight: 600;
              margin-bottom: 0.5rem;
            }

            .error-boundary-description {
              color: #6c757d;
              margin-bottom: 1rem;
              line-height: 1.5;
            }

            .error-boundary-id {
              font-size: 0.875rem;
              color: #495057;
              margin-bottom: 1.5rem;
            }

            .error-boundary-id code {
              background: #e9ecef;
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              font-family: monospace;
              font-size: 0.75rem;
            }

            .error-boundary-actions {
              display: flex;
              gap: 0.75rem;
              justify-content: center;
              margin-bottom: 1.5rem;
            }

            .error-boundary-button {
              padding: 0.5rem 1rem;
              border: none;
              border-radius: 4px;
              font-size: 0.875rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            }

            .error-boundary-button.primary {
              background: #007bff;
              color: white;
            }

            .error-boundary-button.primary:hover {
              background: #0056b3;
            }

            .error-boundary-button.secondary {
              background: #6c757d;
              color: white;
            }

            .error-boundary-button.secondary:hover {
              background: #545b62;
            }

            .error-boundary-details {
              text-align: left;
              margin-top: 1rem;
              padding: 1rem;
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
            }

            .error-boundary-details summary {
              cursor: pointer;
              font-weight: 600;
              margin-bottom: 0.5rem;
              color: #495057;
            }

            .error-boundary-stack,
            .error-boundary-component-stack {
              font-family: monospace;
              font-size: 0.75rem;
              white-space: pre-wrap;
              word-break: break-word;
              background: #ffffff;
              padding: 0.75rem;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              margin: 0.5rem 0;
              max-height: 200px;
              overflow-y: auto;
            }

            @media (max-width: 600px) {
              .error-boundary {
                padding: 1rem;
                margin: 0.5rem;
              }

              .error-boundary-actions {
                flex-direction: column;
              }

              .error-boundary-button {
                width: 100%;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;