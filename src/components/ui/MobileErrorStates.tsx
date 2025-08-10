'use client';

import React, { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon, 
  WifiIcon,
  ArrowPathIcon,
  XMarkIcon,
  SignalSlashIcon,
  ServerIcon
} from '@heroicons/react/24/outline';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// Mobile-optimized error message types
export type MobileErrorType = 
  | 'network' 
  | 'server' 
  | 'validation' 
  | 'permission' 
  | 'timeout' 
  | 'offline'
  | 'generic';

interface MobileErrorConfig {
  title: string;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'red' | 'yellow' | 'blue' | 'gray';
  showRetry: boolean;
  autoRetry?: boolean;
  retryDelay?: number;
}

const ERROR_CONFIGS: Record<MobileErrorType, MobileErrorConfig> = {
  network: {
    title: '네트워크 연결 오류',
    message: '인터넷 연결을 확인하고 다시 시도해주세요.',
    icon: WifiIcon,
    color: 'red',
    showRetry: true,
    autoRetry: true,
    retryDelay: 3000
  },
  server: {
    title: '서버 오류',
    message: '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    icon: ServerIcon,
    color: 'red',
    showRetry: true,
    autoRetry: false
  },
  validation: {
    title: '입력 오류',
    message: '입력하신 정보를 다시 확인해주세요.',
    icon: ExclamationTriangleIcon,
    color: 'yellow',
    showRetry: false
  },
  permission: {
    title: '권한 오류',
    message: '이 작업을 수행할 권한이 없습니다.',
    icon: ExclamationTriangleIcon,
    color: 'red',
    showRetry: false
  },
  timeout: {
    title: '요청 시간 초과',
    message: '요청 처리 시간이 초과되었습니다. 다시 시도해주세요.',
    icon: ArrowPathIcon,
    color: 'yellow',
    showRetry: true,
    autoRetry: false
  },
  offline: {
    title: '오프라인 상태',
    message: '인터넷 연결이 끊어졌습니다. 연결을 확인해주세요.',
    icon: SignalSlashIcon,
    color: 'gray',
    showRetry: true,
    autoRetry: true,
    retryDelay: 5000
  },
  generic: {
    title: '오류 발생',
    message: '예상치 못한 오류가 발생했습니다.',
    icon: ExclamationTriangleIcon,
    color: 'red',
    showRetry: true,
    autoRetry: false
  }
};

// Mobile error message component
interface MobileErrorMessageProps {
  type: MobileErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  customAction?: {
    label: string;
    action: () => void;
  };
  details?: string;
  showDetails?: boolean;
}

