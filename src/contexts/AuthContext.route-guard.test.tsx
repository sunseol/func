import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

let mockPathname = '/login';
let mockSearch = '';
let mockSession: { user: { id: string; email: string } } | null = null;
const mockReplace = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockImplementation(async () => ({
        data: { session: mockSession },
        error: null,
      })),
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
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

function AuthInitializationProbe() {
  const { initialized } = useAuth();
  return <span>{initialized ? 'initialized' : 'initializing'}</span>;
}

describe('AuthContext route guard parity', () => {
  beforeEach(() => {
    mockPathname = '/login';
    mockSearch = '';
    mockSession = null;
    mockReplace.mockReset();
  });

  async function renderAndWaitForInitialization() {
    window.history.replaceState({}, '', `${mockPathname}${mockSearch}`);
    render(
      <AuthProvider>
        <AuthInitializationProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('initialized')).not.toBeNull());
  }

  it.each(['/qa-missing-route', '/reports'])('does not redirect unknown route %s', async (pathname) => {
    mockPathname = pathname;
    await renderAndWaitForInitialization();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect an API path', async () => {
    mockPathname = '/api/unknown';
    await renderAndWaitForInitialization();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects a protected path with an encoded internal requested path', async () => {
    mockPathname = '/my-reports';
    mockSearch = '?filter=morning';
    window.history.replaceState({}, '', `${mockPathname}${mockSearch}`);
    render(
      <AuthProvider>
        <div>content</div>
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/login?redirect=%2Fmy-reports%3Ffilter%3Dmorning'),
    );
  });

  it.each(['/landing', '/login', '/signup', '/reset-password', '/auth/callback'])(
    'does not redirect public auth path %s', async (pathname) => {
      mockPathname = pathname;
      await renderAndWaitForInitialization();
      expect(mockReplace).not.toHaveBeenCalled();
    },
  );

  it('redirects an authenticated login page to its safe requested path', async () => {
    mockSession = { user: { id: 'existing-user', email: 'existing@example.com' } };
    mockPathname = '/login';
    mockSearch = '?redirect=%2Fmy-reports';
    window.history.replaceState({}, '', `${mockPathname}${mockSearch}`);
    render(
      <AuthProvider>
        <div>login</div>
      </AuthProvider>,
    );

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/my-reports'));
  });
});
