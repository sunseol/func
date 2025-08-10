'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/responsive-utils';
import { 
  EllipsisVerticalIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}

interface MobileActionMenuProps {
  items: ActionMenuItem[];
  trigger?: 'click' | 'hover';
  placement?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}

export default function MobileActionMenu({
  items,
  trigger = 'click',
  placement = 'bottom-right',
  className,
  buttonClassName,
  menuClassName,
  disabled = false
}: MobileActionMenuProps) {
  const { isMobile } = useBreakpoint();
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowModal(false);
      }
    };

    if (isOpen || showModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showModal]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setShowModal(false);
      }
    };

    if (isOpen || showModal) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, showModal]);

  const handleButtonClick = () => {
    if (disabled) return;
    
    if (isMobile) {
      setShowModal(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleItemClick = (item: ActionMenuItem) => {
    if (item.disabled) return;
    
    item.onClick();
    setIsOpen(false);
    setShowModal(false);
  };

  const getMenuPosition = () => {
    const positions = {
      'bottom-left': 'top-full left-0 mt-1',
      'bottom-right': 'top-full right-0 mt-1',
      'top-left': 'bottom-full left-0 mb-1',
      'top-right': 'bottom-full right-0 mb-1'
    };
    return positions[placement];
  };

  const enabledItems = items.filter(item => !item.disabled);

  if (enabledItems.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn('relative inline-block', className)}>
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          onMouseEnter={() => trigger === 'hover' && !isMobile && setIsOpen(true)}
          onMouseLeave={() => trigger === 'hover' && !isMobile && setIsOpen(false)}
          disabled={disabled}
          className={cn(
            'flex items-center justify-center p-2 rounded-lg transition-colors',
            'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isMobile ? 'min-w-[44px] min-h-[44px]' : 'w-8 h-8',
            buttonClassName
          )}
          aria-label="액션 메뉴"
          aria-expanded={isOpen || showModal}
          aria-haspopup="true"
        >
          <EllipsisVerticalIcon className={cn(
            'text-gray-500',
            isMobile ? 'w-6 h-6' : 'w-5 h-5'
          )} />
        </button>

        {/* Desktop dropdown menu */}
        {!isMobile && isOpen && (
          <div
            ref={menuRef}
            className={cn(
              'absolute z-50 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg',
              'py-1 focus:outline-none',
              getMenuPosition(),
              menuClassName
            )}
            role="menu"
            aria-orientation="vertical"
          >
            {enabledItems.map((item) => {
              const IconComponent = item.icon;
              
              return (
                <button
                  key={item.key}
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2 text-sm text-left',
                    'hover:bg-gray-50 focus:bg-gray-50 focus:outline-none',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    item.danger ? 'text-red-600 hover:bg-red-50 focus:bg-red-50' : 'text-gray-700',
                    item.className
                  )}
                  role="menuitem"
                >
                  {IconComponent && (
                    <IconComponent className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile modal menu */}
      {isMobile && showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50">
          <div 
            className={cn(
              'w-full max-w-sm bg-white rounded-t-2xl shadow-xl',
              'transform transition-transform duration-300 ease-out',
              menuClassName
            )}
            style={{ 
              transform: showModal ? 'translateY(0)' : 'translateY(100%)',
              maxHeight: '80vh'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">액션 선택</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="닫기"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Menu items */}
            <div className="py-2">
              {enabledItems.map((item) => {
                const IconComponent = item.icon;
                
                return (
                  <button
                    key={item.key}
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                    className={cn(
                      'w-full flex items-center gap-4 px-6 py-4 text-left',
                      'hover:bg-gray-50 active:bg-gray-100 transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'min-h-[56px]', // Ensure touch-friendly height
                      item.danger ? 'text-red-600' : 'text-gray-700',
                      item.className
                    )}
                  >
                    {IconComponent && (
                      <div className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-full',
                        item.danger ? 'bg-red-50' : 'bg-gray-50'
                      )}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                    )}
                    <span className="flex-1 text-base font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cancel button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 text-center text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}