'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DocumentEditor from './DocumentEditor';
import { useToast, useApiError } from '@/contexts/ToastContext';
import { 
  PlanningDocumentWithUsers,
  DocumentStatus,
  WorkflowStep,
  UpdateDocumentRequest
} from '@/types/ai-pm';

interface DocumentManagerProps {
  projectId: string;
  workflowStep: WorkflowStep;
  userId: string;
  onDocumentChange?: (document: PlanningDocumentWithUsers | null) => void;
  onShowVersionHistory?: () => void;
  className?: string;
}

interface DocumentState {
  document: PlanningDocumentWithUsers | null;
  isLoading: boolean;
  error: string | null;
  isGenerating: boolean;
}

export default function DocumentManager({
  projectId,
  workflowStep,
  userId,
  onDocumentChange,
  onShowVersionHistory,
  className = ''
}: DocumentManagerProps) {
  // Toast notifications
  const { success, error: showError, info } = useToast();
  const { handleApiError } = useApiError();

  // Log activity helper
  const logActivity = useCallback(async (activityType: string, description: string, targetId?: string) => {
    try {
      await fetch(`/api/ai-pm/projects/${projectId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: activityType,
          target_type: 'document',
          target_id: targetId,
          description
        })
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, [projectId]);
  const [state, setState] = useState<DocumentState>({
    document: null,
    isLoading: true,
    error: null,
    isGenerating: false
  });

  // Load existing document for this workflow step
  const loadDocument = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `/api/ai-pm/documents?projectId=${projectId}&workflowStep=${workflowStep}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '문서 로드에 실패했습니다.');
      }

      const data = await response.json();
      const documents = data.documents || [];
      
      // Find the user's document or the official document
      const userDocument = documents.find((doc: PlanningDocumentWithUsers) => 
        doc.created_by === userId
      );
      const officialDocument = documents.find((doc: PlanningDocumentWithUsers) => 
        doc.status === 'official'
      );

      const document = userDocument || officialDocument || null;

      setState(prev => ({ 
        ...prev, 
        document, 
        isLoading: false 
      }));

      if (onDocumentChange) {
        onDocumentChange(document);
      }

    } catch (error: any) {
      console.error('Error loading document:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
    }
  }, [projectId, workflowStep, userId, onDocumentChange]);

  // Generate new document from AI conversation
  const generateDocument = useCallback(async () => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      const response = await fetch(
        `/api/ai-pm/documents/generate?projectId=${projectId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow_step: workflowStep
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'AI 문서 생성에 실패했습니다.');
      }

      const data = await response.json();
      const newDocument = data.document;

      setState(prev => ({ 
        ...prev, 
        document: newDocument, 
        isGenerating: false 
      }));

      if (onDocumentChange) {
        onDocumentChange(newDocument);
      }

      // Log activity
      await logActivity(
        'document_created',
        `AI를 사용하여 워크플로우 ${workflowStep}단계 문서 "${newDocument.title}"를 생성했습니다.`,
        newDocument.id
      );

    } catch (error: any) {
      console.error('Error generating document:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isGenerating: false 
      }));
    }
  }, [projectId, workflowStep, onDocumentChange, logActivity]);

  // Create new document
  const createDocument = useCallback(async (title: string, content: string) => {
    try {
      const response = await fetch('/api/ai-pm/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          workflow_step: workflowStep,
          title,
          content
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '문서 생성에 실패했습니다.');
      }

      const data = await response.json();
      const newDocument = data.document;

      setState(prev => ({ 
        ...prev, 
        document: newDocument 
      }));

      if (onDocumentChange) {
        onDocumentChange(newDocument);
      }

      // Log activity
      await logActivity(
        'document_created',
        `워크플로우 ${workflowStep}단계에 새 문서 "${title}"를 생성했습니다.`,
        newDocument.id
      );

      // Show success notification
      success('문서 생성 완료', `"${title}" 문서가 성공적으로 생성되었습니다.`);

      return newDocument;
    } catch (error: unknown) {
      console.error('Error creating document:', error);
      handleApiError(error, '문서 생성에 실패했습니다.');
      throw error;
    }
  }, [projectId, workflowStep, onDocumentChange, logActivity, success, handleApiError]);

  // Save document changes
  const saveDocument = useCallback(async (content: string, title?: string) => {
    if (!state.document) {
      // Create new document if none exists
      if (!title) {
        throw new Error('새 문서를 생성하려면 제목이 필요합니다.');
      }
      return await createDocument(title, content);
    }

    try {
      const updateData: UpdateDocumentRequest = { content };
      if (title !== undefined) {
        updateData.title = title;
      }

      const response = await fetch(`/api/ai-pm/documents/${state.document.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '문서 저장에 실패했습니다.');
      }

      const data = await response.json();
      const updatedDocument = data.document;

      setState(prev => ({ 
        ...prev, 
        document: updatedDocument 
      }));

      if (onDocumentChange) {
        onDocumentChange(updatedDocument);
      }

      // Log activity
      await logActivity(
        'document_updated',
        `워크플로우 ${workflowStep}단계 문서 "${updatedDocument.title}"를 수정했습니다.`,
        updatedDocument.id
      );

      // Show success notification
      success('문서 저장 완료', '변경사항이 성공적으로 저장되었습니다.');

      return updatedDocument;
    } catch (error: unknown) {
      console.error('Error saving document:', error);
      handleApiError(error, '문서 저장에 실패했습니다.');
      throw error;
    }
  }, [state.document, createDocument, onDocumentChange, logActivity, workflowStep, success, handleApiError]);

  // Change document status
  const changeDocumentStatus = useCallback(async (status: DocumentStatus) => {
    if (!state.document) return;

    try {
      const response = await fetch(`/api/ai-pm/documents/${state.document.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '문서 상태 변경에 실패했습니다.');
      }

      const data = await response.json();
      const updatedDocument = data.document;

      setState(prev => ({ 
        ...prev, 
        document: updatedDocument 
      }));

      if (onDocumentChange) {
        onDocumentChange(updatedDocument);
      }

      // Log activity based on status
      let activityType = '';
      let description = '';
      
      switch (status) {
        case 'pending_approval':
          activityType = 'document_approval_requested';
          description = `"${updatedDocument.title}" 문서의 승인을 요청했습니다.`;
          break;
        case 'official':
          activityType = 'document_approved';
          description = `"${updatedDocument.title}" 문서를 승인했습니다.`;
          break;
        case 'private':
          activityType = 'document_rejected';
          description = `"${updatedDocument.title}" 문서 승인을 반려했습니다.`;
          break;
      }

      if (activityType) {
        await logActivity(activityType, description, updatedDocument.id);
      }

    } catch (error: any) {
      console.error('Error changing document status:', error);
      throw error;
    }
  }, [state.document, onDocumentChange, logActivity]);

  // Delete document
  const deleteDocument = useCallback(async () => {
    if (!state.document) return;

    const documentToDelete = state.document; // Store reference before deletion

    try {
      const response = await fetch(`/api/ai-pm/documents/${state.document.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '문서 삭제에 실패했습니다.');
      }

      setState(prev => ({ 
        ...prev, 
        document: null 
      }));

      if (onDocumentChange) {
        onDocumentChange(null);
      }

      // Log activity
      await logActivity(
        'document_deleted',
        `워크플로우 ${workflowStep}단계 문서 "${documentToDelete.title}"를 삭제했습니다.`,
        documentToDelete.id
      );

    } catch (error: any) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }, [state.document, onDocumentChange, logActivity, workflowStep]);

  // Load document on mount and when dependencies change
  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Render loading state
  if (state.isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          문서를 불러오는 중...
        </div>
      </div>
    );
  }

  // Render error state
  if (state.error && !state.document) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="text-red-600 mb-4">{state.error}</div>
        <button
          onClick={loadDocument}
          className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // Render empty state with AI generation option
  if (!state.document) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            이 단계의 문서가 없습니다
          </h3>
          <p className="text-gray-600">
            AI와의 대화를 바탕으로 문서를 생성하거나 직접 작성할 수 있습니다.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={generateDocument}
            disabled={state.isGenerating}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {state.isGenerating && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {state.isGenerating ? 'AI 문서 생성 중...' : 'AI로 문서 생성'}
          </button>
          
          <button
            onClick={() => createDocument('새 문서', '# 새 문서\n\n여기에 내용을 작성하세요.')}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            직접 작성
          </button>
        </div>
      </div>
    );
  }

  // Render document editor
  const isReadOnly = state.document.created_by !== userId && state.document.status === 'official';

  return (
    <div className={className}>
      <DocumentEditor
        projectId={projectId}
        workflowStep={workflowStep}
        document={state.document}
        isReadOnly={isReadOnly}
        onSave={saveDocument}
        onStatusChange={changeDocumentStatus}
        onDelete={deleteDocument}
        onShowVersionHistory={onShowVersionHistory}
      />
      
      {/* AI regeneration option for existing documents */}
      {!isReadOnly && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900">AI 문서 재생성</h4>
              <p className="text-sm text-blue-700">
                현재 대화 내용을 바탕으로 문서를 다시 생성할 수 있습니다.
              </p>
            </div>
            <button
              onClick={generateDocument}
              disabled={state.isGenerating}
              className="px-3 py-1 text-sm text-blue-700 border border-blue-300 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.isGenerating ? '생성 중...' : '재생성'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}