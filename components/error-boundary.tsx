'use client';

import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log to external service (e.g., Sentry, LogRocket)
    if (typeof window !== 'undefined') {
      // Log to analytics/monitoring service
      console.error('Error tracked:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            reset={this.handleReset}
          />
        );
      }

      // Default error UI
      return (
        <DefaultErrorFallback
          error={this.state.error || new Error('Unknown error')}
          reset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

export function DefaultErrorFallback({ error, reset }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto size-16 rounded-full bg-red-100 p-4 text-red-600">
          <AlertTriangle className="size-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Something went wrong
          </h1>
          <p className="text-gray-600">
            We encountered an unexpected error. Please try again or contact
            support if the problem persists.
          </p>
        </div>

        {isDevelopment && (
          <div className="rounded-lg bg-red-50 p-4 text-left">
            <h3 className="font-medium text-red-800">
              Error Details (Development Mode):
            </h3>
            <pre className="mt-2 text-sm text-red-700 overflow-auto max-h-40">
              {error.message}
              {error.stack && `\n\nStack trace:\n${error.stack}`}
            </pre>
          </div>
        )}

        <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
          <Button
            onClick={reset}
            className="flex items-center justify-center"
            variant="default"
          >
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>

          <Button
            onClick={() => {
              window.location.href = '/';
            }}
            variant="outline"
            className="flex items-center justify-center"
          >
            <Home className="mr-2 size-4" />
            Go Home
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          Error ID: {Date.now().toString(36).toUpperCase()}
        </p>
      </div>
    </div>
  );
}

// Specialized error boundaries for different contexts

export function ChatErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <div className="flex h-64 items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-center">
            <AlertTriangle className="mx-auto size-8 text-red-600" />
            <h3 className="mt-2 font-medium text-red-800">Chat Error</h3>
            <p className="mt-1 text-sm text-red-600">
              Failed to load chat interface
            </p>
            <Button onClick={reset} size="sm" className="mt-3">
              Retry
            </Button>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        console.error('Chat error:', error, errorInfo);
        // Log chat-specific errors
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function DashboardErrorBoundary({
  children,
}: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <div className="flex min-h-96 items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8">
          <div className="text-center">
            <AlertTriangle className="mx-auto size-12 text-red-600" />
            <h3 className="mt-4 text-lg font-medium text-red-800">
              Dashboard Error
            </h3>
            <p className="mt-2 text-red-600">
              Unable to load dashboard components
            </p>
            <div className="mt-4 flex justify-center space-x-3">
              <Button onClick={reset} size="sm">
                Retry
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        console.error('Dashboard error:', error, errorInfo);
        // Log dashboard-specific errors
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function DocumentErrorBoundary({
  children,
}: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <div className="flex h-48 items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-center">
            <AlertTriangle className="mx-auto size-8 text-red-600" />
            <h3 className="mt-2 font-medium text-red-800">Document Error</h3>
            <p className="mt-1 text-sm text-red-600">Failed to load document</p>
            <Button onClick={reset} size="sm" className="mt-3">
              Retry
            </Button>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        console.error('Document error:', error, errorInfo);
        // Log document-specific errors
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
