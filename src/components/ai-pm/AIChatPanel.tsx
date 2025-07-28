'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AIChatMessage, 
  AIConversation, 
  WorkflowStep
} from '@/types/ai-pm';
import { 
  PaperAirplaneIcon, 
  DocumentTextIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface AIChatPanelProps {
  projectId: string;
  workflowStep: WorkflowStep;
  onDocumentGenerated?: (documentId: string) => void;
  className?: string;
}

interface StreamingMessage {
  id: string;
  role: 'assistant';
  content: string;
  isStreaming: boolean;
}

export default function AIChatPanel({ 
  projectId, 
  workflowStep, 
  onDocumentGenerated,
  className = '' 
}: AIChatPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, scrollToBottom]);

  // Load conversation history on mount
  useEffect(() => {
    if (user && projectId) {
      loadConversation();
    }
  }, [user, projectId, workflowStep]); // loadConversation is stable

  const loadConversation = async () => {
    try {
      setIsInitialLoading(true);
      setError(null);

      const response = await fetch(
        `/api/ai-pm/chat?projectId=${projectId}&workflowStep=${workflowStep}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '대화 기록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      const conversation: AIConversation = data.conversation;
      
      if (conversation && conversation.messages) {
        setMessages(conversation.messages);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Error loading conversation:', err);
      setError(err instanceof Error ? err.message : '대화 기록을 불러오는데 실패했습니다.');
      setMessages([]);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !user) return;

    const messageContent = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);
    setError(null);

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Add user message immediately
      const userMessage: AIChatMessage = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: messageContent,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Start streaming response
      const response = await fetch(
        `/api/ai-pm/chat/stream?projectId=${projectId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageContent,
            workflow_step: workflowStep
          }),
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'AI 응답을 받는데 실패했습니다.');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('스트리밍 응답을 읽을 수 없습니다.');
      }

      const decoder = new TextDecoder();
      const streamingId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      setStreamingMessage({
        id: streamingId,
        role: 'assistant',
        content: '',
        isStreaming: true
      });

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content') {
                setStreamingMessage(prev => prev ? {
                  ...prev,
                  content: data.content,
                  isStreaming: !data.isComplete
                } : null);
              } else if (data.type === 'complete') {
                // Move streaming message to regular messages
                setStreamingMessage(prev => {
                  if (prev) {
                    const finalMessage: AIChatMessage = {
                      id: data.messageId || prev.id,
                      role: 'assistant',
                      content: prev.content,
                      timestamp: new Date()
                    };
                    setMessages(prevMessages => [...prevMessages, finalMessage]);
                  }
                  return null;
                });
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError);
            }
          }
        }
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'AI 응답을 받는데 실패했습니다.');
      
      // Clear any streaming message on error
      setStreamingMessage(null);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const generateDocument = async () => {
    if (isGeneratingDocument || messages.length === 0) return;

    setIsGeneratingDocument(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ai-pm/documents/generate?projectId=${projectId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow_step: workflowStep
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '문서 생성에 실패했습니다.');
      }

      const data = await response.json();
      
      if (onDocumentGenerated && data.document) {
        onDocumentGenerated(data.document.id);
      }

    } catch (err) {
      console.error('Error generating document:', err);
      setError(err instanceof Error ? err.message : '문서 생성에 실패했습니다.');
    } finally {
      setIsGeneratingDocument(false);
    }
  };

  const clearConversation = async () => {
    if (!confirm('대화 기록을 모두 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(
        `/api/ai-pm/chat?projectId=${projectId}&workflowStep=${workflowStep}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '대화 기록 삭제에 실패했습니다.');
      }

      setMessages([]);
      setStreamingMessage(null);
      setError(null);

    } catch (err) {
      console.error('Error clearing conversation:', err);
      setError(err instanceof Error ? err.message : '대화 기록 삭제에 실패했습니다.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isInitialLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI 기획 어시스턴트</h3>
          <p className="text-sm text-gray-600">
            {workflowStep}단계 기획 작업을 도와드립니다
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={generateDocument}
            disabled={isGeneratingDocument || messages.length === 0}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DocumentTextIcon className="h-4 w-4 mr-1" />
            {isGeneratingDocument ? '생성 중...' : '문서 생성'}
          </button>
          <button
            onClick={clearConversation}
            disabled={messages.length === 0}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrashIcon className="h-4 w-4 mr-1" />
            초기화
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" style={{ maxHeight: '400px' }}>
        {messages.length === 0 && !streamingMessage && (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-600">
              AI와 대화를 시작해보세요. 기획 작업에 대한 질문이나 아이디어를 공유해주시면 도움을 드리겠습니다.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              <div
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming Message */}
        {streamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100 text-gray-900">
              <div className="whitespace-pre-wrap text-sm">{streamingMessage.content}</div>
              {streamingMessage.isStreaming && (
                <div className="flex items-center mt-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">AI가 응답 중...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Typing Indicator */}
        {isTyping && !streamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500">AI가 생각 중...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="AI에게 질문하거나 아이디어를 공유해보세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Shift + Enter로 줄바꿈, Enter로 전송
        </div>
      </div>
    </div>
  );
}