'use client';

import React from 'react';
import { cn } from '@/lib/responsive-utils';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'gray' | 'white' | 'blue';
}

/**
 * Hamburger menu component with smooth animations
 * Meets accessibility requirements with 44px+ touch target
 */
export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onClick,
  className,
  size = 'md',
  color = 'gray'
}) => {
  const sizeClasses = {
    sm: {
      button: 'min-h-[44px] min-w-[44px] p-2',
      line: 'h-0.5 w-4',
      spacing: 'space-y-1'
    },
    md: {
      button: 'min-h-[44px] min-w-[44px] p-2.5',
      line: 'h-0.5 w-5',
      spacing: 'space-y-1.5'
    },
    lg: {
      button: 'min-h-[48px] min-w-[48px] p-3',
      line: 'h-0.5 w-6',
      spacing: 'space-y-2'
    }
  };

  const colorClasses = {
    gray: {
      button: 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
      line: 'bg-current'
    },
    white: {
      button: 'text-white hover:text-gray-200 hover:bg-white/10',
      line: 'bg-current'
    },
    blue: {
      button: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50',
      line: 'bg-current'
    }
  };

  const currentSize = sizeClasses[size];
  const currentColor = colorClasses[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-md transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'active:scale-95',
        // Size and color classes
        currentSize.button,
        currentColor.button,
        className
      )}
      aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
      aria-expanded={isOpen}
      type="button"
    >
      <div className={cn('flex flex-col', currentSize.spacing)}>
        {/* Top line */}
        <span
          className={cn(
            currentSize.line,
            currentColor.line,
            'transform transition-all duration-300 ease-in-out',
            isOpen ? 'rotate-45 translate-y-2' : 'rotate-0 translate-y-0'
          )}
        />
        
        {/* Middle line */}
        <span
          className={cn(
            currentSize.line,
            currentColor.line,
            'transform transition-all duration-300 ease-in-out',
            isOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
          )}
        />
        
        {/* Bottom line */}
        <span
          className={cn(
            currentSize.line,
            currentColor.line,
            'transform transition-all duration-300 ease-in-out',
            isOpen ? '-rotate-45 -translate-y-2' : 'rotate-0 translate-y-0'
          )}
        />
      </div>
    </button>
  );
};

export default HamburgerMenu;