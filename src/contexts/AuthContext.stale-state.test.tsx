import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

type AuthEventSession = { user: { id: string; email: string } } | null;
type AuthEventCallback = (event: 'SIGNED_OUT' | 'SIGNED_IN', session: AuthEventSession) => unknown;
type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
};
type Membership = { project_id: string; role: 'owner' | 'member' | 'viewer'; added_at: string };

function deferred<T>() {
  let resolvePromise = (_value: T): void => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolvePromise = promiseResolve;
  });
  return { promise, resolve: (value: T) => resolvePromise(value) };
}

const mockAuthEventCallback: { current: AuthEventCallback | null } = { current: null };
const profileDeferreds: Record<string, ReturnType<typeof deferred<{ data: Profile; error: null }>>> = {};
const membershipDeferreds: Record<string, ReturnType<typeof deferred<{ data: Membership[]; error: null }>>> = {};

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-a', email: 'a@example.com' } } },
        error: null,
      }),
      onAuthStateChange: jest.fn((callback: AuthEventCallback) => {
        mockAuthEventCallback.current = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        eq: jest.fn((_field: string, userId: string) => {
          if (table === 'user_profiles') {
            profileDeferreds[userId] ??= deferred<{ data: Profile; error: null }>();
            return { single: jest.fn(() => profileDeferreds[userId].promise) };
          }
          membershipDeferreds[userId] ??= deferred<{ data: Membership[]; error: null }>();
          return membershipDeferreds[userId].promise;
        }),
      })),
    })),
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

function AuthProbe() {
  const { initialized, loading, user, profile, projectMemberships } = useAuth();
  return (
    <div>
      <span data-testid="initialized">{String(initialized)}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.id ?? 'signed-out'}</span>
      <span data-testid="profile">{profile?.full_name ?? 'no-profile'}</span>
      <span data-testid="memberships">{projectMemberships.length}</span>
    </div>
  );
}

const profile = (userId: string, name: string): Profile => ({
  id: userId,
  email: `${userId}@example.com`,
  full_name: name,
  role: 'user',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
});

const membership = (projectId: string): Membership => ({
  project_id: projectId,
  role: 'member',
  added_at: '2026-01-01',
});

describe('AuthContext stale async state protection', () => {
  beforeEach(() => {
    mockAuthEventCallback.current = null;
    Object.keys(profileDeferreds).forEach((key) => delete profileDeferreds[key]);
    Object.keys(membershipDeferreds).forEach((key) => delete membershipDeferreds[key]);
  });

  it('ignores user A profile and membership responses that resolve after logout', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(mockAuthEventCallback.current).not.toBeNull());
    await act(async () => {
      mockAuthEventCallback.current?.('SIGNED_OUT', null);
    });

    await act(async () => {
      profileDeferreds['user-a'].resolve({ data: profile('user-a', 'User A'), error: null });
      membershipDeferreds['user-a'].resolve({ data: [membership('project-a')], error: null });
      await Promise.resolve();
    });

    expect(screen.getByTestId('user')).toHaveTextContent('signed-out');
    expect(screen.getByTestId('profile')).toHaveTextContent('no-profile');
    expect(screen.getByTestId('memberships')).toHaveTextContent('0');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('ignores user A responses after switching to user B and keeps user B derived state', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(mockAuthEventCallback.current).not.toBeNull());
    await act(async () => {
      mockAuthEventCallback.current?.('SIGNED_IN', {
        user: { id: 'user-b', email: 'b@example.com' },
      });
    });

    await waitFor(() => {
      expect(profileDeferreds['user-b']).toBeDefined();
      expect(membershipDeferreds['user-b']).toBeDefined();
    });

    await act(async () => {
      profileDeferreds['user-a'].resolve({ data: profile('user-a', 'User A'), error: null });
      membershipDeferreds['user-a'].resolve({ data: [membership('project-a')], error: null });
      await Promise.resolve();
    });

    expect(screen.getByTestId('user')).toHaveTextContent('user-b');
    expect(screen.getByTestId('profile')).toHaveTextContent('no-profile');
    expect(screen.getByTestId('memberships')).toHaveTextContent('0');

    await act(async () => {
      profileDeferreds['user-b'].resolve({ data: profile('user-b', 'User B'), error: null });
      membershipDeferreds['user-b'].resolve({ data: [membership('project-b')], error: null });
      await Promise.resolve();
    });

    expect(screen.getByTestId('profile')).toHaveTextContent('User B');
    expect(screen.getByTestId('memberships')).toHaveTextContent('1');
  });
});
