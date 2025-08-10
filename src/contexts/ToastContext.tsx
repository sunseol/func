'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useViewport } from './ViewportContext';
import { NotificationManager } from '@/components/ui/NotificationManager';
import { GestureTutorial } from '@/components/ui/GestureTutorial';
import { useGestureTutorial } from '@/hooks/useGestureTutorial';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPriority = 'high' | 'medium' | 'low';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
  priority?: ToastPriority;
  // Mobile-specific options
  allowSwipeDismiss?: boolean;
  hapticFeedback?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  
  // Convenience methods
  success: (title: string, message?: string, options?: Partial<Toast>) => string;
  error: (title: string, message?: string, options?: Partial<Toast>) => string;
  warning: (title: string, message?: string, options?: Partial<Toast>) => string;
  info: (title: string, message?: string, options?: Partial<Toast>) => string;
  
  // Priority notification methods
  urgent: (title: string, message?: string, options?: Partial<Toast>) => string;
  important: (title: string, message?: string, options?: Partial<Toast>) => string;
  critical: (title: string, message?: string, options?: Partial<Toast>) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  position?: 'top' | 'bottom';
}

export function ToastProvider({ children, maxToasts = 5, position = 'top' }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = useCallback(() => {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const addToast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = generateId();
    
    // Set default priority based on type
    const defaultPriority: ToastPriority = 
      toastData.type === 'error' ? 'high' :
      toastData.type === 'warning' ? 'medium' : 'low';
    
    const toast: Toast = {
      id,
      duration: 5000, // Default 5 seconds
      priority: defaultPriority,
      allowSwipeDismiss: true,
      hapticFeedback: true,
      ...toastData
    };

    setToasts(prev => {
      const newToasts = [toast, ...prev];
      // Limit number of toasts
      return newToasts.slice(0, maxToasts);
    });

    // Haptic feedback for mobile devices
    if (toast.hapticFeedback && 'vibrate' in navigator) {
      const vibrationPattern = toast.type === 'error' ? [100, 50, 100] : [50];
      navigator.vibrate(vibrationPattern);
    }

    // Auto-remove toast after duration (unless persistent)
    if (!toast.persistent && toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  }, [generateId, maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'success', title, message, ...options });
  }, [addToast]);

  const error = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ 
      type: 'error', 
      title, 
      message, 
      duration: 7000, // Longer duration for errors
      ...options 
    });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'warning', title, message, ...options });
  }, [addToast]);

  const info = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'info', title, message, ...options });
  }, [addToast]);

  // Priority notification methods
  const urgent = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ 
      type: 'error', 
      title, 
      message, 
      priority: 'high',
      persistent: true,
      duration: 0, // No auto-dismiss
      hapticFeedback: true,
      ...options 
    });
  }, [addToast]);

  const important = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ 
      type: 'warning', 
      title, 
      message, 
      priority: 'medium',
      persistent: true,
      duration: 10000, // Longer duration
      hapticFeedback: true,
      ...options 
    });
  }, [addToast]);

  const critical = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ 
      type: 'error', 
      title, 
      message, 
      priority: 'high',
      persistent: true,
      duration: 0, // No auto-dismiss
      hapticFeedback: true,
      allowSwipeDismiss: false, // Prevent accidental dismissal
      ...options 
    });
  }, [addToast]);

  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    urgent,
    important,
    critical
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ResponsiveToastContainer position={position} maxToasts={maxToasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Responsive Toast Container Component
interface ResponsiveToastContainerProps {
  position: 'top' | 'bottom';
  maxToasts: number;
}

function ResponsiveToastContainer({ position, maxToasts }: ResponsiveToastContainerProps) {
  const { 
    showTutorial, 
    completeTutorial, 
    hideTutorial 
  } = useGestureTutorial();

  return (
    <>
      <NotificationManager position={position} maxToasts={maxToasts} />
      <GestureTutorial 
        show={showTutorial}
        onClose={hideTutorial}
        onComplete={completeTutorial}
      />
    </>
  );
}

// Desktop Toast Container Component
interface DesktopToastContainerProps {
  position: 'top' | 'bottom';
}

function DesktopToastContainer({ position }: DesktopToastContainerProps) {
  const { toasts, removeToast } = useToast();

  const positionClasses = position === 'top' 
    ? 'top-4 right-4' 
    : 'bottom-4 right-4';

  return (
    <div className={`fixed ${positionClasses} z-50 space-y-2 max-w-sm w-full`}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

// Individual Toast Item Component
interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          containerClass: 'bg-green-50 border-green-200 text-green-800',
          iconClass: 'text-green-400',
          icon: CheckCircleIcon
        };
      case 'error':
        return {
          containerClass: 'bg-red-50 border-red-200 text-red-800',
          iconClass: 'text-red-400',
          icon: XCircleIcon
        };
      case 'warning':
        return {
          containerClass: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          iconClass: 'text-yellow-400',
          icon: ExclamationTriangleIcon
        };
      case 'info':
        return {
          containerClass: 'bg-blue-50 border-blue-200 text-blue-800',
          iconClass: 'text-blue-400',
          icon: InformationCircleIcon
        };
      default:
        return {
          containerClass: 'bg-gray-50 border-gray-200 text-gray-800',
          iconClass: 'text-gray-400',
          icon: InformationCircleIcon
        };
    }
  };

  const { containerClass, iconClass, icon: Icon } = getToastStyles(toast.type);

  return (
    <div className={`${containerClass} border rounded-lg shadow-lg p-4 transition-all duration-300 ease-in-out transform hover:scale-105`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`w-5 h-5 ${iconClass}`} />
        </div>
        
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{toast.title}</p>
          {toast.message && (
            <p className="text-sm mt-1 opacity-90">{toast.message}</p>
          )}
          
          {toast.action && (
            <div className="mt-3">
              <button
                onClick={toast.action.onClick}
                className="text-sm font-medium underline hover:no-underline transition-all"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={() => onRemove(toast.id)}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for API error handling
export function useApiError() {
  const { error } = useToast();

  const handleApiError = useCallback((err: unknown, fallbackMessage = '요청 처리 중 오류가 발생했습니다.') => {
    let title = '오류';
    let message = fallbackMessage;

    if (err instanceof Error) {
      title = err.name || '오류';
      message = err.message || fallbackMessage;
    } else if (typeof err === 'string') {
      message = err;
    } else if (err && typeof err === 'object') {
      const errorObj = err as Record<string, unknown>;
      if (errorObj.message && typeof errorObj.message === 'string') {
        message = errorObj.message;
      }
      if (errorObj.title && typeof errorObj.title === 'string') {
        title = errorObj.title;
      }
    }

    return error(title, message);
  }, [error]);

  return { handleApiError };
} 