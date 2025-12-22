'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { 
  PlanningDocumentWithUsers,
  DocumentStatus,
  WorkflowStep,
} from '@/types/ai-pm';
import { 
  PlusOutlined,
  EllipsisOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  DeleteOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { Button, Dropdown, MenuProps } from 'antd';

const STEP_LABELS: Record<WorkflowStep, string> = {
  1: '컨셉 정의', 2: '기능 기획', 3: '기술 설계', 4: '개발 계획', 5: '테스트 계획', 
  6: '배포 준비', 7: '운영 계획', 8: '마케팅 전략', 9: '사업화 계획'
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

interface DocumentManagerProps {
  projectId: string;
  workflowStep: WorkflowStep;
  onDocumentSelect?: (document: PlanningDocumentWithUsers) => void;
}

export default function DocumentManager({
  projectId,
  workflowStep,
  onDocumentSelect,
}: DocumentManagerProps) {
  const { user, projectMemberships, isAdmin } = useAuth();
  const { success, error: showError } = useToast();
  const [documents, setDocuments] = useState<PlanningDocumentWithUsers[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    console.log('[DEBUG] Loading documents...');
    try {
      const response = await fetch(`/api/ai-pm/documents?projectId=${projectId}&workflowStep=${workflowStep}`, {
        cache: 'no-store' // Add cache-busting
      });
      if (!response.ok) throw new Error('문서 목록 로딩 실패');
      const data = await response.json();
      console.log('[DEBUG] Loaded documents data:', data);
      setDocuments(data.documents || []);
      console.log('[DEBUG] Updated documents state with new data.');
    } catch (err) {
      console.error('[DEBUG] Load documents error:', err);
      showError('문서 로드 오류', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, workflowStep, showError]);

  useEffect(() => {
    if (user?.id) { // Ensure user is loaded before fetching documents
        loadDocuments();
    }
  }, [user, loadDocuments]);
  
  const handleAction = useCallback(async (action: 'request-approval' | 'approve' | 'delete', documentId: string) => {
    console.log(`[ACTION] handleAction called! action: ${action}, documentId: ${documentId}`);

    const urlMap = {
      'request-approval': `/api/ai-pm/documents/${documentId}/request-approval`,
      'approve': `/api/ai-pm/documents/${documentId}/approve`,
      'delete': `/api/ai-pm/documents/${documentId}`,
    };
    const methodMap = {
      'request-approval': 'POST', 'approve': 'POST', 'delete': 'DELETE',
    };
    
    const url = urlMap[action as keyof typeof urlMap];
    if (!url) {
        console.error(`[ACTION] Invalid action type: ${action}`);
        return;
    }

    if (action === 'delete' && !confirm('정말로 이 문서를 삭제하시겠습니까?')) return;

    console.log(`[ACTION] Attempting to fetch: ${methodMap[action]} ${url}`);

    try {
      const response = await fetch(url, {
        method: methodMap[action as keyof typeof methodMap],
        headers: { 'Content-Type': 'application/json' },
      });
      
      const responseData = await response.json();
      console.log('[ACTION] API response:', { status: response.status, data: responseData });

      if (!response.ok) {
        throw new Error(responseData.message || `작업에 실패했습니다 (${response.status})`);
      }
      
      success('성공', responseData.message || '작업이 성공적으로 완료되었습니다.');
      console.log('[ACTION] Action successful, reloading documents...');
      await loadDocuments();
      console.log('[ACTION] Documents reloaded.');

    } catch (err) {
      console.error('[ACTION] Action failed:', err);
      showError('작업 실패', (err as Error).message);
    }
  }, [loadDocuments, success, showError]);

  const getMenuItems = (doc: PlanningDocumentWithUsers): MenuProps['items'] => {
    const items: MenuProps['items'] = [];
    const userRole = projectMemberships.find(m => m.project_id === doc.project_id)?.role;
    
    if (doc.created_by === user?.id && doc.status === 'private') {
      items.push({ 
        key: 'request-approval', 
        label: '승인 요청', 
        icon: <ArrowUpOutlined />,
        onClick: () => handleAction('request-approval', doc.id),
      });
    }

    if (doc.status === 'pending_approval' && doc.created_by !== user?.id && isAdmin) {
        items.push({ 
            key: 'approve', 
            label: '승인', 
            icon: <CheckOutlined />,
            onClick: () => handleAction('approve', doc.id),
        });
    }

    if (doc.created_by === user?.id && doc.status !== 'official') {
      items.push({ 
        key: 'delete', 
        label: '삭제', 
        icon: <DeleteOutlined />, 
        danger: true,
        onClick: () => handleAction('delete', doc.id),
      });
    }
    
    return items;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h3 className="font-semibold">{STEP_LABELS[workflowStep]} 문서</h3>
          <p className="text-sm text-gray-500">문서를 관리하고 공식화하세요.</p>
        </div>
        <Button icon={<PlusOutlined />} type="primary" disabled>새 문서 (준비 중)</Button>
      </div>

      <div className="p-4">
        {isLoading ? <p className="text-center py-8">로딩 중...</p> : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileTextOutlined className="text-4xl" />
            <p className="mt-2">문서가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start gap-4">
                  <div className="cursor-pointer flex-1 min-w-0" onClick={() => onDocumentSelect?.(doc)}>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-lg truncate">{doc.title}</h4>
                      <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${STATUS_COLORS[doc.status]}`}>{STATUS_LABELS[doc.status]}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 break-words">{doc.content}</p>
                    <p className="text-xs text-gray-400 mt-2 truncate">
                      작성자: {doc.creator_name || '...'} | 최종 수정: {new Date(doc.updated_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <Dropdown menu={{ items: getMenuItems(doc) }} trigger={['click']}>
                    <Button type="text" icon={<EllipsisOutlined />} />
                  </Dropdown>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
