import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AIChatPanel from '../AIChatPanel';

// Mock fetch
global.fetch = jest.fn();

// Mock contexts
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false
  })
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  }),
  useApiError: () => ({
    handleApiError: jest.fn(),
  }),
}));

jest.mock('@/contexts/ViewportContext', () => ({
  useViewport: () => ({ isMobile: false, isTablet: false }),
}));

describe('AIChatPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chat panel with initial welcome message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversation: { messages: [] } }),
    });

    render(
      <AIChatPanel 
        projectId="test-project" 
        workflowStep={1} 
      />
    );

    expect(await screen.findByText(/컨셉 정의 단계에서 도움을 드리겠습니다/)).toBeInTheDocument();
  });

  it('displays workflow step suggestions', () => {
    render(
      <AIChatPanel 
        projectId="test-project" 
        workflowStep={1} 
      />
    );

    expect(screen.getByText(/플랫폼의 핵심 가치를 정의해주세요/)).toBeInTheDocument();
    expect(screen.getByText(/타겟 사용자를 분석해보겠습니다/)).toBeInTheDocument();
  });

  it('allows user to type and send messages', () => {
    render(
      <AIChatPanel 
        projectId="test-project" 
        workflowStep={1} 
      />
    );

    const input = screen.getByPlaceholderText(/메시지를 입력하세요/);
    const sendButton = screen.getByRole('button', { name: /전송/ });

    fireEvent.change(input, { target: { value: '테스트 메시지' } });
    fireEvent.click(sendButton);

    expect(screen.getByText('테스트 메시지')).toBeInTheDocument();
  });

  it('handles suggestion clicks', () => {
    render(
      <AIChatPanel 
        projectId="test-project" 
        workflowStep={1} 
      />
    );

    const suggestion = screen.getByText(/플랫폼의 핵심 가치를 정의해주세요/);
    fireEvent.click(suggestion);

    expect(screen.getByText('플랫폼의 핵심 가치를 정의해주세요')).toBeInTheDocument();
  });

  it('shows different suggestions for different workflow steps', () => {
    render(
      <AIChatPanel 
        projectId="test-project" 
        workflowStep={2} 
      />
    );

    expect(screen.getByText(/주요 기능을 우선순위별로 정리해보겠습니다/)).toBeInTheDocument();
    expect(screen.getByText(/사용자 시나리오를 작성해보겠습니다/)).toBeInTheDocument();
  });
}); 
