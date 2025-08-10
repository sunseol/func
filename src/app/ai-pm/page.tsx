'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useViewport } from '@/contexts/ViewportContext';
import { ProjectWithCreator, CreateProjectRequest } from '@/types/ai-pm';
import { MobileLazy } from '@/lib/lazy-loading';
import LoadingSkeletons from '@/components/ui/LoadingSkeletons';

// 지연 로딩 컴포넌트들
// ProjectCard는 모바일에서 즉시 렌더되도록 정적 임포트로 전환
import ProjectCard from '@/components/ai-pm/ProjectCard';
const CreateProjectModal = React.lazy(() => import('@/components/ai-pm/CreateProjectModal'));
import { 
  PlusIcon,
  FolderIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export default function AIPMPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { isMobile } = useViewport();
  
  const [projects, setProjects] = useState<ProjectWithCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalDocuments: 0,
    recentActivity: 0
  });

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ai-pm/projects', { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setProjects(data.projects || []);

      // 통계 계산
      const totalProjects = data.projects?.length || 0;
      const activeProjects = data.projects?.filter((p: any) => 
        p.progress?.some((prog: any) => prog.has_official_document)
      ).length || 0;
      const totalDocuments = data.projects?.reduce((sum: number, p: any) => 
        sum + (p.progress?.reduce((docSum: number, prog: any) => docSum + prog.document_count, 0) || 0), 0
      ) || 0;

      setStats({
        totalProjects,
        activeProjects,
        totalDocuments,
        recentActivity: Math.floor(Math.random() * 10) + 1 // 임시 데이터
      });

    } catch (err) {
      console.error('Error loading projects:', err);
      showError('프로젝트 로드 오류', '프로젝트 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // 프로젝트 목록 로드
  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  const handleCreateProject = async () => {
    // 프로젝트 생성 후 목록 새로고침
    await loadProjects();
    setShowCreateModal(false);
    success('프로젝트 생성', '프로젝트가 성공적으로 생성되었습니다.');
  };

  const handleProjectDelete = async (projectId: string) => {
    try {
      const response = await fetch(`/api/ai-pm/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('프로젝트 삭제에 실패했습니다.');
      }

      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      success('프로젝트 삭제', '프로젝트가 성공적으로 삭제되었습니다.');
      
      // 통계 업데이트
      setStats(prev => ({
        ...prev,
        totalProjects: prev.totalProjects - 1
      }));

    } catch (err) {
      console.error('Error deleting project:', err);
      showError('프로젝트 삭제 오류', '프로젝트 삭제에 실패했습니다.');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600">AI-PM 시스템을 사용하려면 로그인해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* 헤더 */}
      <div className="bg-white dark:bg-neutral-900 shadow-sm border-b border-gray-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI-PM 프로젝트</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  AI와 함께 체계적으로 플랫폼을 기획하세요
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                새 프로젝트
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FolderIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">전체 프로젝트</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalProjects}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">진행 중</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">{stats.activeProjects}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">총 문서</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalDocuments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">최근 활동</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">{stats.recentActivity}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 프로젝트 목록 */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 overflow-visible pb-4 sm:pb-6">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">내 프로젝트</h2>
          </div>

          {isLoading ? (
            <div className="p-4 sm:p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">프로젝트가 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                첫 번째 프로젝트를 생성하여 AI-PM 워크플로우를 시작해보세요.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  새 프로젝트 생성
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 relative z-0">
                {projects.map((project) => (
                  <div key={project.id} className="relative z-0">
                    <ProjectCard
                      project={project}
                      isAdmin={user?.user_metadata?.role === 'admin'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 프로젝트 생성 모달 */}
      {showCreateModal && (
        <Suspense fallback={
          isMobile ? <LoadingSkeletons.MobileModal /> : <LoadingSkeletons.Modal />
        }>
          <CreateProjectModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleCreateProject}
          />
        </Suspense>
      )}
    </div>
  );
}