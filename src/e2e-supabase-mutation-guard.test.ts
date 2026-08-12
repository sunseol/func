const mockListUsers = jest.fn();
const mockCreateUser = jest.fn();
const mockUpdateUserById = jest.fn();
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {
        listUsers: (...args: unknown[]) => mockListUsers(...args),
        createUser: (...args: unknown[]) => mockCreateUser(...args),
        updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
      },
    },
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

import {
  guardedSupabaseFetch,
  isLoopbackSupabaseUrl,
  requireLocalSupabaseMutation,
  cleanupTestData,
  setupTestUsers,
} from '../e2e/setup/test-setup';

const originalEnvironment = { ...process.env };

describe('E2E Supabase mutation guard', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      NEXT_PUBLIC_SUPABASE_URL: 'https://shared-project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      E2E_LOCAL_SUPABASE: '0',
    };
    jest.clearAllMocks();
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
    mockCreateUser.mockImplementation(async ({ email }: { email: string }) => ({
      data: { user: { id: `${email}-id` } },
      error: null,
    }));
    mockUpdateUserById.mockResolvedValue({ data: { user: { id: 'existing-id' } }, error: null });
    mockFrom.mockImplementation(() => ({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    }));
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('rejects a remote URL before any auth or profile mutation call', async () => {
    await expect(setupTestUsers()).rejects.toThrow(/E2E_LOCAL_SUPABASE=1/);

    expect(mockListUsers).not.toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockUpdateUserById).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects remote cleanup before any lookup or delete call', async () => {
    await expect(cleanupTestData()).rejects.toThrow(/E2E_LOCAL_SUPABASE=1/);

    expect(mockListUsers).not.toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockUpdateUserById).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects a direct service-client transport before network access', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    expect(() => guardedSupabaseFetch('https://shared-project.supabase.co/rest/v1/projects')).toThrow(/E2E_LOCAL_SUPABASE=1/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('accepts only the dedicated loopback Supabase API endpoint', async () => {
    expect(isLoopbackSupabaseUrl('http://127.0.0.1:55421')).toBe(true);
    expect(isLoopbackSupabaseUrl('http://localhost:55421')).toBe(true);
    expect(isLoopbackSupabaseUrl('http://[::1]:55421')).toBe(true);
    expect(isLoopbackSupabaseUrl('http://127.0.0.1:54321')).toBe(false);
    expect(isLoopbackSupabaseUrl('https://shared-project.supabase.co:55421')).toBe(false);
  });

  it('seeds users when explicitly pointed at the dedicated loopback endpoint', async () => {
    process.env.E2E_LOCAL_SUPABASE = '1';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55421';

    requireLocalSupabaseMutation();
    await setupTestUsers();

    expect(mockListUsers).toHaveBeenCalledTimes(4);
    expect(mockCreateUser).toHaveBeenCalledTimes(4);
    expect(mockFrom).toHaveBeenCalledTimes(4);
  });
});
