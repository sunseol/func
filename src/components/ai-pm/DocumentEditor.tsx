'use client';

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import { 
  PlanningDocumentWithUsers, 
  DocumentStatus
} from '@/types/ai-pm';
import { ClockIcon, EyeIcon, PencilIcon, DocumentDuplicateIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import ConflictAnalysisPanel from './ConflictAnalysisPanel';

// Dynamic import to avoid SSR issues with the markdown editor
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor'),
  { ssr: false }
);

const MDPreview = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
);

interface ConflictAnalysisResult {
  hasConflicts: boolean;
  conflictLevel: 'none' | 'minor' | 'major' | 'critical';
  conflicts: Array<{
    type: 'content' | 'requirement' | 'design' | 'technical';
    description: string;
    conflictingDocument: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }>;
  recommendations: string[];
  summary: string;
}

interface DocumentEditorProps {
  projectId: string;
  workflowStep: number;
  document?: PlanningDocumentWithUsers;
  isReadOnly?: boolean;
  onSave?: (content: string, title?: string) => Promise<void>;
  onStatusChange?: (status: DocumentStatus) => Promise<void>;
  onDelete?: () => Promise<void>;
  onShowVersionHistory?: () => void;
  className?: string;
}

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

function DocumentEditor({
  projectId,
  workflowStep,
  document,
  isReadOnly = false,
  onSave,
  onStatusChange,
  onDelete,
  onShowVersionHistory,
  className = ''
}: DocumentEditorProps) {
  const [title, setTitle] = useState(document?.title || '');
  const [content, setContent] = useState(document?.content || '');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [autoSave, setAutoSave] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: document ? new Date(document.updated_at) : null,
    hasUnsavedChanges: false
  });
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConflictAnalysis, setShowConflictAnalysis] = useState(false);
  const [conflictAnalysisResult, setConflictAnalysisResult] = useState<ConflictAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMetadata, setAnalysisMetadata] = useState<{
    analyzedDocuments: number;
    timestamp: string;
  } | null>(null);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const initialContentRef = useRef(content);
  const initialTitleRef = useRef(title);

  // Auto-save functionality
  const performAutoSave = useCallback(async () => {
    if (!onSave || isReadOnly || autoSave.isSaving) return;

    const hasContentChanged = content !== initialContentRef.current;
    const hasTitleChanged = title !== initialTitleRef.current;

    if (!hasContentChanged && !hasTitleChanged) return;

    setAutoSave(prev => ({ ...prev, isSaving: true }));
    setError(null);

    try {
      await onSave(content, title);
      
      // Update refs to new saved state
      initialContentRef.current = content;
      initialTitleRef.current = title;
      
      setAutoSave({
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false
      });
    } catch (err: any) {
      console.error('Auto-save failed:', err);
      setError(err.message || '자동 저장에 실패했습니다.');
      setAutoSave(prev => ({ 
        ...prev, 
        isSaving: false,
        hasUnsavedChanges: true 
      }));
    }
  }, [content, title, onSave, isReadOnly, autoSave.isSaving]);

  // Set up auto-save timer
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    const hasContentChanged = content !== initialContentRef.current;
    const hasTitleChanged = title !== initialTitleRef.current;
    const hasChanges = hasContentChanged || hasTitleChanged;

    setAutoSave(prev => ({ 
      ...prev, 
      hasUnsavedChanges: hasChanges 
    }));

    if (hasChanges && !isReadOnly) {
      autoSaveTimeoutRef.current = setTimeout(performAutoSave, 2000); // Auto-save after 2 seconds
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, title, performAutoSave, isReadOnly]);

  // Manual save
  const handleManualSave = async () => {
    if (!onSave || isReadOnly) return;
    await performAutoSave();
  };

  // Status change handler
  const handleStatusChange = async (newStatus: DocumentStatus) => {
    if (!onStatusChange) return;

    try {
      setError(null);
      await onStatusChange(newStatus);
    } catch (err: any) {
      setError(err.message || '상태 변경에 실패했습니다.');
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!onDelete) return;

    const confirmed = window.confirm('정말로 이 문서를 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      setError(null);
      await onDelete();
    } catch (err: any) {
      setError(err.message || '문서 삭제에 실패했습니다.');
    }
  };

  // Format last saved time
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    
    return date.toLocaleDateString('ko-KR');
  };

  // Run conflict analysis
  const runConflictAnalysis = async () => {
    if (!content.trim() || !title.trim()) {
      setError('충돌 분석을 위해서는 제목과 내용이 필요합니다.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-pm/documents/analyze-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          currentContent: content,
          currentTitle: title,
          workflowStep
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '충돌 분석에 실패했습니다.');
      }

      const data = await response.json();
      setConflictAnalysisResult(data.analysis);
      setAnalysisMetadata({
        analyzedDocuments: data.analyzedDocuments,
        timestamp: data.timestamp
      });
      setShowConflictAnalysis(true);

    } catch (err: any) {
      console.error('Conflict analysis failed:', err);
      setError(err.message || '충돌 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'official':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'official':
        return '공식 승인됨';
      case 'pending_approval':
        return '승인 대기 중';
      default:
        return '개인 작업 중';
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white border border-gray-200 rounded-lg ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex-1 min-w-0">
          {!isReadOnly ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="문서 제목을 입력하세요"
              className="w-full text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 placeholder-gray-400"
            />
          ) : (
            <h2 className="text-lg font-semibold text-gray-900 truncate">{title}</h2>
          )}
          
          {/* Auto-save status */}
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {autoSave.isSaving && (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                저장 중...
              </span>
            )}
            {!autoSave.isSaving && autoSave.hasUnsavedChanges && (
              <span className="flex items-center gap-1 text-orange-600">
                <PencilIcon className="w-4 h-4" />
                저장되지 않은 변경사항
              </span>
            )}
            {!autoSave.isSaving && !autoSave.hasUnsavedChanges && autoSave.lastSaved && (
              <span className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                마지막 저장: {formatLastSaved(autoSave.lastSaved)}
              </span>
            )}

            {/* Document version info */}
            {document && document.version > 1 && (
              <span className="flex items-center gap-1 text-blue-600">
                <DocumentDuplicateIcon className="w-4 h-4" />
                v{document.version}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-4">
          {/* Version history button */}
          {document && onShowVersionHistory && (
            <button
              onClick={onShowVersionHistory}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
              title="버전 히스토리 보기"
            >
              <ClockIcon className="w-4 h-4" />
              히스토리
            </button>
          )}

          {/* Preview/Edit toggle */}
          {!isReadOnly && (
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
            >
              {isPreviewMode ? (
                <>
                  <PencilIcon className="w-4 h-4" />
                  편집
                </>
              ) : (
                <>
                  <EyeIcon className="w-4 h-4" />
                  미리보기
                </>
              )}
            </button>
          )}
          
          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
          >
            {isFullscreen ? '창 모드' : '전체화면'}
          </button>

          {/* AI PM Feedback button */}
          {!isReadOnly && content.trim() && title.trim() && (
            <button
              onClick={runConflictAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  분석 중...
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  AI PM 피드백
                </>
              )}
            </button>
          )}

          {/* Manual save button */}
          {!isReadOnly && (
            <button
              onClick={handleManualSave}
              disabled={autoSave.isSaving || !autoSave.hasUnsavedChanges}
              className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              저장
            </button>
          )}

          {/* Status change buttons */}
          {document && onStatusChange && (
            <div className="flex items-center gap-1">
              {document.status === 'private' && (
                <button
                  onClick={() => handleStatusChange('pending_approval')}
                  className="px-3 py-1 text-sm text-white bg-yellow-600 rounded hover:bg-yellow-700"
                >
                  승인 요청
                </button>
              )}
              {document.status === 'pending_approval' && (
                <>
                  <button
                    onClick={() => handleStatusChange('official')}
                    className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleStatusChange('private')}
                    className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    반려
                  </button>
                </>
              )}
            </div>
          )}

          {/* Delete button */}
          {document && onDelete && !isReadOnly && (
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Document status badge */}
      {document && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">상태:</span>
              <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(document.status)}`}>
                {getStatusText(document.status)}
              </span>
            </div>
            
            {/* Document metadata */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>워크플로우 {workflowStep}단계</span>
              {document.creator_name && (
                <span>작성자: {document.creator_name}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor/Preview content */}
      <div className="flex-1 overflow-hidden">
        {isReadOnly || isPreviewMode ? (
          <div className="h-full overflow-y-auto">
            <MDPreview
              source={content}
              style={{ 
                padding: 16,
                background: 'transparent',
                minHeight: '100%'
              }}
            />
          </div>
        ) : (
          <div className="h-full" data-color-mode="light">
            <MDEditor
              value={content}
              onChange={(val) => setContent(val || '')}
              preview="edit"
              hideToolbar={false}
              height="100%"
              textareaProps={{
                placeholder: '마크다운 형식으로 문서를 작성하세요...',
                style: {
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Footer with document info */}
      {document && (
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between">
                <span>생성일:</span>
                <span>{new Date(document.created_at).toLocaleString('ko-KR')}</span>
              </div>
              <div className="flex justify-between">
                <span>수정일:</span>
                <span>{new Date(document.updated_at).toLocaleString('ko-KR')}</span>
              </div>
            </div>
            
            <div>
              {document.approved_by && document.approved_at && (
                <>
                  <div className="flex justify-between">
                    <span>승인자:</span>
                    <span>{document.approver_name || document.approver_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>승인일:</span>
                    <span>{new Date(document.approved_at).toLocaleString('ko-KR')}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conflict Analysis Panel */}
      <ConflictAnalysisPanel
        isOpen={showConflictAnalysis}
        onClose={() => setShowConflictAnalysis(false)}
        analysisResult={conflictAnalysisResult}
        isAnalyzing={isAnalyzing}
        onRunAnalysis={runConflictAnalysis}
        analyzedDocuments={analysisMetadata?.analyzedDocuments}
        timestamp={analysisMetadata?.timestamp}
      />
    </div>
  );
}

export default memo(DocumentEditor);