import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentEditor from '../DocumentEditor';
import type { PlanningDocumentWithUsers } from '@/types/ai-pm';

let mockProfileRole: 'admin' | 'user' = 'admin';
const mockSuccess = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    profile: {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: mockProfileRole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    loading: false,
  }),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    success: mockSuccess,
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
  const baseDocument: PlanningDocumentWithUsers = {
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
    mockProfileRole = 'admin';
  });

  it('renders document title and preview content', () => {
    render(
      <DocumentEditor
        projectId="project-1"
        workflowStep={1}
        document={baseDocument}
        onSave={async (content) => ({ ...baseDocument, content })}
        onStatusChange={async () => {}}
        onDelete={async () => {}}
      />
    );

    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.getByText(/World/)).toBeInTheDocument();
  });

  it('does not render executable markup from stored document content', () => {
    render(
      <DocumentEditor
        projectId="project-1"
        workflowStep={1}
        document={{
          ...baseDocument,
          content: '<img src=x onerror="alert(1)"><script>alert(2)</script><strong>Safe</strong>',
        }}
        onSave={async (content) => ({ ...baseDocument, content })}
        onStatusChange={async () => {}}
        onDelete={async () => {}}
      />
    );

    expect(document.querySelector('script')).not.toBeInTheDocument();
    expect(document.querySelector('[onerror]')).not.toBeInTheDocument();
    expect(screen.getByText('Safe')).toBeInTheDocument();
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
        document={baseDocument}
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
      expect(mockSuccess).toHaveBeenCalledTimes(1);
      expect(mockSuccess).toHaveBeenCalledWith('문서 저장 완료', '변경사항이 성공적으로 저장되었습니다.');
    });
  });

  it('exposes a unique accessible name for the edit action', () => {
    render(
      <DocumentEditor
        projectId="project-1"
        workflowStep={1}
        document={baseDocument}
        onSave={async (content) => ({ ...baseDocument, content })}
        onStatusChange={async () => {}}
        onDelete={async () => {}}
      />
    );

    expect(screen.getByRole('button', { name: /^문서 편집$/ })).toBeInTheDocument();
  });

  it('offers approval request for a private document without exposing direct approval', () => {
    render(
      <DocumentEditor
        projectId="project-1"
        workflowStep={1}
        document={baseDocument}
        onSave={async (content) => ({ ...baseDocument, content })}
        onStatusChange={async () => {}}
        onDelete={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '개인 문서' }));

    expect(screen.getByRole('button', { name: '승인 요청' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '공식 문서' })).not.toBeInTheDocument();
  });

  it('offers official demotion only to the admin and never exposes official approval', () => {
    render(
      <DocumentEditor
        projectId="project-1"
        workflowStep={1}
        document={{ ...baseDocument, status: 'official' }}
        onSave={async (content) => ({ ...baseDocument, content, status: 'official' })}
        onStatusChange={async () => {}}
        onDelete={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '공식 문서' }));

    expect(screen.getByRole('button', { name: '개인 문서로 되돌리기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '승인 요청' })).not.toBeInTheDocument();
  });

  it('offers only withdrawal for a pending owner document', async () => {
    const onStatusChange = jest.fn(async () => {});

    render(
      <DocumentEditor
        projectId="project-1"
        workflowStep={1}
        document={{ ...baseDocument, status: 'pending_approval' }}
        onSave={async (content) => ({ ...baseDocument, content, status: 'pending_approval' })}
        onStatusChange={onStatusChange}
        onDelete={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '승인 대기' }));

    expect(screen.getByRole('button', { name: '개인 문서로 되돌리기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '공식 문서' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '개인 문서로 되돌리기' }));
    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith('private'));
  });

  it('does not expose official demotion to a non-admin owner', () => {
    mockProfileRole = 'user';

    render(
      <DocumentEditor
        projectId="project-1"
        workflowStep={1}
        document={{ ...baseDocument, status: 'official' }}
        onSave={async (content) => ({ ...baseDocument, content, status: 'official' })}
        onStatusChange={async () => {}}
        onDelete={async () => {}}
      />
    );

    expect(screen.getByTestId('document-status')).toHaveTextContent('공식 문서');
    expect(screen.queryByRole('button', { name: '공식 문서' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '개인 문서로 되돌리기' })).not.toBeInTheDocument();

  });
});
