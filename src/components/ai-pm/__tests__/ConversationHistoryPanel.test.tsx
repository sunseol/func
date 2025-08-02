import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import ConversationHistoryPanel from '../ConversationHistoryPanel';
import { WorkflowStep } from '@/types/ai-pm';

// Mock the contexts
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');

// Mock fetch
global.fetch = jest.fn();

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com'
};

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn()
};

const mockConversations = [
  {
    id: 'conv-1',
    workflow_step: 1 as WorkflowStep,
    step_name: '서비스 개요 및 목표 설정',
    message_count: 10,
    user_message_count: 5,
    assistant_message_count: 5,
    last_activity: '2024-01-15T10:00:00Z',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 'conv-2',
    workflow_step: 2 as WorkflowStep,
    step_name: '타겟 사용자 분석',
    message_count: 8,
    user_message_count: 4,
    assistant_message_count: 4,
    last_activity: '2024-01-14T15:30:00Z',
    created_at: '2024-01-14T15:00:00Z',
    updated_at: '2024-01-14T15:30:00Z'
  }
];

const mockStats = {
  total_conversations: 2,
  total_messages: 18,
  most_active_step: 1 as WorkflowStep,
  activity_by_step: { 1: 10, 2: 8 } as Record<WorkflowStep, number>,
  recent_activity_count: 1
};

const mockConversationDetail = {
  id: 'conv-1',
  project_id: 'project-1',
  workflow_step: 1 as WorkflowStep,
  user_id: 'user-1',
  messages: [
    {
      id: 'msg-1',
      role: 'user' as const,
      content: '안녕하세요',
      timestamp: new Date('2024-01-15T09:00:00Z')
    },
    {
      id: 'msg-2',
      role: 'assistant' as const,
      content: '안녕하세요! 도움을 드리겠습니다.',
      timestamp: new Date('2024-01-15T09:01:00Z')
    }
  ],
  created_at: '2024-01-15T09:00:00Z',
  updated_at: '2024-01-15T10:00:00Z'
};

describe('ConversationHistoryPanel', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: jest.fn()
    });

    mockUseToast.mockReturnValue(mockToast);

    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  const defaultProps = {
    projectId: 'project-1',
    currentStep: 1 as WorkflowStep,
    className: ''
  };

  it('renders conversation history panel correctly', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conversations: mockConversations,
        stats: mockStats
      })
    } as Response);

    render(<ConversationHistoryPanel {...defaultProps} />);

    expect(screen.getByText('대화 기록')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('1단계')).toBeInTheDocument();
      expect(screen.getByText('서비스 개요 및 목표 설정')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<ConversationHistoryPanel {...defaultProps} />);

    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });

  it('displays empty state when no conversations exist', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conversations: [],
        stats: {
          total_conversations: 0,
          total_messages: 0,
          most_active_step: null,
          activity_by_step: {},
          recent_activity_count: 0
        }
      })
    } as Response);

    render(<ConversationHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('대화 기록이 없습니다.')).toBeInTheDocument();
    });
  });

  it('shows statistics when stats button is clicked', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conversations: mockConversations,
        stats: mockStats
      })
    } as Response);

    render(<ConversationHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('1단계')).toBeInTheDocument();
    });

    const statsButton = screen.getByTitle('통계 보기');
    fireEvent.click(statsButton);

    expect(screen.getByText('총 대화')).toBeInTheDocument();
    expect(screen.getByText('총 메시지')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // total conversations
    expect(screen.getByText('18')).toBeInTheDocument(); // total messages
  });

  it('shows filters when filter button is clicked', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conversations: mockConversations,
        stats: mockStats
      })
    } as Response);

    render(<ConversationHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('1단계')).toBeInTheDocument();
    });

    const filterButton = screen.getByTitle('필터');
    fireEvent.click(filterButton);

    expect(screen.getByText('키워드')).toBeInTheDocument();
    expect(screen.getByText('단계')).toBeInTheDocument();
    expect(screen.getByText('시작일')).toBeInTheDocument();
    expect(screen.getByText('종료일')).toBeInTheDocument();
  });

  it('loads conversation detail when conversation is clicked', async () => {
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversations: mockConversations,
          stats: mockStats
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversation: mockConversationDetail
        })
      } as Response);

    render(<ConversationHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('1단계')).toBeInTheDocument();
    });

    const conversationItem = screen.getByText('서비스 개요 및 목표 설정');
    fireEvent.click(conversationItem);

    await waitFor(() => {
      expect(screen.getByText('안녕하세요')).toBeInTheDocument();
      expect(screen.getByText('안녕하세요! 도움을 드리겠습니다.')).toBeInTheDocument();
    });
  });

  it('filters conversations by step', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conversations: mockConversations,
        stats: mockStats
      })
    } as Response);

    render(<ConversationHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('1단계')).toBeInTheDocument();
      expect(screen.getByText('서비스 개요 및 목표 설정')).toBeInTheDocument();
    });

    // Show filters
    const filterButton = screen.getByTitle('필터');
    fireEvent.click(filterButton);

    // Select step 1 only
    const stepSelect = screen.getByDisplayValue('모든 단계');
    fireEvent.change(stepSelect, { target: { value: '1' } });

    // Should still show step 1 conversation
    expect(screen.getByText('1단계')).toBeInTheDocument();
  });

  it('handles conversation deletion', async () => {
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversations: mockConversations,
          stats: mockStats
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: '대화 기록이 삭제되었습니다.'
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversations: [mockConversations[1]], // Only second conversation remains
          stats: { ...mockStats, total_conversations: 1 }
        })
      } as Response);

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    render(<ConversationHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('1단계')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('삭제');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('삭제 완료', '대화 기록이 삭제되었습니다.');
    });
  });

  it('handles export functionality', async () => {
    // Mock URL.createObjectURL and related functions first
    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock document.createElement and appendChild
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn()
    };
    const originalCreateElement = document.createElement;
    document.createElement = jest.fn((tagName) => {
      if (tagName === 'a') {
        return mockAnchor as any;
      }
      return originalCreateElement.call(document, tagName);
    });
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();

    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversations: mockConversations,
          stats: mockStats
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '# 대화 기록\n\n내용...'
      } as Response);

    render(<ConversationHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('1단계')).toBeInTheDocument();
    });

    const exportButtons = screen.getAllByTitle('마크다운으로 내보내기');
    fireEvent.click(exportButtons[0]);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('내보내기 완료', '대화 기록이 성공적으로 내보내졌습니다.');
    });

    // Restore original createElement
    document.createElement = originalCreateElement;
  });

  it('handles bulk selection and deletion', async () => {
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);

    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversations: mockConversations,
          stats: mockStats
        })
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          message: '대화 기록이 삭제되었습니다.'
        })
      } as Response);

    render(<ConversationHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('1단계')).toBeInTheDocument();
    });

    // Select conversations - only one checkbox is visible since we only show one conversation
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText('1개 선택됨')).toBeInTheDocument();
    });

    // Bulk delete
    const bulkDeleteButton = screen.getByTitle('선택한 대화 삭제');
    fireEvent.click(bulkDeleteButton);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('일괄 삭제 완료', '1개의 대화 기록이 삭제되었습니다.');
    });

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  

  it('handles API errors gracefully', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
      new Error('Network error')
    );

    render(<ConversationHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        '대화 기록 로드 실패',
        '대화 기록을 불러오는 중 오류가 발생했습니다.'
      );
    }, { timeout: 3000 });
  });
});