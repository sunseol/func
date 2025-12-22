'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useViewport } from '@/contexts/ViewportContext';
import { useKeyboardAvoidance } from '@/hooks/useKeyboardAvoidance';
import { AIChatMessage, SendMessageRequest, WorkflowStep, WORKFLOW_STEPS } from '@/types/ai-pm';
import { Input, Button } from 'antd';
import {
  SendOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  StopOutlined,
  SaveOutlined,
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

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';

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
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
        const response = await fetch(`/api/ai-pm/chat?projectId=${projectId}&workflowStep=${workflowStep}`);
        if (!response.ok) return;

        const data = await response.json();
        const conversation = data.conversation;

        if (conversation && conversation.messages.length > 0) {
          setMessages(
            conversation.messages.map((msg: any): ChatMessage => ({
              id: msg.id || `${msg.role}-${msg.timestamp}`,
              role: msg.role as ChatMessage['role'],
              content: String(msg.content ?? ''),
              timestamp: new Date(msg.timestamp),
            })),
          );
        } else {
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content: `Hi! Let's work on ${WORKFLOW_STEPS[workflowStep]}. What should we tackle first?`,
              timestamp: new Date(),
            },
          ]);
        }
      } catch (err) {
        showError('Load failed', 'Unable to load conversation history.');
      } finally {
        setIsLoading(false);
        setSaveState('saved');
      }
    };

    loadConversation();
  }, [workflowStep, projectId, showError]);

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
          messages: currentMessages.filter((message) => message.id !== 'welcome'),
        }),
      });

      if (!response.ok) throw new Error('Failed to save conversation');

      success('Saved', 'Conversation saved successfully.');
      setSaveState('saved');
    } catch {
      showError('Save failed', 'Unable to save conversation.');
      setSaveState('error');
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, aiMessage]);
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
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
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
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') {
            setIsStreaming(false);
            break;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
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

      let finalMessages: ChatMessage[] = [];
      setMessages((prev) => {
        finalMessages = prev.map((msg) =>
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

      await handleSave(finalMessages);
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
        showError('Chat error', 'Unable to fetch AI response.');
      }

      setSaveState('error');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = () => {
    abortControllerRef.current?.abort();
  };

  const clearConversation = async () => {
    if (!confirm('Clear the current conversation? This cannot be undone.')) return;

    try {
      await fetch(`/api/ai-pm/chat?projectId=${projectId}&workflowStep=${workflowStep}`, { method: 'DELETE' });
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hi! Let's work on ${WORKFLOW_STEPS[workflowStep]}. What should we tackle first?`,
          timestamp: new Date(),
        },
      ]);
      setSaveState('saved');
      success('Cleared', 'Conversation cleared.');
    } catch {
      showError('Clear failed', 'Unable to clear conversation.');
    }
  };

  const renderSaveStatus = () => {
    switch (saveState) {
      case 'saved':
        return <span className="text-xs text-gray-500">All changes saved.</span>;
      case 'saving':
        return <span className="text-xs text-blue-500">Saving...</span>;
      case 'unsaved':
        return <span className="text-xs text-yellow-600">Unsaved changes.</span>;
      case 'error':
        return <span className="text-xs text-red-500">Save failed.</span>;
      default:
        return null;
    }
  };

  const suggestions = STEP_SUGGESTIONS[workflowStep] || [];

  return (
    <div
      ref={chatContainerRef}
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
        {messages.map((message) => (
          <div
            key={message.id}
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
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4 bg-white">
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.map((suggestion) => (
              <Button key={suggestion} size="small" onClick={() => sendMessage(suggestion)} disabled={isLoading}>
                {suggestion}
              </Button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input.TextArea
            value={inputMessage}
            onChange={(event) => setInputMessage(event.target.value)}
            placeholder="Type your message..."
            autoSize={{ minRows: 2, maxRows: 4 }}
            onPressEnter={(event) => {
              if (!event.shiftKey) {
                event.preventDefault();
                sendMessage(inputMessage);
              }
            }}
            disabled={isLoading}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => sendMessage(inputMessage)}
              loading={isLoading}
            />
            {isStreaming && (
              <Button icon={<StopOutlined />} onClick={stopStreaming} danger />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <Button size="small" icon={<SaveOutlined />} onClick={() => handleSave()} disabled={saveState === 'saving'}>
            Save
          </Button>
          <Button size="small" onClick={clearConversation}>
            Clear
          </Button>
          <div>{renderSaveStatus()}</div>
        </div>
      </div>
    </div>
  );
}
