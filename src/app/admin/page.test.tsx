import { App as AntApp } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import AdminPage from './page';
import { persistUserRole } from './role-update';

jest.mock('@/contexts/AuthContext', () => {
  const user = {
      id: 'admin-user',
      email: 'admin-pii-sentinel@example.com',
      user_metadata: { full_name: 'ADMIN_METADATA_SENTINEL', role: 'admin' },
      created_at: '2025-01-01T00:00:00.000Z',
      last_sign_in_at: '2025-01-02T00:00:00.000Z',
  };
  return {
    useAuth: () => ({
      user,
      profile: { role: 'admin' },
      isAdmin: true,
      loading: false,
    }),
  };
});

jest.mock('@/app/components/ThemeProvider', () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

jest.mock('@/app/components/ReportSummary', () => function MockReportSummary() {
  return <div>Report summary</div>;
});
jest.mock('@/app/components/AdminAIAssistant', () => function MockAdminAIAssistant() {
  return <div>AI assistant</div>;
});

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      void table;
      return query;
    },
  })),
}));

describe('AdminPage privacy boundary', () => {
  it('does not log authenticated email or user metadata during admin load', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      render(
        <AntApp>
          <AdminPage />
        </AntApp>,
      );

      await waitFor(() => expect(screen.getByText('관리자 대시보드')).toBeInTheDocument());

      const logOutput = logSpy.mock.calls
        .flatMap((args) => args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg) ?? '')))
        .join('\n');
      expect(logOutput).not.toContain('admin-pii-sentinel@example.com');
      expect(logOutput).not.toContain('ADMIN_METADATA_SENTINEL');
    } finally {
      logSpy.mockRestore();
    }
  });
});

describe('persistUserRole', () => {
  it('requires the database response to confirm the requested role', async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: 'user-1', role: 'admin' },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const eq = jest.fn(() => ({ select }));
    const update = jest.fn(() => ({ eq }));
    const client = { from: jest.fn(() => ({ update })) };

    await expect(persistUserRole(client, 'user-1', 'admin')).resolves.toEqual({
      id: 'user-1',
      role: 'admin',
    });
    expect(update).toHaveBeenCalledWith({
      role: 'admin',
      updated_at: expect.any(String),
    });
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
    expect(select).toHaveBeenCalledWith('id, role');
  });

  it('rejects a successful PATCH that does not return the requested role', async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: 'user-1', role: 'user' },
      error: null,
    });
    const client = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({ single })),
          })),
        })),
      })),
    };

    await expect(persistUserRole(client, 'user-1', 'admin')).rejects.toThrow(
      'Database did not confirm the requested role change.',
    );
  });
});
