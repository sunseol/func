import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const mockReplace = jest.fn();
const mockSession = {
  user: { id: 'admin-user', email: 'admin@example.com' },
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn((field: string) =>
          field === 'id'
            ? { single: jest.fn().mockResolvedValue({ data: null, error: null }) }
            : Promise.resolve({ data: [], error: null }),
        ),
      })),
    })),
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/admin',
  useSearchParams: () => new URLSearchParams(),
}));

function LogoutProbe() {
  const { initialized, signOut } = useAuth();
  return (
    <button disabled={!initialized} onClick={() => void signOut()}>
      로그아웃
    </button>
  );
}

describe('AuthContext logout navigation', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    window.history.replaceState({}, '', '/admin');
  });

  it('keeps protected-route guard from replacing canonical landing after sign out', async () => {
    render(
      <AuthProvider>
        <LogoutProbe />
      </AuthProvider>,
    );

    const logoutButton = screen.getByRole('button', { name: '로그아웃' });
    await waitFor(() => expect(logoutButton.getAttribute('disabled')).toBeNull());
    fireEvent.click(logoutButton);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/landing'));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
