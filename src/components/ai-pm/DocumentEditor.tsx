'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast, useApiError } from '@/contexts/ToastContext';
import { useViewport } from '@/contexts/ViewportContext';
import { useKeyboardAvoidance } from '@/hooks/useKeyboardAvoidance';
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
  DeleteOutlined,
  EditOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';

import { Input } from 'antd';
import { MobileSelect, SelectOption } from '@/components/ui/MobileSelect';

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
  const { isMobile, isTablet } = useViewport();
  const editorRef = useRef<HTMLDivElement>(null);
  const { keyboardState, getSafeAreaStyles } = useKeyboardAvoidance();

  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(!isEditing);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Mobile-specific handlers
  const handleEditModeToggle = useCallback(() => {
    if (isEditing) {
      if (hasUnsavedChanges) {
        handleSave();
      }
      setIsEditing(false);
      setIsPreviewMode(true);
    } else {
      setIsEditing(true);
      setIsPreviewMode(false);
    }
  }, [isEditing, hasUnsavedChanges, handleSave]);

  const handlePreviewToggle = useCallback(() => {
    if (isEditing) {
      setIsPreviewMode(!isPreviewMode);
    }
  }, [isEditing, isPreviewMode]);

  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    
    // On mobile, request fullscreen API if available
    if (isMobile && !isFullscreen && editorRef.current) {
      if (editorRef.current.requestFullscreen) {
        editorRef.current.requestFullscreen().catch(console.error);
      }
    } else if (isMobile && isFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
  }, [isFullscreen, isMobile]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-save on mobile when switching away from edit mode
  useEffect(() => {
    if (isMobile && !isEditing && hasUnsavedChanges) {
      handleSave();
    }
  }, [isMobile, isEditing, hasUnsavedChanges, handleSave]);

  return (
    <div 
      ref={editorRef}
      className={`bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
      style={keyboardState.isVisible ? getSafeAreaStyles() : {}}
    >
      {/* Header */}
      <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-neutral-800 ${
        isMobile ? 'sticky top-0 bg-white dark:bg-neutral-900 z-10' : ''
      }`}>
        <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-3' : ''}`}>
          <div className={`flex-1 ${isMobile ? 'w-full' : ''}`}>
            <div className={`flex items-center gap-2 sm:gap-3 mb-2 ${
              isMobile ? 'flex-wrap' : ''
            }`}>
              <FileTextOutlined style={{ fontSize: isMobile ? 18 : 20, color: '#9ca3af' }} />
              <h2 className={`font-semibold text-gray-900 dark:text-gray-100 ${
                isMobile ? 'text-base' : 'text-lg'
              }`}>
                {isEditing ? (isPreviewMode ? '문서 미리보기' : '문서 편집') : '문서 보기'}
              </h2>
              <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </span>
            </div>
            
            {isEditing && !isPreviewMode ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px] text-base ${
                  isMobile ? 'text-[16px]' : 'text-sm'
                }`}
                placeholder="문서 제목을 입력하세요"
              />
            ) : (
              <h3 className={`font-medium text-gray-900 dark:text-gray-100 ${
                isMobile ? 'text-lg' : 'text-xl'
              }`}>{document.title}</h3>
            )}
            
            <p className={`mt-1 text-gray-500 dark:text-gray-400 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              {statusConfig.description}
            </p>
          </div>

          <div className={`flex items-center gap-2 ${
            isMobile ? 'w-full flex-wrap justify-between' : ''
          }`}>
            {/* Mobile: First row of buttons */}
            <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}>
              {isMobile && canEdit && (
                <button
                  onClick={handleFullscreenToggle}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
                >
                  {isFullscreen ? (
                    <FullscreenExitOutlined style={{ fontSize: 16 }} />
                  ) : (
                    <FullscreenOutlined style={{ fontSize: 16 }} />
                  )}
                  {!isMobile && (isFullscreen ? '전체화면 해제' : '전체화면')}
                </button>
              )}

              {isEditing && (
                <button
                  onClick={handlePreviewToggle}
                  className={`inline-flex items-center px-3 py-2 border border-gray-300 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] ${
                    isMobile ? 'text-sm' : 'text-sm'
                  }`}
                >
                  {isPreviewMode ? (
                    <>
                      <EditOutlined style={{ marginRight: isMobile ? 0 : 4, fontSize: 16 }} />
                      {!isMobile && '편집'}
                    </>
                  ) : (
                    <>
                      <EyeOutlined style={{ marginRight: isMobile ? 0 : 4, fontSize: 16 }} />
                      {!isMobile && '미리보기'}
                    </>
                  )}
                </button>
              )}

              {onShowVersionHistory && !isMobile && (
                <button
                  onClick={onShowVersionHistory}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ReloadOutlined style={{ marginRight: 4 }} />
                  버전 기록
                </button>
              )}

              {canEdit && (
                <button
                  onClick={handleEditModeToggle}
                  disabled={isSaving}
                  className={`inline-flex items-center px-4 py-2 border border-transparent font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] ${
                    isMobile ? 'text-sm flex-1' : 'text-sm'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      저장 중...
                    </>
                  ) : isEditing ? (
                    <>
                      <CheckOutlined style={{ marginRight: isMobile ? 2 : 4 }} />
                      완료
                    </>
                  ) : (
                    <>
                      <EditOutlined style={{ marginRight: isMobile ? 2 : 4 }} />
                      편집
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Mobile: Second row of buttons */}
            {isMobile && (
              <div className="flex items-center gap-2 w-full">
                {canChangeStatus && !isReadOnly && (
                  <div className="flex-1">
                    <MobileSelect
                      value={document.status}
                      onChange={(value) => handleStatusChange(value as DocumentStatus)}
                      options={[
                        { value: 'private', label: '개인 문서' },
                        { value: 'pending_approval', label: '승인 요청' },
                        ...(isAdmin ? [{ value: 'official', label: '공식 문서' }] : [])
                      ] as SelectOption[]}
                      className="w-full"
                    />
                  </div>
                )}

                {onShowVersionHistory && (
                  <button
                    onClick={onShowVersionHistory}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    <ReloadOutlined style={{ fontSize: 16 }} />
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    <DeleteOutlined style={{ fontSize: 16 }} />
                  </button>
                )}
              </div>
            )}

            {/* Desktop: Single row layout */}
            {!isMobile && (
              <>
                {canChangeStatus && !isReadOnly && (
                  <MobileSelect
                    value={document.status}
                    onChange={(value) => handleStatusChange(value as DocumentStatus)}
                    options={[
                      { value: 'private', label: '개인 문서' },
                      { value: 'pending_approval', label: '승인 요청' },
                      ...(isAdmin ? [{ value: 'official', label: '공식 문서' }] : [])
                    ] as SelectOption[]}
                    className="min-w-[140px]"
                  />
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
              </>
            )}
          </div>
        </div>

          <div className={`mt-3 sm:mt-4 flex items-center justify-between text-gray-500 dark:text-gray-400 ${
          isMobile ? 'text-xs flex-col gap-2 items-start' : 'text-sm'
        }`}>
          <div className={`flex items-center ${
            isMobile ? 'flex-col items-start gap-1' : 'gap-4'
          }`}>
            <span>작성자: {document.creator_name || document.creator_email}</span>
            <span>작성일: {formatDate(document.created_at)}</span>
            {document.updated_at !== document.created_at && (
              <span>수정일: {formatDate(document.updated_at)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className={`inline-flex items-center text-orange-600 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>
                <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                저장되지 않은 변경사항
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className={`p-4 sm:p-6 ${
        isFullscreen ? 'flex-1 overflow-auto' : ''
      }`}>
        {isEditing && !isPreviewMode ? (
          <div className="space-y-4">
            <Input.TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="문서 내용을 입력하세요."
              autoSize={{ 
                minRows: isMobile ? 10 : 15,
                maxRows: isFullscreen ? 50 : (isMobile ? 25 : 30)
              }}
              className={`w-full dark:!bg-neutral-900 dark:!text-gray-100 ${
                isMobile ? 'text-[16px]' : ''
              }`}
              style={{
                fontSize: isMobile ? '16px' : '14px',
                lineHeight: isMobile ? '1.5' : '1.4'
              }}
            />
            
            {isMobile && (
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>글자 수: {content.length}</span>
                <button
                  onClick={handlePreviewToggle}
                  className="text-blue-600 hover:text-blue-700"
                >
                  미리보기로 전환
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={`prose max-w-none break-all ${
            isMobile ? 'prose-sm' : ''
          } dark:prose-invert`}>
            <div 
              className={`markdown-content ${
                isMobile ? 'text-base leading-relaxed' : ''
              }`}
              dangerouslySetInnerHTML={{ 
                __html: content 
                  .replace(/\n/g, '<br>')
                  .replace(/#{1,6}\s+(.+)/g, '<h1>$1</h1>')
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.+?)\*/g, '<em>$1</em>')
                  .replace(/`(.+?)`/g, '<code>$1</code>')
              }}
            />
            
            {isEditing && isMobile && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handlePreviewToggle}
                  className="w-full py-3 px-4 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                >
                  편집 모드로 돌아가기
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-lg p-6 w-full ${
            isMobile ? 'max-w-sm' : 'max-w-md'
          }`}>
            <h3 className={`font-medium text-gray-900 mb-4 ${
              isMobile ? 'text-base' : 'text-lg'
            }`}>
              문서 삭제 확인
            </h3>
            <p className={`text-gray-600 mb-6 ${
              isMobile ? 'text-sm' : 'text-base'
            }`}>
              "{document.title}" 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className={`flex gap-3 ${
              isMobile ? 'flex-col-reverse' : 'justify-end'
            }`}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className={`px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 font-medium ${
                  isMobile ? 'min-h-[44px] w-full' : ''
                }`}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center font-medium ${
                  isMobile ? 'min-h-[44px] w-full' : ''
                }`}
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
