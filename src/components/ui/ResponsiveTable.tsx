'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/responsive-utils';
import MobileActionMenu, { ActionMenuItem } from './MobileActionMenu';
import { 
  ChevronDownIcon, 
  ChevronUpIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';

export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => React.ReactNode | { type: 'mobile-actions'; actions: ActionMenuItem[] };
  width?: string | number;
  priority?: 'high' | 'medium' | 'low'; // For mobile column prioritization
  sortable?: boolean;
  filterable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  mobileHidden?: boolean; // Hide on mobile by default
}

type MobileActionsRender = { type: 'mobile-actions'; actions: ActionMenuItem[] };

function isMobileActionsRender(value: unknown): value is MobileActionsRender {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as any).type === 'mobile-actions' &&
    Array.isArray((value as any).actions)
  );
}

export interface ResponsiveTableProps<T = any> {
  columns: TableColumn<T>[];
  dataSource: T[];
  rowKey?: string | ((record: T) => string);
  loading?: boolean;
  className?: string;
  onRowClick?: (record: T, index: number) => void;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  // Mobile-specific props
  mobileCardMode?: boolean; // Force card mode on mobile
  expandableRows?: boolean; // Allow row expansion on mobile
  showColumnToggle?: boolean; // Show column visibility toggle
  horizontalScroll?: boolean; // Enable horizontal scroll as fallback
}

interface MobileCardProps<T> {
  record: T;
  columns: TableColumn<T>[];
  index: number;
  onRowClick?: (record: T, index: number) => void;
  expandableRows?: boolean;
}

