'use client';

import React, { memo, useState } from 'react';
import Link from 'next/link';
import { ProjectWithCreator, getRoleDescription } from '@/types/ai-pm';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { 
  UsersIcon, 
  DocumentTextIcon, 
  ClockIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

interface ProjectCardProps {
  project: ProjectWithCreator;
  isAdmin: boolean;
  userRole?: string;
}

function ProjectCard({ project, isAdmin, userRole }: ProjectCardProps) {
  const { isMobile } = useBreakpoint();
  const [showDetails, setShowDetails] = useState(false);
  const [showFullTitle, setShowFullTitle] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

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

  // Calculate progress percentage
  const progressPercentage = Math.round((project.official_documents_count / 9) * 100);

  // Check if text is long enough to need truncation
  const isTitleLong = project.name.length > 30;
  const isDescriptionLong = project.description && project.description.length > 80;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 hover:shadow-md transition-shadow duration-200 overflow-visible" style={{ transform: 'translateZ(0)' }}>
      <Link href={`/ai-pm/${project.id}`} prefetch={false}>
        <div className="p-4 sm:p-6 flex flex-col cursor-pointer active:bg-gray-50 transition-colors touch-manipulation overflow-visible">
          {/* Header - Always visible */}
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex-1 min-w-0">
              {/* Project Title */}
              <div>
                <h3 
                  className={`text-base sm:text-lg font-semibold text-gray-900 dark:text-white ${
                    isMobile && isTitleLong && !showFullTitle ? 'truncate' : ''
                  }`}
                >
                  {project.name}
                </h3>
                {/* Title expand button for mobile */}
                {isMobile && isTitleLong && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowFullTitle(!showFullTitle);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 touch-manipulation"
                  >
                    {showFullTitle ? '간단히' : '전체 제목 보기'}
                  </button>
                )}
              </div>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
          </div>
          {/* Summary (Always visible on mobile: members, documents, activity) */}
          <div className="mb-3">
            {userRole && (
              <div className="mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {getRoleDescription(userRole as any)}
                </span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                <UsersIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
                <span className="truncate">{project.member_count || 0}명</span>
              </div>
              <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                <DocumentTextIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
                <span className="truncate">문서 {project.official_documents_count || 0}</span>
              </div>
              <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                <ClockIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
                <span className="truncate">{formatLastActivity(project.updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Expanded details (mobile: only when expanded) */}
          {(!isMobile || showDetails) && (
            <div className="space-y-3 sm:space-y-4">
              {/* Description */}
              <div className="mt-1">
                  <p
                    className={`text-sm text-gray-600 dark:text-gray-300 ${
                    isMobile && isDescriptionLong && !showFullDescription ? 'line-clamp-2' : ''
                  }`}
                  style={
                    isMobile && isDescriptionLong && !showFullDescription
                      ? {
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }
                      : {}
                  }
                >
                  {project.description || '프로젝트 설명이 없습니다.'}
                </p>
                {isMobile && isDescriptionLong && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowFullDescription(!showFullDescription);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 touch-manipulation"
                  >
                    {showFullDescription ? '간단히' : '전체 설명 보기'}
                  </button>
                )}
              </div>

              {/* Progress (expanded only) */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                  <span>진행 상황</span>
                  <span className="font-medium">{Math.max(0, Math.min(progressPercentage, 100))}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.min(progressPercentage, 100))}%` }}
                  />
                </div>
              </div>

              {/* Admin Badge */}
              {isAdmin && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    관리자 권한
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Mobile expand/collapse button */}
      {isMobile && (
        <div className="px-4 pb-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="w-full flex items-center justify-center min-h-[44px] py-3 text-xs text-gray-500 hover:text-gray-700 active:bg-gray-50 transition-colors rounded-md touch-manipulation"
            style={{ minHeight: '44px', position: 'relative', zIndex: 1 }}
          >
            <span className="mr-1">
              {showDetails ? '간단히 보기' : '자세히 보기'}
            </span>
            {showDetails ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(ProjectCard);