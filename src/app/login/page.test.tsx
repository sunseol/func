import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from './page';

const replace = jest.fn();
const signIn = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  useSearchParams: () => new URLSearchParams('redirect=%2Fmy-reports%3Ffilter%3Dmorning'),
}));

jest.mock('@/app/components/ThemeProvider', () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signIn }),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: jest.fn(),
    },
  }),
}));

describe('LoginPage navigation', () => {
  beforeEach(() => {
    replace.mockReset();
    signIn.mockReset();
    signIn.mockResolvedValue({});
    window.history.replaceState({}, '', '/login?redirect=%2Fmy-reports%3Ffilter%3Dmorning');
  });

  it('uses AuthContext signIn and preserves the safe requested destination', async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'correct-password' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    expect(screen.getByRole('button', { name: '로그인' })).toHaveStyle('min-height: 44px');

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('user@example.com', 'correct-password');
      expect(replace).toHaveBeenCalledWith('/my-reports?filter=morning');
    });
  });
});
