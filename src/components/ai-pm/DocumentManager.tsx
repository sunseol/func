'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { 
  PlanningDocumentWithUsers,
  DocumentStatus,
  WorkflowStep,
  CreateDocumentRequest,
  UpdateDocumentRequest
} from '@/types/ai-pm';
import { 
  PlusIcon,
  PencilIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowUpIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

interface DocumentManagerProps {
  projectId: string;
  workflowStep: WorkflowStep;
  onDocumentCreated?: (document: PlanningDocumentWithUsers) => void;
  onDocumentUpdated?: (document: PlanningDocumentWithUsers) => void;
  className?: string;
}

interface DocumentFormData {
  title: string;
  content: string;
}

const STEP_LABELS: Record<WorkflowStep, string> = {
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

const STATUS_LABELS: Record<DocumentStatus, string> = {
  private: '개인',
  pending_approval: '승인 대기',
  official: '공식'
};

const STATUS_COLORS: Record<DocumentStatus, string> = {
  private: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  official: 'bg-green-100 text-green-800'
};

export default function DocumentManager({
  projectId,
  workflowStep,
  onDocumentCreated,
  onDocumentUpdated,
  className = ''
}: DocumentManagerProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [documents, setDocuments] = useState<PlanningDocumentWithUsers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState<PlanningDocumentWithUsers | null>(null);
  const [formData, setFormData] = useState<DocumentFormData>({
    title: '',
    content: ''
  });

  // 문서 목록 로드
  useEffect(() => {
    loadDocuments();
  }, [projectId, workflowStep]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai-pm/documents?projectId=${projectId}&workflowStep=${workflowStep}`);
      
      if (!response.ok) {
        throw new Error('문서 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Error loading documents:', err);
      showError('문서 로드 오류', '문서 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showError('입력 오류', '제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      const request: CreateDocumentRequest = {
        workflow_step: workflowStep,
        title: formData.title.trim(),
        content: formData.content.trim()
      };

      const response = await fetch(`/api/ai-pm/documents?projectId=${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('문서 생성에 실패했습니다.');
      }

      const data = await response.json();
      const newDocument = data.document;
      
      setDocuments(prev => [newDocument, ...prev]);
      setShowCreateForm(false);
      setFormData({ title: '', content: '' });
      
      success('문서 생성', '문서가 성공적으로 생성되었습니다.');
      onDocumentCreated?.(newDocument);
    } catch (err) {
      console.error('Error creating document:', err);
      showError('문서 생성 오류', '문서 생성에 실패했습니다.');
    }
  };

  const handleUpdateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDocument || !formData.title.trim() || !formData.content.trim()) {
      showError('입력 오류', '제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      const request: UpdateDocumentRequest = {
        title: formData.title.trim(),
        content: formData.content.trim()
      };

      const response = await fetch(`/api/ai-pm/documents/${editingDocument.id}?projectId=${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('문서 수정에 실패했습니다.');
      }

      const data = await response.json();
      const updatedDocument = data.document;
      
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === editingDocument.id ? updatedDocument : doc
        )
      );
      setEditingDocument(null);
      setFormData({ title: '', content: '' });
      
      success('문서 수정', '문서가 성공적으로 수정되었습니다.');
      onDocumentUpdated?.(updatedDocument);
    } catch (err) {
      console.error('Error updating document:', err);
      showError('문서 수정 오류', '문서 수정에 실패했습니다.');
    }
  };

  const handleRequestApproval = async (documentId: string) => {
    try {
      const response = await fetch(`/api/ai-pm/documents/${documentId}/request-approval?projectId=${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('승인 요청에 실패했습니다.');
      }

      await loadDocuments();
      success('승인 요청', '승인 요청이 성공적으로 전송되었습니다.');
    } catch (err) {
      console.error('Error requesting approval:', err);
      showError('승인 요청 오류', '승인 요청에 실패했습니다.');
    }
  };

  const handleApproveDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/ai-pm/documents/${documentId}/approve?projectId=${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('문서 승인에 실패했습니다.');
      }

      await loadDocuments();
      success('문서 승인', '문서가 성공적으로 승인되었습니다.');
    } catch (err) {
      console.error('Error approving document:', err);
      showError('승인 오류', '문서 승인에 실패했습니다.');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('정말로 이 문서를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ai-pm/documents/${documentId}?projectId=${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('문서 삭제에 실패했습니다.');
      }

      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      success('문서 삭제', '문서가 성공적으로 삭제되었습니다.');
    } catch (err) {
      console.error('Error deleting document:', err);
      showError('삭제 오류', '문서 삭제에 실패했습니다.');
    }
  };

  const startEditing = (document: PlanningDocumentWithUsers) => {
    setEditingDocument(document);
    setFormData({
      title: document.title,
      content: document.content
    });
  };

  const cancelEditing = () => {
    setEditingDocument(null);
    setFormData({ title: '', content: '' });
  };

  const canEdit = (document: PlanningDocumentWithUsers) => {
    return document.created_by === user?.id && document.status === 'private';
  };

  const canRequestApproval = (document: PlanningDocumentWithUsers) => {
    return document.created_by === user?.id && document.status === 'private';
  };

  const canApprove = (document: PlanningDocumentWithUsers) => {
    return document.status === 'pending_approval' && document.created_by !== user?.id;
  };

  const canDelete = (document: PlanningDocumentWithUsers) => {
    return document.created_by === user?.id && document.status !== 'official';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">문서 관리</h3>
            <p className="text-sm text-gray-600 mt-1">
              {STEP_LABELS[workflowStep]} 단계 문서
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            새 문서
          </button>
        </div>
      </div>

      {/* 문서 생성 폼 */}
      {showCreateForm && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h4 className="text-md font-medium text-gray-900 mb-4">새 문서 생성</h4>
          <form onSubmit={handleCreateDocument} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="문서 제목을 입력하세요"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="문서 내용을 입력하세요"
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                생성
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ title: '', content: '' });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 문서 목록 */}
      <div className="p-6">
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">문서가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              첫 번째 문서를 생성해보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => (
              <div
                key={document.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                {/* 문서 편집 폼 */}
                {editingDocument?.id === document.id ? (
                  <form onSubmit={handleUpdateDocument} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        제목
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        내용
                      </label>
                      <textarea
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* 문서 정보 */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-lg font-medium text-gray-900">
                            {document.title}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[document.status]}`}>
                            {STATUS_LABELS[document.status]}
                          </span>
                          {document.version > 1 && (
                            <span className="text-xs text-gray-500">
                              v{document.version}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                          {document.content}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>작성자: {document.creator_name || document.creator_email}</span>
                          <span>작성일: {formatDate(document.created_at)}</span>
                          {document.approved_by && (
                            <span>승인자: {document.approver_name || document.approver_email}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="mt-4 flex items-center space-x-2">
                      {canEdit(document) && (
                        <button
                          onClick={() => startEditing(document)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <PencilIcon className="w-3 h-3 mr-1" />
                          편집
                        </button>
                      )}
                      
                      {canRequestApproval(document) && (
                        <button
                          onClick={() => handleRequestApproval(document.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          <ArrowUpIcon className="w-3 h-3 mr-1" />
                          승인 요청
                        </button>
                      )}
                      
                      {canApprove(document) && (
                        <button
                          onClick={() => handleApproveDocument(document.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                        >
                          <CheckIcon className="w-3 h-3 mr-1" />
                          승인
                        </button>
                      )}
                      
                      {canDelete(document) && (
                        <button
                          onClick={() => handleDeleteDocument(document.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          <TrashIcon className="w-3 h-3 mr-1" />
                          삭제
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}