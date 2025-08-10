'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useViewport } from '@/contexts/ViewportContext';
import { useKeyboardAvoidance } from '@/hooks/useKeyboardAvoidance';
import { WorkflowStep, AIChatMessage, SendMessageRequest } from '@/types/ai-pm';
import { Input, Button } from 'antd';
import { 
  SendOutlined,
  MessageOutlined,
  BulbOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  DownloadOutlined,
  DeleteOutlined,
  StopOutlined,
  SaveOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CloseOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';

interface AIChatPanelProps {
  projectId: string;
  workflowStep: WorkflowStep;
  onMessageSent?: (message: AIChatMessage) => void;
  onShowHistory?: () => void;
  className?: string;
  onFullscreenToggle?: (isFullscreen: boolean) => void;
}

interface ChatMessage extends AIChatMessage {
  id: string;
  isLoading?: boolean;
  error?: string;
}

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';

export default function AIChatPanel({
  projectId,
  workflowStep,
  onMessageSent,
  onShowHistory,
  onFullscreenToggle,
  className = ''
}: AIChatPanelProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { isMobile, isTablet } = useViewport();
  const { keyboardState, getSafeAreaStyles } = useKeyboardAvoidance();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mobile fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    onFullscreenToggle?.(newFullscreenState);

    // On mobile, try to use native fullscreen API
    if (isMobile && newFullscreenState && chatContainerRef.current) {
      if (chatContainerRef.current.requestFullscreen) {
        chatContainerRef.current.requestFullscreen().catch(console.error);
      }
    } else if (isMobile && !newFullscreenState && document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
  }, [isFullscreen, isMobile, onFullscreenToggle]);

  // Handle native fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFullscreen = !!document.fullscreenElement;
      if (isMobile && isNativeFullscreen !== isFullscreen) {
        setIsFullscreen(isNativeFullscreen);
        onFullscreenToggle?.(isNativeFullscreen);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isMobile, isFullscreen, onFullscreenToggle]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const getWorkflowStepName = useCallback((step: WorkflowStep): string => {
    const stepNames: Record<WorkflowStep, string> = {
      1: '컨셉 정의', 2: '기능 기획', 3: '기술 설계', 4: '개발 계획',
      5: '테스트 계획', 6: '배포 준비', 7: '운영 계획', 8: '마케팅 전략', 9: '사업화 계획'
    };
    return stepNames[step];
  }, []);

  useEffect(() => {
    const loadConversation = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/ai-pm/chat?projectId=${projectId}&workflowStep=${workflowStep}`);
            if(response.ok) {
                const data = await response.json();
                if (data.conversation && data.conversation.messages.length > 0) {
                    setMessages(data.conversation.messages.map((msg: any) => ({
                        ...msg,
                        id: msg.id || `${msg.role}-${msg.timestamp}`
                    })));
                } else {
                    const initialMessage: ChatMessage = {
                      id: 'welcome',
                      role: 'assistant',
                      content: `안녕하세요! ${getWorkflowStepName(workflowStep)} 단계에서 도움을 드리겠습니다. 무엇을 도와드릴까요?`,
                      timestamp: new Date()
                    };
                    setMessages([initialMessage]);
                }
            }
        } catch(e) {
            showError("대화 로딩 실패", "이전 대화 내용을 불러오는데 실패했습니다.")
        } finally {
            setIsLoading(false);
            setSaveState('saved');
        }
    };
    loadConversation();
  }, [workflowStep, projectId, getWorkflowStepName, showError]);


  const getSuggestions = (): string[] => {
    const suggestions: Record<WorkflowStep, string[]> = {
        1: ['플랫폼의 핵심 가치를 정의해주세요', '타겟 사용자를 분석해보겠습니다', '시장 포지셔닝을 설정해보겠습니다'],
        2: ['주요 기능을 우선순위별로 정리해보겠습니다', '사용자 시나리오를 작성해보겠습니다', '기능 요구사항을 정리해보겠습니다'],
        3: ['기술 스택을 선정해보겠습니다', '아키텍처를 설계해보겠습니다', '데이터베이스 구조를 설계해보겠습니다'],
        4: ['개발 일정을 계획해보겠습니다', '필요한 리소스를 분석해보겠습니다', '리스크를 평가해보겠습니다'],
        5: ['테스트 전략을 수립해보겠습니다', '품질 보증 계획을 세워보겠습니다', '테스트 케이스를 작성해보겠습니다'],
        6: ['배포 전략을 수립해보겠습니다', '운영 환경을 구성해보겠습니다', '모니터링 계획을 세워보겠습니다'],
        7: ['운영 프로세스를 정의해보겠습니다', '성능 모니터링 방안을 세워보겠습니다', '장애 대응 계획을 수립해보겠습니다'],
        8: ['마케팅 전략을 수립해보겠습니다', '사용자 확보 방안을 세워보겠습니다', '브랜딩 전략을 정의해보겠습니다'],
        9: ['수익화 모델을 설계해보겠습니다', '사업화 로드맵을 수립해보겠습니다', '투자 계획을 세워보겠습니다']
      };
    return suggestions[workflowStep] || [];
  };

  const handleSave = async (messagesToSave?: ChatMessage[]) => {
    const currentMessages = messagesToSave || messages;
    if (currentMessages.length === 0) return;

    setSaveState('saving');
    try {
      const response = await fetch(`/api/ai-pm/chat`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          workflow_step: workflowStep,
          messages: currentMessages.filter(m => m.id !== 'welcome')
        })
      });
      if (!response.ok) throw new Error('Failed to save conversation');
      success('저장 완료', '대화 내용이 성공적으로 저장되었습니다.');
      setSaveState('saved');
    } catch (e) {
      showError('저장 실패', '대화 내용 저장 중 오류가 발생했습니다.');
      setSaveState('error');
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: content.trim(), timestamp: new Date() };
    const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', timestamp: new Date(), isLoading: true };
    
    setMessages(prev => [...prev, userMessage, aiMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsStreaming(true);
    setSaveState('unsaved');

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch(`/api/ai-pm/chat/stream?projectId=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content.trim(), workflow_step: workflowStep } as SendMessageRequest),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');

      let accumulatedContent = '';
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') { setIsStreaming(false); break; }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent += parsed.content;
                setMessages(prev => prev.map(msg => msg.id === aiMessage.id ? { ...msg, content: accumulatedContent, isLoading: true } : msg));
              }
            } catch (e) { console.error('Failed to parse SSE data:', e); }
          }
        }
      }

      let finalMessages: ChatMessage[] = [];
      setMessages(prev => {
        finalMessages = prev.map(msg => msg.id === aiMessage.id ? { ...msg, content: accumulatedContent.trim(), isLoading: false } : msg);
        return finalMessages;
      });

      onMessageSent?.({ id: aiMessage.id, role: aiMessage.role, content: accumulatedContent.trim(), timestamp: aiMessage.timestamp });
      
      await handleSave(finalMessages);

    } catch (error) {
      const errorMessage = error instanceof Error && error.name === 'AbortError' ? '메시지가 중단되었습니다.' : '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.';
      setMessages(prev => prev.map(msg => msg.id === aiMessage.id ? { ...msg, content: errorMessage, isLoading: false, error: 'error' } : msg));
      if (!(error instanceof Error && error.name === 'AbortError')) {
        showError('채팅 오류', '채팅 중 오류가 발생했습니다.');
      }
      setSaveState('error');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
  };
  
  const clearCurrentConversation = async () => {
    if (!confirm('현재 대화 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    try {
      await fetch(`/api/ai-pm/chat?projectId=${projectId}&workflowStep=${workflowStep}`, { method: 'DELETE' });
      const initialMessage = { id: 'welcome', role: 'assistant', content: `안녕하세요! ${getWorkflowStepName(workflowStep)} 단계에서 도움을 드리겠습니다. 무엇을 도와드릴까요?`, timestamp: new Date() };
      setMessages([initialMessage]);
      setShowMenu(false);
      success('삭제 완료', '대화 기록이 삭제되었습니다.');
      setSaveState('saved');
    } catch (error) {
      showError('삭제 실패', '대화 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  const exportCurrentConversation = async (format: 'markdown' | 'pdf') => {
    // Logic remains the same
  };

  const formatTime = (date: Date) => new Date(date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  const renderSaveStatus = () => {
    switch(saveState) {
        case 'saved': return <span className="text-xs text-gray-500">모든 변경사항이 저장되었습니다.</span>;
        case 'saving': return <span className="text-xs text-blue-500">저장 중...</span>;
        case 'unsaved': return <span className="text-xs text-yellow-600">저장되지 않은 변경사항이 있습니다.</span>;
        case 'error': return <span className="text-xs text-red-500">저장 중 오류 발생</span>;
        default: return null;
    }
  }

  return (
    <div 
      ref={chatContainerRef}
      className={`bg-white dark:bg-neutral-900 flex flex-col h-full ${
        isFullscreen 
          ? 'fixed inset-0 z-50 rounded-none' 
          : 'rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800'
      } ${className}`}
      style={keyboardState.isVisible ? getSafeAreaStyles() : {}}
    >
      {/* Mobile Header */}
      {(isMobile || isFullscreen) && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {isFullscreen && (
              <button
                onClick={handleFullscreenToggle}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftOutlined style={{ fontSize: 18 }} />
              </button>
            )}
            <MessageOutlined style={{ fontSize: 20, color: '#3b82f6' }} />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">AI 어시스턴트</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{getWorkflowStepName(workflowStep)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isFullscreen && isMobile && (
              <button
                onClick={handleFullscreenToggle}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FullscreenOutlined style={{ fontSize: 18 }} />
              </button>
            )}
            
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreOutlined style={{ fontSize: 18 }} />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  {onShowHistory && (
                    <button
                      onClick={() => {
                        onShowHistory();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <ClockCircleOutlined />
                      대화 기록
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleSave();
                      setShowMenu(false);
                    }}
                    disabled={saveState === 'saved' || saveState === 'saving'}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                  >
                    <SaveOutlined />
                    대화 저장
                  </button>
                  <button
                    onClick={() => {
                      clearCurrentConversation();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <DeleteOutlined />
                    대화 삭제
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        
      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto space-y-4 ${
        isMobile || isFullscreen ? 'p-4' : 'p-4'
      }`}>
            {messages.map(message => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-4 py-3 rounded-lg ${
                      isMobile || isFullscreen 
                        ? 'max-w-[85%]' 
                        : 'max-w-xs lg:max-w-md'
                    } ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : message.error 
                          ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900' 
                          : 'bg-gray-100 text-gray-900 dark:bg-neutral-800 dark:text-gray-100'
                    }`}>
                        <div className="flex items-start space-x-2">
                            {message.role === 'assistant' && (
                              <div className="flex-shrink-0 mt-1">
                                {message.error ? (
                                  <ExclamationCircleOutlined style={{ color: '#ef4444', fontSize: isMobile ? 16 : 14 }} />
                                ) : (
                                  <BulbOutlined style={{ color: '#3b82f6', fontSize: isMobile ? 16 : 14 }} />
                                )}
                              </div>
                            )}
                            <div className="flex-1">
                                <p className={`whitespace-pre-wrap ${
                                  isMobile || isFullscreen ? 'text-base leading-relaxed' : 'text-sm'
                                }`}>
                                  {message.content}
                                </p>
                                {message.isLoading && (
                                  <div className="mt-2 flex space-x-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                  </div>
                                )}
                            </div>
                        </div>
                        <div className={`mt-2 ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                        } ${isMobile || isFullscreen ? 'text-xs' : 'text-xs'}`}>
                          {formatTime(message.timestamp)}
                        </div>
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && (
            <div className={`px-4 pb-4 ${isMobile || isFullscreen ? 'px-4' : 'px-4'}`}>
                <h4 className={`font-medium text-gray-900 mb-3 ${
                  isMobile || isFullscreen ? 'text-base' : 'text-sm'
                }`}>
                  추천 질문
                </h4>
                <div className="space-y-3">
                    {getSuggestions().map((suggestion, index) => (
                      <button 
                        key={index} 
                        onClick={() => sendMessage(suggestion)} 
                        className={`w-full text-left p-3 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors ${
                          isMobile || isFullscreen 
                            ? 'text-base min-h-[48px] leading-relaxed' 
                            : 'text-sm'
                        }`}
                      >
                        {suggestion}
                      </button>
                    ))}
                </div>
            </div>
        )}

        {/* Input Area */}
        <div className={`p-4 border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 ${
          isMobile || isFullscreen ? 'sticky bottom-0' : ''
        }`}>
            <div className={`flex items-end gap-2 ${
              isMobile || isFullscreen ? 'gap-3' : 'gap-2'
            }`}>
              <Input.TextArea
                value={inputMessage}
                onChange={(e) => {
                    setInputMessage(e.target.value);
                    if (saveState === 'saved') setSaveState('unsaved');
                }}
                onKeyDown={handleKeyDown}
                placeholder={isMobile ? "메시지 입력..." : "메시지를 입력하세요 (Shift+Enter로 줄바꿈)"}
                disabled={isLoading}
                autoSize={{ 
                  minRows: 1, 
                  maxRows: isMobile || isFullscreen ? 4 : 5 
                }}
                className="flex-1"
                style={{
                  fontSize: isMobile ? '16px' : '14px',
                  minHeight: isMobile ? '48px' : '32px'
                }}
              />
              {isStreaming ? (
                <Button 
                  type="primary" 
                  danger 
                  icon={<StopOutlined />} 
                  onClick={stopStreaming}
                  size={isMobile ? 'large' : 'middle'}
                  className={isMobile ? 'min-h-[48px] min-w-[48px]' : ''}
                />
              ) : (
                <Button 
                  type="primary" 
                  icon={<SendOutlined />} 
                  onClick={() => sendMessage(inputMessage)} 
                  disabled={!inputMessage.trim() || isLoading}
                  size={isMobile ? 'large' : 'middle'}
                  className={isMobile ? 'min-h-[48px] min-w-[48px]' : ''}
                />
              )}
            </div>
            
            {/* Status and Actions */}
            <div className={`flex justify-between items-center mt-3 ${
              isMobile || isFullscreen ? 'flex-col gap-2 items-stretch' : ''
            }`}>
                <div className={`${isMobile || isFullscreen ? 'text-center' : ''}`}>
                  {renderSaveStatus()}
                </div>
                
                {!(isMobile || isFullscreen) && (
                  <Button 
                      type="link" 
                      size="small" 
                      icon={<SaveOutlined />} 
                      onClick={() => handleSave()}
                      disabled={saveState === 'saved' || saveState === 'saving'}
                  >
                      지금 저장
                  </Button>
                )}
                
                {(isMobile || isFullscreen) && (
                  <div className="flex justify-center gap-4 text-xs text-gray-500">
                    <span>글자 수: {inputMessage.length}</span>
                    <button
                      onClick={() => handleSave()}
                      disabled={saveState === 'saved' || saveState === 'saving'}
                      className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      저장
                    </button>
                  </div>
                )}
            </div>
        </div>
    </div>
  );
}
