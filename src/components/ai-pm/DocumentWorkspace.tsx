'use client';

import React, { useState } from 'react';
import DocumentManager from './DocumentManager';
import DocumentVersionHistory from './DocumentVersionHistory';
import { PlanningDocumentWithUsers, WorkflowStep } from '@/types/ai-pm';

interface DocumentWorkspaceProps {
  projectId: string;
  workflowStep: WorkflowStep;
  userId: string;
  className?: string;
}

export default function DocumentWorkspace({
  projectId,
  workflowStep,
  userId,
  className = ''
}: DocumentWorkspaceProps) {
  const [currentDocument, setCurrentDocument] = useState<PlanningDocumentWithUsers | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const handleDocumentChange = (document: PlanningDocumentWithUsers | null) => {
    setCurrentDocument(document);
  };

  const handleVersionPreview = (version: any) => {
    // 버전 미리보기 처리 로직
    console.log('Version preview:', version);
  };

  const handleVersionRestore = async (versionId: string) => {
    // 버전 복원 처리 로직
    console.log('Restore version:', versionId);
    // 실제 구현 시에는 API 호출 및 문서 새로고침 필요
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            워크플로우 단계 {workflowStep}
          </h2>
          {currentDocument && (
            <p className="text-sm text-gray-600">
              {currentDocument.status === 'official' ? '공식 승인됨' :
               currentDocument.status === 'pending_approval' ? '승인 대기 중' :
               '개인 작업 중'}
            </p>
          )}
        </div>

        {/* Document actions */}
        <div className="flex items-center gap-2">
          {currentDocument && (
            <>
              <button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                버전 히스토리
              </button>
              
              {currentDocument.status === 'official' && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  v{currentDocument.version}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <DocumentManager
          projectId={projectId}
          workflowStep={workflowStep}
          userId={userId}
          onDocumentChange={handleDocumentChange}
          onShowVersionHistory={() => setShowVersionHistory(true)}
          className="h-full"
        />
      </div>

      {/* Version history modal */}
      {currentDocument && (
        <DocumentVersionHistory
          projectId={projectId}
          documentId={currentDocument.id}
          currentVersion={currentDocument.version}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          onPreviewVersion={handleVersionPreview}
          onRestoreVersion={handleVersionRestore}
        />
      )}

      {/* Document info panel */}
      {currentDocument && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>
                작성자: {currentDocument.creator_name || currentDocument.creator_email}
              </span>
              <span>
                생성일: {new Date(currentDocument.created_at).toLocaleDateString('ko-KR')}
              </span>
              {currentDocument.approved_by && (
                <span>
                  승인자: {currentDocument.approver_name || currentDocument.approver_email}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {currentDocument.status === 'private' && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  비공개
                </span>
              )}
              {currentDocument.status === 'pending_approval' && (
                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                  승인 대기
                </span>
              )}
              {currentDocument.status === 'official' && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                  공식 문서
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}