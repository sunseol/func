'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { WorkflowStep, PlanningDocumentWithUsers } from '@/types/ai-pm';
import WorkflowSidebar from '@/components/ai-pm/WorkflowSidebar';
import WorkflowProgress from '@/components/ai-pm/WorkflowProgress';
import WorkflowGuide from '@/components/ai-pm/WorkflowGuide';
import DocumentEditor from '@/components/ai-pm/DocumentEditor';
import AIChatPanel from '@/components/ai-pm/AIChatPanel';
import DocumentManager from '@/components/ai-pm/DocumentManager';
import { 
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  documentCount: number;
}

export default function WorkflowStepPage() {
  const params = useParams();
  const { user } = useAuth();
  const { error: showError } = useToast();
  
  const projectId = params.projectId as string;
  const step = parseInt(params.step as string) as WorkflowStep;
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'document' | 'chat' | 'guide'>('document');
  const [completedSteps, setCompletedSteps] = useState<WorkflowStep[]>([]);
  const [currentDocument, setCurrentDocument] = useState<PlanningDocumentWithUsers | null>(null);

  const loadProjectData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai-pm/projects/${projectId}`);
      
      if (!response.ok) {
        throw new Error('프로젝트 정보를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      const projectData = data.project;
      
      setProject({
        id: projectData.id,
        name: projectData.name,
        description: projectData.description,
        memberCount: data.members?.length || 0,
        documentCount: data.progress?.reduce((sum: number, p: any) => sum + p.document_count, 0) || 0
      });

      // 완료된 단계 계산
      const completed = data.progress
        ?.filter((p: any) => p && p.has_official_document)
        .map((p: any) => p.workflow_step)
        .filter((step: any) => step !== undefined && step !== null) || [];
      setCompletedSteps(completed);

    } catch (err) {
      console.error('Error loading project:', err);
      showError('프로젝트 로드 오류', '프로젝트 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, showError]);

  // 프로젝트 정보 로드
  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  const handleStepClick = (clickedStep: WorkflowStep) => {
    // 현재 단계보다 낮은 단계로만 이동 가능
    if (clickedStep <= step) {
      window.location.href = `/ai-pm/${projectId}/workflow/${clickedStep}`;
    }
  };

  const handleDocumentCreated = (document: PlanningDocumentWithUsers) => {
    setCurrentDocument(document);
    // 프로젝트 데이터 새로고침
    loadProjectData();
  };

  const handleDocumentUpdated = (document: PlanningDocumentWithUsers) => {
    setCurrentDocument(document);
    // 프로젝트 데이터 새로고침
    loadProjectData();
  };

  const handleMessageSent = (message: any) => {
    // 메시지 전송 후 필요한 경우 문서 상태 업데이트
    console.log('Message sent:', message);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">프로젝트를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-4">요청하신 프로젝트가 존재하지 않거나 접근 권한이 없습니다.</p>
          <Link
            href="/ai-pm"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            프로젝트 목록으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* 사이드바 */}
        <WorkflowSidebar
          projectId={projectId}
          projectName={project.name}
          currentStep={step}
          completedSteps={completedSteps}
          memberCount={project.memberCount}
          documentCount={project.documentCount}
          onStepClick={handleStepClick}
        />

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {step}. {getWorkflowStepName(step)}
                </h1>
                <p className="text-gray-600 mt-1">
                  {project.name} - {getWorkflowStepDescription(step)}
                </p>
              </div>
              
              {/* 진행률 */}
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  {completedSteps?.length || 0}/9 단계 완료
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {Math.round(((completedSteps?.length || 0) / 9) * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-white border-b border-gray-200 px-6">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('document')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'document'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DocumentTextIcon className="w-4 h-4 inline mr-2" />
                문서 편집
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'chat'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4 inline mr-2" />
                AI 어시스턴트
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'guide'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <LightBulbIcon className="w-4 h-4 inline mr-2" />
                워크플로우 가이드
              </button>
            </div>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'document' && (
              <div className="h-full flex">
                                 {/* 문서 편집기 */}
                 <div className="flex-1 p-6">
                   <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                     <div className="text-center">
                       <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                       <h3 className="text-lg font-medium text-gray-900 mb-2">
                         문서 편집기
                       </h3>
                       <p className="text-gray-600 mb-4">
                         AI와 대화 후 문서를 생성하면 이 영역에 편집기가 표시됩니다.
                       </p>
                       <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                         <h4 className="font-medium text-blue-900 mb-2">
                           현재 단계: {getWorkflowStepName(step)}
                         </h4>
                         <p className="text-sm text-blue-700">
                           AI 어시스턴트와 대화하여 이 단계의 기획 문서를 작성해보세요.
                         </p>
                       </div>
                     </div>
                   </div>
                 </div>
                
                {/* 문서 관리 */}
                <div className="w-80 p-6 border-l border-gray-200 overflow-y-auto">
                  <DocumentManager
                    projectId={projectId}
                    workflowStep={step}
                    onDocumentCreated={handleDocumentCreated}
                    onDocumentUpdated={handleDocumentUpdated}
                  />
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="h-full p-6">
                <AIChatPanel
                  projectId={projectId}
                  workflowStep={step}
                  onMessageSent={handleMessageSent}
                  className="h-full"
                />
              </div>
            )}

            {activeTab === 'guide' && (
              <div className="h-full p-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-6">
                  <WorkflowProgress
                    currentStep={step}
                    completedSteps={completedSteps}
                    totalSteps={9}
                    onStepClick={handleStepClick}
                  />
                  <WorkflowGuide currentStep={step} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getWorkflowStepName(step: WorkflowStep): string {
  const stepNames: Record<WorkflowStep, string> = {
    1: '컨셉 정의',
    2: '기능 기획',
    3: '기술 설계',
    4: '개발 계획',
    5: '테스트 계획',
    6: '배포 준비',
    7: '운영 계획',
    8: '마케팅 전략',
    9: '사업화 계획'
  };
  return stepNames[step];
}

function getWorkflowStepDescription(step: WorkflowStep): string {
  const descriptions: Record<WorkflowStep, string> = {
    1: '플랫폼의 기본 컨셉과 방향성을 정의합니다',
    2: '핵심 기능과 요구사항을 정리합니다',
    3: '기술 스택과 아키텍처를 설계합니다',
    4: '개발 일정과 리소스를 계획합니다',
    5: '테스트 전략과 품질 보증을 수립합니다',
    6: '배포 전략과 운영 환경을 준비합니다',
    7: '운영 프로세스와 모니터링을 계획합니다',
    8: '마케팅 전략과 사용자 확보를 계획합니다',
    9: '수익화 모델과 사업화 전략을 수립합니다'
  };
  return descriptions[step];
}