import { render, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthContext';

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'existing-user', email: 'existing@example.com' } } },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
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
  useRouter: () => ({
    replace: (path: string) => window.history.replaceState({}, '', path),
  }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

describe('authenticated login bypass', () => {
  it('navigates an existing session away from the public login page', async () => {
    window.history.replaceState({}, '', '/login');
    render(<AuthProvider><div>login</div></AuthProvider>);

    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });
});
