'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/responsive-utils';
import MobileTableControls, { SortOption, FilterOption } from './MobileTableControls';
import { 
  FunnelIcon,
  XMarkIcon,
  BookmarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

export interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, any>;
  sort?: { key: string; direction: 'asc' | 'desc' };
  isDefault?: boolean;
  createdAt: string;
}

interface AdvancedTableFiltersProps {
  // Basic props from MobileTableControls
  sortOptions?: SortOption[];
  currentSort?: { key: string; direction: 'asc' | 'desc' };
  onSortChange?: (sort: { key: string; direction: 'asc' | 'desc' }) => void;
  filterOptions?: FilterOption[];
  currentFilters?: Record<string, any>;
  onFiltersChange?: (filters: Record<string, any>) => void;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showResultCount?: boolean;
  resultCount?: number;
  
  // Advanced features
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, filters: Record<string, any>, sort?: { key: string; direction: 'asc' | 'desc' }) => void;
  onLoadFilter?: (filter: SavedFilter) => void;
  onDeleteFilter?: (filterId: string) => void;
  showSavedFilters?: boolean;
  
  // Quick filters
  quickFilters?: Array<{
    key: string;
    label: string;
    filters: Record<string, any>;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  
  // Filter presets
  filterPresets?: Array<{
    key: string;
    label: string;
    description?: string;
    filters: Record<string, any>;
    sort?: { key: string; direction: 'asc' | 'desc' };
  }>;
  
  className?: string;
}

interface SaveFilterModalProps {
  currentFilters: Record<string, any>;
  currentSort?: { key: string; direction: 'asc' | 'desc' };
  onSave: (name: string, filters: Record<string, any>, sort?: { key: string; direction: 'asc' | 'desc' }) => void;
  onClose: () => void;
}

