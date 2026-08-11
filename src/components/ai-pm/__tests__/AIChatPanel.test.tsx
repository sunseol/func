import React from 'react';
import { TextDecoder, TextEncoder } from 'node:util';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

Object.assign(globalThis, { TextDecoder, TextEncoder });

type MockButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };
type MockTextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  autoSize?: unknown;
  onPressEnter?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
};

jest.mock('antd/es/Input', () => {
  const ReactRuntime = jest.requireActual<typeof React>('react');
  const TextArea = ({ autoSize: _autoSize, onPressEnter, ...props }: MockTextAreaProps) =>
    ReactRuntime.createElement('textarea', { ...props, onKeyDown: onPressEnter });
  return { __esModule: true, default: { TextArea } };
});
jest.mock('antd/es/button', () => {
  const ReactRuntime = jest.requireActual<typeof React>('react');
  const Button = ({ children, loading: _loading, ...props }: MockButtonProps) =>
    ReactRuntime.createElement('button', props, children);
  return { __esModule: true, default: Button };
});
jest.mock('antd/es/Button', () => {
  const ReactRuntime = jest.requireActual<typeof React>('react');
  const Button = ({ children, loading: _loading, ...props }: MockButtonProps) =>
    ReactRuntime.createElement('button', props, children);
  return { __esModule: true, default: Button };
});

jest.mock('@ant-design/icons', () => ({
  SendOutlined: () => React.createElement('span'),
  MessageOutlined: () => React.createElement('span'),
  ClockCircleOutlined: () => React.createElement('span'),
  StopOutlined: () => React.createElement('span'),
  FullscreenOutlined: () => React.createElement('span'),
  FullscreenExitOutlined: () => React.createElement('span'),
}));

import AIChatPanel from '../AIChatPanel';

global.fetch = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@example.com' }, loading: false }),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: (() => {
    const value = { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() };
    return () => value;
  })(),
}));

jest.mock('@/contexts/ViewportContext', () => ({
  useViewport: () => ({ isMobile: false, isTablet: false }),
}));

const mockHistory = (messages: readonly object[] = []) => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ conversation: { messages } }),
  });
};

describe('AIChatPanel', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('renders a new-conversation welcome message after an empty history loads', async () => {
    mockHistory();

    render(<AIChatPanel projectId="test-project" workflowStep={1} />);

    expect(await screen.findByText(/Let's work on Discovery/)).toBeInTheDocument();
  });

  it('shows different suggestions for different workflow steps', async () => {
    mockHistory();

    render(<AIChatPanel projectId="test-project" workflowStep={2} />);

    expect(await screen.findByText('List MVP features')).toBeInTheDocument();
    expect(screen.getByText('Describe key user flows')).toBeInTheDocument();
  });

  it('surfaces history failures and disables sending', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 });

    render(<AIChatPanel projectId="test-project" workflowStep={1} />);

    await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(0));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load conversation history');
    const input = screen.getByPlaceholderText('Type your message...');
    expect(input).toBeDisabled();
  });

  it('rejects malformed history items and disables sending', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ conversation: { messages: [{ role: 'assistant', content: 'invalid' }] } }),
    });

    render(<AIChatPanel projectId="test-project" workflowStep={1} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load conversation history');
    expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled();
  });

  it('allows sending after history has loaded', async () => {
    mockHistory();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: jest
            .fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"content":"Reply"}\\n\\n') })
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: [DONE]\\n\\n') })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    });

    render(<AIChatPanel projectId="test-project" workflowStep={1} />);
    const input = await screen.findByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument());
  });

  it('retries a failed stream without duplicating the user message', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conversation: { messages: [] } }),
      })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: Buffer.from('data: {"content":"Recovered"}\n\ndata: [DONE]\n\n'),
              })
              .mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      });

    render(<AIChatPanel projectId="test-project" workflowStep={1} />);
    const input = await screen.findByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Retry me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByTestId('ai-error-message')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect((global.fetch as jest.Mock).mock.calls).toHaveLength(3));

    await waitFor(() => expect(screen.getAllByTestId('ai-response').at(-1)).toHaveTextContent('Recovered'));
    expect(screen.getAllByTestId('user-message')).toHaveLength(1);
    expect(screen.getAllByTestId('ai-response').filter((element) => element.textContent === 'Recovered')).toHaveLength(1);
    expect((global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).includes('/chat/stream')).length).toBe(2);
  });

  it('keeps local history when clearing fails', async () => {
    const history = {
      ok: true,
      json: async () => ({
        conversation: {
          messages: [{ id: 'message-1', role: 'assistant', content: 'Persisted', timestamp: '2026-08-04T00:00:00.000Z' }],
        },
      }),
    };
    (global.fetch as jest.Mock).mockImplementation((_: unknown, options?: RequestInit) =>
      options?.method === 'DELETE' ? Promise.resolve({ ok: false, status: 500 }) : Promise.resolve(history),
    );
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AIChatPanel projectId="test-project" workflowStep={1} />);
    expect(await screen.findByText('Persisted')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => expect(screen.getByText('Persisted')).toBeInTheDocument());
  });
});
