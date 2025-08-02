'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast, useApiError } from '@/contexts/ToastContext';
import { 
  PlanningDocumentWithUsers,
  DocumentStatus,
  WorkflowStep,
  UpdateDocumentRequest
} from '@/types/ai-pm';
import { 
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  DeleteOutlined
} from '@ant-design/icons';

import { Input } from 'antd';

interface DocumentEditorProps {
  projectId: string;
  workflowStep: WorkflowStep;
  document: PlanningDocumentWithUsers;
  isReadOnly?: boolean;
  onSave: (content: string, title?: string) => Promise<PlanningDocumentWithUsers>;
  onStatusChange: (status: DocumentStatus) => Promise<void>;
  onDelete: () => Promise<void>;
  onShowVersionHistory?: () => void;
  onDocumentUpdated?: (document: PlanningDocumentWithUsers) => void;
}

const STATUS_CONFIG = {
  private: {
    label: '개인 문서',
    color: 'bg-gray-100 text-gray-800',
    icon: EyeInvisibleOutlined,
    description: '본인만 볼 수 있는 개인 문서입니다.'
  },
  pending_approval: {
    label: '승인 대기',
    color: 'bg-yellow-100 text-yellow-800',
    icon: ClockCircleOutlined,
    description: '관리자 승인을 기다리는 문서입니다.'
  },
  official: {
    label: '공식 문서',
    color: 'bg-green-100 text-green-800',
    icon: CheckOutlined,
    description: '승인된 공식 문서입니다.'
  },
  rejected: {
    label: '승인 반려',
    color: 'bg-red-100 text-red-800',
    icon: CloseOutlined,
    description: '승인이 반려된 문서입니다.'
  }
};

export default function DocumentEditor({
  projectId,
  workflowStep,
  document,
  isReadOnly = false,
  onSave,
  onStatusChange,
  onDelete,
  onShowVersionHistory,
  onDocumentUpdated,
}: DocumentEditorProps) {
  const { user, profile } = useAuth();
  const { success, error: showError, info } = useToast();
  const { handleApiError } = useApiError();

  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const isOwner = document.created_by === user?.id;
  const canEdit = !isReadOnly && (isOwner || isAdmin);
  const canChangeStatus = isAdmin || isOwner;
  const canDelete = isOwner || isAdmin;

  const statusConfig = STATUS_CONFIG[document.status];

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = title !== document.title || content !== document.content;
    setHasUnsavedChanges(hasChanges);
  }, [title, content, document.title, document.content]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      const updatedDocument = await onSave(content, title);
      setHasUnsavedChanges(false);
      success('문서 저장 완료', '변경사항이 성공적으로 저장되었습니다.');
      if (onDocumentUpdated) {
        onDocumentUpdated(updatedDocument);
      }
    } catch (error) {
      handleApiError(error, '문서 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [content, title, hasUnsavedChanges, onSave, success, handleApiError, onDocumentUpdated]);

  const handleStatusChange = useCallback(async (newStatus: DocumentStatus) => {
    try {
      // The parent component is responsible for showing success/error messages.
      // This component just triggers the action.
      await onStatusChange(newStatus);
    } catch (error) {
      // The parent's error handler will be called, but we catch here
      // to prevent unhandled promise rejections if the parent doesn't handle it.
      console.error("Error during status change, handled by parent:", error);
    }
  }, [onStatusChange]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      success('문서 삭제 완료', '문서가 성공적으로 삭제되었습니다.');
    } catch (error) {
      handleApiError(error, '문서 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [onDelete, success, handleApiError]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <FileTextOutlined style={{ fontSize: 20, color: '#9ca3af' }} />
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? '문서 편집' : '문서 보기'}
              </h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </span>
            </div>
            
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="문서 제목을 입력하세요"
              />
            ) : (
              <h3 className="text-xl font-medium text-gray-900">{document.title}</h3>
            )}
            
            <p className="mt-1 text-sm text-gray-500">
              {statusConfig.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onShowVersionHistory && (
              <button
                onClick={onShowVersionHistory}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ReloadOutlined style={{ marginRight: 4 }} />
                버전 기록
              </button>
            )}

            {canChangeStatus && !isReadOnly && (
              <select
                value={document.status}
                onChange={(e) => handleStatusChange(e.target.value as DocumentStatus)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="private">개인 문서</option>
                <option value="pending_approval">승인 요청</option>
                {isAdmin && <option value="official">공식 문서</option>}
              </select>
            )}

            {canEdit && (
              <button
                onClick={() => {
                  if (isEditing) {
                    handleSave();
                  }
                  setIsEditing(!isEditing);
                }}
                disabled={isSaving || (isEditing && !hasUnsavedChanges)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    저장 중...
                  </>
                ) : isEditing ? (
                  <>
                    <CheckOutlined style={{ marginRight: 4 }} />
                    저장
                  </>
                ) : (
                  <>
                    <FileTextOutlined style={{ marginRight: 4 }} />
                    편집
                  </>
                )}
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DeleteOutlined style={{ marginRight: 4 }} />
                삭제
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span>작성자: {document.creator_name || document.creator_email}</span>
            <span>작성일: {formatDate(document.created_at)}</span>
            {document.updated_at !== document.created_at && (
              <span>수정일: {formatDate(document.updated_at)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="inline-flex items-center text-orange-600">
                <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                저장되지 않은 변경사항
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {isEditing ? (
          <Input.TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="문서 내용을 입력하세요."
            autoSize={{ minRows: 15 }}
            className="w-full"
          />
        ) : (
          <div className="prose max-w-none break-all">
            <div 
              className="markdown-content"
              dangerouslySetInnerHTML={{ 
                __html: content 
                  .replace(/\n/g, '<br>')
                  .replace(/#{1,6}\s+(.+)/g, '<h1>$1</h1>')
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.+?)\*/g, '<em>$1</em>')
                  .replace(/`(.+?)`/g, '<code>$1</code>')
              }}
            />
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              문서 삭제 확인
            </h3>
            <p className="text-gray-600 mb-6">
              "{document.title}" 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {isDeleting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                )}
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
