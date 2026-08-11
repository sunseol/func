import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AIPMPage from '../page';
import { getDocumentStatusAction } from '@/lib/ai-pm/document-status-action';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', user_metadata: { role: 'user' } } }),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn() }),
}));

jest.mock('@/contexts/ViewportContext', () => ({
  useViewport: () => ({ isMobile: false }),
}));

jest.mock('@/components/ai-pm/ProjectCard', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/ui/LoadingSkeletons', () => ({
  __esModule: true,
  default: { Modal: () => null, MobileModal: () => null },
}));

describe('AI-PM dashboard metrics', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('counts official documents and only valid activity from the last seven days', async () => {
    const now = Date.parse('2026-08-04T00:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        projects: [
          { id: 'recent', name: 'Recent', description: null, created_by: 'u1', created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z', creator_email: 'u1@example.com', creator_name: 'User 1', member_count: 1, official_documents_count: 2, user_role: 'service_planning', last_activity: '2026-08-02T00:00:00.000Z' },
          { id: 'old', name: 'Old', description: null, created_by: 'u1', created_at: '2026-07-01T00:00:00.000Z', updated_at: '2026-07-01T00:00:00.000Z', creator_email: 'u1@example.com', creator_name: 'User 1', member_count: 1, official_documents_count: 1, user_role: 'service_planning', last_activity: '2026-07-20T00:00:00.000Z' },
          { id: 'boundary', name: 'Boundary', description: null, created_by: 'u1', created_at: '2026-07-28T00:00:00.000Z', updated_at: '2026-07-28T00:00:00.000Z', creator_email: 'u1@example.com', creator_name: 'User 1', member_count: 1, official_documents_count: 0, user_role: 'service_planning', last_activity: '2026-07-28T00:00:00.000Z' },
          { id: 'before-boundary', name: 'Before boundary', description: null, created_by: 'u1', created_at: '2026-07-27T23:59:59.999Z', updated_at: '2026-07-27T23:59:59.999Z', creator_email: 'u1@example.com', creator_name: 'User 1', member_count: 1, official_documents_count: 0, user_role: 'service_planning', last_activity: '2026-07-27T23:59:59.999Z' },
          { id: 'future', name: 'Future', description: null, created_by: 'u1', created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z', creator_email: 'u1@example.com', creator_name: 'User 1', member_count: 1, official_documents_count: 0, user_role: 'service_planning', last_activity: '2026-08-05T00:00:00.000Z' },
          { id: 'invalid', name: 'Invalid', description: null, created_by: 'u1', created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z', creator_email: 'u1@example.com', creator_name: 'User 1', member_count: 1, official_documents_count: 4, user_role: 'service_planning', last_activity: 'not-a-date' },
          { id: 'missing', name: 'Missing', description: null, created_by: 'u1', created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z', creator_email: 'u1@example.com', creator_name: 'User 1', member_count: 1, official_documents_count: 3, user_role: 'service_planning', last_activity: null },
        ],
      }),
    });

    render(<AIPMPage />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const activityLabel = screen.getByText('최근 7일 활동');
      expect(activityLabel.parentElement?.querySelector('p.text-lg')?.textContent).toBe('2');
      const documentsLabel = screen.getByText('공식 문서');
      expect(documentsLabel.parentElement?.querySelector('p.text-lg')?.textContent).toBe('10');
      const activeLabel = screen.getByText('진행 중');
      expect(activeLabel.parentElement?.querySelector('p.text-lg')?.textContent).toBe('4');
    });
  });

  it('selects dedicated status routes and rejects unsupported transitions', () => {
    expect(getDocumentStatusAction('private', 'pending_approval')).toBe('request-approval');
    expect(getDocumentStatusAction('pending_approval', 'official')).toBe('approve');
    expect(getDocumentStatusAction('pending_approval', 'private')).toBe('withdraw-approval');
    expect(getDocumentStatusAction('official', 'private')).toBe('update');
    expect(getDocumentStatusAction('private', 'official')).toBeNull();
    expect(getDocumentStatusAction('official', 'pending_approval')).toBeNull();
  });
});
