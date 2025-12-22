import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConversationHistoryPanel from '../ConversationHistoryPanel';

// Mock fetch
global.fetch = jest.fn();

jest.mock('@/contexts/AuthContext', () => {
  const user = { id: 'user-1', email: 'test@example.com' };
  return {
    useAuth: () => ({
      user,
      loading: false,
    }),
  };
});

const toast = {
  success: jest.fn(),
  error: jest.fn(),
};

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => toast,
}));

describe('ConversationHistoryPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  const defaultProps = {
    projectId: 'project-1',
    className: '',
  };

  it('shows loading state while fetching conversations', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<ConversationHistoryPanel {...defaultProps} />);
    expect(screen.getAllByText('로딩 중...')[0]).toBeInTheDocument();
  });

  it('renders conversations and loads detail on click', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversations: [
            {
              id: 'conv-1',
              workflow_step: 1,
              step_name: '서비스 개요 및 목표 설정',
              message_count: 2,
              last_activity: new Date().toISOString(),
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversation: {
            id: 'conv-1',
            workflow_step: 1,
            messages: [
              { role: 'user', content: '안녕하세요', timestamp: new Date().toISOString() },
              { role: 'assistant', content: '안녕하세요! 도움을 드리겠습니다.', timestamp: new Date().toISOString() },
            ],
          },
        }),
      });

    render(<ConversationHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('서비스 개요 및 목표 설정')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('서비스 개요 및 목표 설정'));

    await waitFor(() => {
      expect(screen.getByText('안녕하세요')).toBeInTheDocument();
      expect(screen.getByText('안녕하세요! 도움을 드리겠습니다.')).toBeInTheDocument();
    });
  });

  it('exports a conversation', async () => {
    const originalCreateObjectURL = global.URL.createObjectURL;
    const originalRevokeObjectURL = global.URL.revokeObjectURL;
    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = jest.fn();
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversations: [
            {
              id: 'conv-1',
              workflow_step: 1,
              step_name: '서비스 개요 및 목표 설정',
              message_count: 2,
              last_activity: new Date().toISOString(),
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['# export'], { type: 'text/plain' }),
      });

    render(<ConversationHistoryPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('서비스 개요 및 목표 설정')).toBeInTheDocument();
    });

    // Open dropdown
    const dropdownButtons = screen.getAllByRole('button').filter((b) =>
      b.className.includes('ant-btn')
    );
    fireEvent.click(dropdownButtons[0]);

    const exportTextItem = await screen.findByText('텍스트로 내보내기');
    fireEvent.click(exportTextItem);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });

    clickSpy.mockRestore();
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
