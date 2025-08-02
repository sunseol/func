'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { 
  AIConversation, 
  WorkflowStep, 
  WORKFLOW_STEPS 
} from '@/types/ai-pm';

import { 
  ClockCircleOutlined,
  EyeOutlined,
  MessageOutlined,
  DownloadOutlined,
  EllipsisOutlined
} from '@ant-design/icons';
import { Dropdown, Button, MenuProps } from 'antd';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

// ... (interface definitions remain the same)
interface ConversationSummary {
  id: string;
  workflow_step: WorkflowStep;
  step_name: string;
  message_count: number;
  last_activity: string;
}

interface ConversationStats {
    // ...
}

interface SearchFilters {
    // ...
}

export default function ConversationHistoryPanel({
  projectId,
  className = ''
}: {
  projectId: string,
  currentStep?: WorkflowStep,
  className?: string
}) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<AIConversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai-pm/chat/history?projectId=${projectId}`);
      if (!response.ok) throw new Error('Failed to load conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
      showError('대화 기록 로드 실패', '대화 기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user, showError]);
  
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadConversationDetail = useCallback(async (step: WorkflowStep) => {
    setIsLoadingDetail(true);
    try {
        const response = await fetch(`/api/ai-pm/chat?projectId=${projectId}&workflowStep=${step}`);
        if (!response.ok) throw new Error('Failed to load conversation detail');
        const data = await response.json();
        setSelectedConversation(data.conversation);
    } catch (error) {
        showError('대화 상세 로드 실패', '상세 내용을 불러오는 중 오류가 발생했습니다.');
    } finally {
        setIsLoadingDetail(false);
    }
  }, [projectId, showError]);

  const handleExport = useCallback(async (step: WorkflowStep, format: 'text' | 'html') => {
    try {
      const response = await fetch(`/api/ai-pm/chat/export?projectId=${projectId}&workflowStep=${step}&format=${format}`);
      if (!response.ok) throw new Error(`Failed to export: ${response.statusText}`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-step-${step}-${new Date().toISOString().slice(0,10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      success('내보내기 완료', `대화 기록이 ${format} 형식으로 다운로드되었습니다.`);
    } catch (err) {
      console.error('Error exporting conversation:', err);
      showError('내보내기 실패', '대화 기록을 내보내는 중 오류가 발생했습니다.');
    }
  }, [projectId, success, showError]);

  const formatRelativeDate = (dateString: string) => {
    const date = parseISO(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}시간 전`;
    if (diffInHours < 24 * 7) return `${Math.floor(diffInHours / 24)}일 전`;
    return format(date, 'MM월 dd일', { locale: ko });
  };
  
  const getMenuItems = (workflowStep: WorkflowStep): MenuProps['items'] => [
    {
      key: 'text',
      label: '텍스트로 내보내기',
      icon: <DownloadOutlined />,
      onClick: () => handleExport(workflowStep, 'text'),
    },
    {
      key: 'html',
      label: 'HTML로 내보내기',
      icon: <DownloadOutlined />,
      onClick: () => handleExport(workflowStep, 'html'),
    },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col h-full ${className}`}>
      

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 border-r border-gray-200 overflow-y-auto p-2">
          {isLoading ? <p className="p-4 text-center">로딩 중...</p> : conversations.map((conv) => (
            <div
              key={conv.id}
              className={`p-3 rounded-lg border cursor-pointer mb-2 transition-colors ${selectedConversation?.workflow_step === conv.workflow_step ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
              onClick={() => loadConversationDetail(conv.workflow_step)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{conv.step_name}</p>
                  <p className="text-sm text-gray-500">{conv.message_count}개 메시지 · {formatRelativeDate(conv.last_activity)}</p>
                </div>
                <Dropdown
                  menu={{ items: getMenuItems(conv.workflow_step) }}
                  trigger={['click']}
                >
                  <Button type="text" icon={<EllipsisOutlined />} onClick={e => e.stopPropagation()} />
                </Dropdown>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          {isLoadingDetail ? <p className="text-center">로딩 중...</p> : selectedConversation ? (
            <div>
              <h4 className="font-bold text-lg mb-2">{WORKFLOW_STEPS[selectedConversation.workflow_step]}</h4>
              {selectedConversation.messages.map((msg, i) => (
                <div key={i} className={`p-3 rounded-lg mb-2 ${msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <p className="font-semibold text-sm mb-1">{msg.role === 'user' ? '나' : 'AI'}</p>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs text-gray-400 text-right mt-2">{format(new Date(msg.timestamp), 'HH:mm')}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              <div className="text-center">
                <EyeOutlined className="text-4xl mb-2" />
                <p>왼쪽에서 대화를 선택하여 내용을 확인하세요.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
