'use client';

import React from 'react';

// Base skeleton component
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

function Skeleton({ 
  className = '', 
  width, 
  height, 
  rounded = false,
  animate = true 
}: SkeletonProps) {
  const baseClasses = `bg-gray-200 ${animate ? 'animate-pulse' : ''}`;
  const roundedClass = rounded ? 'rounded-full' : 'rounded';
  
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      className={`${baseClasses} ${roundedClass} ${className}`}
      style={style}
    />
  );
}

// Text line skeleton
interface TextSkeletonProps {
  lines?: number;
  className?: string;
  animate?: boolean;
}

export function TextSkeleton({ lines = 1, className = '', animate = true }: TextSkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={16}
          width={index === lines - 1 ? '75%' : '100%'}
          animate={animate}
        />
      ))}
    </div>
  );
}

// Card skeleton
interface CardSkeletonProps {
  className?: string;
  showAvatar?: boolean;
  titleLines?: number;
  contentLines?: number;
  animate?: boolean;
}

export function CardSkeleton({ 
  className = '',
  showAvatar = false,
  titleLines = 1,
  contentLines = 3,
  animate = true
}: CardSkeletonProps) {
  return (
    <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
      {showAvatar && (
        <div className="flex items-center space-x-3 mb-4">
          <Skeleton width={40} height={40} rounded animate={animate} />
          <div className="flex-1">
            <Skeleton height={16} width="60%" animate={animate} />
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        <TextSkeleton lines={titleLines} animate={animate} />
        <TextSkeleton lines={contentLines} animate={animate} />
      </div>
    </div>
  );
}

// Table skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  animate?: boolean;
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  className = '',
  animate = true
}: TableSkeletonProps) {
  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} height={16} width="80%" animate={animate} />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-3">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  height={16} 
                  width={colIndex === 0 ? '90%' : '70%'} 
                  animate={animate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// List skeleton
interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  className?: string;
  animate?: boolean;
}

export function ListSkeleton({ 
  items = 5, 
  showAvatar = true,
  className = '',
  animate = true
}: ListSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
          {showAvatar && (
            <Skeleton width={40} height={40} rounded animate={animate} />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="60%" animate={animate} />
            <Skeleton height={14} width="80%" animate={animate} />
          </div>
          <Skeleton width={60} height={20} animate={animate} />
        </div>
      ))}
    </div>
  );
}

// Project card skeleton (AI PM specific)
export function ProjectCardSkeleton({ className = '', animate = true }: { className?: string; animate?: boolean }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton height={20} width="70%" animate={animate} />
            <div className="mt-2">
              <Skeleton height={14} width="90%" animate={animate} />
            </div>
          </div>
          <Skeleton width={80} height={24} animate={animate} />
        </div>
        
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Skeleton height={14} width="40%" animate={animate} />
            <Skeleton height={14} width="20%" animate={animate} />
          </div>
          <Skeleton height={8} width="100%" animate={animate} />
        </div>
        
        {/* Members */}
        <div className="flex items-center space-x-2">
          <Skeleton height={14} width="30%" animate={animate} />
          <div className="flex space-x-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} width={24} height={24} rounded animate={animate} />
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <Skeleton height={12} width="50%" animate={animate} />
          <Skeleton width={60} height={32} animate={animate} />
        </div>
      </div>
    </div>
  );
}

// Document editor skeleton (AI PM specific)
export function DocumentEditorSkeleton({ className = '', animate = true }: { className?: string; animate?: boolean }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <Skeleton height={24} width="40%" animate={animate} />
          <div className="flex space-x-2">
            <Skeleton width={80} height={32} animate={animate} />
            <Skeleton width={60} height={32} animate={animate} />
            <Skeleton width={40} height={32} animate={animate} />
          </div>
        </div>
      </div>
      
      {/* Content area */}
      <div className="p-4 space-y-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton 
            key={index} 
            height={16} 
            width={index % 3 === 0 ? '60%' : index % 2 === 0 ? '90%' : '75%'} 
            animate={animate}
          />
        ))}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <Skeleton height={14} width="30%" animate={animate} />
          <div className="flex space-x-2">
            <Skeleton width={80} height={32} animate={animate} />
            <Skeleton width={60} height={32} animate={animate} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Chat message skeleton (AI PM specific)
