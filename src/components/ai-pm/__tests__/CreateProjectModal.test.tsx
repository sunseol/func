import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CreateProjectModal from '../CreateProjectModal';

// Mock contexts
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn()
  })
}));

// Mock fetch
global.fetch = jest.fn();

describe('CreateProjectModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders modal when open', () => {
    render(<CreateProjectModal {...defaultProps} />);

    expect(screen.getByText('새 프로젝트 생성')).toBeInTheDocument();
    expect(screen.getByLabelText('프로젝트 이름')).toBeInTheDocument();
    expect(screen.getByLabelText('프로젝트 설명')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CreateProjectModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('새 프로젝트 생성')).not.toBeInTheDocument();
  });

  it('handles form input changes', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal {...defaultProps} />);

    const nameInput = screen.getByLabelText('프로젝트 이름');
    const descriptionInput = screen.getByLabelText('프로젝트 설명');

    await user.type(nameInput, 'Test Project');
    await user.type(descriptionInput, 'Test Description');

    expect(nameInput).toHaveValue('Test Project');
    expect(descriptionInput).toHaveValue('Test Description');
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal {...defaultProps} />);

    const submitButton = screen.getByText('생성');
    await user.click(submitButton);

    expect(screen.getByText('프로젝트 이름을 입력해주세요.')).toBeInTheDocument();
  });

  it('validates name length', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal {...defaultProps} />);

    const nameInput = screen.getByLabelText('프로젝트 이름');
    await user.type(nameInput, 'a'.repeat(256)); // Exceeds max length

    const submitButton = screen.getByText('생성');
    await user.click(submitButton);

    expect(screen.getByText('프로젝트 이름은 255자를 초과할 수 없습니다.')).toBeInTheDocument();
  });

  it('validates description length', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal {...defaultProps} />);

    const nameInput = screen.getByLabelText('프로젝트 이름');
    const descriptionInput = screen.getByLabelText('프로젝트 설명');

    await user.type(nameInput, 'Test Project');
    await user.type(descriptionInput, 'a'.repeat(2001)); // Exceeds max length

    const submitButton = screen.getByText('생성');
    await user.click(submitButton);

    expect(screen.getByText('프로젝트 설명은 2000자를 초과할 수 없습니다.')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const mockProject = {
      id: 'test-project-id',
      name: 'Test Project',
      description: 'Test Description',
      created_at: new Date().toISOString(),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ project: mockProject }),
    });

    render(<CreateProjectModal {...defaultProps} />);

    const nameInput = screen.getByLabelText('프로젝트 이름');
    const descriptionInput = screen.getByLabelText('프로젝트 설명');
    const submitButton = screen.getByText('생성');

    await user.type(nameInput, 'Test Project');
    await user.type(descriptionInput, 'Test Description');
    await user.click(submitButton);

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

    expect(mockOnSuccess).toHaveBeenCalledWith(mockProject);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles API errors', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Server error' }),
    });

    render(<CreateProjectModal {...defaultProps} />);

    const nameInput = screen.getByLabelText('프로젝트 이름');
    const submitButton = screen.getByText('생성');

    await user.type(nameInput, 'Test Project');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<CreateProjectModal {...defaultProps} />);

    const nameInput = screen.getByLabelText('프로젝트 이름');
    const submitButton = screen.getByText('생성');

    await user.type(nameInput, 'Test Project');
    await user.click(submitButton);

    expect(screen.getByText('생성 중...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal {...defaultProps} />);

    const cancelButton = screen.getByText('취소');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal {...defaultProps} />);

    const overlay = screen.getByTestId('modal-overlay');
    await user.click(overlay);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not close modal when modal content is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal {...defaultProps} />);

    const modalContent = screen.getByTestId('modal-content');
    await user.click(modalContent);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('handles escape key press', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal {...defaultProps} />);

    await user.keyboard('{Escape}');

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('focuses on name input when modal opens', () => {
    render(<CreateProjectModal {...defaultProps} />);

    const nameInput = screen.getByLabelText('프로젝트 이름');
    expect(nameInput).toHaveFocus();
  });

  it('resets form when modal closes and reopens', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CreateProjectModal {...defaultProps} />);

    const nameInput = screen.getByLabelText('프로젝트 이름');
    await user.type(nameInput, 'Test Project');

    // Close modal
    rerender(<CreateProjectModal {...defaultProps} isOpen={false} />);

    // Reopen modal
    rerender(<CreateProjectModal {...defaultProps} isOpen={true} />);

    const newNameInput = screen.getByLabelText('프로젝트 이름');
    expect(newNameInput).toHaveValue('');
  });

  it('handles network errors', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<CreateProjectModal {...defaultProps} />);

    const nameInput = screen.getByLabelText('프로젝트 이름');
    const submitButton = screen.getByText('생성');

    await user.type(nameInput, 'Test Project');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('프로젝트 생성 중 오류가 발생했습니다.')).toBeInTheDocument();
    });
  });

  it('trims whitespace from inputs', async () => {
    const user = userEvent.setup();
    const mockProject = {
      id: 'test-project-id',
      name: 'Test Project',
      description: 'Test Description',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ project: mockProject }),
    });

    render(<CreateProjectModal {...defaultProps} />);

    const nameInput = screen.getByLabelText('프로젝트 이름');
    const descriptionInput = screen.getByLabelText('프로젝트 설명');
    const submitButton = screen.getByText('생성');

    await user.type(nameInput, '  Test Project  ');
    await user.type(descriptionInput, '  Test Description  ');
    await user.click(submitButton);

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
  });
});