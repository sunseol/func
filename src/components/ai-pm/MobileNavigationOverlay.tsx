'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/responsive-utils';
import { XMarkIcon, HomeIcon, FolderIcon, UserIcon } from '@heroicons/react/24/outline';

interface MobileNavigationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: 'fullscreen' | 'drawer';
  currentProject?: {
    id: string;
    name: string;
  } | null;
  user?: {
    email?: string;
  } | null;
  profile?: {
    full_name?: string | null;
    role?: string;
  } | null;
}

/**
 * Mobile navigation overlay component
 * Supports both fullscreen modal and side drawer variants
 */
export const MobileNavigationOverlay: React.FC<MobileNavigationOverlayProps> = ({
  isOpen,
  onClose,
  variant = 'drawer',
  currentProject,
  user,
  profile
}) => {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when overlay is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Navigation handler
  const handleNavigation = (href: string) => {
    onClose();
    // 닫힘 애니메이션이 끝난 뒤 네비게이션 수행
    setTimeout(() => router.push(href), 150);
  };

  if (!isOpen) return null;

  const navigationItems = [
    {
      label: 'AI PM 대시보드',
      href: '/ai-pm',
      icon: HomeIcon,
      description: '프로젝트 관리 메인'
    },
    {
      label: '메인 대시보드',
      href: '/',
      icon: FolderIcon,
      description: '전체 서비스 메인'
    }
  ];

  if (currentProject) {
    navigationItems.unshift({
      label: currentProject.name,
      href: `/ai-pm/${currentProject.id}`,
      icon: FolderIcon,
      description: '현재 프로젝트'
    });
  }

  const overlayClasses = cn(
    'fixed inset-0 z-50 flex',
    variant === 'fullscreen' ? 'items-center justify-center' : 'items-start justify-end'
  );

  const backdropClasses = cn(
    'absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300',
    isOpen ? 'opacity-100' : 'opacity-0'
  );

  const panelClasses = cn(
    'relative bg-white shadow-xl transition-all duration-300 ease-in-out',
    variant === 'fullscreen' 
      ? cn(
          'w-full h-full max-w-sm mx-4 rounded-lg',
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )
      : cn(
          'h-full w-80 max-w-[80vw]',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )
  );

  return (
    <div
      ref={overlayRef}
      className={overlayClasses}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-nav-title"
    >
      {/* Backdrop - 클릭 시 닫힘 */}
      <button
        aria-label="뒤로"
        onClick={onClose}
        className={backdropClasses}
      />

      {/* Navigation Panel */}
      <div className={panelClasses}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 id="mobile-nav-title" className="text-lg font-semibold text-gray-900">
            메뉴
          </h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="메뉴 닫기"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* User Info */}
        {(user || profile) && (
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <UserIcon className="h-10 w-10 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.full_name || '사용자'}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {user?.email}
                </p>
                {profile?.role && (
                  <p className="text-xs text-blue-600 mt-1">
                    {profile.role === 'admin' ? '관리자' : profile.role}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigationItems.map((item, index) => (
              <li key={index}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className="w-full flex items-center space-x-3 p-3 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors min-h-[48px]"
                >
                  <item.icon className="h-6 w-6 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.description}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              // This would typically call a signOut function
              // For now, just close the overlay
              onClose();
            }}
            className="w-full flex items-center justify-center space-x-2 p-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors min-h-[48px]"
          >
            <span className="text-sm font-medium">로그아웃</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileNavigationOverlay;