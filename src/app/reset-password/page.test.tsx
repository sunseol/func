import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ResetPasswordPage from './page';

const updateUser = jest.fn();

jest.mock('@/app/components/ThemeProvider', () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { updateUser } }),
}));

describe('reset password callback', () => {
  beforeEach(() => {
    updateUser.mockReset();
    updateUser.mockResolvedValue({ error: null });
  });

  it('renders publicly and updates the password from the callback form', async () => {
    render(<ResetPasswordPage />);

    expect(screen.getByRole('heading', { name: '비밀번호 재설정' })).not.toBeNull();
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'new-password' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'new-password' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith({ password: 'new-password' });
      expect(screen.getByText('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.')).not.toBeNull();
    });
  });
});
