'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { WorkflowStep, AIChatMessage, SendMessageRequest } from '@/types/ai-pm';
import { 
  PaperAirplaneIcon,
  StopIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface AIChatPanelProps {
  projectId: string;
  workflowStep: WorkflowStep;
  onMessageSent?: (message: AIChatMessage) => void;
  className?: string;
}

interface ChatMessage extends AIChatMessage {
  isLoading?: boolean;
  error?: string;
}

export default function AIChatPanel({
  projectId,
  workflowStep,
  onMessageSent,
  className = ''
}: AIChatPanelProps) {
  const { user } = useAuth();
  const { error: showError } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 워크플로우 단계 이름 가져오기 함수
  const getWorkflowStepName = useCallback((step: WorkflowStep): string => {
    const stepNames: Record<WorkflowStep, string> = {
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
    return stepNames[step];
  }, []);

  // 초기 메시지 설정
  useEffect(() => {
    const initialMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `안녕하세요! ${getWorkflowStepName(workflowStep)} 단계에서 도움을 드리겠습니다. 무엇을 도와드릴까요?`,
      timestamp: new Date()
    };
    setMessages([initialMessage]);
  }, [workflowStep, getWorkflowStepName]);

  const getSuggestions = (): string[] => {
    const suggestions: Record<WorkflowStep, string[]> = {
      1: [
        '플랫폼의 핵심 가치를 정의해주세요',
        '타겟 사용자를 분석해보겠습니다',
        '시장 포지셔닝을 설정해보겠습니다'
      ],
      2: [
        '주요 기능을 우선순위별로 정리해보겠습니다',
        '사용자 시나리오를 작성해보겠습니다',
        '기능 요구사항을 정리해보겠습니다'
      ],
      3: [
        '기술 스택을 선정해보겠습니다',
        '아키텍처를 설계해보겠습니다',
        '데이터베이스 구조를 설계해보겠습니다'
      ],
      4: [
        '개발 일정을 계획해보겠습니다',
        '필요한 리소스를 분석해보겠습니다',
        '리스크를 평가해보겠습니다'
      ],
      5: [
        '테스트 전략을 수립해보겠습니다',
        '품질 보증 계획을 세워보겠습니다',
        '테스트 케이스를 작성해보겠습니다'
      ],
      6: [
        '배포 전략을 수립해보겠습니다',
        '운영 환경을 구성해보겠습니다',
        '모니터링 계획을 세워보겠습니다'
      ],
      7: [
        '운영 프로세스를 정의해보겠습니다',
        '성능 모니터링 방안을 세워보겠습니다',
        '장애 대응 계획을 수립해보겠습니다'
      ],
      8: [
        '마케팅 전략을 수립해보겠습니다',
        '사용자 확보 방안을 세워보겠습니다',
        '브랜딩 전략을 정의해보겠습니다'
      ],
      9: [
        '수익화 모델을 설계해보겠습니다',
        '사업화 로드맵을 수립해보겠습니다',
        '투자 계획을 세워보겠습니다'
      ]
    };
    return suggestions[workflowStep] || [];
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsStreaming(true);

    // AI 응답 메시지 추가
    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, aiMessage]);

    try {
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/ai-pm/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          workflow_step: workflowStep
        } as SendMessageRequest),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is null');
      }

      let accumulatedContent = '';
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        
        // 마지막 라인은 완전하지 않을 수 있으므로 버퍼에 보관
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsStreaming(false);
              break;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent += parsed.content;
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === aiMessage.id 
                      ? { ...msg, content: accumulatedContent, isLoading: false }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      // 최종 메시지 업데이트
      setMessages(prev => 
        prev.map(msg => 
          msg.id === aiMessage.id 
            ? { ...msg, content: accumulatedContent, isLoading: false }
            : msg
        )
      );

             onMessageSent?.({
         id: aiMessage.id,
         role: aiMessage.role,
         content: accumulatedContent,
         timestamp: aiMessage.timestamp
       });

    } catch (error) {
      console.error('Chat error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        // 사용자가 중단한 경우
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessage.id 
              ? { ...msg, content: '메시지가 중단되었습니다.', isLoading: false }
              : msg
          )
        );
      } else {
        // 오류 발생
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessage.id 
              ? { ...msg, content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.', isLoading: false, error: 'error' }
              : msg
          )
        );
                 showError('채팅 오류', '채팅 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full ${className}`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">AI 어시스턴트</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {getWorkflowStepName(workflowStep)} 단계에서 도움을 드립니다
        </p>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.error
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 mt-1">
                    {message.error ? (
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                    ) : (
                      <LightBulbIcon className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.isLoading && (
                    <div className="mt-2 flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                </div>
              </div>
              <div className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 제안 메시지 */}
      {messages.length === 1 && (
        <div className="px-4 pb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">추천 질문</h4>
          <div className="space-y-2">
            {getSuggestions().map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left p-3 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 입력 영역 */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <StopIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}