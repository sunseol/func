'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/responsive-utils';
import { 
  UserCircleIcon, 
  HomeIcon, 
  FolderIcon, 
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface MobileUserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    email?: string;
  } | null;
  profile?: {
    full_name?: string | null;
    role?: string;
  } | null;
  onSignOut: () => void;
  variant?: 'dropdown' | 'modal';
}

/**
 * Mobile-optimized user menu component
 * Supports both dropdown and modal variants for different screen sizes
 */
export const MobileUserMenu: React.FC<MobileUserMenuProps> = ({
  isOpen,
  onClose,
  user,
  profile,
  onSignOut,
  variant = 'modal'
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle escape key and outside clicks
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      if (variant === 'dropdown') {
        document.addEventListener('mousedown', handleClickOutside);
      }
      // Prevent body scroll for modal variant
      if (variant === 'modal') {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, variant]);

  const handleSignOut = () => {
    onSignOut();
    onClose();
  };

  const handleLinkClick = () => {
    onClose();
  };

  if (!isOpen) return null;

  const menuItems = [
    {
      label: 'AI PM 대시보드',
      href: '/ai-pm',
      icon: FolderIcon,
      description: '프로젝트 관리'
    },
    {
      label: '메인 대시보드',
      href: '/',
      icon: HomeIcon,
      description: '전체 서비스'
    }
  ];

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div 
          ref={menuRef}
          className="relative bg-white rounded-t-lg sm:rounded-lg shadow-xl w-full max-w-sm mx-4 mb-0 sm:mb-4 transform transition-all"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-menu-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 id="user-menu-title" className="text-lg font-semibold text-gray-900">
              사용자 메뉴
            </h3>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="메뉴 닫기"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center space-x-3">
              <UserCircleIcon className="h-12 w-12 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-gray-900 truncate">
                  {profile?.full_name || '사용자'}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {user?.email}
                </p>
                {profile?.role && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                    {profile.role === 'admin' ? '관리자' : profile.role}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                onClick={handleLinkClick}
                className="flex items-center space-x-3 p-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors min-h-[48px]"
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Sign Out */}
          <div className="p-2 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 p-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors min-h-[48px]"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">로그아웃</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dropdown variant
  return (
    <div 
      ref={menuRef}
      className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg border border-gray-200 z-50"
      role="menu"
      aria-orientation="vertical"
    >
      {/* User Info */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center space-x-3">
          <UserCircleIcon className="h-10 w-10 text-gray-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.full_name || '사용자'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
            {profile?.role && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                {profile.role === 'admin' ? '관리자' : profile.role}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {menuItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            onClick={handleLinkClick}
            className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors min-h-[48px]"
            role="menuitem"
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
          </Link>
        ))}

        <hr className="my-1 border-gray-200" />

        <button
          onClick={handleSignOut}
          className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors min-h-[48px]"
          role="menuitem"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">로그아웃</span>
        </button>
      </div>
    </div>
  );
};

export default MobileUserMenu;