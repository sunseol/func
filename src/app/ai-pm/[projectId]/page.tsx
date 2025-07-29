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
  const { user, profile } = useAuth();
  const { state: navState, setCurrentProject } = useNavigation();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<ProjectWithCreator | null>(null);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [progress, setProgress] = useState<ProjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'collaboration' | 'members' | 'settings'>('overview');
  const [showWorkflowSidebar, setShowWorkflowSidebar] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai-pm/projects/${projectId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('프로젝트를 찾을 수 없습니다.');
        } else if (response.status === 403) {
          throw new Error('이 프로젝트에 접근할 권한이 없습니다.');
        }
        throw new Error('프로젝트 정보를 불러오는데 실패했습니다.');
      }

      const data: ProjectResponse = await response.json();
      setProject(data.project);
      setMembers(data.members);
      setProgress(data.progress);
      
      // DO NOT UPDATE CONTEXT HERE
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

  // This effect syncs the fetched project data to the navigation context
  useEffect(() => {
    // Prevent infinite loop by checking if the project in context is already set
    if (project && project.id !== navState.currentProject?.id) {
      setCurrentProject(project);
    }
  }, [project, setCurrentProject, navState.currentProject]);

  const handleMembersUpdate = () => {
    fetchProjectData();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600">이 페이지에 접근하려면 로그인해주세요.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">프로젝트 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">오류 발생</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-3">
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => router.push('/ai-pm')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                대시보드로 돌아가기
              </button>
              <button
                onClick={fetchProjectData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                다시 시도
              </button>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              홈으로 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  // 현재 단계와 완료된 단계 계산
  const currentStep = progress?.find(p => p.has_official_document)?.workflow_step || 1;
  const completedSteps = (progress || [])
    .filter(p => p.has_official_document)
    .map(p => p.workflow_step)
    .filter(step => step !== undefined && step !== null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const tabs = [
    { id: 'overview' as const, name: '개요', icon: DocumentTextIcon },
    { id: 'collaboration' as const, name: '협업 현황', icon: UsersIcon },
    { id: 'members' as const, name: '멤버 관리', icon: UsersIcon },
    ...(isAdmin ? [{ id: 'settings' as const, name: '설정', icon: Cog6ToothIcon }] : [])
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Workflow Sidebar - Mobile Overlay */}
      {showWorkflowSidebar && project && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowWorkflowSidebar(false)} />
          <div className="relative w-80 h-full">
            <WorkflowSidebar 
              projectId={projectId}
              projectName={project.name}
              currentStep={currentStep}
              completedSteps={completedSteps}
              memberCount={members.length}
              documentCount={progress.reduce((sum, p) => sum + p.document_count, 0)}
            />
          </div>
        </div>
      )}

      {/* Workflow Sidebar - Desktop */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
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
                {project.description && (
                  <p className="mt-1 text-gray-600">{project.description}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  생성일: {formatDate(project.created_at)} | 
                  생성자: {project.creator_name || project.creator_email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-8">
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

            {/* Tab Content */}
            {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Project Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <UsersIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{members.length}</p>
                    <p className="text-xs sm:text-sm text-gray-600">프로젝트 멤버</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {progress.filter(p => p.has_official_document).length}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">완료된 단계</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="h-6 w-6 sm:h-8 sm:w-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">%</span>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {Math.round((progress.filter(p => p.has_official_document).length / 9) * 100)}%
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">진행률</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Progress */}
            {project && (
              <WorkflowProgress 
                currentStep={currentStep}
                completedSteps={completedSteps}
                totalSteps={9}
              />
            )}

            {/* Recent Members */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">프로젝트 멤버</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {members.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {(member.full_name || member.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {member.full_name || member.email}
                          </p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
                {members.length > 5 && (
                  <button
                    onClick={() => setActiveTab('members')}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-800"
                  >
                    모든 멤버 보기 ({members.length}명)
                  </button>
                )}
              </div>
            </div>
          </div>
            )}

            {activeTab === 'collaboration' && (
              <ProjectCollaborationDashboard
                projectId={projectId}
                className="max-w-none"
              />
            )}

            {activeTab === 'members' && (
              <MemberManagement
                projectId={projectId}
                members={members}
                isAdmin={isAdmin}
                onMembersUpdate={handleMembersUpdate}
              />
            )}

            {activeTab === 'settings' && isAdmin && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">프로젝트 설정</h3>
                <p className="text-gray-600">프로젝트 설정 기능은 향후 구현 예정입니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}