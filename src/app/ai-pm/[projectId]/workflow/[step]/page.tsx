'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast, useApiError } from '@/contexts/ToastContext';
import { WorkflowStep, PlanningDocumentWithUsers, DocumentStatus, UpdateDocumentRequest } from '@/types/ai-pm';
import WorkflowSidebar from '@/components/ai-pm/WorkflowSidebar';
import WorkflowProgress from '@/components/ai-pm/WorkflowProgress';
import WorkflowGuide from '@/components/ai-pm/WorkflowGuide';
import DocumentEditor from '@/components/ai-pm/DocumentEditor';
import AIChatPanel from '@/components/ai-pm/AIChatPanel';
import DocumentManager from '@/components/ai-pm/DocumentManager';
import ConversationHistoryPanel from '@/components/ai-pm/ConversationHistoryPanel';
import { useViewport } from '@/contexts/ViewportContext';
import MobileBottomSheet from '@/components/ai-pm/MobileBottomSheet';
import { 
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  ArrowLeftIcon,
  ClockIcon
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
  const { success, error: showError } = useToast();
  const { handleApiError } = useApiError();
  
  const projectId = params.projectId as string;
  const step = parseInt(params.step as string) as WorkflowStep;
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'document' | 'chat' | 'guide'>('document');
  const [completedSteps, setCompletedSteps] = useState<WorkflowStep[]>([]);
  const [currentDocument, setCurrentDocument] = useState<PlanningDocumentWithUsers | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showDocManager, setShowDocManager] = useState(false);
  const { isMobile } = useViewport();

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

      const completed = data.progress
        ?.filter((p: any) => p && p.has_official_document)
        .map((p: any) => p.workflow_step)
        .filter((step: any) => step !== undefined && step !== null) || [];
      setCompletedSteps(completed);

    } catch (err) {
      handleApiError(err, '프로젝트 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, handleApiError]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  const handleDocumentUpdated = (document: PlanningDocumentWithUsers) => {
    setCurrentDocument(document);
    loadProjectData();
  };

  const handleSaveDocument = async (content: string, title?: string): Promise<PlanningDocumentWithUsers> => {
    if (!currentDocument) {
      throw new Error("No document selected");
    }

    const requestBody: UpdateDocumentRequest = {
      content,
      title: title || currentDocument.title,
    };

    const response = await fetch(`/api/ai-pm/documents/${currentDocument.id}?projectId=${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save document');
    }

    const { document: updatedDocument } = await response.json();
    handleDocumentUpdated(updatedDocument);
    success('문서 저장 완료', '변경사항이 성공적으로 저장되었습니다.');
    return updatedDocument;
  };

  const handleStatusChange = async (newStatus: DocumentStatus): Promise<void> => {
    if (!currentDocument) {
      throw new Error("No document selected");
    }

    const dedicatedAction = newStatus === 'pending_approval' ? 'request-approval' : newStatus === 'official' ? 'approve' : null;

    try {
      let response;
      if (dedicatedAction) {
        // Use dedicated endpoints for requesting approval or approving
        const url = `/api/ai-pm/documents/${currentDocument.id}/${dedicatedAction}`;
        console.log(`[StatusChange] Calling dedicated action: POST ${url}`);
        response = await fetch(url, { method: 'POST' });
      } else {
        // Use generic update endpoint for other status changes (e.g., to private, rejected)
        const url = `/api/ai-pm/documents/${currentDocument.id}?projectId=${projectId}`;
        console.log(`[StatusChange] Calling generic update: PUT ${url}`);
        response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '상태 변경에 실패했습니다.');
      }

      const updatedData = await response.json();
      success('상태 변경 완료', `문서가 ${newStatus} 상태로 변경되었습니다.`);
      handleDocumentUpdated(updatedData.document);
    } catch (err) {
      handleApiError(err, "상태 변경에 실패했습니다.");
    }
  };

  const handleDeleteDocument = async (): Promise<void> => {
    if (!currentDocument) {
      throw new Error("No document selected");
    }

    await fetch(`/api/ai-pm/documents/${currentDocument.id}?projectId=${projectId}`, {
      method: 'DELETE',
    });
    
    setCurrentDocument(null);
    loadProjectData();
    success('문서 삭제 완료', '문서가 성공적으로 삭제되었습니다.');
  };

  const handleStepClick = (clickedStep: WorkflowStep) => {
    if (clickedStep <= step) {
      window.location.href = `/ai-pm/${projectId}/workflow/${clickedStep}`;
    }
  };

  const handleDocumentSelect = (document: PlanningDocumentWithUsers) => {
    setCurrentDocument(document);
  };
  
  const handleDocumentCreated = (document: PlanningDocumentWithUsers) => {
    setCurrentDocument(document);
    loadProjectData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
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
    <>
      <WorkflowSidebar
        projectId={projectId}
        projectName={project.name}
        currentStep={step}
        completedSteps={completedSteps}
        memberCount={project.memberCount}
        documentCount={project.documentCount}
        onStepClick={handleStepClick}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-3 sm:px-6">
          <div className="flex space-x-2 sm:space-x-8 overflow-x-auto no-scrollbar">
            <button
              className={`flex items-center px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'document'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('document')}
            >
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              문서 편집기
            </button>
            <button
              className={`flex items-center px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('chat')}
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
              AI 어시스턴트
            </button>
            <button
              className={`flex items-center px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'guide'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('guide')}
            >
              <LightBulbIcon className="w-5 h-5 mr-2" />
              워크플로우 가이드
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'document' && (
            <div className={`h-full ${isMobile ? 'flex flex-col' : 'flex'}`}>
              <div className={`flex-1 ${isMobile ? 'p-3' : 'p-6'} overflow-y-auto`}>
                {currentDocument ? (
                  <DocumentEditor
                    key={currentDocument.id}
                    document={currentDocument}
                    workflowStep={step}
                    onSave={handleSaveDocument}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteDocument}
                    onDocumentUpdated={handleDocumentUpdated}
                    projectId={projectId}
                  />
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex items-center justify-center">
                    <div className="text-center">
                      <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        문서를 선택해주세요
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {isMobile ? '아래 버튼을 눌러 문서 목록을 열어주세요.' : '오른쪽 문서 관리 목록에서 문서를 선택하거나 새 문서를 생성하세요.'}
                      </p>
                    </div>
                  </div>
                )}

                {isMobile && (
                  <div className="fixed right-4 bottom-20 sm:bottom-6 z-40">
                    <button
                      onClick={() => setShowDocManager(true)}
                      className="px-4 py-3 rounded-full shadow-lg bg-blue-600 text-white text-sm font-medium"
                    >
                      문서 목록
                    </button>
                  </div>
                )}
              </div>

              {!isMobile && (
                <div className="w-96 p-6 border-l border-gray-200 overflow-y-auto bg-gray-50">
                  <DocumentManager
                    projectId={projectId}
                    workflowStep={step}
                    onDocumentCreated={handleDocumentCreated}
                    onDocumentUpdated={handleDocumentUpdated}
                    onDocumentSelect={handleDocumentSelect}
                  />
                </div>
              )}

              {isMobile && (
                <MobileBottomSheet
                  isOpen={showDocManager}
                  onClose={() => setShowDocManager(false)}
                  initialHeight={70}
                  minHeight={0}
                  maxHeight={90}
                  snapPoints={[0, 50, 70, 90]}
                >
                  <div className="p-3">
                    <DocumentManager
                      projectId={projectId}
                      workflowStep={step}
                      onDocumentCreated={handleDocumentCreated}
                      onDocumentUpdated={handleDocumentUpdated}
                      onDocumentSelect={(doc) => { setShowDocManager(false); handleDocumentSelect(doc); }}
                    />
                  </div>
                </MobileBottomSheet>
              )}
            </div>
          )}
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <h3 className="text-lg font-semibold">
                  {showHistory ? '대화 기록' : 'AI 어시스턴트'}
                </h3>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                  title={showHistory ? "AI 어시스턴트로 돌아가기" : "대화 기록 보기"}
                >
                  {showHistory 
                    ? <ChatBubbleLeftRightIcon className="w-6 h-6" />
                    : <ClockIcon className="w-6 h-6" />
                  }
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {showHistory ? (
                  <ConversationHistoryPanel 
                    projectId={projectId} 
                    currentStep={step}
                  />
                ) : (
                  <AIChatPanel 
                    projectId={projectId} 
                    workflowStep={step} 
                  />
                )}
              </div>
            </div>
          )}
          {activeTab === 'guide' && (
            <div className="h-full p-6 overflow-y-auto">
              <WorkflowGuide step={step} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
