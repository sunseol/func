'use client';

import React, { useState, useCallback } from 'react';
import DocumentManager from './DocumentManager';
import DocumentEditor from './DocumentEditor';
import DocumentVersionHistory from './DocumentVersionHistory';
import { PlanningDocumentWithUsers, WorkflowStep, DocumentStatus } from '@/types/ai-pm';
import { useToast } from '@/contexts/ToastContext';

interface DocumentWorkspaceProps {
  projectId: string;
  workflowStep: WorkflowStep;
  className?: string;
}

export default function DocumentWorkspace({
  projectId,
  workflowStep,
  className = ''
}: DocumentWorkspaceProps) {
  const [currentDocument, setCurrentDocument] = useState<PlanningDocumentWithUsers | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const { success, error: showError } = useToast();

  // A key to force-remount the DocumentManager when a document is updated.
  const [managerKey, setManagerKey] = useState(Date.now());

  const handleDocumentSelect = (document: PlanningDocumentWithUsers | null) => {
    setCurrentDocument(document);
  };

  const handleDocumentUpdate = (updatedDocument: PlanningDocumentWithUsers) => {
    setCurrentDocument(updatedDocument);
    // Force DocumentManager to re-fetch documents to reflect changes
    setManagerKey(Date.now()); 
  };
  
  const handleStatusChange = async (documentId: string, newStatus: DocumentStatus) => {
    const action = newStatus === 'pending_approval' ? 'request-approval' : newStatus === 'official' ? 'approve' : null;

    if (!action && newStatus !== 'private') {
        showError('유효하지 않은 상태 값입니다.');
        return;
    }

    // For simple status changes that have dedicated endpoints
    if (action) {
        const url = `/api/ai-pm/documents/${documentId}/${action}`;
        try {
            const response = await fetch(url, { method: 'POST' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '상태 변경에 실패했습니다.');
            }
            const updatedDocument = await response.json();
            success('상태 변경 완료', `문서가 ${newStatus} 상태로 변경되었습니다.`);
            handleDocumentUpdate(updatedDocument.document);
        } catch (err) {
            showError('상태 변경 오류', (err as Error).message);
        }
    } else {
         // Handle general status updates (e.g., to private) via a generic update endpoint
         // This part needs a proper API endpoint like `PATCH /api/ai-pm/documents/{documentId}`
         console.warn(`Status change to "${newStatus}" is not fully implemented yet.`);
         // As a placeholder, we optimistically update the UI
         if(currentDocument) {
           const updatedDoc = { ...currentDocument, status: newStatus };
           handleDocumentUpdate(updatedDoc);
           success('상태 변경 완료 (임시)', `문서가 ${newStatus} 상태로 변경되었습니다.`);
         }
    }
  };

  const handleSave = async (documentId: string, content: string, title?: string): Promise<PlanningDocumentWithUsers> => {
    // Placeholder for save logic
    console.log('Saving document...', { documentId, title, content });
    if(currentDocument) {
        const updatedDoc = { ...currentDocument, title: title || currentDocument.title, content };
        handleDocumentUpdate(updatedDoc);
        return updatedDoc;
    }
    throw new Error("No document selected");
  };

  const handleDelete = async (documentId: string) => {
    // Placeholder for delete logic
    console.log('Deleting document...', documentId);
    setCurrentDocument(null);
    setManagerKey(Date.now());
  };

  return (
    <div className={`flex h-full gap-4 ${className}`}>
      {/* Left Panel: Document Manager */}
      <div className="w-1/3 flex-shrink-0">
        <DocumentManager
          key={managerKey}
          projectId={projectId}
          workflowStep={workflowStep}
          onDocumentSelect={handleDocumentSelect}
        />
      </div>

      {/* Right Panel: Document Editor or Placeholder */}
      <div className="w-2/3 flex-grow">
        {currentDocument ? (
          <DocumentEditor
            key={currentDocument.id}
            projectId={projectId}
            workflowStep={workflowStep}
            document={currentDocument}
            onSave={(content, title) => handleSave(currentDocument.id, content, title)}
            onStatusChange={(status) => handleStatusChange(currentDocument.id, status)}
            onDelete={() => handleDelete(currentDocument.id)}
            onShowVersionHistory={() => setShowVersionHistory(true)}
            onDocumentUpdated={handleDocumentUpdate}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-500">문서를 선택하여 편집하세요</p>
              <p className="text-sm text-gray-400">왼쪽 목록에서 문서를 클릭하면 여기에 내용이 표시됩니다.</p>
            </div>
          </div>
        )}
      </div>

      {/* Version History Modal (remains unchanged) */}
      {currentDocument && showVersionHistory && (
        <DocumentVersionHistory
          projectId={projectId}
          documentId={currentDocument.id}
          currentVersion={currentDocument.version}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </div>
  );
}
