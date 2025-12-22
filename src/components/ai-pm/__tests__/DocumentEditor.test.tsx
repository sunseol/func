import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentEditor from '../DocumentEditor';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    profile: {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    loading: false,
  }),
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

jest.mock('@/hooks/useKeyboardAvoidance', () => ({
  useKeyboardAvoidance: () => ({
    keyboardState: { isVisible: false, height: 0 },
    getSafeAreaStyles: () => ({}),
  }),
}));

describe('DocumentEditor', () => {
  const baseDocument = {
    id: 'doc-1',
    project_id: 'project-1',
    workflow_step: 1 as const,
    title: 'Test Document',
    content: '# Hello\n\nWorld',
    status: 'private' as const,
    version: 1,
    created_by: 'user-123',
    approved_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    approved_at: null,
    creator_email: 'test@example.com',
    creator_name: 'Test User',
    approver_email: null,
    approver_name: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders document title and preview content', () => {
    render(
      <DocumentEditor
        projectId="project-1"
        workflowStep={1}
        document={baseDocument as any}
        onSave={async (content) => ({ ...baseDocument, content } as any)}
        onStatusChange={async () => {}}
        onDelete={async () => {}}
      />
    );

    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.getByText(/World/)).toBeInTheDocument();
  });

  it('toggles edit mode and saves changes', async () => {
    const onSave = jest.fn(async (content: string, title?: string) => ({
      ...baseDocument,
      content,
      title: title ?? baseDocument.title,
      version: 2,
    }));

    render(
      <DocumentEditor
        projectId="project-1"
        workflowStep={1}
        document={baseDocument as any}
        onSave={onSave}
        onStatusChange={async () => {}}
        onDelete={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /편집|Edit/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('textbox').length).toBeGreaterThan(1);
    });
    const textboxes = screen.getAllByRole('textbox');
    const contentTextarea = textboxes[textboxes.length - 1];
    fireEvent.change(contentTextarea, { target: { value: '# Hello\n\nWorld!!' } });

    fireEvent.click(screen.getByRole('button', { name: /완료|Done/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('# Hello\n\nWorld!!', 'Test Document');
    });
  });
});