function MobileCard<T>({ 
  record, 
  columns, 
  index, 
  onRowClick,
  expandableRows = true 
}: MobileCardProps<T>) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Separate columns by priority
  const highPriorityColumns = columns.filter(col => 
    col.priority === 'high' || (!col.priority && !col.mobileHidden)
  );
  const lowPriorityColumns = columns.filter(col => 
    col.priority === 'low' || col.priority === 'medium' || col.mobileHidden
  );

  const renderCellValue = (column: TableColumn<T>, record: T) => {
    if (column.render) {
      const rendered = column.render(
        column.dataIndex ? record[column.dataIndex] : record,
        record,
        index
      );
      
      // Handle mobile action menu
      if (isMobileActionsRender(rendered)) {
        return <MobileActionMenu items={rendered.actions} placement="bottom-left" />;
      }
      
      return rendered as React.ReactNode;
    }
    return column.dataIndex ? String(record[column.dataIndex] || '') : '';
  };

  return (
    <div 
      className={cn(
        'bg-white border border-gray-200 rounded-lg p-4 shadow-sm',
        onRowClick && 'cursor-pointer hover:shadow-md transition-shadow'
      )}
      onClick={() => onRowClick?.(record, index)}
    >
      {/* High priority fields - always visible */}
      <div className="space-y-3">
        {highPriorityColumns.map((column) => (
          <div key={column.key} className="flex justify-between items-start gap-3">
            <span className="text-sm font-medium text-gray-600 flex-shrink-0 min-w-0">
              {column.title}:
            </span>
            <div className={cn(
              'text-sm text-gray-900 text-right flex-1 min-w-0',
              column.align === 'left' && 'text-left',
              column.align === 'center' && 'text-center'
            )}>
              {renderCellValue(column, record)}
            </div>
          </div>
        ))}
      </div>

      {/* Expandable section for low priority fields */}
      {expandableRows && lowPriorityColumns.length > 0 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-2 mt-4 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon className="w-4 h-4" />
                간단히 보기
              </>
            ) : (
              <>
                <ChevronDownIcon className="w-4 h-4" />
                자세히 보기
              </>
            )}
          </button>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
              {lowPriorityColumns.map((column) => (
                <div key={column.key} className="flex justify-between items-start gap-3">
                  <span className="text-sm font-medium text-gray-600 flex-shrink-0 min-w-0">
                    {column.title}:
                  </span>
                  <div className={cn(
                    'text-sm text-gray-900 text-right flex-1 min-w-0',
                    column.align === 'left' && 'text-left',
                    column.align === 'center' && 'text-center'
                  )}>
                    {renderCellValue(column, record)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ColumnToggleProps<T> {
  columns: TableColumn<T>[];
  visibleColumns: string[];
  onToggleColumn: (columnKey: string) => void;
}

function ColumnToggle<T>({ 
  columns, 
  visibleColumns, 
  onToggleColumn 
}: ColumnToggleProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <EyeIcon className="w-4 h-4" />
        컬럼 표시
        <ChevronDownIcon className={cn(
          'w-4 h-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
              표시할 컬럼 선택
            </div>
            {columns.map((column) => (
              <label
                key={column.key}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(column.key)}
                  onChange={() => onToggleColumn(column.key)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1">
                  {column.title}
                </span>
                {column.priority === 'high' && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    필수
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResponsiveTable<T = any>({
  columns,
  dataSource,
  rowKey = 'id',
  loading = false,
  className,
  onRowClick,
  pagination,
  mobileCardMode = true,
  expandableRows = true,
  showColumnToggle = true,
  horizontalScroll = true
}: ResponsiveTableProps<T>) {
  const { isMobile, isTablet } = useBreakpoint();
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.map(col => col.key)
  );
  const [isScrollIndicatorVisible, setIsScrollIndicatorVisible] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Check if horizontal scroll is needed
  useEffect(() => {
    const checkScrollIndicator = () => {
      if (tableRef.current) {
        const { scrollWidth, clientWidth } = tableRef.current;
        setIsScrollIndicatorVisible(scrollWidth > clientWidth);
      }
    };

    checkScrollIndicator();
    window.addEventListener('resize', checkScrollIndicator);
    return () => window.removeEventListener('resize', checkScrollIndicator);
  }, [columns, visibleColumns]);

  const handleToggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return String((record as any)[rowKey] || index);
  };

  const filteredColumns = columns.filter(col => visibleColumns.includes(col.key));

  // Mobile card view
  if (isMobile && mobileCardMode) {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Header with column toggle */}
        {showColumnToggle && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              총 {dataSource.length}개 항목
            </div>
            <ColumnToggle
              columns={columns}
              visibleColumns={visibleColumns}
              onToggleColumn={handleToggleColumn}
            />
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Empty state */}
        {!loading && dataSource.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p>표시할 데이터가 없습니다.</p>
          </div>
        )}

        {/* Card list */}
        {!loading && dataSource.length > 0 && (
          <div className="space-y-3">
            {dataSource.map((record, index) => (
              <MobileCard
                key={getRowKey(record, index)}
                record={record}
                columns={filteredColumns}
                index={index}
                onRowClick={onRowClick}
                expandableRows={expandableRows}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && (
          <div className="flex justify-center mt-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
                disabled={pagination.current <= 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                이전
              </button>
              <span className="px-3 py-2 text-sm">
                {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
              <button
                onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
                disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop/tablet table view with horizontal scroll
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      {/* Header with controls */}
      {showColumnToggle && (
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div className="text-sm text-gray-600">
            총 {dataSource.length}개 항목
          </div>
          <ColumnToggle
            columns={columns}
            visibleColumns={visibleColumns}
            onToggleColumn={handleToggleColumn}
          />
        </div>
      )}

      {/* Scroll indicator */}
      {horizontalScroll && isScrollIndicatorVisible && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <ArrowsPointingOutIcon className="w-4 h-4" />
            좌우로 스크롤하여 더 많은 컬럼을 확인하세요
          </div>
        </div>
      )}

      {/* Table container */}
      <div 
        ref={tableRef}
        className={cn(
          'overflow-x-auto',
          !horizontalScroll && 'overflow-x-hidden'
        )}
      >
        <table className="w-full min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {filteredColumns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={filteredColumns.length} className="px-4 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </td>
              </tr>
            )}
            
            {!loading && dataSource.length === 0 && (
              <tr>
                <td colSpan={filteredColumns.length} className="px-4 py-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>표시할 데이터가 없습니다.</p>
                </td>
              </tr>
            )}

            {!loading && dataSource.map((record, index) => (
              <tr
                key={getRowKey(record, index)}
                className={cn(
                  'hover:bg-gray-50',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(record, index)}
              >
                {filteredColumns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-4 whitespace-nowrap text-sm text-gray-900',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.className
                    )}
                  >
                    {(() => {
                      if (column.render) {
                        const rendered = column.render(
                          column.dataIndex ? record[column.dataIndex] : record,
                          record,
                          index
                        );
                        
                        // Handle mobile action menu for desktop too
                        if (isMobileActionsRender(rendered)) {
                          return <MobileActionMenu items={rendered.actions} placement="bottom-right" />;
                        }
                        
                        return rendered as React.ReactNode;
                      }
                      return column.dataIndex ? String(record[column.dataIndex] || '') : '';
                    })()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200">
          <div className="text-sm text-gray-700">
            {((pagination.current - 1) * pagination.pageSize) + 1}-
            {Math.min(pagination.current * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} 결과
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
              disabled={pagination.current <= 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              이전
            </button>
            <span className="px-3 py-2 text-sm">
              {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <button
              onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
              disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
