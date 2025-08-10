'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/responsive-utils';
import { 
  FunnelIcon,
  ArrowsUpDownIcon,
  ChevronDownIcon,
  XMarkIcon,
  CheckIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export interface SortOption {
  key: string;
  label: string;
  direction?: 'asc' | 'desc';
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'text' | 'date' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface MobileTableControlsProps {
  // Sorting
  sortOptions?: SortOption[];
  currentSort?: { key: string; direction: 'asc' | 'desc' };
  onSortChange?: (sort: { key: string; direction: 'asc' | 'desc' }) => void;
  
  // Filtering
  filterOptions?: FilterOption[];
  currentFilters?: Record<string, any>;
  onFiltersChange?: (filters: Record<string, any>) => void;
  
  // Search
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  
  // UI
  className?: string;
  showResultCount?: boolean;
  resultCount?: number;
}

interface SortModalProps {
  options: SortOption[];
  currentSort?: { key: string; direction: 'asc' | 'desc' };
  onSortChange: (sort: { key: string; direction: 'asc' | 'desc' }) => void;
  onClose: () => void;
}

function SortModal({ options, currentSort, onSortChange, onClose }: SortModalProps) {
  const handleSortSelect = (option: SortOption) => {
    const direction = option.direction || 'asc';
    onSortChange({ key: option.key, direction });
    onClose();
  };

  const toggleDirection = (key: string, currentDirection: 'asc' | 'desc') => {
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    onSortChange({ key, direction: newDirection });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-sm bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">정렬 기준</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Sort options */}
        <div className="py-2 max-h-96 overflow-y-auto">
          {options.map((option) => {
            const isSelected = currentSort?.key === option.key;
            
            return (
              <div key={option.key} className="px-4">
                <button
                  onClick={() => handleSortSelect(option)}
                  className={cn(
                    'w-full flex items-center justify-between py-4 text-left',
                    'hover:bg-gray-50 active:bg-gray-100 transition-colors',
                    'min-h-[56px] rounded-lg px-3',
                    isSelected && 'bg-blue-50'
                  )}
                >
                  <span className={cn(
                    'text-base font-medium',
                    isSelected ? 'text-blue-600' : 'text-gray-700'
                  )}>
                    {option.label}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDirection(option.key, currentSort!.direction);
                        }}
                        className="p-1 rounded hover:bg-blue-100 transition-colors"
                      >
                        <ArrowsUpDownIcon className="w-4 h-4 text-blue-600" />
                      </button>
                    )}
                    {isSelected && <CheckIcon className="w-5 h-5 text-blue-600" />}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Cancel button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-3 text-center text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

interface FilterModalProps {
  options: FilterOption[];
  currentFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  onClose: () => void;
}

function FilterModal({ options, currentFilters, onFiltersChange, onClose }: FilterModalProps) {
  const [tempFilters, setTempFilters] = useState(currentFilters);

  const handleFilterChange = (key: string, value: any) => {
    setTempFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApply = () => {
    onFiltersChange(tempFilters);
    onClose();
  };

  const handleReset = () => {
    setTempFilters({});
  };

  const renderFilterInput = (option: FilterOption) => {
    const value = tempFilters[option.key];

    switch (option.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFilterChange(option.key, e.target.value)}
            placeholder={option.placeholder}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleFilterChange(option.key, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-white"
          >
            <option value="">전체</option>
            {option.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {option.options?.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt.value)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, opt.value]
                      : selectedValues.filter(v => v !== opt.value);
                    handleFilterChange(option.key, newValues);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-base text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleFilterChange(option.key, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleFilterChange(option.key, e.target.value)}
            placeholder={option.placeholder}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-sm bg-white rounded-t-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-medium text-gray-900">필터</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Filter options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {options.map((option) => (
            <div key={option.key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {option.label}
              </label>
              {renderFilterInput(option)}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3 text-center text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              초기화
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-3 text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MobileTableControls({
  sortOptions = [],
  currentSort,
  onSortChange,
  filterOptions = [],
  currentFilters = {},
  onFiltersChange,
  searchable = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = '검색...',
  className,
  showResultCount = false,
  resultCount = 0
}: MobileTableControlsProps) {
  const { isMobile } = useBreakpoint();
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const hasActiveFilters = Object.values(currentFilters).some(value => 
    value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true)
  );

  const getSortLabel = () => {
    if (!currentSort) return '정렬';
    const option = sortOptions.find(opt => opt.key === currentSort.key);
    const directionLabel = currentSort.direction === 'desc' ? ' (내림차순)' : ' (오름차순)';
    return option ? `${option.label}${directionLabel}` : '정렬';
  };

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* Search bar */}
        {searchable && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                'block w-full pl-10 pr-3 border border-gray-300 rounded-lg',
                'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'placeholder-gray-500',
                isMobile ? 'py-3 text-base' : 'py-2 text-sm'
              )}
            />
          </div>
        )}

        {/* Controls row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Sort button */}
            {sortOptions.length > 0 && onSortChange && (
              <button
                onClick={() => setShowSortModal(true)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg',
                  'hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  'transition-colors',
                  isMobile ? 'min-h-[44px] text-base' : 'text-sm',
                  currentSort && 'bg-blue-50 border-blue-300 text-blue-700'
                )}
              >
                <ArrowsUpDownIcon className="w-4 h-4" />
                <span className="truncate max-w-24">{getSortLabel()}</span>
                <ChevronDownIcon className="w-4 h-4" />
              </button>
            )}

            {/* Filter button */}
            {filterOptions.length > 0 && onFiltersChange && (
              <button
                onClick={() => setShowFilterModal(true)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg',
                  'hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  'transition-colors relative',
                  isMobile ? 'min-h-[44px] text-base' : 'text-sm',
                  hasActiveFilters && 'bg-blue-50 border-blue-300 text-blue-700'
                )}
              >
                <FunnelIcon className="w-4 h-4" />
                <span>필터</span>
                {hasActiveFilters && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full"></div>
                )}
              </button>
            )}
          </div>

          {/* Result count */}
          {showResultCount && (
            <div className="text-sm text-gray-600">
              총 {resultCount.toLocaleString()}개
            </div>
          )}
        </div>
      </div>

      {/* Sort modal */}
      {showSortModal && sortOptions.length > 0 && onSortChange && (
        <SortModal
          options={sortOptions}
          currentSort={currentSort}
          onSortChange={onSortChange}
          onClose={() => setShowSortModal(false)}
        />
      )}

      {/* Filter modal */}
      {showFilterModal && filterOptions.length > 0 && onFiltersChange && (
        <FilterModal
          options={filterOptions}
          currentFilters={currentFilters}
          onFiltersChange={onFiltersChange}
          onClose={() => setShowFilterModal(false)}
        />
      )}
    </>
  );
}