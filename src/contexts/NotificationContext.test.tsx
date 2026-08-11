import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationProvider, useNotification } from './NotificationContext';

type QueryResult = { data: unknown; error: Error | null };
type QueryBuilder = {
  select: jest.Mock<QueryBuilder, [columns?: string]>;
  eq: jest.Mock<QueryBuilder, [column: string, value: string | boolean]>;
  order: jest.Mock<QueryBuilder, [column: string, options: { ascending: boolean }]>;
  limit: jest.Mock<QueryBuilder, [count: number]>;
  upsert: jest.Mock<QueryBuilder, [values: Record<string, unknown>, options: { onConflict: string }]>;
  update: jest.Mock<QueryBuilder, [values: Record<string, unknown>]>;
  maybeSingle: () => Promise<QueryResult>;
  single: () => Promise<QueryResult>;
  then: PromiseLike<QueryResult>['then'];
};

type MockClient = { from: jest.Mock<QueryBuilder, [string]> };

const mockUser = { id: 'notification-owner', email: 'owner@example.com' };
let mockClient: MockClient;
let authUser: typeof mockUser | null = mockUser;

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: authUser }),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockClient),
}));

function makeBuilder(result: QueryResult): QueryBuilder {
  let builder: QueryBuilder;
  builder = {
    select: jest.fn((_columns?: string) => builder),
    eq: jest.fn((_column: string, _value: string | boolean) => builder),
    order: jest.fn((_column: string, _options: { ascending: boolean }) => builder),
    limit: jest.fn((_count: number) => builder),
    upsert: jest.fn((_values: Record<string, unknown>, _options: { onConflict: string }) => builder),
    update: jest.fn((_values: Record<string, unknown>) => builder),
    maybeSingle: jest.fn(async () => result),
    single: jest.fn(async () => result),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  } as QueryBuilder;
  return builder;
}

function configureClient(settings: QueryResult, history: QueryResult, settingsWrite = settings): void {
  const settingsBuilder = makeBuilder(settings);
  settingsBuilder.single = jest.fn(async () => settingsWrite);
  const historyBuilder = makeBuilder(history);
  mockClient = {
    from: jest.fn((table: string) => (table === 'notification_settings' ? settingsBuilder : historyBuilder)),
  };
}

function Probe() {
  const { settings, notifications, loadError, updateSettings, markAsRead } = useNotification();
  return (
    <div>
      <output data-testid="settings-state">{settings ? settings.morning_reminder_enabled.toString() : 'none'}</output>
      <output data-testid="notification-state">{notifications.length}</output>
      <output data-testid="load-error">{loadError ?? ''}</output>
      <button onClick={() => updateSettings({ morning_reminder_enabled: false, user_id: 'other-user' })}>update</button>
      <button onClick={() => markAsRead('owned-notification')}>mark</button>
    </div>
  );
}

const existingSettings = {
  id: 'settings-1',
  user_id: mockUser.id,
  morning_reminder_enabled: false,
  morning_reminder_time: '09:00:00',
  evening_reminder_enabled: true,
  evening_reminder_time: '18:00:00',
  weekend_reminders: false,
  email_notifications: false,
  browser_notifications: true,
  created_at: '2026-08-12T00:00:00.000Z',
  updated_at: '2026-08-12T00:00:00.000Z',
};

const existingNotification = {
  id: 'owned-notification',
  user_id: mockUser.id,
  notification_type: 'e2e',
  title: 'Owned notification',
  message: 'Only the owner can update this row.',
  is_read: false,
  sent_at: '2026-08-12T00:00:00.000Z',
};

describe('NotificationProvider recovery and ownership', () => {
  beforeEach(() => {
    authUser = mockUser;
    configureClient(
      { data: existingSettings, error: null },
      { data: [existingNotification], error: null },
    );
  });

  it('loads an existing settings row and history for the signed-in owner', async () => {
    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('settings-state').textContent).toBe('false'));
    expect(screen.getByTestId('notification-state').textContent).toBe('1');
    expect(screen.getByTestId('load-error').textContent).toBe('');
  });

  it('reflects a settings toggle before the persistence response resolves', async () => {
    const initialSettings = { ...existingSettings, morning_reminder_enabled: true };
    let resolveWrite: ((value: QueryResult) => void) | undefined;
    const pendingWrite = new Promise<QueryResult>((resolve) => {
      resolveWrite = resolve;
    });
    const settingsBuilder = makeBuilder({ data: initialSettings, error: null });
    settingsBuilder.single = jest.fn(() => pendingWrite);
    const historyBuilder = makeBuilder({ data: [], error: null });
    mockClient = {
      from: jest.fn((table: string) => (table === 'notification_settings' ? settingsBuilder : historyBuilder)),
    };

    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('settings-state').textContent).toBe('true'));
    fireEvent.click(screen.getByRole('button', { name: 'update' }));

    await waitFor(() => expect(screen.getByTestId('settings-state').textContent).toBe('false'));
    await act(async () => {
      resolveWrite?.({ data: { ...initialSettings, morning_reminder_enabled: false }, error: null });
    });
  });

  it('creates missing settings before exposing the default row', async () => {
    const created = { ...existingSettings, id: 'created-settings', morning_reminder_enabled: true };
    configureClient({ data: null, error: null }, { data: [], error: null }, { data: created, error: null });

    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('settings-state').textContent).toBe('true'));
    expect(mockClient.from).toHaveBeenCalledWith('notification_settings');
  });

  it('keeps usable defaults and a visible recovery error when settings queries fail', async () => {
    configureClient(
      { data: null, error: new Error('RLS select denied') },
      { data: [], error: null },
      { data: null, error: new Error('RLS upsert denied') },
    );

    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('settings-state').textContent).toBe('true'));
    expect(screen.getByTestId('load-error').textContent).toContain('기본 설정을 표시합니다');
  });

  it('keeps settings visible when history query fails', async () => {
    const settingsBuilder = makeBuilder({ data: existingSettings, error: null });
    const historyBuilder = makeBuilder({ data: null, error: new Error('history denied') });
    mockClient = {
      from: jest.fn((table: string) => (table === 'notification_settings' ? settingsBuilder : historyBuilder)),
    };

    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('settings-state').textContent).toBe('false'));
    expect(screen.getByTestId('notification-state').textContent).toBe('0');
    expect(screen.getByTestId('load-error').textContent).toContain('알림 이력을 불러오지 못했습니다');
  });

  it('scopes settings and history writes to the signed-in owner', async () => {
    const settingsBuilder = makeBuilder({ data: existingSettings, error: null });
    const historyBuilder = makeBuilder({ data: [existingNotification], error: null });
    mockClient = {
      from: jest.fn((table: string) => (table === 'notification_settings' ? settingsBuilder : historyBuilder)),
    };

    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('settings-state').textContent).toBe('false'));
    fireEvent.click(screen.getByRole('button', { name: 'update' }));
    fireEvent.click(screen.getByRole('button', { name: 'mark' }));

    await waitFor(() => expect(settingsBuilder.upsert).toHaveBeenCalled());
    expect(settingsBuilder.upsert.mock.calls[0]?.[0]).toMatchObject({ user_id: mockUser.id });
    expect(historyBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
  });
});
