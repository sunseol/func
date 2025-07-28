'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useToast, useApiError } from '@/contexts/ToastContext';
import { useProjects } from '@/hooks/useApiCache';
import { ProjectsResponse, UserProject, ProjectWithCreator } from '@/types/ai-pm';
import { ProjectCardSkeleton, LoadingSpinner } from '@/components/ui/LoadingSkeletons';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

// Dynamic imports for code splitting
const ProjectCard = dynamic(() => import('@/components/ai-pm/ProjectCard'), {
  loading: () => <ProjectCardSkeleton />,
  ssr: false
});

const CreateProjectModal = dynamic(() => import('@/components/ai-pm/CreateProjectModal'), {
  loading: () => <div className="animate-pulse">모달 로딩 중...</div>,
  ssr: false
});

export default function AIPMDashboard() {
  const { user, isAdmin } = useAuth();
  const { success } = useToast();
  const { handleApiError } = useApiError();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Use cached API call
  const { 
    data: projectsData, 
    error: apiError, 
    isLoading, 
    isValidating,
    mutate: refetchProjects 
  } = useProjects();

  // Memoized projects data
  const projects = useMemo(() => {
    return projectsData?.projects as (UserProject | ProjectWithCreator)[] || [];
  }, [projectsData]);

  // Handle API errors
  useEffect(() => {
    if (apiError) {
      handleApiError(apiError, '프로젝트를 불러오는데 실패했습니다.');
    }
  }, [apiError, handleApiError]);

  const handleProjectCreated = () => {
    setShowCreateModal(false);
    success('프로젝트 생성 완료', '새로운 프로젝트가 성공적으로 생성되었습니다.');
    refetchProjects();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600">AI PM 기능을 사용하려면 로그인해주세요.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (apiError && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">오류 발생</h2>
          <p className="text-gray-600 mb-4">{apiError.message}</p>
          <button
            onClick={refetchProjects}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI PM 대시보드</h1>
              {isValidating && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <LoadingSpinner size="sm" />
                  <span>업데이트 중...</span>
                </div>
              )}
            </div>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              AI와 함께하는 체계적인 프로젝트 기획 관리
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refetchProjects}
              disabled={isValidating}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="프로젝트 목록 새로고침"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto justify-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                새 프로젝트
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">프로젝트가 없습니다</h3>
          <p className="mt-2 text-gray-500">
            {isAdmin 
              ? '새 프로젝트를 생성하여 AI PM 기능을 시작해보세요.'
              : '관리자가 프로젝트에 초대할 때까지 기다려주세요.'
            }
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              첫 번째 프로젝트 만들기
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={'project_id' in project ? project.project_id : project.id}
              project={project}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleProjectCreated}
        />
      )}
    </div>
  );
}