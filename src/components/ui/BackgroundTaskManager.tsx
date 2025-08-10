'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { MobileProgressBar } from './MobileLoadingStates';

export interface BackgroundTask {
  id: string;
  title: string;
  description?: string;
  progress: number; // 0-100
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  error?: string;
  cancellable?: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  metadata?: Record<string, any>;
}

interface BackgroundTaskContextType {
  tasks: BackgroundTask[];
  addTask: (task: Omit<BackgroundTask, 'id' | 'startTime' | 'status'>) => string;
  updateTask: (id: string, updates: Partial<BackgroundTask>) => void;
  removeTask: (id: string) => void;
  cancelTask: (id: string) => void;
  retryTask: (id: string) => void;
  clearCompletedTasks: () => void;
  getRunningTasks: () => BackgroundTask[];
  getCompletedTasks: () => BackgroundTask[];
  getFailedTasks: () => BackgroundTask[];
}

const BackgroundTaskContext = createContext<BackgroundTaskContextType | undefined>(undefined);

interface BackgroundTaskProviderProps {
  children: ReactNode;
  maxTasks?: number;
  autoRemoveCompleted?: boolean;
  autoRemoveDelay?: number;
}

export function BackgroundTaskProvider({ 
  children, 
  maxTasks = 10,
  autoRemoveCompleted = true,
  autoRemoveDelay = 5000 
}: BackgroundTaskProviderProps) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);

  // Auto-remove completed tasks
  useEffect(() => {
    if (!autoRemoveCompleted) return;

    const interval = setInterval(() => {
      setTasks(prev => prev.filter(task => {
        if (task.status === 'completed' && task.endTime) {
          return Date.now() - task.endTime < autoRemoveDelay;
        }
        return true;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRemoveCompleted, autoRemoveDelay]);

  const addTask = (taskData: Omit<BackgroundTask, 'id' | 'startTime' | 'status'>): string => {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTask: BackgroundTask = {
      ...taskData,
      id,
      startTime: Date.now(),
      status: 'pending',
      progress: 0
    };

    setTasks(prev => {
      const updated = [newTask, ...prev];
      // Limit number of tasks
      return updated.slice(0, maxTasks);
    });

    return id;
  };

  const updateTask = (id: string, updates: Partial<BackgroundTask>) => {
    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        const updatedTask = { ...task, ...updates };
        
        // Set end time when task completes or fails
        if ((updates.status === 'completed' || updates.status === 'failed') && !task.endTime) {
          updatedTask.endTime = Date.now();
        }
        
        return updatedTask;
      }
      return task;
    }));
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const cancelTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task?.onCancel) {
      task.onCancel();
    }
    updateTask(id, { status: 'cancelled', endTime: Date.now() });
  };

  const retryTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task?.onRetry) {
      updateTask(id, { 
        status: 'pending', 
        progress: 0, 
        error: undefined,
        endTime: undefined,
        startTime: Date.now()
      });
      task.onRetry();
    }
  };

  const clearCompletedTasks = () => {
    setTasks(prev => prev.filter(task => 
      task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled'
    ));
  };

  const getRunningTasks = () => tasks.filter(task => 
    task.status === 'running' || task.status === 'pending'
  );

  const getCompletedTasks = () => tasks.filter(task => task.status === 'completed');

  const getFailedTasks = () => tasks.filter(task => task.status === 'failed');

  const contextValue: BackgroundTaskContextType = {
    tasks,
    addTask,
    updateTask,
    removeTask,
    cancelTask,
    retryTask,
    clearCompletedTasks,
    getRunningTasks,
    getCompletedTasks,
    getFailedTasks
  };

  return (
    <BackgroundTaskContext.Provider value={contextValue}>
      {children}
    </BackgroundTaskContext.Provider>
  );
}

export function useBackgroundTasks(): BackgroundTaskContextType {
  const context = useContext(BackgroundTaskContext);
  if (context === undefined) {
    throw new Error('useBackgroundTasks must be used within a BackgroundTaskProvider');
  }
  return context;
}

// Mobile task progress indicator
interface MobileTaskProgressProps {
  task: BackgroundTask;
  onCancel?: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
  className?: string;
}

