'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { 
  ProjectResponse, 
  ProjectWithCreator, 
  ProjectMemberWithProfile, 
  ProjectProgress
} from '@/types/ai-pm';
import MemberManagement from '@/components/ai-pm/MemberManagement';
import WorkflowProgress from '@/components/ai-pm/WorkflowProgress';
import WorkflowSidebar from '@/components/ai-pm/WorkflowSidebar';
import ProjectCollaborationDashboard from '@/components/ai-pm/ProjectCollaborationDashboard';
import { Card } from 'antd';
import { 
  ArrowLeftIcon,
  UsersIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { state: navState, setCurrentProject } = useNavigation();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<ProjectWithCreator | null>(null);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [progress, setProgress] = useState<ProjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'collaboration' | 'members' | 'settings'>('overview');
  const [showWorkflowSidebar, setShowWorkflowSidebar] = useState(false);

  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai-pm/projects/${projectId}`, { cache: 'no-store' });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '프로젝트 정보를 불러오는데 실패했습니다.');
      }

      const data: ProjectResponse = await response.json();
      
      setProject(data.project);
      setMembers(data.members);
      setProgress(data.progress);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (user?.id && projectId) {
      fetchProjectData();
    }
  }, [user?.id, projectId, fetchProjectData]);

  useEffect(() => {
    if (project && project.id !== navState.currentProject?.id) {
      setCurrentProject(project);
    }
  }, [project, setCurrentProject, navState.currentProject]);

  const handleMembersUpdate = () => {
    fetchProjectData();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600">이 페이지에 접근하려면 로그인해주세요.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 w-full h-full items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">프로젝트 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">오류 발생</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/ai-pm')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const currentStep = progress?.find(p => p.has_official_document)?.workflow_step || 1;
  const completedSteps = (progress || [])
    .filter(p => p.has_official_document)
    .map(p => p.workflow_step)
    .filter(step => step !== undefined && step !== null);
  
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const tabs = [
    { id: 'overview' as const, name: '개요', icon: DocumentTextIcon },
    { id: 'collaboration' as const, name: '협업 현황', icon: UsersIcon },
    { id: 'members' as const, name: '멤버 관리', icon: UsersIcon },
    { id: 'settings' as const, name: '설정', icon: Cog6ToothIcon }
  ];

  return (
    <>
      {showWorkflowSidebar && project && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="뒤로"
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowWorkflowSidebar(false)}
          />
          <div className="relative w-80 h-full">
            <WorkflowSidebar 
              projectId={projectId}
              projectName={project.name}
              currentStep={currentStep}
              completedSteps={completedSteps}
              memberCount={members.length}
              documentCount={progress.reduce((sum, p) => sum + p.document_count, 0)}
              isOpen={true}
              onClose={() => setShowWorkflowSidebar(false)}
              displayMode={'mobile-fullscreen'}
            />
          </div>
        </div>
      )}

      {project && (
        <div className="hidden lg:block w-80 flex-shrink-0">
          <WorkflowSidebar 
            projectId={projectId}
            projectName={project.name}
            currentStep={currentStep}
            completedSteps={completedSteps}
            memberCount={members.length}
            documentCount={progress.reduce((sum, p) => sum + p.document_count, 0)}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowWorkflowSidebar(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
              <button
                onClick={() => router.push('/ai-pm')}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  생성일: {formatDate(project.created_at)} | 
                  생성자: {project.creator_name || project.creator_email}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-2" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-8">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <Card>
                      <div className="flex items-center">
                        <UsersIcon className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-2xl font-bold">{members.length}</p>
                          <p className="text-sm text-gray-600">프로젝트 멤버</p>
                        </div>
                      </div>
                    </Card>
                    <Card>
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                          <p className="text-2xl font-bold">{completedSteps.length}</p>
                          <p className="text-sm text-gray-600">완료된 단계</p>
                        </div>
                      </div>
                    </Card>
                    <Card>
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">%</div>
                        <div className="ml-4">
                          <p className="text-2xl font-bold">{Math.round((completedSteps.length / 9) * 100)}%</p>
                          <p className="text-sm text-gray-600">진행률</p>
                        </div>
                      </div>
                    </Card>
                 </div>

                {project && (
                  <WorkflowProgress 
                    currentStep={currentStep}
                    completedSteps={completedSteps}
                    totalSteps={9}
                  />
                )}
              </div>
            )}

            {activeTab === 'collaboration' && (
              <ProjectCollaborationDashboard projectId={projectId} />
            )}

            {activeTab === 'members' && (
              <MemberManagement
                projectId={projectId}
                members={members}
                onMembersUpdate={handleMembersUpdate}
              />
            )}

            {activeTab === 'settings' && (
              <Card>
                <h3 className="text-lg font-medium text-gray-900 mb-4">프로젝트 설정</h3>
                <p className="text-gray-600">프로젝트 설정 기능은 향후 구현 예정입니다.</p>
              </Card>
            )}
        </div>
      </div>
    </>
  );
}
