'use client';

import React from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/responsive-utils';
import MobileActionMenu, { ActionMenuItem } from './MobileActionMenu';
import { 
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  ShareIcon,
  ArchiveBoxIcon,
  CheckIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface TableActionButtonsProps {
  actions: ActionMenuItem[];
  variant?: 'menu' | 'buttons' | 'auto'; // auto switches based on screen size
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  maxVisibleButtons?: number; // For button mode, how many to show before collapsing to menu
}

// Common action configurations
export const COMMON_ACTIONS = {
  view: (onClick: () => void): ActionMenuItem => ({
    key: 'view',
    label: '보기',
    icon: EyeIcon,
    onClick
  }),
  
  edit: (onClick: () => void): ActionMenuItem => ({
    key: 'edit',
    label: '수정',
    icon: PencilIcon,
    onClick
  }),
  
  delete: (onClick: () => void): ActionMenuItem => ({
    key: 'delete',
    label: '삭제',
    icon: TrashIcon,
    onClick,
    danger: true
  }),
  
  duplicate: (onClick: () => void): ActionMenuItem => ({
    key: 'duplicate',
    label: '복제',
    icon: DocumentDuplicateIcon,
    onClick
  }),
  
  share: (onClick: () => void): ActionMenuItem => ({
    key: 'share',
    label: '공유',
    icon: ShareIcon,
    onClick
  }),
  
  archive: (onClick: () => void): ActionMenuItem => ({
    key: 'archive',
    label: '보관',
    icon: ArchiveBoxIcon,
    onClick
  }),
  
  approve: (onClick: () => void): ActionMenuItem => ({
    key: 'approve',
    label: '승인',
    icon: CheckIcon,
    onClick
  }),
  
  reject: (onClick: () => void): ActionMenuItem => ({
    key: 'reject',
    label: '거부',
    icon: XMarkIcon,
    onClick,
    danger: true
  }),
  
  download: (onClick: () => void): ActionMenuItem => ({
    key: 'download',
    label: '다운로드',
    icon: ArrowDownTrayIcon,
    onClick
  }),
  
  settings: (onClick: () => void): ActionMenuItem => ({
    key: 'settings',
    label: '설정',
    icon: Cog6ToothIcon,
    onClick
  })
};

export default function TableActionButtons({
  actions,
  variant = 'auto',
  size = 'md',
  className,
  maxVisibleButtons = 2
}: TableActionButtonsProps) {
  const { isMobile, isTablet } = useBreakpoint();
  
  // Determine effective variant
  const effectiveVariant = variant === 'auto' 
    ? (isMobile ? 'menu' : (isTablet && actions.length > maxVisibleButtons ? 'menu' : 'buttons'))
    : variant;

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const mobileSizeClasses = {
    sm: 'min-w-[40px] min-h-[40px]',
    md: 'min-w-[44px] min-h-[44px]',
    lg: 'min-w-[48px] min-h-[48px]'
  };

  const enabledActions = actions.filter(action => !action.disabled);

  if (enabledActions.length === 0) {
    return null;
  }

  // Menu variant - always use dropdown menu
  if (effectiveVariant === 'menu') {
    return (
      <MobileActionMenu
        items={enabledActions}
        className={className}
        placement={isMobile ? 'bottom-left' : 'bottom-right'}
      />
    );
  }

  // Buttons variant - show individual buttons
  if (effectiveVariant === 'buttons') {
    const visibleActions = enabledActions.slice(0, maxVisibleButtons);
    const hiddenActions = enabledActions.slice(maxVisibleButtons);

    return (
      <div className={cn('flex items-center gap-1', className)}>
        {/* Visible action buttons */}
        {visibleActions.map((action) => {
          const IconComponent = action.icon;
          
          return (
            <button
              key={action.key}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                'flex items-center justify-center rounded-lg border border-gray-300',
                'hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                action.danger 
                  ? 'text-red-600 hover:bg-red-50 hover:border-red-300' 
                  : 'text-gray-600',
                isMobile ? mobileSizeClasses[size] : sizeClasses[size]
              )}
              title={action.label}
              aria-label={action.label}
            >
              {IconComponent && (
                <IconComponent className={cn(
                  isMobile ? 'w-5 h-5' : 'w-4 h-4'
                )} />
              )}
            </button>
          );
        })}

        {/* Overflow menu for hidden actions */}
        {hiddenActions.length > 0 && (
          <MobileActionMenu
            items={hiddenActions}
            placement={isMobile ? 'bottom-left' : 'bottom-right'}
            buttonClassName={cn(
              'border border-gray-300',
              isMobile ? mobileSizeClasses[size] : sizeClasses[size]
            )}
          />
        )}
      </div>
    );
  }

  return null;
}

// Utility function to create action buttons for table columns
export function createTableActionColumn<T>(
  getActions: (record: T, index: number) => ActionMenuItem[],
  options: {
    title?: string;
    width?: string | number;
    variant?: 'menu' | 'buttons' | 'auto';
    maxVisibleButtons?: number;
  } = {}
) {
  const {
    title = '액션',
    width = '80px',
    variant = 'auto',
    maxVisibleButtons = 2
  } = options;

  return {
    key: 'actions',
    title,
    width,
    align: 'center' as const,
    priority: 'high' as const,
    render: (_: any, record: T, index: number) => {
      const actions = getActions(record, index);
      
      return (
        <TableActionButtons
          actions={actions}
          variant={variant}
          maxVisibleButtons={maxVisibleButtons}
        />
      );
    }
  };
}

// Preset action configurations for common use cases
export const ACTION_PRESETS = {
  // Basic CRUD actions
  crud: <T>(
    onView: (record: T) => void,
    onEdit: (record: T) => void,
    onDelete: (record: T) => void
  ) => (record: T) => [
    COMMON_ACTIONS.view(() => onView(record)),
    COMMON_ACTIONS.edit(() => onEdit(record)),
    COMMON_ACTIONS.delete(() => onDelete(record))
  ],

  // Document management actions
  document: <T>(
    onView: (record: T) => void,
    onEdit: (record: T) => void,
    onShare: (record: T) => void,
    onDownload: (record: T) => void,
    onDelete: (record: T) => void
  ) => (record: T) => [
    COMMON_ACTIONS.view(() => onView(record)),
    COMMON_ACTIONS.edit(() => onEdit(record)),
    COMMON_ACTIONS.share(() => onShare(record)),
    COMMON_ACTIONS.download(() => onDownload(record)),
    COMMON_ACTIONS.delete(() => onDelete(record))
  ],

  // Approval workflow actions
  approval: <T>(
    onView: (record: T) => void,
    onApprove: (record: T) => void,
    onReject: (record: T) => void
  ) => (record: T) => [
    COMMON_ACTIONS.view(() => onView(record)),
    COMMON_ACTIONS.approve(() => onApprove(record)),
    COMMON_ACTIONS.reject(() => onReject(record))
  ],

  // User management actions
  user: <T>(
    onView: (record: T) => void,
    onEdit: (record: T) => void,
    onArchive: (record: T) => void
  ) => (record: T) => [
    COMMON_ACTIONS.view(() => onView(record)),
    COMMON_ACTIONS.edit(() => onEdit(record)),
    COMMON_ACTIONS.archive(() => onArchive(record))
  ]
};