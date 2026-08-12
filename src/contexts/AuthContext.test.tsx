import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

type AuthEventSession = { user: { id: string; email: string } } | null;
type AuthEventCallback = (event: 'USER_UPDATED' | 'SIGNED_IN', session: AuthEventSession) => unknown;
const mockAuthEventCallback: { current: AuthEventCallback | null } = { current: null };
const mockProfileSelect = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'signed-in-user', email: 'signed-in@example.com' },
          },
          user: { id: 'signed-in-user', email: 'signed-in@example.com' },
        },
        error: null,
      }),
      onAuthStateChange: jest.fn((callback: AuthEventCallback) => {
        mockAuthEventCallback.current = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn((field: string) =>
          field === 'id'
            ? { single: mockProfileSelect }
            : Promise.resolve({ data: [], error: null }),
        ),
      })),
    })),
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

function AuthProbe() {
  const { signIn, user, initialized } = useAuth();
  return (
    <div>
      <span>{initialized ? user?.email ?? 'signed-out' : 'initializing'}</span>
      <button onClick={() => signIn('signed-in@example.com', 'password')}>sign in</button>
    </div>
  );
}

describe('AuthContext session propagation', () => {
  beforeEach(() => {
    mockAuthEventCallback.current = null;
    mockProfileSelect.mockReset();
    mockProfileSelect.mockResolvedValue({ data: null, error: null });
  });

  it('updates the context user before signIn resolves to its caller', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('signed-out')).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'sign in' }));

    await waitFor(() => expect(screen.getByText('signed-in@example.com')).not.toBeNull());
  });

  it('returns from USER_UPDATED without awaiting profile queries for the same user', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('signed-out')).not.toBeNull());
    expect(mockAuthEventCallback.current).not.toBeNull();

    await act(async () => {
      mockAuthEventCallback.current?.('USER_UPDATED', {
        user: { id: 'signed-in-user', email: 'signed-in@example.com' },
      });
      await Promise.resolve();
    });
    mockProfileSelect.mockClear();

    let result: unknown;
    await act(async () => {
      result = mockAuthEventCallback.current?.('USER_UPDATED', {
        user: { id: 'signed-in-user', email: 'signed-in@example.com' },
      });
      await Promise.resolve();
    });

    expect(result).toBeUndefined();
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockProfileSelect).not.toHaveBeenCalled();
  });
});
