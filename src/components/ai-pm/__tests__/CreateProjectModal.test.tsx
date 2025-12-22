import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CreateProjectModal from '../CreateProjectModal';

describe('CreateProjectModal', () => {
  const onClose = jest.fn();
  const onSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders when open and focuses name input', async () => {
    render(<CreateProjectModal isOpen onClose={onClose} onSuccess={onSuccess} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('새 프로젝트 생성')).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/프로젝트 이름/);
    expect(nameInput).toBeInTheDocument();

    await waitFor(() => {
      expect(nameInput).toHaveFocus();
    });
  });

  it('does not render when closed', () => {
    render(<CreateProjectModal isOpen={false} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes via overlay, cancel, and escape', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal isOpen onClose={onClose} onSuccess={onSuccess} />);

    await user.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('validates required name on submit', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal isOpen onClose={onClose} onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: '프로젝트 생성' }));
    expect(screen.getByText('프로젝트 이름을 입력해주세요.')).toBeInTheDocument();
  });

  it('submits trimmed inputs and calls onSuccess', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ project: { id: 'p1' } }),
    });

    render(<CreateProjectModal isOpen onClose={onClose} onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/프로젝트 이름/), '  Test Project  ');
    await user.type(screen.getByLabelText(/프로젝트 설명/), '  Test Description  ');
    await user.click(screen.getByRole('button', { name: '프로젝트 생성' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai-pm/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Project',
          description: 'Test Description',
        }),
      });
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows API error message', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Server error' }),
    });

    render(<CreateProjectModal isOpen onClose={onClose} onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/프로젝트 이름/), 'Test Project');
    await user.click(screen.getByRole('button', { name: '프로젝트 생성' }));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});

