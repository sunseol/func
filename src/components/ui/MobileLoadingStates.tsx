'use client';

import React, { useEffect, useState } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// Pull-to-refresh loading indicator
interface PullToRefreshProps {
  isRefreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
  threshold?: number;
}

export function PullToRefresh({ 
  isRefreshing, 
  onRefresh, 
  children, 
  threshold = 80 
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= threshold && !isRefreshing) {
      onRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldShowIndicator = isPulling || isRefreshing;

  return (
    <div 
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className={`absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ${
          shouldShowIndicator ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          height: Math.max(pullDistance, isRefreshing ? 60 : 0),
          transform: `translateY(${isRefreshing ? 0 : -60 + pullDistance}px)`
        }}
      >
        <div className="flex flex-col items-center space-y-2">
          {isRefreshing ? (
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <div 
              className="w-6 h-6 border-2 border-gray-400 rounded-full transition-transform duration-200"
              style={{ 
                transform: `rotate(${progress * 180}deg)`,
                borderTopColor: progress >= 1 ? '#3b82f6' : '#9ca3af'
              }}
            >
              <div className="w-1 h-3 bg-current rounded-full" />
            </div>
          )}
          <span className="text-sm text-gray-600">
            {isRefreshing ? '새로고침 중...' : progress >= 1 ? '놓아서 새로고침' : '아래로 당겨서 새로고침'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div 
        style={{ 
          transform: `translateY(${Math.max(pullDistance, isRefreshing ? 60 : 0)}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Infinite scroll loading indicator
interface InfiniteScrollLoadingProps {
  isLoading: boolean;
  hasMore: boolean;
  className?: string;
}

export function InfiniteScrollLoading({ 
  isLoading, 
  hasMore, 
  className = '' 
}: InfiniteScrollLoadingProps) {
  if (!hasMore && !isLoading) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500 text-sm">더 이상 불러올 항목이 없습니다</p>
      </div>
    );
  }

  if (!isLoading) return null;

  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-600 text-sm">더 많은 항목을 불러오는 중...</span>
      </div>
    </div>
  );
}

// Swipe loading indicator for mobile gestures
interface SwipeLoadingProps {
  direction: 'left' | 'right';
  isLoading: boolean;
  progress: number; // 0 to 1
  threshold?: number;
  className?: string;
}

export function SwipeLoading({ 
  direction, 
  isLoading, 
  progress, 
  threshold = 0.3,
  className = '' 
}: SwipeLoadingProps) {
  const isActive = progress >= threshold;
  
  return (
    <div className={`absolute inset-y-0 ${direction === 'left' ? 'right-0' : 'left-0'} flex items-center justify-center w-20 ${className}`}>
      <div 
        className={`transition-all duration-200 ${
          isActive ? 'scale-100 opacity-100' : 'scale-75 opacity-50'
        }`}
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <div 
            className={`w-6 h-6 rounded-full border-2 transition-colors duration-200 ${
              isActive ? 'border-white bg-white bg-opacity-20' : 'border-gray-400'
            }`}
          >
            <div className={`w-2 h-2 rounded-full bg-current m-1 transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-gray-400'
            }`} />
          </div>
        )}
      </div>
    </div>
  );
}

// Mobile-optimized progress bar
interface MobileProgressBarProps {
  progress: number; // 0 to 100
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'red' | 'yellow';
  className?: string;
  animated?: boolean;
}

export function MobileProgressBar({ 
  progress, 
  showPercentage = true,
  size = 'md',
  color = 'blue',
  className = '',
  animated = true
}: MobileProgressBarProps) {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-between items-center mb-2">
          <span className={`text-gray-600 ${textSizeClasses[size]}`}>진행률</span>
          <span className={`font-medium text-gray-800 ${textSizeClasses[size]}`}>
            {Math.round(progress)}%
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div 
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-300 ${
            animated ? 'ease-out' : ''
          }`}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

// Step progress indicator for mobile workflows
interface MobileStepProgressProps {
  steps: string[];
  currentStep: number;
  completedSteps?: number[];
  className?: string;
}

export function MobileStepProgress({ 
  steps, 
  currentStep, 
  completedSteps = [],
  className = '' 
}: MobileStepProgressProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-600">
          단계 {currentStep + 1} / {steps.length}
        </span>
        <span className="text-sm font-medium text-gray-800">
          {Math.round(((currentStep + 1) / steps.length) * 100)}%
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="h-2 bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
      
      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;
          
          return (
            <div key={index} className="flex items-center space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                isCompleted 
                  ? 'bg-green-500 text-white' 
                  : isCurrent 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {isCompleted ? '✓' : index + 1}
              </div>
              <span className={`text-sm ${
                isCurrent ? 'font-medium text-gray-900' : 'text-gray-600'
              }`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Mobile loading button with different states
interface MobileLoadingButtonProps {
  isLoading: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  loadingText?: string;
}

export function MobileLoadingButton({ 
  isLoading,
  disabled = false,
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  loadingText
}: MobileLoadingButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 min-h-[44px] touch-manipulation';
  
  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-100',
    danger: 'bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-300'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const spinnerSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {isLoading ? (
        <>
          <div className={`${spinnerSizes[size]} border-2 border-current border-t-transparent rounded-full animate-spin mr-2`} />
          {loadingText || '처리 중...'}
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Skeleton loader specifically for mobile chat messages
export function MobileChatSkeleton({ 
  messageCount = 3,
  className = '' 
}: { 
  messageCount?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-4 p-4 ${className}`}>
      {Array.from({ length: messageCount }).map((_, index) => {
        const isUser = index % 2 === 1;
        return (
          <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${
              isUser ? 'bg-blue-500' : 'bg-gray-200'
            }`}>
              <div className="space-y-2">
                <div className={`h-4 rounded animate-pulse ${
                  isUser ? 'bg-blue-400' : 'bg-gray-300'
                }`} style={{ width: `${60 + Math.random() * 30}%` }} />
                {Math.random() > 0.5 && (
                  <div className={`h-4 rounded animate-pulse ${
                    isUser ? 'bg-blue-400' : 'bg-gray-300'
                  }`} style={{ width: `${40 + Math.random() * 40}%` }} />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}