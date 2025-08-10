'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/responsive-utils';
import { TableColumn } from './ResponsiveTable';
import { ColumnGroup } from '@/lib/table-utils';
import { 
  EyeIcon,
  EyeSlashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  CheckIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface AdvancedColumnToggleProps<T> {
  columns: TableColumn<T>[];
  visibleColumns: string[];
  onToggleColumn: (columnKey: string) => void;
  onToggleGroup?: (groupKey: string, visible: boolean) => void;
  groups?: ColumnGroup[];
  className?: string;
  showPresets?: boolean;
  presets?: Array<{
    key: string;
    label: string;
    columns: string[];
  }>;
  onApplyPreset?: (columns: string[]) => void;
}

interface ColumnPreset {
  key: string;
  label: string;
  columns: string[];
}

const DEFAULT_PRESETS: ColumnPreset[] = [
  {
    key: 'essential',
    label: '필수 정보만',
    columns: [] // Will be populated with high priority columns
  },
  {
    key: 'standard',
    label: '표준 보기',
    columns: [] // Will be populated with high + medium priority columns
  },
  {
    key: 'detailed',
    label: '상세 보기',
    columns: [] // Will be populated with all columns
  }
];

export default function AdvancedColumnToggle<T>({
  columns,
  visibleColumns,
  onToggleColumn,
  onToggleGroup,
  groups = [],
  className,
  showPresets = true,
  presets,
  onApplyPreset
}: AdvancedColumnToggleProps<T>) {
  const { isMobile } = useBreakpoint();
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'columns' | 'presets'>('columns');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Generate default presets if not provided
  const effectivePresets = presets || DEFAULT_PRESETS.map(preset => {
    switch (preset.key) {
      case 'essential':
        return {
          ...preset,
          columns: columns.filter(col => col.priority === 'high').map(col => col.key)
        };
      case 'standard':
        return {
          ...preset,
          columns: columns.filter(col => col.priority !== 'low').map(col => col.key)
        };
      case 'detailed':
        return {
          ...preset,
          columns: columns.map(col => col.key)
        };
      default:
        return preset;
    }
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
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

  const handleButtonClick = () => {
    if (isMobile) {
      setShowModal(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const handleGroupToggle = (group: ColumnGroup) => {
    const groupColumns = group.columns;
    const allVisible = groupColumns.every(col => visibleColumns.includes(col));
    
    if (onToggleGroup) {
      onToggleGroup(group.key, !allVisible);
    } else {
      // Fallback: toggle individual columns
      groupColumns.forEach(colKey => {
        if (allVisible && visibleColumns.includes(colKey)) {
          onToggleColumn(colKey);
        } else if (!allVisible && !visibleColumns.includes(colKey)) {
          onToggleColumn(colKey);
        }
      });
    }
  };

  const handlePresetApply = (preset: ColumnPreset) => {
    if (onApplyPreset) {
      onApplyPreset(preset.columns);
    } else {
      // Fallback: manually toggle columns
      const currentVisible = new Set(visibleColumns);
      const targetVisible = new Set(preset.columns);
      
      // Hide columns not in preset
      currentVisible.forEach(col => {
        if (!targetVisible.has(col)) {
          onToggleColumn(col);
        }
      });
      
      // Show columns in preset
      targetVisible.forEach(col => {
        if (!currentVisible.has(col)) {
          onToggleColumn(col);
        }
      });
    }
    
    setIsOpen(false);
    setShowModal(false);
  };

  const getGroupedColumns = () => {
    const groupedColumnKeys = new Set(groups.flatMap(group => group.columns));
    const ungroupedColumns = columns.filter(col => !groupedColumnKeys.has(col.key));
    return { groupedColumnKeys, ungroupedColumns };
  };

  const { ungroupedColumns } = getGroupedColumns();

  const renderColumnItem = (column: TableColumn<T>) => {
    const isVisible = visibleColumns.includes(column.key);
    const priorityColor = {
      high: 'text-blue-600 bg-blue-50',
      medium: 'text-green-600 bg-green-50',
      low: 'text-gray-600 bg-gray-50'
    }[column.priority || 'medium'];

    return (
      <label
        key={column.key}
        className={cn(
          'flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors',
          isMobile && 'min-h-[56px]'
        )}
      >
        <input
          type="checkbox"
          checked={isVisible}
          onChange={() => onToggleColumn(column.key)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-medium text-gray-900 truncate',
              isMobile && 'text-base'
            )}>
              {column.title}
            </span>
            {column.priority && (
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                priorityColor
              )}>
                {column.priority === 'high' ? '필수' : 
                 column.priority === 'medium' ? '표준' : '선택'}
              </span>
            )}
          </div>
          {column.key !== column.title && (
            <div className="text-xs text-gray-500 truncate">
              {column.key}
            </div>
          )}
        </div>
      </label>
    );
  };

  const renderGroupItem = (group: ColumnGroup) => {
    const isExpanded = expandedGroups.has(group.key);
    const groupColumns = group.columns.map(key => 
      columns.find(col => col.key === key)
    ).filter(Boolean) as TableColumn<T>[];
    
    const visibleCount = groupColumns.filter(col => 
      visibleColumns.includes(col.key)
    ).length;
    const totalCount = groupColumns.length;
    const allVisible = visibleCount === totalCount;

    return (
      <div key={group.key} className="border border-gray-200 rounded-lg">
        <div className="flex items-center gap-3 p-3">
          <button
            onClick={() => toggleGroup(group.key)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          <button
            onClick={() => handleGroupToggle(group)}
            className="flex-1 flex items-center justify-between text-left"
          >
            <div>
              <div className={cn(
                'font-medium text-gray-900',
                isMobile ? 'text-base' : 'text-sm'
              )}>
                {group.label}
              </div>
              <div className="text-xs text-gray-500">
                {visibleCount}/{totalCount} 표시됨
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {allVisible ? (
                <EyeIcon className="w-4 h-4 text-green-600" />
              ) : visibleCount > 0 ? (
                <EyeSlashIcon className="w-4 h-4 text-yellow-600" />
              ) : (
                <EyeSlashIcon className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </button>
        </div>
        
        {isExpanded && (
          <div className="border-t border-gray-200 p-2 space-y-1">
            {groupColumns.map(renderColumnItem)}
          </div>
        )}
      </div>
    );
  };

  const renderPresetItem = (preset: ColumnPreset) => {
    const isActive = preset.columns.length === visibleColumns.length &&
      preset.columns.every(col => visibleColumns.includes(col));

    return (
      <button
        key={preset.key}
        onClick={() => handlePresetApply(preset)}
        className={cn(
          'w-full flex items-center justify-between p-3 text-left rounded-lg transition-colors',
          'hover:bg-gray-50 active:bg-gray-100',
          isMobile && 'min-h-[56px]',
          isActive && 'bg-blue-50 border border-blue-200'
        )}
      >
        <div>
          <div className={cn(
            'font-medium',
            isActive ? 'text-blue-900' : 'text-gray-900',
            isMobile ? 'text-base' : 'text-sm'
          )}>
            {preset.label}
          </div>
          <div className="text-xs text-gray-500">
            {preset.columns.length}개 컬럼
          </div>
        </div>
        
        {isActive && (
          <CheckIcon className="w-5 h-5 text-blue-600" />
        )}
      </button>
    );
  };

  const DropdownContent = () => (
    <div className="space-y-4">
      {/* Tabs */}
      {showPresets && (
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('columns')}
            className={cn(
              'flex-1 py-2 px-1 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'columns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            컬럼 선택
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={cn(
              'flex-1 py-2 px-1 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'presets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            프리셋
          </button>
        </div>
      )}

      {/* Content */}
      {activeTab === 'columns' && (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Groups */}
          {groups.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                컬럼 그룹
              </div>
              {groups.map(renderGroupItem)}
            </div>
          )}

          {/* Individual columns */}
          {ungroupedColumns.length > 0 && (
            <div className="space-y-1">
              {groups.length > 0 && (
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  기타 컬럼
                </div>
              )}
              {ungroupedColumns.map(renderColumnItem)}
            </div>
          )}
        </div>
      )}

      {activeTab === 'presets' && showPresets && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {effectivePresets.map(renderPresetItem)}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className={cn('relative', className)}>
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg',
            'hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'transition-colors',
            isMobile && 'min-h-[44px] text-base'
          )}
        >
          <Cog6ToothIcon className="w-4 h-4" />
          <span>컬럼 설정</span>
          <ChevronDownIcon className={cn(
            'w-4 h-4 transition-transform',
            (isOpen || showModal) && 'rotate-180'
          )} />
        </button>

        {/* Desktop dropdown */}
        {!isMobile && isOpen && (
          <div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4"
          >
            <DropdownContent />
          </div>
        )}
      </div>

      {/* Mobile modal */}
      {isMobile && showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm bg-white rounded-t-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-medium text-gray-900">컬럼 설정</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="닫기"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-4">
              <DropdownContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}