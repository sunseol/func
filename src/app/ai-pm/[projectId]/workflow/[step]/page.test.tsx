import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowStepPage from './page';

jest.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'project-1', step: '6' }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn() }),
  useApiError: () => ({ handleApiError: jest.fn() }),
}));

jest.mock('@/contexts/ViewportContext', () => ({
  useViewport: () => ({ isMobile: true, isTablet: false }),
}));

jest.mock('@/components/ai-pm/WorkflowSidebar', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ai-pm/WorkflowGuide', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ai-pm/DocumentEditor', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ai-pm/AIChatPanel', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ai-pm/DocumentManager', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ai-pm/ConversationHistoryPanel', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ai-pm/MobileBottomSheet', () => ({ __esModule: true, default: () => null }));

describe('workflow mobile navigation', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        project: { id: 'project-1', name: 'Project', description: null },
        members: [],
        progress: [],
      }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps tab labels on one line and gives step links a 44px target', async () => {
    render(<WorkflowStepPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /문서 편집기/ })).toBeInTheDocument());

    for (const label of [/문서 편집기/, /AI 어시스턴트/, /워크플로우 가이드/]) {
      expect(screen.getByRole('button', { name: label })).toHaveClass('shrink-0', 'whitespace-nowrap', 'min-h-[44px]');
    }

    expect(screen.getByTestId('workflow-step-6')).toHaveClass('min-h-[44px]', 'whitespace-nowrap');
  });

  it('uses a 6px mobile tab gap so all three tabs fit within a 390px viewport', async () => {
    render(<WorkflowStepPage />);

    await waitFor(() => expect(screen.getByTestId('mobile-workflow-tabs')).toBeInTheDocument());

    expect(screen.getByTestId('mobile-workflow-tabs')).toHaveClass('space-x-[6px]', 'overflow-x-auto');
  });
});
