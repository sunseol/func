'use client';

import React, { useState, useRef } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/responsive-utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useKeyboardAvoidance } from '@/hooks/useKeyboardAvoidance';

interface MobileDatePickerProps {
  value?: string; // ISO date string (YYYY-MM-DD)
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
  helperText?: string;
  errorMessage?: string;
  min?: string; // ISO date string
  max?: string; // ISO date string
  type?: 'date' | 'datetime-local' | 'time';
}

/**
 * Mobile-optimized date picker that uses native date input on mobile
 * and provides a consistent experience across devices
 */
export const MobileDatePicker: React.FC<MobileDatePickerProps> = ({
  value,
  onChange,
  placeholder = '날짜를 선택하세요',
  disabled = false,
  error = false,
  className = '',
  label,
  required = false,
  helperText,
  errorMessage,
  min,
  max,
  type = 'date'
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const { isMobile } = useBreakpoint();
  const { scrollToFocusedElement } = useKeyboardAvoidance({ enabled: isMobile });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (isMobile) {
      setTimeout(() => {
        scrollToFocusedElement();
      }, 300);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const getInputStyles = () => {
    const baseStyles = cn(
      'w-full border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors',
      'bg-white',
      isMobile ? 'px-4 py-3 text-base min-h-[48px] text-[16px]' : 'px-3 py-2 text-sm min-h-[40px]'
    );

    if (error) {
      return cn(baseStyles, 'border-red-300 focus:border-red-500 focus:ring-red-500');
    }

    return cn(baseStyles, 'border-gray-300 focus:border-blue-500 focus:ring-blue-500');
  };

  const formatDisplayValue = (dateValue: string) => {
    if (!dateValue) return '';
    
    try {
      const date = new Date(dateValue);
      
      switch (type) {
        case 'date':
          return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        case 'datetime-local':
          return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        case 'time':
          return date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
          });
        default:
          return dateValue;
      }
    } catch {
      return dateValue;
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className={cn(
          'block font-medium text-gray-700',
          isMobile ? 'text-base' : 'text-sm'
        )}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Native date input - hidden but functional */}
        <input
          ref={inputRef}
          type={type}
          value={value || ''}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          min={min}
          max={max}
          className={cn(
            getInputStyles(),
            // Hide native date picker styling on mobile for consistent appearance
            isMobile ? 'appearance-none' : '',
            className
          )}
          style={{
            // Ensure the native date picker is accessible but styled consistently
            colorScheme: 'light'
          }}
        />
        
        {/* Custom display overlay for better visual consistency */}
        {!isFocused && !value && (
          <div className={cn(
            'absolute inset-0 flex items-center pointer-events-none',
            isMobile ? 'px-4' : 'px-3'
          )}>
            <span className="text-gray-500">{placeholder}</span>
          </div>
        )}
        
        {/* Calendar icon */}
        <div className={cn(
          'absolute inset-y-0 right-0 flex items-center pointer-events-none',
          isMobile ? 'pr-4' : 'pr-3'
        )}>
          <CalendarIcon className={cn(
            'text-gray-400',
            isMobile ? 'w-6 h-6' : 'w-5 h-5'
          )} />
        </div>
      </div>

      {/* Display formatted value for better readability */}
      {value && !isFocused && (
        <div className={cn(
          'text-gray-600',
          isMobile ? 'text-sm' : 'text-xs'
        )}>
          선택된 날짜: {formatDisplayValue(value)}
        </div>
      )}

      {errorMessage && (
        <p className={cn(
          'text-red-600',
          isMobile ? 'text-base' : 'text-sm'
        )}>{errorMessage}</p>
      )}
      
      {helperText && !errorMessage && (
        <p className={cn(
          'text-gray-500',
          isMobile ? 'text-base' : 'text-sm'
        )}>{helperText}</p>
      )}
    </div>
  );
};

/**
 * Date range picker component optimized for mobile
 */
interface MobileDateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (value: string) => void;
  onEndDateChange?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
  helperText?: string;
  errorMessage?: string;
  min?: string;
  max?: string;
}

export const MobileDateRangePicker: React.FC<MobileDateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false,
  error = false,
  className = '',
  label,
  required = false,
  helperText,
  errorMessage,
  min,
  max
}) => {
  const { isMobile } = useBreakpoint();

  return (
    <div className={cn('space-y-4', className)}>
      {label && (
        <label className={cn(
          'block font-medium text-gray-700',
          isMobile ? 'text-base' : 'text-sm'
        )}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className={cn(
        'grid gap-4',
        isMobile ? 'grid-cols-1' : 'grid-cols-2'
      )}>
        <MobileDatePicker
          value={startDate}
          onChange={onStartDateChange}
          placeholder="시작 날짜"
          disabled={disabled}
          error={error}
          min={min}
          max={endDate || max} // End date can't be before start date
          label={isMobile ? "시작 날짜" : undefined}
        />
        
        <MobileDatePicker
          value={endDate}
          onChange={onEndDateChange}
          placeholder="종료 날짜"
          disabled={disabled}
          error={error}
          min={startDate || min} // Start date can't be after end date
          max={max}
          label={isMobile ? "종료 날짜" : undefined}
        />
      </div>

      {errorMessage && (
        <p className={cn(
          'text-red-600',
          isMobile ? 'text-base' : 'text-sm'
        )}>{errorMessage}</p>
      )}
      
      {helperText && !errorMessage && (
        <p className={cn(
          'text-gray-500',
          isMobile ? 'text-base' : 'text-sm'
        )}>{helperText}</p>
      )}
    </div>
  );
};