export function MobileTaskProgress({ 
  task, 
  onCancel, 
  onRetry, 
  onDismiss,
  compact = false,
  className = '' 
}: MobileTaskProgressProps) {
  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <XMarkIcon className="w-5 h-5 text-gray-500" />;
      case 'running':
        return (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <div className="w-5 h-5 bg-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'cancelled':
        return 'border-gray-200 bg-gray-50';
      case 'running':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const formatDuration = (startTime: number, endTime?: number) => {
    const duration = (endTime || Date.now()) - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}분 ${seconds % 60}초`;
    }
    return `${seconds}초`;
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 p-3 border rounded-lg ${getStatusColor()} ${className}`}>
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
          {task.status === 'running' && (
            <div className="mt-1">
              <MobileProgressBar 
                progress={task.progress} 
                showPercentage={false}
                size="sm"
                animated
              />
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
          >
            <XMarkIcon className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()} ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-base font-medium text-gray-900">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            )}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Progress bar for running tasks */}
      {task.status === 'running' && (
        <div className="mb-3">
          <MobileProgressBar 
            progress={task.progress} 
            showPercentage={true}
            size="md"
            animated
          />
        </div>
      )}

      {/* Error message for failed tasks */}
      {task.status === 'failed' && task.error && (
        <div className="mb-3 p-3 bg-red-100 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{task.error}</p>
        </div>
      )}

      {/* Task info */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>시작: {new Date(task.startTime).toLocaleTimeString()}</span>
        <span>소요시간: {formatDuration(task.startTime, task.endTime)}</span>
      </div>

      {/* Action buttons */}
      <div className="flex space-x-2">
        {task.status === 'running' && task.cancellable && (
          <button
            onClick={onCancel}
            className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200 transition-colors min-h-[40px]"
          >
            취소
          </button>
        )}
        
        {task.status === 'failed' && task.onRetry && (
          <button
            onClick={onRetry}
            className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors min-h-[40px] flex items-center justify-center"
          >
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}

// Mobile task manager overlay
interface MobileTaskManagerProps {
  isVisible: boolean;
  onClose: () => void;
  position?: 'bottom' | 'top';
}

export function MobileTaskManager({ 
  isVisible, 
  onClose, 
  position = 'bottom' 
}: MobileTaskManagerProps) {
  const { 
    tasks, 
    cancelTask, 
    retryTask, 
    removeTask, 
    clearCompletedTasks,
    getRunningTasks,
    getCompletedTasks,
    getFailedTasks
  } = useBackgroundTasks();

  const [showCompleted, setShowCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<'running' | 'completed' | 'failed'>('running');

  const runningTasks = getRunningTasks();
  const completedTasks = getCompletedTasks();
  const failedTasks = getFailedTasks();

  if (!isVisible) return null;

  const positionClasses = position === 'bottom' 
    ? 'bottom-0 animate-slide-up' 
    : 'top-0 animate-slide-down';

  const getTabTasks = () => {
    switch (activeTab) {
      case 'running':
        return runningTasks;
      case 'completed':
        return completedTasks;
      case 'failed':
        return failedTasks;
      default:
        return [];
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className={`fixed left-0 right-0 ${positionClasses} bg-white rounded-t-lg max-h-[80vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">백그라운드 작업</h2>
          <div className="flex items-center space-x-2">
            {completedTasks.length > 0 && (
              <button
                onClick={clearCompletedTasks}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                완료된 작업 정리
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('running')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'running'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            진행 중 ({runningTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'completed'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            완료됨 ({completedTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('failed')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'failed'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            실패함 ({failedTasks.length})
          </button>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto p-4">
          {getTabTasks().length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {activeTab === 'running' && '진행 중인 작업이 없습니다'}
                {activeTab === 'completed' && '완료된 작업이 없습니다'}
                {activeTab === 'failed' && '실패한 작업이 없습니다'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {getTabTasks().map(task => (
                <MobileTaskProgress
                  key={task.id}
                  task={task}
                  onCancel={() => cancelTask(task.id)}
                  onRetry={() => retryTask(task.id)}
                  onDismiss={() => removeTask(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Floating task indicator
interface FloatingTaskIndicatorProps {
  onClick: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function FloatingTaskIndicator({ 
  onClick, 
  position = 'bottom-right' 
}: FloatingTaskIndicatorProps) {
  const { getRunningTasks, getFailedTasks } = useBackgroundTasks();
  const runningTasks = getRunningTasks();
  const failedTasks = getFailedTasks();
  
  const totalActiveTasks = runningTasks.length + failedTasks.length;

  if (totalActiveTasks === 0) return null;

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  return (
    <button
      onClick={onClick}
      className={`fixed ${positionClasses[position]} z-40 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 min-h-[56px] min-w-[56px] flex items-center justify-center`}
    >
      <div className="relative">
        {runningTasks.length > 0 ? (
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <ExclamationCircleIcon className="w-6 h-6" />
        )}
        
        {totalActiveTasks > 1 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {totalActiveTasks > 9 ? '9+' : totalActiveTasks}
          </div>
        )}
      </div>
    </button>
  );
}

// Hook for managing long-running tasks
interface UseLongTaskOptions {
  title: string;
  description?: string;
  cancellable?: boolean;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export function useLongTask(options: UseLongTaskOptions) {
  const { addTask, updateTask, removeTask } = useBackgroundTasks();
  const [taskId, setTaskId] = useState<string | null>(null);

  const startTask = () => {
    const id = addTask({
      title: options.title,
      description: options.description,
      progress: 0,
      cancellable: options.cancellable,
      onCancel: () => {
        if (options.onCancel) {
          options.onCancel();
        }
        if (taskId) {
          updateTask(taskId, { status: 'cancelled' });
        }
      }
    });
    
    setTaskId(id);
    updateTask(id, { status: 'running' });
    return id;
  };

  const updateProgress = (progress: number) => {
    if (taskId) {
      updateTask(taskId, { progress: Math.min(Math.max(progress, 0), 100) });
      if (options.onProgress) {
        options.onProgress(progress);
      }
    }
  };

  const completeTask = () => {
    if (taskId) {
      updateTask(taskId, { status: 'completed', progress: 100 });
      if (options.onComplete) {
        options.onComplete();
      }
    }
  };

  const failTask = (error: string) => {
    if (taskId) {
      updateTask(taskId, { status: 'failed', error });
      if (options.onError) {
        options.onError(error);
      }
    }
  };

  const cancelTask = () => {
    if (taskId) {
      updateTask(taskId, { status: 'cancelled' });
      if (options.onCancel) {
        options.onCancel();
      }
    }
  };

  return {
    startTask,
    updateProgress,
    completeTask,
    failTask,
    cancelTask,
    taskId
  };
}