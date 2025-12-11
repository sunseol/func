'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast, useApiError } from '@/contexts/ToastContext';
import { useViewport } from '@/contexts/ViewportContext';
import { useKeyboardAvoidance } from '@/hooks/useKeyboardAvoidance';
import {
  PlanningDocumentWithUsers,
  DocumentStatus,
  WorkflowStep
} from '@/types/ai-pm';
import {
  Check,
  X,
  Eye,
  EyeOff,
  FileText,
  Clock,
  AlertCircle,
  RotateCw,
  Trash2,
  Edit,
  Maximize,
  Minimize
} from 'lucide-react';
import { MobileSelect, SelectOption } from '@/components/ui/MobileSelect';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    icon: EyeOff,
    description: '본인만 볼 수 있는 개인 문서입니다.'
  },
  pending_approval: {
    label: '승인 대기',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500',
    icon: Clock,
    description: '관리자 승인을 기다리는 문서입니다.'
  },
  official: {
    label: '공식 문서',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500',
    icon: Check,
    description: '승인된 공식 문서입니다.'
  },
  rejected: {
    label: '승인 반려',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500',
    icon: X,
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
  const { success, error: showError } = useToast();
  const { handleApiError } = useApiError();
  const { isMobile } = useViewport();
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

  useEffect(() => {
    const hasChanges = title !== document.title || content !== document.content;
    setHasUnsavedChanges(hasChanges);
  }, [title, content, document.title, document.content]);

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
      await onStatusChange(newStatus);
    } catch (error) {
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
    if (isMobile && !isFullscreen && editorRef.current) {
      if (editorRef.current.requestFullscreen) {
        editorRef.current.requestFullscreen().catch(console.error);
      }
    } else if (isMobile && isFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
  }, [isFullscreen, isMobile]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (isMobile && !isEditing && hasUnsavedChanges) {
      handleSave();
    }
  }, [isMobile, isEditing, hasUnsavedChanges, handleSave]);

  return (
    <div
      ref={editorRef}
      className={`bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
        }`}
      style={keyboardState.isVisible ? getSafeAreaStyles() : {}}
    >
      <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-neutral-800 ${isMobile ? 'sticky top-0 bg-white dark:bg-neutral-900 z-10' : ''
        }`}>
        <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-3' : ''}`}>
          <div className={`flex-1 ${isMobile ? 'w-full' : ''}`}>
            <div className={`flex items-center gap-2 sm:gap-3 mb-2 ${isMobile ? 'flex-wrap' : ''}`}>
              <FileText className="w-5 h-5 text-gray-400" />
              <h2 className={`font-semibold text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : 'text-lg'}`}>
                {isEditing ? (isPreviewMode ? '문서 미리보기' : '문서 편집') : '문서 보기'}
              </h2>
              <Badge variant="outline" className={cn("gap-1 font-normal", statusConfig.className)}>
                <statusConfig.icon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>

            {isEditing && !isPreviewMode ? (
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full text-base ${isMobile ? 'text-[16px]' : 'text-sm'}`}
                placeholder="문서 제목을 입력하세요"
              />
            ) : (
              <h3 className={`font-medium text-gray-900 dark:text-gray-100 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                {document.title}
              </h3>
            )}

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {statusConfig.description}
            </p>
          </div>

          <div className={`flex items-center gap-2 ${isMobile ? 'w-full flex-wrap justify-between' : ''}`}>
            <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}>
              {isMobile && canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFullscreenToggle}
                  className="h-11"
                >
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
              )}

              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviewToggle}
                  className={isMobile ? 'h-11' : ''}
                >
                  {isPreviewMode ? (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      {!isMobile && '편집'}
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      {!isMobile && '미리보기'}
                    </>
                  )}
                </Button>
              )}

              {onShowVersionHistory && !isMobile && (
                <Button variant="outline" size="sm" onClick={onShowVersionHistory}>
                  <RotateCw className="h-4 w-4 mr-2" />
                  버전 기록
                </Button>
              )}

              {canEdit && (
                <Button
                  variant={isEditing ? (hasUnsavedChanges ? "default" : "outline") : "default"}
                  size="sm"
                  onClick={handleEditModeToggle}
                  disabled={isSaving}
                  className={isMobile ? 'flex-1 h-11' : ''}
                >
                  {isSaving ? (
                    <>
                      <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : isEditing ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      완료
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      편집
                    </>
                  )}
                </Button>
              )}
            </div>

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
                  <Button variant="outline" size="sm" onClick={onShowVersionHistory} className="h-11">
                    <RotateCw className="h-4 w-4" />
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="h-11"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {!isMobile && (
              <>
                {canChangeStatus && !isReadOnly && (
                  <div className="w-[140px]">
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

                {canDelete && (
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className={`mt-3 sm:mt-4 flex items-center justify-between text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs flex-col gap-2 items-start' : 'text-sm'
          }`}>
          <div className={`flex items-center ${isMobile ? 'flex-col items-start gap-1' : 'gap-4'}`}>
            <span>작성자: {document.creator_name || document.creator_email}</span>
            <span>작성일: {formatDate(document.created_at)}</span>
            {document.updated_at !== document.created_at && (
              <span>수정일: {formatDate(document.updated_at)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="inline-flex items-center text-orange-600 dark:text-orange-400">
                <AlertCircle className="h-4 w-4 mr-1" />
                저장되지 않은 변경사항
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={`p-4 sm:p-6 ${isFullscreen ? 'flex-1 overflow-auto' : ''}`}>
        {isEditing && !isPreviewMode ? (
          <div className="space-y-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="문서 내용을 입력하세요."
              className={`w-full min-h-[400px] font-mono text-base ${isMobile ? 'text-[16px]' : 'text-sm'}`}
            />

            {isMobile && (
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>글자 수: {content.length}</span>
                <button onClick={handlePreviewToggle} className="text-blue-600 hover:text-blue-700">
                  미리보기로 전환
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="prose max-w-none break-all dark:prose-invert">
            <div
              className={`markdown-content ${isMobile ? 'text-base leading-relaxed' : ''}`}
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
                <Button variant="secondary" className="w-full" onClick={handlePreviewToggle}>
                  편집 모드로 돌아가기
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="font-semibold text-lg mb-2">문서 삭제 확인</h3>
            <p className="text-muted-foreground mb-6">
              "{document.title}" 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <RotateCw className="h-4 w-4 mr-2 animate-spin" />}
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
