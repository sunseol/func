'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useViewport } from '@/contexts/ViewportContext';
import { useKeyboardAvoidance } from '@/hooks/useKeyboardAvoidance';
import { AIChatMessage, WorkflowStep, WORKFLOW_STEPS } from '@/types/ai-pm';
import { Input, Button } from 'antd';
import {
  SendOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  StopOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
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
  role: 'user' | 'assistant';
  timestamp: Date;
  isLoading?: boolean;
  error?: string;
}

type HistoryState = 'loading' | 'loaded' | 'new' | 'error';

interface RetryRequest {
  readonly prompt: string;
  readonly idempotencyKey: string;
  readonly userMessageId: string;
  readonly assistantMessageId: string;
  readonly assistantTimestamp: Date;
}

function createUuid(): string {
  const randomUuid = globalThis.crypto?.randomUUID;
  if (typeof randomUuid === 'function') return randomUuid.call(globalThis.crypto);
  const randomHex = (length: number) => Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `00000000-0000-4000-8000-${randomHex(12)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseMessage(value: unknown): ChatMessage | null {
  if (!isRecord(value)) return null;
  const { id, role, content, timestamp } = value;
  if (
    typeof id !== 'string' ||
    (role !== 'user' && role !== 'assistant') ||
    typeof content !== 'string' ||
    (typeof timestamp !== 'string' && !(timestamp instanceof Date))
  ) {
    return null;
  }
  return { id, role, content, timestamp: new Date(timestamp) };
}

const STEP_SUGGESTIONS: Record<WorkflowStep, string[]> = {
  1: ['Define the target users', 'Clarify the core value proposition', 'Outline differentiation'],
  2: ['List MVP features', 'Describe key user flows', 'Identify dependencies'],
  3: ['Sketch architecture', 'Define data model', 'List integrations'],
  4: ['Draft milestones', 'Estimate scope', 'Call out risks'],
  5: ['Outline test plan', 'List critical test cases', 'Define acceptance criteria'],
  6: ['Describe release steps', 'Define environments', 'Plan monitoring'],
  7: ['Define on-call plan', 'Set alert thresholds', 'Outline support flow'],
  8: ['Define launch plan', 'Choose channels', 'Set success metrics'],
  9: ['Define pricing model', 'Identify KPIs', 'Draft go-to-market'],
};

export default function AIChatPanel({
  projectId,
  workflowStep,
  onMessageSent,
  onShowHistory,
  onFullscreenToggle,
  className = '',
}: AIChatPanelProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { isMobile } = useViewport();
  const { keyboardState, getSafeAreaStyles } = useKeyboardAvoidance();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyState, setHistoryState] = useState<HistoryState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [retryRequest, setRetryRequest] = useState<RetryRequest | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const requestInFlightRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFullscreenToggle = useCallback(() => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    onFullscreenToggle?.(next);

    if (!isMobile || !chatContainerRef.current) return;

    if (next && chatContainerRef.current.requestFullscreen) {
      chatContainerRef.current.requestFullscreen().catch(console.error);
    } else if (!next && document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
  }, [isFullscreen, isMobile, onFullscreenToggle]);

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
    const loadConversation = async () => {
      try {
        setIsLoading(true);
        setHistoryState('loading');
        setLoadError(null);
        const response = await fetch(`/api/ai-pm/chat?projectId=${projectId}&workflowStep=${workflowStep}`);
        if (!response.ok) {
          throw new Error(`History request failed with status ${response.status}`);
        }

        const data: unknown = await response.json();
        const conversation = isRecord(data) && isRecord(data.conversation) ? data.conversation : null;
        const rawMessages = conversation?.messages;
        if (!conversation || !Array.isArray(rawMessages)) {
          throw new Error('History response did not include a conversation');
        }
        const parsedMessages = rawMessages.map(parseMessage);
        if (parsedMessages.some((message) => message === null)) {
          throw new Error('History response contained an invalid message');
        }

        if (parsedMessages.length > 0) {
          setMessages(parsedMessages.filter((message): message is ChatMessage => message !== null));
          setHistoryState('loaded');
        } else {
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content: `Hi! Let's work on ${WORKFLOW_STEPS[workflowStep]}. What should we tackle first?`,
              timestamp: new Date(),
            },
          ]);
          setHistoryState('new');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load conversation history.';
        setMessages([]);
        setLoadError(message);
        setHistoryState('error');
        showError('Load failed', 'Unable to load conversation history.');
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [workflowStep, projectId, showError]);

  const sendMessage = async (content: string, retry?: RetryRequest) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isLoading || requestInFlightRef.current || historyState === 'loading' || historyState === 'error') return;

    requestInFlightRef.current = true;

    const idempotencyKey = retry?.idempotencyKey ?? createUuid();
    const userMessageId = retry?.userMessageId ?? createUuid();
    const aiMessage: ChatMessage = {
      id: retry?.assistantMessageId ?? createUuid(),
      role: 'assistant',
      content: '',
      timestamp: retry?.assistantTimestamp ?? new Date(),
      isLoading: true,
    };

    if (retry) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === aiMessage.id ? { ...message, content: '', isLoading: true, error: undefined } : message,
        ),
      );
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: 'user',
          content: trimmedContent,
          timestamp: new Date(),
        },
        aiMessage,
      ]);
      setInputMessage('');
    }
    setRetryRequest(null);
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch(`/api/ai-pm/chat/stream?projectId=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedContent,
          workflow_step: workflowStep,
          idempotency_key: idempotencyKey,
          user_message_id: userMessageId,
          assistant_message_id: aiMessage.id,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');

      let accumulatedContent = '';
      let buffer = '';
      let streamError: Error | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') {
            setIsStreaming(false);
            break;
          }

          try {
            const parsed: unknown = JSON.parse(data);
            if (isRecord(parsed) && typeof parsed.error === 'string') {
              streamError = new Error(typeof parsed.message === 'string' ? parsed.message : parsed.error);
              continue;
            }
            if (isRecord(parsed) && typeof parsed.content === 'string') {
              accumulatedContent += parsed.content;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessage.id ? { ...msg, content: accumulatedContent, isLoading: true } : msg,
                ),
              );
            }
          } catch (err) {
            console.error('Failed to parse SSE data:', err);
          }
        }
      }

      if (streamError) throw streamError;

      setMessages((prev) => {
        const finalMessages = prev.map((msg) =>
          msg.id === aiMessage.id ? { ...msg, content: accumulatedContent.trim(), isLoading: false } : msg,
        );
        return finalMessages;
      });

      onMessageSent?.({
        id: aiMessage.id,
        role: aiMessage.role,
        content: accumulatedContent.trim(),
        timestamp: aiMessage.timestamp,
      });
      setRetryRequest(null);
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      const errorMessage = aborted
        ? 'Streaming stopped.'
        : 'Sorry, something went wrong. Please try again.';

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessage.id ? { ...msg, content: errorMessage, isLoading: false, error: 'error' } : msg,
        ),
      );

      if (!aborted) {
        setRetryRequest({
          prompt: trimmedContent,
          idempotencyKey,
          userMessageId,
          assistantMessageId: aiMessage.id,
          assistantTimestamp: aiMessage.timestamp,
        });
        showError('Chat error', 'Unable to fetch AI response.');
      }

    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
      requestInFlightRef.current = false;
    }
  };

  const retryMessage = (request: RetryRequest) => {
    void sendMessage(request.prompt, request);
  };

  const stopStreaming = () => {
    abortControllerRef.current?.abort();
  };

  const clearConversation = async () => {
    if (!confirm('Clear the current conversation? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/ai-pm/chat?projectId=${projectId}&workflowStep=${workflowStep}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Clear failed with status ${response.status}`);
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hi! Let's work on ${WORKFLOW_STEPS[workflowStep]}. What should we tackle first?`,
          timestamp: new Date(),
        },
      ]);
      success('Cleared', 'Conversation cleared.');
    } catch {
      showError('Clear failed', 'Unable to clear conversation.');
    }
  };

  const suggestions = STEP_SUGGESTIONS[workflowStep] || [];

  return (
    <div
      ref={chatContainerRef}
      data-testid="ai-chat-panel"
      className={`bg-white flex flex-col h-full ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'rounded-lg shadow-sm border border-gray-200'
      } ${className}`}
      style={keyboardState.isVisible ? getSafeAreaStyles() : {}}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <MessageOutlined className="text-blue-600" />
          <div>
            <div className="text-sm text-gray-500">AI Assistant</div>
            <div className="text-base font-semibold text-gray-900">{WORKFLOW_STEPS[workflowStep]}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="small" icon={<ClockCircleOutlined />} onClick={onShowHistory}>
            History
          </Button>
          <Button
            size="small"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={handleFullscreenToggle}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadError && (
          <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            Unable to load conversation history. Sending is disabled until history is available.
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            data-testid="ai-message"
            data-message-role={message.role}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.error
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div
                className="whitespace-pre-wrap"
                data-testid={message.error ? 'ai-error-message' : message.role === 'assistant' ? 'ai-response' : 'user-message'}
              >
                {message.content}
              </div>
              {message.error && retryRequest?.assistantMessageId === message.id && (
                <Button
                  type="link"
                  size="small"
                  aria-label="Retry message"
                  data-testid="retry-ai-message"
                  onClick={() => retryMessage(retryRequest)}
                  disabled={isLoading}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div data-testid="ai-typing-indicator" role="status" className="sr-only">
            AI 응답 생성 중
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4 bg-white">
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                size="small"
                onClick={() => sendMessage(suggestion)}
                disabled={isLoading || historyState === 'loading' || historyState === 'error'}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input.TextArea
            value={inputMessage}
            aria-label="AI 메시지"
            onChange={(event) => setInputMessage(event.target.value)}
            placeholder="Type your message..."
            autoSize={{ minRows: 2, maxRows: 4 }}
            onPressEnter={(event) => {
              if (!event.shiftKey) {
                event.preventDefault();
                sendMessage(inputMessage);
              }
            }}
            disabled={isLoading || historyState === 'loading' || historyState === 'error'}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="primary"
              icon={<SendOutlined />}
              aria-label="Send message"
              onClick={() => sendMessage(inputMessage)}
              loading={isLoading}
              disabled={historyState === 'loading' || historyState === 'error'}
            />
            {isStreaming && (
              <Button icon={<StopOutlined />} onClick={stopStreaming} danger />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <Button size="small" onClick={clearConversation}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
