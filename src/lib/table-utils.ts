import { TableColumn } from '@/components/ui/ResponsiveTable';

/**
 * Table utility functions for mobile optimization
 */

export interface ColumnPriorityConfig {
  high: string[]; // Always visible columns
  medium: string[]; // Visible on tablet and desktop
  low: string[]; // Only visible on desktop
}

/**
 * Apply priority configuration to table columns
 */
export function applyColumnPriorities<T>(
  columns: TableColumn<T>[],
  priorityConfig: ColumnPriorityConfig
): TableColumn<T>[] {
  return columns.map(column => {
    let priority: 'high' | 'medium' | 'low' = 'medium';
    let mobileHidden = false;

    if (priorityConfig.high.includes(column.key)) {
      priority = 'high';
      mobileHidden = false;
    } else if (priorityConfig.medium.includes(column.key)) {
      priority = 'medium';
      mobileHidden = false;
    } else if (priorityConfig.low.includes(column.key)) {
      priority = 'low';
      mobileHidden = true;
    }

    return {
      ...column,
      priority,
      mobileHidden
    };
  });
}

/**
 * Get default column visibility based on screen size
 */
export function getDefaultColumnVisibility<T>(
  columns: TableColumn<T>[],
  screenSize: 'mobile' | 'tablet' | 'desktop'
): string[] {
  switch (screenSize) {
    case 'mobile':
      return columns
        .filter(col => col.priority === 'high' || (!col.priority && !col.mobileHidden))
        .map(col => col.key);
    
    case 'tablet':
      return columns
        .filter(col => col.priority !== 'low')
        .map(col => col.key);
    
    case 'desktop':
    default:
      return columns.map(col => col.key);
  }
}

/**
 * Sort columns by priority for optimal mobile display
 */
export function sortColumnsByPriority<T>(columns: TableColumn<T>[]): TableColumn<T>[] {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  
  return [...columns].sort((a, b) => {
    const aPriority = a.priority || 'medium';
    const bPriority = b.priority || 'medium';
    return priorityOrder[aPriority] - priorityOrder[bPriority];
  });
}

/**
 * Create column toggle groups for better UX
 */
export interface ColumnGroup {
  key: string;
  label: string;
  columns: string[];
  defaultVisible?: boolean;
}

export function createColumnGroups<T>(
  columns: TableColumn<T>[],
  groups: ColumnGroup[]
): { groups: ColumnGroup[]; ungroupedColumns: TableColumn<T>[] } {
  const groupedColumnKeys = new Set(
    groups.flatMap(group => group.columns)
  );
  
  const ungroupedColumns = columns.filter(
    col => !groupedColumnKeys.has(col.key)
  );

  return { groups, ungroupedColumns };
}

/**
 * Get responsive column configuration for common data types
 */
export const COMMON_COLUMN_PRIORITIES = {
  // User/Member tables
  userTable: {
    high: ['name', 'email', 'status'],
    medium: ['role', 'lastActivity', 'joinDate'],
    low: ['permissions', 'metadata', 'id']
  },
  
  // Document tables
  documentTable: {
    high: ['title', 'status', 'updatedAt'],
    medium: ['author', 'createdAt', 'type'],
    low: ['version', 'size', 'tags', 'id']
  },
  
  // Project tables
  projectTable: {
    high: ['name', 'status', 'progress'],
    medium: ['owner', 'dueDate', 'priority'],
    low: ['createdAt', 'description', 'tags', 'id']
  },
  
  // Activity/Log tables
  activityTable: {
    high: ['description', 'timestamp', 'user'],
    medium: ['type', 'target'],
    low: ['metadata', 'id', 'details']
  }
} as const;

/**
 * Generate mobile-friendly column widths
 */
export function getMobileColumnWidths(columnCount: number): Record<string, string> {
  // Ensure minimum touch target size on mobile
  const minWidth = '120px';
  const maxWidth = '200px';
  
  if (columnCount <= 2) {
    return {
      default: '50%'
    };
  } else if (columnCount <= 3) {
    return {
      default: '33.333%',
      minWidth
    };
  } else {
    return {
      default: minWidth,
      maxWidth
    };
  }
}

/**
 * Format cell content for mobile display
 */
export function formatMobileCellContent(
  value: any,
  column: TableColumn,
  maxLength: number = 50
): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  let stringValue = String(value);
  
  // Truncate long text
  if (stringValue.length > maxLength) {
    stringValue = stringValue.substring(0, maxLength - 3) + '...';
  }
  
  return stringValue;
}

/**
 * Create action column for mobile tables
 */
export function createMobileActionColumn<T>(
  actions: Array<{
    key: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: (record: T) => void;
    danger?: boolean;
    disabled?: (record: T) => boolean;
  }>
): TableColumn<T> {
  return {
    key: 'actions',
    title: '액션',
    priority: 'high',
    width: '60px',
    align: 'center',
    render: (_, record) => {
      const enabledActions = actions.filter(action => 
        !action.disabled || !action.disabled(record)
      );
      
      return {
        type: 'mobile-actions',
        actions: enabledActions.map(action => ({
          ...action,
          onClick: () => action.onClick(record)
        }))
      };
    }
  };
}

/**
 * Validate table configuration for mobile optimization
 */
export function validateMobileTableConfig<T>(
  columns: TableColumn<T>[],
  options: {
    maxMobileColumns?: number;
    requireHighPriorityColumns?: boolean;
    maxColumnTitleLength?: number;
  } = {}
): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const {
    maxMobileColumns = 3,
    requireHighPriorityColumns = true,
    maxColumnTitleLength = 20
  } = options;

  const warnings: string[] = [];
  const errors: string[] = [];

  // Check high priority columns
  const highPriorityColumns = columns.filter(col => col.priority === 'high');
  if (requireHighPriorityColumns && highPriorityColumns.length === 0) {
    errors.push('최소 하나의 고우선순위 컬럼이 필요합니다.');
  }

  // Check mobile column count
  const mobileVisibleColumns = columns.filter(col => 
    col.priority === 'high' || (!col.priority && !col.mobileHidden)
  );
  if (mobileVisibleColumns.length > maxMobileColumns) {
    warnings.push(
      `모바일에서 표시되는 컬럼이 ${mobileVisibleColumns.length}개입니다. ` +
      `${maxMobileColumns}개 이하를 권장합니다.`
    );
  }

  // Check column title lengths
  const longTitles = columns.filter(col => col.title.length > maxColumnTitleLength);
  if (longTitles.length > 0) {
    warnings.push(
      `다음 컬럼의 제목이 너무 깁니다: ${longTitles.map(col => col.title).join(', ')}`
    );
  }

  // Check for action columns without proper mobile handling
  const actionColumns = columns.filter(col => 
    col.key.includes('action') || col.title.includes('액션')
  );
  actionColumns.forEach(col => {
    if (!col.render) {
      warnings.push(`액션 컬럼 '${col.title}'에 모바일 최적화된 렌더러가 필요합니다.`);
    }
  });

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}