function SaveFilterModal({ currentFilters, currentSort, onSave, onClose }: SaveFilterModalProps) {
  const [filterName, setFilterName] = useState('');
  const [includeSort, setIncludeSort] = useState(!!currentSort);

  const handleSave = () => {
    if (filterName.trim()) {
      onSave(
        filterName.trim(),
        currentFilters,
        includeSort ? currentSort : undefined
      );
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">필터 저장</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              필터 이름
            </label>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="예: 활성 사용자"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {currentSort && (
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeSort}
                  onChange={(e) => setIncludeSort(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  현재 정렬 설정도 함께 저장
                </span>
              </label>
            </div>
          )}

          {/* Preview */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">저장될 설정:</div>
            <div className="text-xs text-gray-600 space-y-1">
              {Object.entries(currentFilters).map(([key, value]) => {
                if (value && value !== '' && (!Array.isArray(value) || value.length > 0)) {
                  return (
                    <div key={key}>
                      <strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : String(value)}
                    </div>
                  );
                }
                return null;
              })}
              {includeSort && currentSort && (
                <div>
                  <strong>정렬:</strong> {currentSort.key} ({currentSort.direction === 'asc' ? '오름차순' : '내림차순'})
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!filterName.trim()}
            className="flex-1 py-2 px-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdvancedTableFilters({
  sortOptions,
  currentSort,
  onSortChange,
  filterOptions,
  currentFilters = {},
  onFiltersChange,
  searchable,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  showResultCount,
  resultCount,
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
  showSavedFilters = true,
  quickFilters = [],
  filterPresets = [],
  className
}: AdvancedTableFiltersProps) {
  const { isMobile } = useBreakpoint();
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Check if there are active filters
  const hasActiveFilters = useMemo(() => {
    return Object.values(currentFilters).some(value => 
      value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true)
    );
  }, [currentFilters]);

  const handleQuickFilter = useCallback((quickFilter: typeof quickFilters[0]) => {
    if (onFiltersChange) {
      onFiltersChange(quickFilter.filters);
    }
  }, [onFiltersChange]);

  const handlePresetFilter = useCallback((preset: typeof filterPresets[0]) => {
    if (onFiltersChange) {
      onFiltersChange(preset.filters);
    }
    if (preset.sort && onSortChange) {
      onSortChange(preset.sort);
    }
  }, [onFiltersChange, onSortChange]);

  const handleClearFilters = useCallback(() => {
    if (onFiltersChange) {
      onFiltersChange({});
    }
    if (onSortChange) {
      onSortChange(undefined as any);
    }
  }, [onFiltersChange, onSortChange]);

  const handleSaveCurrentFilter = useCallback(() => {
    if (hasActiveFilters || currentSort) {
      setShowSaveModal(true);
    }
  }, [hasActiveFilters, currentSort]);

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* Quick filters */}
        {quickFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <div className="text-sm font-medium text-gray-700 flex items-center">
              빠른 필터:
            </div>
            {quickFilters.map((quickFilter) => {
              const IconComponent = quickFilter.icon;
              return (
                <button
                  key={quickFilter.key}
                  onClick={() => handleQuickFilter(quickFilter)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-full',
                    'hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    'transition-colors'
                  )}
                >
                  {IconComponent && <IconComponent className="w-4 h-4" />}
                  {quickFilter.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Saved filters */}
        {showSavedFilters && savedFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <div className="text-sm font-medium text-gray-700 flex items-center">
              <BookmarkIcon className="w-4 h-4 mr-1" />
              저장된 필터:
            </div>
            {savedFilters.map((savedFilter) => (
              <div key={savedFilter.id} className="flex items-center">
                <button
                  onClick={() => onLoadFilter?.(savedFilter)}
                  className={cn(
                    'px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-l-full',
                    'hover:bg-blue-100 transition-colors',
                    savedFilter.isDefault && 'font-medium'
                  )}
                >
                  {savedFilter.name}
                </button>
                {onDeleteFilter && (
                  <button
                    onClick={() => onDeleteFilter(savedFilter.id)}
                    className="px-2 py-1.5 text-sm bg-blue-50 text-blue-700 border-l-0 border border-blue-200 rounded-r-full hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                    title="삭제"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Filter presets */}
        {filterPresets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filterPresets.map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePresetFilter(preset)}
                className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <div className="font-medium text-gray-900 text-sm">
                  {preset.label}
                </div>
                {preset.description && (
                  <div className="text-xs text-gray-500 mt-1">
                    {preset.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Main controls */}
        <MobileTableControls
          sortOptions={sortOptions}
          currentSort={currentSort}
          onSortChange={onSortChange}
          filterOptions={filterOptions}
          currentFilters={currentFilters}
          onFiltersChange={onFiltersChange}
          searchable={searchable}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          showResultCount={showResultCount}
          resultCount={resultCount}
        />

        {/* Filter actions */}
        {(hasActiveFilters || currentSort) && (
          <div className="flex items-center justify-between gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <FunnelIcon className="w-4 h-4" />
              <span>필터가 적용되었습니다</span>
            </div>
            
            <div className="flex items-center gap-2">
              {onSaveFilter && (
                <button
                  onClick={handleSaveCurrentFilter}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  저장
                </button>
              )}
              
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
                초기화
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save filter modal */}
      {showSaveModal && onSaveFilter && (
        <SaveFilterModal
          currentFilters={currentFilters}
          currentSort={currentSort}
          onSave={onSaveFilter}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </>
  );
}

// Utility function to create common filter presets
export const createFilterPresets = {
  // User management presets
  userPresets: [
    {
      key: 'active-users',
      label: '활성 사용자',
      description: '현재 활성 상태인 사용자만 표시',
      filters: { status: 'active' },
      sort: { key: 'lastActivity', direction: 'desc' as const }
    },
    {
      key: 'new-users',
      label: '신규 사용자',
      description: '최근 30일 내 가입한 사용자',
      filters: { joinDateRange: 'last30days' },
      sort: { key: 'joinDate', direction: 'desc' as const }
    },
    {
      key: 'inactive-users',
      label: '비활성 사용자',
      description: '30일 이상 활동하지 않은 사용자',
      filters: { status: 'inactive' },
      sort: { key: 'lastActivity', direction: 'asc' as const }
    }
  ],

  // Document management presets
  documentPresets: [
    {
      key: 'pending-review',
      label: '검토 대기',
      description: '검토가 필요한 문서들',
      filters: { status: 'review' },
      sort: { key: 'updatedAt', direction: 'desc' as const }
    },
    {
      key: 'recent-documents',
      label: '최근 문서',
      description: '최근 7일 내 수정된 문서',
      filters: { updatedRange: 'last7days' },
      sort: { key: 'updatedAt', direction: 'desc' as const }
    },
    {
      key: 'published-documents',
      label: '게시된 문서',
      description: '현재 게시 중인 문서들',
      filters: { status: 'published' },
      sort: { key: 'createdAt', direction: 'desc' as const }
    }
  ]
};