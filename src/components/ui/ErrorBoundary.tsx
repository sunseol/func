'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error);
      console.error('Error Info:', errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to external service (placeholder for future implementation)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Placeholder for error logging service integration
    // Could integrate with services like Sentry, LogRocket, etc.
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: this.props.level || 'component'
    };

    // For now, just log to console
    console.error('Error logged:', errorData);
    
    // Future: Send to error tracking service
    // errorTrackingService.log(errorData);
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI based on level
      const { level = 'component' } = this.props;
      const { error, errorId } = this.state;

      if (level === 'critical') {
        return (
          <div className="min-h-screen bg-red-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-red-900 mb-2">시스템 오류</h1>
              <p className="text-red-700 mb-6">
                예상치 못한 오류가 발생했습니다. 페이지를 새로고침해주세요.
              </p>
              <div className="space-y-3">
                <button
                  onClick={this.handleReload}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  페이지 새로고침
                </button>
                <p className="text-sm text-red-600">오류 ID: {errorId}</p>
              </div>
            </div>
          </div>
        );
      }

      if (level === 'page') {
        return (
          <div className="min-h-[400px] bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
              <div className="bg-yellow-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">페이지 오류</h2>
              <p className="text-gray-600 mb-4">
                이 페이지를 불러오는 중 오류가 발생했습니다.
              </p>
              <div className="space-y-2">
                <button
                  onClick={this.handleRetry}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mr-2"
                >
                  다시 시도
                </button>
                <button
                  onClick={this.handleReload}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  새로고침
                </button>
              </div>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-left">
                  <summary className="text-sm text-gray-500 cursor-pointer">
                    개발자 정보 (개발 모드)
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {error?.message}
                    {'\n\n'}
                    {error?.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        );
      }

      // Component level error (default)
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 my-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">컴포넌트 오류</h3>
              <p className="text-sm text-yellow-700 mt-1">
                이 구성 요소를 불러오는 중 오류가 발생했습니다.
              </p>
              <div className="mt-3">
                <button
                  onClick={this.handleRetry}
                  className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 transition-colors"
                >
                  다시 시도
                </button>
              </div>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-2">
                  <summary className="text-xs text-yellow-600 cursor-pointer">
                    오류 세부정보
                  </summary>
                  <pre className="text-xs mt-1 whitespace-pre-wrap">
                    {error?.message}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  level: ErrorBoundaryProps['level'] = 'component'
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary level={level}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
} 