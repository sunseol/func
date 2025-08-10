'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/responsive-utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useKeyboardAvoidance } from '@/hooks/useKeyboardAvoidance';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface MobileSelectProps {
  options: SelectOption[];
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  label?: string;
  required?: boolean;
  helperText?: string;
  errorMessage?: string;
}

/**
 * Mobile-optimized select component that uses native select on mobile
 * and custom dropdown on desktop for consistent styling
 */
export const MobileSelect: React.FC<MobileSelectProps> = ({
  options,
  value,
  placeholder = '선택하세요',
  disabled = false,
  error = false,
  onChange,
  className = '',
  label,
  required = false,
  helperText,
  errorMessage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isMobile } = useBreakpoint();
  const { scrollToFocusedElement } = useKeyboardAvoidance({ enabled: isMobile });
  const selectRef = useRef<HTMLSelectElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNativeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleCustomSelect = (optionValue: string) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleFocus = () => {
    if (isMobile) {
      setTimeout(() => {
        scrollToFocusedElement();
      }, 300);
    }
  };

  const getSelectStyles = () => {
    const baseStyles = cn(
      'w-full border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors',
      isMobile ? 'px-4 py-3 text-base min-h-[48px] text-[16px]' : 'px-3 py-2 text-sm min-h-[40px]'
    );

    if (error) {
      return cn(baseStyles, 'border-red-300 focus:border-red-500 focus:ring-red-500');
    }

    return cn(baseStyles, 'border-gray-300 focus:border-blue-500 focus:ring-blue-500');
  };

  // On mobile, use native select for better UX
  if (isMobile) {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-base font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={selectRef}
            value={value || ''}
            onChange={handleNativeChange}
            onFocus={handleFocus}
            disabled={disabled}
            className={cn(
              getSelectStyles(),
              'appearance-none bg-white pr-12',
              className
            )}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Custom dropdown arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
            <ChevronDownIcon className="w-6 h-6 text-gray-400" />
          </div>
        </div>

        {errorMessage && (
          <p className="text-base text-red-600">{errorMessage}</p>
        )}
        
        {helperText && !errorMessage && (
          <p className="text-base text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }

  // On desktop, use custom dropdown for better styling control
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            getSelectStyles(),
            'flex items-center justify-between bg-white pr-10',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            className
          )}
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDownIcon 
            className={cn(
              'w-5 h-5 text-gray-400 transition-transform',
              isOpen ? 'rotate-180' : ''
            )} 
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Search input for large option lists */}
            {options.length > 10 && (
              <div className="p-2 border-b border-gray-200">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="검색..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  검색 결과가 없습니다.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !option.disabled && handleCustomSelect(option.value)}
                    disabled={option.disabled}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 flex items-center justify-between',
                      option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                      value === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                    )}
                  >
                    <span>{option.label}</span>
                    {value === option.value && (
                      <CheckIcon className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
      
      {helperText && !errorMessage && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

/**
 * Multi-select component optimized for mobile
 */
interface MobileMultiSelectProps extends Omit<MobileSelectProps, 'value' | 'onChange'> {
  values?: string[];
  onChange?: (values: string[]) => void;
  maxSelections?: number;
}

export const MobileMultiSelect: React.FC<MobileMultiSelectProps> = ({
  options,
  values = [],
  placeholder = '선택하세요',
  disabled = false,
  error = false,
  onChange,
  className = '',
  label,
  required = false,
  helperText,
  errorMessage,
  maxSelections
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile } = useBreakpoint();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOptions = options.filter(option => values.includes(option.value));
  const canSelectMore = !maxSelections || values.length < maxSelections;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleOption = (optionValue: string) => {
    if (!onChange) return;

    const newValues = values.includes(optionValue)
      ? values.filter(v => v !== optionValue)
      : canSelectMore
      ? [...values, optionValue]
      : values;

    onChange(newValues);
  };

  const getDisplayText = () => {
    if (selectedOptions.length === 0) return placeholder;
    if (selectedOptions.length === 1) return selectedOptions[0].label;
    return `${selectedOptions.length}개 선택됨`;
  };

  const getSelectStyles = () => {
    const baseStyles = cn(
      'w-full border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors',
      isMobile ? 'px-4 py-3 text-base min-h-[48px] text-[16px]' : 'px-3 py-2 text-sm min-h-[40px]'
    );

    if (error) {
      return cn(baseStyles, 'border-red-300 focus:border-red-500 focus:ring-red-500');
    }

    return cn(baseStyles, 'border-gray-300 focus:border-blue-500 focus:ring-blue-500');
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
      
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            getSelectStyles(),
            'flex items-center justify-between bg-white pr-10',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            className
          )}
        >
          <span className={selectedOptions.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
            {getDisplayText()}
          </span>
          <ChevronDownIcon 
            className={cn(
              isMobile ? 'w-6 h-6' : 'w-5 h-5',
              'text-gray-400 transition-transform',
              isOpen ? 'rotate-180' : ''
            )} 
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {options.map((option) => {
              const isSelected = values.includes(option.value);
              const canSelect = canSelectMore || isSelected;
              
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => canSelect && !option.disabled && handleToggleOption(option.value)}
                  disabled={option.disabled || (!canSelect && !isSelected)}
                  className={cn(
                    'w-full px-3 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100 flex items-center justify-between',
                    isMobile ? 'text-base min-h-[48px]' : 'text-sm',
                    option.disabled || (!canSelect && !isSelected) 
                      ? 'cursor-not-allowed opacity-50' 
                      : 'cursor-pointer',
                    isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <CheckIcon className={cn(
                      'text-blue-600',
                      isMobile ? 'w-6 h-6' : 'w-4 h-4'
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {maxSelections && (
        <p className={cn(
          'text-gray-500',
          isMobile ? 'text-sm' : 'text-xs'
        )}>
          {values.length}/{maxSelections} 선택됨
        </p>
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