export function MobileErrorMessage({
  type,
  title,
  message,
  onRetry,
  onDismiss,
  className = '',
  customAction,
  details,
  showDetails = false
}: MobileErrorMessageProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showDetailsExpanded, setShowDetailsExpanded] = useState(false);
  const { isMobile } = useBreakpoint();

  const config = ERROR_CONFIGS[type];
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;
  const IconComponent = config.icon;

  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-500',
      title: 'text-red-900',
      message: 'text-red-700',
      button: 'bg-red-600 hover:bg-red-700 text-white',
      secondaryButton: 'bg-red-100 hover:bg-red-200 text-red-700'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-500',
      title: 'text-yellow-900',
      message: 'text-yellow-700',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      secondaryButton: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-500',
      title: 'text-blue-900',
      message: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondaryButton: 'bg-blue-100 hover:bg-blue-200 text-blue-700'
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: 'text-gray-500',
      title: 'text-gray-900',
      message: 'text-gray-700',
      button: 'bg-gray-600 hover:bg-gray-700 text-white',
      secondaryButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700'
    }
  };

  const colors = colorClasses[config.color];

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  // Auto retry logic
  useEffect(() => {
    if (config.autoRetry && config.retryDelay && onRetry && retryCount < 3) {
      const timer = setTimeout(() => {
        handleRetry();
      }, config.retryDelay);

      return () => clearTimeout(timer);
    }
  }, [config.autoRetry, config.retryDelay, onRetry, retryCount]);

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${colors.icon}`}>
          <IconComponent className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`text-base font-medium ${colors.title} ${isMobile ? 'text-lg' : ''}`}>
                {displayTitle}
              </h3>
              <p className={`mt-1 text-sm ${colors.message} ${isMobile ? 'text-base' : ''}`}>
                {displayMessage}
              </p>
              
              {retryCount > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  재시도 횟수: {retryCount}/3
                </p>
              )}
            </div>
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="mt-4 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            {config.showRetry && onRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className={`${colors.button} px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center`}
              >
                {isRetrying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    재시도 중...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    다시 시도
                  </>
                )}
              </button>
            )}
            
            {customAction && (
              <button
                onClick={customAction.action}
                className={`${colors.secondaryButton} px-4 py-2 rounded-md font-medium transition-colors min-h-[44px]`}
              >
                {customAction.label}
              </button>
            )}
          </div>
          
          {/* Details section */}
          {(details || showDetails) && (
            <div className="mt-3">
              <button
                onClick={() => setShowDetailsExpanded(!showDetailsExpanded)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showDetailsExpanded ? '세부정보 숨기기' : '세부정보 보기'}
              </button>
              
              {showDetailsExpanded && (
                <div className="mt-2 p-3 bg-gray-100 rounded-md">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-32">
                    {details || '추가 정보가 없습니다.'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile error toast for temporary notifications
interface MobileErrorToastProps {
  type: MobileErrorType;
  message: string;
  isVisible: boolean;
  onDismiss: () => void;
  duration?: number;
  position?: 'top' | 'bottom';
}

export function MobileErrorToast({
  type,
  message,
  isVisible,
  onDismiss,
  duration = 4000,
  position = 'top'
}: MobileErrorToastProps) {
  const config = ERROR_CONFIGS[type];
  const IconComponent = config.icon;

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onDismiss]);

  if (!isVisible) return null;

  const positionClasses = position === 'top' 
    ? 'top-4 animate-slide-down' 
    : 'bottom-4 animate-slide-up';

  const colorClasses = {
    red: 'bg-red-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    blue: 'bg-blue-500 text-white',
    gray: 'bg-gray-500 text-white'
  };

  return (
    <div className={`fixed left-4 right-4 ${positionClasses} z-50`}>
      <div className={`${colorClasses[config.color]} rounded-lg p-4 shadow-lg flex items-center space-x-3`}>
        <IconComponent className="w-5 h-5 flex-shrink-0" />
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-20 transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Full screen mobile error page
interface MobileErrorPageProps {
  type: MobileErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  illustration?: React.ReactNode;
}

export function MobileErrorPage({
  type,
  title,
  message,
  onRetry,
  onGoHome,
  illustration
}: MobileErrorPageProps) {
  const config = ERROR_CONFIGS[type];
  const IconComponent = config.icon;
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        {/* Illustration or Icon */}
        <div className="mb-8">
          {illustration || (
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <IconComponent className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>
        
        {/* Content */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {displayTitle}
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          {displayMessage}
        </p>
        
        {/* Actions */}
        <div className="space-y-3">
          {config.showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors min-h-[48px] flex items-center justify-center"
            >
              <ArrowPathIcon className="w-5 h-5 mr-2" />
              다시 시도
            </button>
          )}
          
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="w-full bg-gray-100 text-gray-700 px-6 py-4 rounded-lg font-medium hover:bg-gray-200 transition-colors min-h-[48px]"
            >
              홈으로 가기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for managing mobile error states
interface UseErrorStateOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
}

export function useMobileErrorState(options: UseErrorStateOptions = {}) {
  const [error, setError] = useState<{
    type: MobileErrorType;
    message: string;
    details?: string;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const { maxRetries = 3, retryDelay = 1000, onError } = options;

  const showError = (type: MobileErrorType, message?: string, details?: string) => {
    const config = ERROR_CONFIGS[type];
    setError({
      type,
      message: message || config.message,
      details
    });
    setRetryCount(0);
  };

  const clearError = () => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
  };

  const retry = async (retryFn: () => Promise<void>) => {
    if (retryCount >= maxRetries || isRetrying) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      await retryFn();
      clearError();
    } catch (err) {
      if (onError && err instanceof Error) {
        onError(err);
      }
      
      if (retryCount + 1 >= maxRetries) {
        showError('generic', '최대 재시도 횟수를 초과했습니다.');
      }
    } finally {
      setIsRetrying(false);
    }
  };

  return {
    error,
    retryCount,
    isRetrying,
    showError,
    clearError,
    retry,
    hasError: error !== null
  };
}