import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DocumentEditor from '../DocumentEditor';
import { mockProject, mockDocument, mockUser } from '@/lib/test-utils';

// Mock MDEditor
jest.mock('@uiw/react-md-editor', () => {
  return {
    __esModule: true,
    default: ({ value, onChange, preview }: any) => (
      <div data-testid="md-editor">
        <textarea
          data-testid="md-editor-textarea"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
        {preview === 'preview' && (
          <div data-testid="md-editor-preview">{value}</div>
        )}
      </div>
    ),
  };
});

// Mock contexts
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false
  })
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn()
  })
}));

// Mock document manager hook
const mockDocumentManager = {
  document: mockDocument,
  isLoading: false,
  isSaving: false,
  isGenerating: false,
  error: null,
  hasUnsavedChanges: false,
  lastSaved: new Date(),
};

const mockDocumentActions = {
  loadDocument: jest.fn(),
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
  generateDocument: jest.fn(),
  changeStatus: jest.fn(),
  deleteDocument: jest.fn(),
  saveChanges: jest.fn(),
  markAsChanged: jest.fn(),
  clearError: jest.fn(),
  requestApproval: jest.fn(),
  approveDocument: jest.fn(),
  rejectDocument: jest.fn(),
  getApprovalHistory: jest.fn(),
};

jest.mock('@/lib/ai-pm/hooks/useDocumentManager', () => ({
  useDocumentManager: () => [mockDocumentManager, mockDocumentActions]
}));

describe('DocumentEditor', () => {
  const defaultProps = {
    projectId: mockProject.id,
    workflowStep: 1 as const,
    isReadOnly: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders document editor with content', () => {
    render(<DocumentEditor {...defaultProps} />);

    expect(screen.getByTestId('md-editor')).toBeInTheDocument();
    expect(screen.getByTestId('md-editor-textarea')).toHaveValue(mockDocument.content);
  });

  it('shows loading state when document is loading', () => {
    jest.mocked(require('@/lib/ai-pm/hooks/useDocumentManager').useDocumentManager)
      .mockReturnValue([
        { ...mockDocumentManager, isLoading: true },
        mockDocumentActions
      ]);

    render(<DocumentEditor {...defaultProps} />);

    expect(screen.getByText('문서를 불러오는 중...')).toBeInTheDocument();
  });

  it('shows saving indicator when document is being saved', () => {
    jest.mocked(require('@/lib/ai-pm/hooks/useDocumentManager').useDocumentManager)
      .mockReturnValue([
        { ...mockDocumentManager, isSaving: true },
        mockDocumentActions
      ]);

    render(<DocumentEditor {...defaultProps} />);

    expect(screen.getByText('저장 중...')).toBeInTheDocument();
  });

  it('handles content changes', async () => {
    const user = userEvent.setup();
    render(<DocumentEditor {...defaultProps} />);

    const textarea = screen.getByTestId('md-editor-textarea');
    await user.clear(textarea);
    await user.type(textarea, 'New content');

    expect(mockDocumentActions.markAsChanged).toHaveBeenCalled();
  });

  it('saves document when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<DocumentEditor {...defaultProps} />);

    const saveButton = screen.getByText('저장');
    await user.click(saveButton);

    expect(mockDocumentActions.saveChanges).toHaveBeenCalledWith(
      mockDocument.content,
      mockDocument.title
    );
  });

  it('requests approval when approval button is clicked', async () => {
    const user = userEvent.setup();
    render(<DocumentEditor {...defaultProps} />);

    const approvalButton = screen.getByText('승인 요청');
    await user.click(approvalButton);

    expect(mockDocumentActions.requestApproval).toHaveBeenCalled();
  });

  it('shows read-only mode when isReadOnly is true', () => {
    render(<DocumentEditor {...defaultProps} isReadOnly={true} />);

    expect(screen.queryByText('저장')).not.toBeInTheDocument();
    expect(screen.queryByText('승인 요청')).not.toBeInTheDocument();
  });

  it('displays error message when there is an error', () => {
    jest.mocked(require('@/lib/ai-pm/hooks/useDocumentManager').useDocumentManager)
      .mockReturnValue([
        { ...mockDocumentManager, error: 'Test error message' },
        mockDocumentActions
      ]);

    render(<DocumentEditor {...defaultProps} />);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('shows unsaved changes indicator', () => {
    jest.mocked(require('@/lib/ai-pm/hooks/useDocumentManager').useDocumentManager)
      .mockReturnValue([
        { ...mockDocumentManager, hasUnsavedChanges: true },
        mockDocumentActions
      ]);

    render(<DocumentEditor {...defaultProps} />);

    expect(screen.getByText('저장되지 않은 변경사항이 있습니다')).toBeInTheDocument();
  });

  it('toggles between edit and preview modes', async () => {
    const user = userEvent.setup();
    render(<DocumentEditor {...defaultProps} />);

    const previewButton = screen.getByText('미리보기');
    await user.click(previewButton);

    expect(screen.getByTestId('md-editor-preview')).toBeInTheDocument();

    const editButton = screen.getByText('편집');
    await user.click(editButton);

    expect(screen.getByTestId('md-editor-textarea')).toBeInTheDocument();
  });

  it('handles document generation', async () => {
    const user = userEvent.setup();
    render(<DocumentEditor {...defaultProps} />);

    const generateButton = screen.getByText('AI 문서 생성');
    await user.click(generateButton);

    expect(mockDocumentActions.generateDocument).toHaveBeenCalled();
  });

  it('shows generating state during AI document generation', () => {
    jest.mocked(require('@/lib/ai-pm/hooks/useDocumentManager').useDocumentManager)
      .mockReturnValue([
        { ...mockDocumentManager, isGenerating: true },
        mockDocumentActions
      ]);

    render(<DocumentEditor {...defaultProps} />);

    expect(screen.getByText('AI가 문서를 생성하는 중...')).toBeInTheDocument();
  });

  it('displays last saved time', () => {
    const lastSaved = new Date('2024-01-01T12:00:00Z');
    jest.mocked(require('@/lib/ai-pm/hooks/useDocumentManager').useDocumentManager)
      .mockReturnValue([
        { ...mockDocumentManager, lastSaved },
        mockDocumentActions
      ]);

    render(<DocumentEditor {...defaultProps} />);

    expect(screen.getByText(/마지막 저장:/)).toBeInTheDocument();
  });

  it('handles keyboard shortcuts', async () => {
    const user = userEvent.setup();
    render(<DocumentEditor {...defaultProps} />);

    const textarea = screen.getByTestId('md-editor-textarea');
    await user.click(textarea);
    await user.keyboard('{Control>}s{/Control}');

    expect(mockDocumentActions.saveChanges).toHaveBeenCalled();
  });

  it('shows document status badge', () => {
    render(<DocumentEditor {...defaultProps} />);

    expect(screen.getByText('초안')).toBeInTheDocument();
  });

  it('handles document deletion', async () => {
    const user = userEvent.setup();
    render(<DocumentEditor {...defaultProps} />);

    const deleteButton = screen.getByText('삭제');
    await user.click(deleteButton);

    // Should show confirmation dialog
    expect(screen.getByText('정말로 이 문서를 삭제하시겠습니까?')).toBeInTheDocument();

    const confirmButton = screen.getByText('확인');
    await user.click(confirmButton);

    expect(mockDocumentActions.deleteDocument).toHaveBeenCalled();
  });
});