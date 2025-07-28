'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import Breadcrumb from './Breadcrumb';
import { 
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function AIPMHeader() {
  const { user, profile, signOut } = useAuth();
  const { state, toggleSidebar, navigateBack } = useNavigation();

  const canNavigateBack = state.navigationHistory.length > 1;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section - Navigation controls */}
          <div className="flex items-center space-x-4">
            {/* Back button */}
            {canNavigateBack && (
              <button
                onClick={navigateBack}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                title="뒤로 가기"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            )}

            {/* Sidebar toggle (for mobile/responsive) */}
            <button
              onClick={toggleSidebar}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors lg:hidden"
              title="사이드바 토글"
            >
              {state.showSidebar ? (
                <XMarkIcon className="h-5 w-5" />
              ) : (
                <Bars3Icon className="h-5 w-5" />
              )}
            </button>

            {/* Breadcrumb */}
            <Breadcrumb 
              projectName={state.currentProject?.name}
              className="hidden sm:flex"
            />
          </div>

          {/* Center section - Project info (if in project context) */}
          {state.currentProject && (
            <div className="hidden md:flex flex-1 items-center justify-center px-8">
              <div className="text-center">
                <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                  {state.currentProject.name}
                </h1>
                {state.currentWorkflowStep && (
                  <p className="text-sm text-gray-500">
                    워크플로우 {state.currentWorkflowStep}단계
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Right section - User menu */}
          <div className="flex items-center space-x-4">
            {/* Navigation status indicator */}
            {state.isNavigating && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                <span className="hidden sm:inline">이동 중...</span>
              </div>
            )}

            {/* User profile */}
            <div className="relative group">
              <button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors">
                <UserCircleIcon className="h-8 w-8" />
                <span className="hidden sm:block text-sm font-medium">
                  {profile?.full_name || user?.email || '사용자'}
                </span>
              </button>

              {/* Dropdown menu */}
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
                    onClick={signOut}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile breadcrumb */}
        <div className="sm:hidden pb-3">
          <Breadcrumb 
            projectName={state.currentProject?.name}
            className="text-xs"
          />
        </div>
      </div>
    </header>
  );
} 