export function ChatMessageSkeleton({ 
  isUser = false, 
  className = '', 
  animate = true 
}: { 
  isUser?: boolean; 
  className?: string; 
  animate?: boolean;
}) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${className}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isUser ? 'bg-blue-500' : 'bg-gray-200'
      }`}>
        <div className="space-y-2">
          <Skeleton 
            height={14} 
            width="80%" 
            animate={animate}
            className={isUser ? 'bg-blue-400' : ''}
          />
          <Skeleton 
            height={14} 
            width="60%" 
            animate={animate}
            className={isUser ? 'bg-blue-400' : ''}
          />
        </div>
      </div>
    </div>
  );
}

// Page loading skeleton
export function PageLoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton height={32} width="300px" />
            <Skeleton height={16} width="200px" />
          </div>
          <Skeleton width={120} height={40} />
        </div>
        
        {/* Navigation */}
        <div className="flex space-x-8 border-b border-gray-200">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={20} width="80px" />
          ))}
        </div>
        
        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Loading spinner component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  color?: 'blue' | 'gray' | 'white';
}

export function LoadingSpinner({ size = 'md', className = '', text, color = 'blue' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'border-blue-500 border-t-transparent',
    gray: 'border-gray-400 border-t-transparent',
    white: 'border-white border-t-transparent'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-3">
        <div className={`${sizeClasses[size]} border-4 ${colorClasses[color]} rounded-full animate-spin`}></div>
        {text && (
          <span className={`text-gray-600 ${textSizeClasses[size]} text-center`}>
            {text}
          </span>
        )}
      </div>
    </div>
  );
}

// Mobile-optimized loading indicators
interface MobileLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  variant?: 'dots' | 'spinner' | 'pulse';
}

export function MobileLoadingSpinner({ 
  size = 'md', 
  className = '', 
  text,
  variant = 'spinner'
}: MobileLoadingSpinnerProps) {
  const sizeClasses = {
    sm: { spinner: 'w-6 h-6', dot: 'w-2 h-2', text: 'text-sm' },
    md: { spinner: 'w-10 h-10', dot: 'w-3 h-3', text: 'text-base' },
    lg: { spinner: 'w-14 h-14', dot: 'w-4 h-4', text: 'text-lg' }
  };

  if (variant === 'dots') {
    return (
      <div className={`flex flex-col items-center space-y-4 ${className}`}>
        <div className="flex space-x-2">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`${sizeClasses[size].dot} bg-blue-500 rounded-full animate-bounce`}
              style={{ animationDelay: `${index * 0.1}s` }}
            />
          ))}
        </div>
        {text && (
          <span className={`text-gray-600 ${sizeClasses[size].text} text-center px-4`}>
            {text}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={`flex flex-col items-center space-y-4 ${className}`}>
        <div className={`${sizeClasses[size].spinner} bg-blue-500 rounded-full animate-pulse`} />
        {text && (
          <span className={`text-gray-600 ${sizeClasses[size].text} text-center px-4`}>
            {text}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <div className={`${sizeClasses[size].spinner} border-4 border-blue-500 border-t-transparent rounded-full animate-spin`} />
      {text && (
        <span className={`text-gray-600 ${sizeClasses[size].text} text-center px-4`}>
          {text}
        </span>
      )}
    </div>
  );
}

// Full screen loading overlay for mobile
interface MobileLoadingOverlayProps {
  isVisible: boolean;
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
  onCancel?: () => void;
  cancelText?: string;
}

export function MobileLoadingOverlay({ 
  isVisible, 
  text = '로딩 중...',
  variant = 'spinner',
  onCancel,
  cancelText = '취소'
}: MobileLoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center">
        <MobileLoadingSpinner 
          size="lg" 
          text={text}
          variant={variant}
          className="mb-6"
        />
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full mt-4 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors min-h-[48px]"
          >
            {cancelText}
          </button>
        )}
      </div>
    </div>
  );
}

// Mobile skeleton components with touch-friendly sizing
export function MobileCardSkeleton({ className = '', animate = true }: { className?: string; animate?: boolean }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header with larger touch targets */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton height={24} width="80%" animate={animate} />
            <div className="mt-3">
              <Skeleton height={16} width="100%" animate={animate} />
            </div>
          </div>
          <Skeleton width={60} height={32} animate={animate} />
        </div>
        
        {/* Progress with mobile-friendly sizing */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton height={16} width="40%" animate={animate} />
            <Skeleton height={16} width="25%" animate={animate} />
          </div>
          <Skeleton height={12} width="100%" animate={animate} />
        </div>
        
        {/* Action area with touch-friendly buttons */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <Skeleton height={16} width="50%" animate={animate} />
          <Skeleton width={80} height={44} animate={animate} />
        </div>
      </div>
    </div>
  );
}

export function MobileListSkeleton({ 
  items = 5, 
  className = '',
  animate = true
}: { 
  items?: number;
  className?: string; 
  animate?: boolean;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
          <Skeleton width={48} height={48} rounded animate={animate} />
          <div className="flex-1 space-y-3">
            <Skeleton height={18} width="70%" animate={animate} />
            <Skeleton height={16} width="90%" animate={animate} />
          </div>
          <Skeleton width={44} height={44} animate={animate} />
        </div>
      ))}
    </div>
  );
}

// Mobile table skeleton with card-like layout
export function MobileTableSkeleton({ 
  rows = 5, 
  className = '',
  animate = true
}: { 
  rows?: number;
  className?: string; 
  animate?: boolean;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="space-y-3">
            {/* Main content */}
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton height={18} width="80%" animate={animate} />
                <Skeleton height={16} width="60%" animate={animate} />
              </div>
              <Skeleton width={60} height={24} animate={animate} />
            </div>
            
            {/* Secondary info */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Skeleton height={14} width="40%" animate={animate} />
              <div className="flex space-x-2">
                <Skeleton width={44} height={32} animate={animate} />
                <Skeleton width={44} height={32} animate={animate} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Consolidated skeleton components for easy import
const LoadingSkeletons = {
  // Basic components
  Skeleton,
  Text: TextSkeleton,
  Card: CardSkeleton,
  Table: TableSkeleton,
  List: ListSkeleton,
  
  // AI-PM specific
  ProjectCard: ProjectCardSkeleton,
  Editor: DocumentEditorSkeleton,
  Chat: ChatMessageSkeleton,
  
  // Page layouts
  Page: PageLoadingSkeleton,

  Modal: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="space-y-4">
          <Skeleton height={24} width="70%" animate={true} />
          <Skeleton height={16} width="50%" animate={true} />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height={44} width="100%" animate={true} />
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Skeleton height={40} width={96} animate={true} />
            <Skeleton height={40} width={96} animate={true} />
          </div>
        </div>
      </div>
    </div>
  ),
  
  // Mobile optimized
  MobileCard: MobileCardSkeleton,
  MobileList: MobileListSkeleton,
  MobileTable: MobileTableSkeleton,
  
  // Mobile page layouts
  MobilePage: () => (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="space-y-4">
        <Skeleton height={48} width="100%" animate={true} />
        <Skeleton height={128} width="100%" animate={true} />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <MobileCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  ),

  MobileModal: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-lg w-full max-h-[80vh] p-4">
        <div className="space-y-4">
          <Skeleton height={24} width="75%" animate={true} />
          <Skeleton height={16} width="50%" animate={true} />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height={48} width="100%" animate={true} />
            ))}
          </div>
        </div>
      </div>
    </div>
  ),

  MobileSidebar: () => (
    <div className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 p-4 z-40">
      <div className="space-y-3">
        <Skeleton height={16} width="50%" animate={true} />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} height={44} width="100%" animate={true} />
        ))}
      </div>
    </div>
  ),

  Sidebar: () => (
    <div className="h-full w-80 bg-white border-r border-gray-200 p-4">
      <div className="space-y-4">
        <Skeleton height={24} width="60%" animate={true} />
        <Skeleton height={16} width="80%" animate={true} />
        <div className="space-y-2 pt-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} height={40} width="100%" animate={true} />
          ))}
        </div>
      </div>
    </div>
  ),
  
  // Loading spinners
  Spinner: LoadingSpinner,
  MobileSpinner: MobileLoadingSpinner,
  MobileOverlay: MobileLoadingOverlay,
};

export default LoadingSkeletons; 
