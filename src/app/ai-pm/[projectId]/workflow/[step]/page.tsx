'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectNavigation, useWorkflowNavigation } from '@/contexts/NavigationContext';
import { 
  ProjectResponse, 
  ProjectWithCreator, 
  WORKFLOW_STEPS, 
  WorkflowStep,
  isValidWorkflowStep 
} from '@/types/ai-pm';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/ui/LoadingSkeletons';

// Dynamic imports for heavy components
const WorkflowSidebar = dynamic(() => import('@/components/ai-pm/WorkflowSidebar'), {
  loading: () => <div className="w-80 bg-gray-100 animate-pulse rounded-lg h-96"></div>,
  ssr: false
});

const WorkflowStepNavigation = dynamic(() => import('@/components/ai-pm/WorkflowStepNavigation'), {
  loading: () => <div className="h-16 bg-gray-100 animate-pulse rounded-lg"></div>,
  ssr: false
});

const WorkflowGuide = dynamic(() => import('@/components/ai-pm/WorkflowGuide'), {
  loading: () => <div className="bg-gray-100 animate-pulse rounded-lg h-32"></div>,
  ssr: false
});

const AIChatPanel = dynamic(() => import('@/components/ai-pm/AIChatPanel'), {
  loading: () => <div className="bg-gray-100 animate-pulse rounded-lg h-96"></div>,
  ssr: false
});

export default function WorkflowStepPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { setCurrentProject } = useProjectNavigation();
  const { setCurrentWorkflowStep } = useWorkflowNavigation();
  
  const projectId = params.projectId as string;
  const stepParam = params.step as string;
  const step = parseInt(stepParam);

  const [project, setProject] = useState<ProjectWithCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const projectWithProgress = {
        ...data.project,
        progress: data.progress || []
      };
      setProject(projectWithProgress);
      
      // Update navigation context
      setCurrentProject(data.project);
      setCurrentWorkflowStep(step);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [projectId, step, setCurrentProject, setCurrentWorkflowStep]);

  useEffect(() => {
    if (user && projectId) {
      fetchProjectData();
    }
  }, [user, projectId, fetchProjectData]);

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

  if (!isValidWorkflowStep(step)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">잘못된 워크플로우 단계</h2>
          <p className="text-gray-600 mb-4">유효하지 않은 워크플로우 단계입니다.</p>
          <button
            onClick={() => router.push(`/ai-pm/${projectId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            프로젝트로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">오류 발생</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => router.push(`/ai-pm/${projectId}`)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              프로젝트로 돌아가기
            </button>
            <button
              onClick={fetchProjectData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const stepName = WORKFLOW_STEPS[step as WorkflowStep];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Workflow Sidebar */}
      <WorkflowSidebar 
        projectId={projectId}
        progress={project.progress || []}
        currentStep={step as WorkflowStep}
        className="w-80 flex-shrink-0"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/ai-pm/${projectId}`)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <span>{project.name}</span>
                  <span className="mx-2">›</span>
                  <span>워크플로우</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {step}단계: {stepName}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step Navigation */}
          <WorkflowStepNavigation 
            projectId={projectId}
            currentStep={step as WorkflowStep}
            progress={project.progress || []}
          />

          {/* Workflow Guide */}
          <WorkflowGuide currentStep={step as WorkflowStep} />

          {/* Main Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Chat Panel */}
            <AIChatPanel
              projectId={projectId}
              workflowStep={step as WorkflowStep}
              onDocumentGenerated={(documentId) => {
                // TODO: Handle document generation - will be implemented in task 10
                console.log('Document generated:', documentId);
              }}
              className="h-[600px]"
            />

            {/* Document Editor Placeholder */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  문서 편집기
                </h3>
                <p className="text-gray-600 mb-4">
                  AI와 대화 후 &quot;문서 생성&quot; 버튼을 클릭하면 이 영역에 문서 편집기가 표시됩니다.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-2">현재 단계: {stepName}</h4>
                  <p className="text-sm text-blue-700">
                    왼쪽 AI 어시스턴트와 대화하여 이 단계의 기획 문서를 작성해보세요.
                    대화가 충분히 진행된 후 &quot;문서 생성&quot; 버튼을 클릭하면 AI가 자동으로 문서를 생성합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}