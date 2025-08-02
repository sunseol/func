'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { ProjectWithCreator, getRoleDescription } from '@/types/ai-pm';
import { 
  UsersIcon, 
  DocumentTextIcon, 
  ClockIcon,
  ChevronRightIcon 
} from '@heroicons/react/24/outline';

interface ProjectCardProps {
  project: ProjectWithCreator;
  isAdmin: boolean;
  userRole?: string;
}

function ProjectCard({ project, isAdmin, userRole }: ProjectCardProps) {
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return '활동 없음';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    if (diffInHours < 24 * 7) return `${Math.floor(diffInHours / 24)}일 전`;
    
    return formatDate(dateString);
  };

  return (
    <Link href={`/ai-pm/${project.id}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer h-full">
        <div className="p-4 sm:p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {project.name}
              </h3>
              {project.description && (
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
            <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
          </div>

          {/* User Role */}
          {userRole && (
            <div className="mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {getRoleDescription(userRole as any)}
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="space-y-2 sm:space-y-3 flex-1">
            <div className="flex items-center text-xs sm:text-sm text-gray-600">
              <UsersIcon className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>멤버 {project.member_count || 0}명</span>
            </div>

            <div className="flex items-center text-xs sm:text-sm text-gray-600">
              <DocumentTextIcon className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>공식 문서 {project.official_documents_count || 0}개</span>
            </div>

            <div className="flex items-center text-xs sm:text-sm text-gray-600">
              <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{formatLastActivity(project.updated_at)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          {project.official_documents_count > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>진행률</span>
                <span>{Math.round((project.official_documents_count / 9) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((project.official_documents_count / 9) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Admin Badge */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                관리자 권한
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default memo(ProjectCard);