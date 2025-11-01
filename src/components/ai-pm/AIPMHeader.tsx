'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useViewport } from '@/contexts/ViewportContext';
import Breadcrumb from './Breadcrumb';
import HamburgerMenu from './HamburgerMenu';
import MobileNavigationOverlay from './MobileNavigationOverlay';
import MobileUserMenu from './MobileUserMenu';
import useMobileNavigation from '@/hooks/useMobileNavigation';
import { 
  UserCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/responsive-utils';
import { useRouter } from 'next/navigation';

export default function AIPMHeader() {
  const { user, profile, signOut } = useAuth();
  const { state, toggleSidebar, navigateBack } = useNavigation();
  const { isMobile, isTablet } = useViewport();
  const { 
    isUserMenuOpen, 
    toggleUserMenu, 
    closeUserMenu 
  } = useMobileNavigation();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/landing');
  }, [signOut, router]);

  const canNavigateBack = state.navigationHistory.length > 1;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className={cn(
        "mx-auto px-4",
        isMobile ? "max-w-full" : "max-w-7xl sm:px-6 lg:px-8"
      )}>
        <div className={cn(
          "flex items-center justify-between",
          isMobile ? "h-14" : "h-16"
        )}>
          {/* Left section - Navigation controls */}
          <div className={cn(
            "flex items-center",
            isMobile ? "space-x-2" : "space-x-4"
          )}>
            {/* Back button */}
            {canNavigateBack && (
              <button
                onClick={navigateBack}
                className={cn(
                  "text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors",
                  isMobile ? "min-h-[44px] min-w-[44px] p-2" : "p-2"
                )}
                title="뒤로 가기"
              >
                <ArrowLeftIcon className={cn(
                  isMobile ? "h-6 w-6" : "h-5 w-5"
                )} />
              </button>
            )}

            {/* Sidebar toggle (for mobile/responsive) */}
            <div className="lg:hidden">
              <HamburgerMenu
                isOpen={state.showSidebar}
                onClick={toggleSidebar}
                size={isMobile ? "md" : "sm"}
                color="gray"
              />
            </div>

            {/* Logo/Brand - Mobile optimized */}
            {isMobile && (
              <div className="flex items-center">
                <Link 
                  href="/ai-pm"
                  className="text-lg font-semibold text-gray-900 truncate max-w-[120px]"
                >
                  AI PM
                </Link>
              </div>
            )}

            {/* Breadcrumb - Hidden on mobile, shown on tablet+ */}
            <Breadcrumb 
              projectName={state.currentProject?.name || undefined}
              className={cn(
                isMobile ? "hidden" : "hidden sm:flex"
              )}
            />
          </div>

          {/* Center section - Project info (if in project context) */}
          {state.currentProject && !isMobile && (
            <div className="hidden md:flex flex-1 items-center justify-center px-8">
              <div className="text-center">
                <h1 className={cn(
                  "font-semibold text-gray-900 truncate",
                  isTablet ? "text-base max-w-sm" : "text-lg max-w-md"
                )}>
                  {state.currentProject.name}
                </h1>
                {state.currentWorkflowStep && (
                  <p className={cn(
                    "text-gray-500",
                    isTablet ? "text-xs" : "text-sm"
                  )}>
                    워크플로우 {state.currentWorkflowStep}단계
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Mobile project info - Compact version */}
          {state.currentProject && isMobile && (
            <div className="flex-1 flex items-center justify-center px-2">
              <div className="text-center">
                <h1 className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
                  {state.currentProject.name}
                </h1>
                {state.currentWorkflowStep && (
                  <p className="text-xs text-gray-500">
                    {state.currentWorkflowStep}단계
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Right section - User menu */}
          <div className={cn(
            "flex items-center",
            isMobile ? "space-x-2" : "space-x-4"
          )}>
            {/* Navigation status indicator */}
            {state.isNavigating && (
              <div className={cn(
                "flex items-center text-gray-500",
                isMobile ? "text-xs" : "text-sm"
              )}>
                <div className={cn(
                  "border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2",
                  isMobile ? "w-3 h-3" : "w-4 h-4"
                )}></div>
                <span className={cn(
                  isMobile ? "hidden" : "hidden sm:inline"
                )}>이동 중...</span>
              </div>
            )}

            {/* User profile */}
            <div className="relative">
              <button 
                onClick={isMobile ? toggleUserMenu : undefined}
                className={cn(
                  "flex items-center text-gray-700 hover:text-gray-900 transition-colors",
                  isMobile ? "min-h-[44px] min-w-[44px] space-x-1 px-2" : "space-x-2 group"
                )}
              >
                <UserCircleIcon className={cn(
                  isMobile ? "h-7 w-7" : "h-8 w-8"
                )} />
                <span className={cn(
                  "font-medium truncate",
                  isMobile ? "hidden" : "hidden sm:block text-sm"
                )}>
                  {profile?.full_name || user?.email || '사용자'}
                </span>
              </button>

              {/* Desktop dropdown menu */}
              {!isMobile && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-900 border-b border-gray-100">
                      <div className="font-medium">{profile?.full_name || '이름 없음'}</div>
                      <div className="text-gray-500">{user?.email}</div>
                      {profile?.role && (
                        <div className="text-xs text-blue-600 mt-1">
                          {profile.role === 'admin' ? '관리자' : profile.role}
                        </div>
                      )}
                    </div>

                    <Link 
                      href="/ai-pm"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      AI PM 대시보드
                    </Link>

                    <Link 
                      href="/"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      메인 대시보드
                    </Link>

                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile breadcrumb - Only show if not in project context */}
        {!state.currentProject && (
          <div className="sm:hidden pb-2">
            <Breadcrumb 
              projectName={state.currentProject?.name || undefined}
              className="text-xs"
            />
          </div>
        )}
      </div>

      {/* Mobile Navigation Overlay */}
      {isMobile && (
        <MobileNavigationOverlay
          isOpen={state.showSidebar}
          onClose={toggleSidebar}
          variant="drawer"
          currentProject={state.currentProject}
          user={user}
          profile={profile}
        />
      )}

      {/* Mobile User Menu */}
      {isMobile && (
        <MobileUserMenu
          isOpen={isUserMenuOpen}
          onClose={closeUserMenu}
          user={user}
          profile={profile}
          onSignOut={handleSignOut}
          variant="modal"
        />
      )}
    </header>
  );
} 
