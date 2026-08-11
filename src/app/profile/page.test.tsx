import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfilePage from './page';

const updateUser = jest.fn();
const profileUpdate = jest.fn();
const updateProfile = jest.fn();
const refreshProfile = jest.fn();

const authUser = {
  id: 'user-1',
  email: 'user@example.com',
  user_metadata: { full_name: 'Existing Name' },
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: authUser,
    profile: {
      id: authUser.id,
      email: authUser.email,
      full_name: 'Existing Name',
      role: 'user',
      created_at: '',
      updated_at: '',
    },
    loading: false,
    refreshProfile,
  }),
}));

jest.mock('@/app/components/ThemeProvider', () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { updateUser },
    from: () => ({
      update: updateProfile,
    }),
  }),
}));

describe('ProfilePage save flow', () => {
  beforeEach(() => {
    updateUser.mockReset();
    profileUpdate.mockReset();
    updateProfile.mockReset();
    refreshProfile.mockReset();
    updateUser.mockResolvedValue({ error: null });
    profileUpdate.mockResolvedValue({ error: null });
    updateProfile.mockReturnValue({ eq: profileUpdate });
    refreshProfile.mockResolvedValue(undefined);
  });

  it('updates auth metadata, canonical profile, and context in sequence', async () => {
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Updated Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByText('Profile updated.')).toBeTruthy());
    expect(updateUser).toHaveBeenCalledWith({ data: { full_name: 'Updated Name' } });
    expect(updateProfile).toHaveBeenCalledWith({
      full_name: 'Updated Name',
      updated_at: expect.any(String),
    });
    expect(refreshProfile).toHaveBeenCalledTimes(1);
    expect(updateUser.mock.invocationCallOrder[0]).toBeLessThan(updateProfile.mock.invocationCallOrder[0]);
    expect(updateProfile.mock.invocationCallOrder[0]).toBeLessThan(refreshProfile.mock.invocationCallOrder[0]);
    expect(screen.getByRole('button', { name: 'Save changes' }).classList.contains('ant-btn-loading')).toBe(false);
  });

  it('continues the canonical profile save when auth metadata sync fails and clears loading', async () => {
    updateUser.mockResolvedValue({ error: { message: 'metadata unavailable' } });
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Updated Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('metadata unavailable'));
    expect(profileUpdate).toHaveBeenCalledTimes(1);
    expect(refreshProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Save changes' }).classList.contains('ant-btn-loading')).toBe(false);
  });

  it('shows a database error and clears loading when the canonical update fails', async () => {
    profileUpdate.mockResolvedValue({ error: { message: 'database unavailable' } });
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Updated Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('database unavailable'));
    expect(refreshProfile).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save changes' }).classList.contains('ant-btn-loading')).toBe(false);
  });

  it('shows a revalidation error and clears loading when refreshProfile fails', async () => {
    refreshProfile.mockRejectedValue(new Error('profile revalidation unavailable'));
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Updated Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('profile revalidation unavailable'));
    expect(screen.getByRole('button', { name: 'Save changes' }).classList.contains('ant-btn-loading')).toBe(false);
  });
});
