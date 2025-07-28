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
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'md', className = '', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex items-center space-x-3">
        <div className={`${sizeClasses[size]} border-4 border-blue-500 border-t-transparent rounded-full animate-spin`}></div>
        {text && <span className="text-gray-600">{text}</span>}
      </div>
    </div>
  );
}

export default Skeleton; 