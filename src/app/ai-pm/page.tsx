'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { ProjectWithCreator, CreateProjectRequest } from '@/types/ai-pm';
import ProjectCard from '@/components/ai-pm/ProjectCard';
import CreateProjectModal from '@/components/ai-pm/CreateProjectModal';
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
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">AI-PM 프로젝트</h1>
                <p className="mt-2 text-gray-600">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FolderIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">전체 프로젝트</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalProjects}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">진행 중</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeProjects}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 문서</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalDocuments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-orange-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">최근 활동</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.recentActivity}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 프로젝트 목록 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">내 프로젝트</h2>
          </div>

          {isLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">프로젝트가 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">
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
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isAdmin={user?.user_metadata?.role === 'admin'}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 프로젝트 생성 모달 */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateProject}
        />
      )}
    </div>
  );
}