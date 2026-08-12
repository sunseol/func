import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SignupPage from './page';

const resend = jest.fn();

jest.mock('@/app/components/ThemeProvider', () => ({
  useTheme: () => ({ isDarkMode: false, setIsDarkMode: jest.fn() }),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: jest.fn(),
      resend,
    },
  }),
}));

describe('signup confirmation resend privacy', () => {
  const genericMessage = '요청을 처리했습니다. 입력하신 이메일을 확인해주세요.';

  beforeEach(() => {
    resend.mockReset();
  });

  it.each([
    ['success', () => Promise.resolve({ error: null }), 'SENTINEL_SUCCESS'],
    ['known provider error', () => Promise.resolve({ error: new Error('SENTINEL_PROVIDER_ERROR') }), 'SENTINEL_PROVIDER_ERROR'],
    ['rate-limit-shaped error', () => Promise.resolve({ error: { message: 'SENTINEL_RATE_LIMIT' } }), 'SENTINEL_RATE_LIMIT'],
    ['unknown throw', () => Promise.reject('SENTINEL_THROW'), 'SENTINEL_THROW'],
  ])('renders bounded generic feedback for %s', async (_scenario, response, sentinel) => {
    resend.mockImplementation(response);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<SignupPage />);
    fireEvent.change(screen.getByPlaceholderText('이메일'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '이메일 확인 링크 재전송' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(genericMessage);
    });

    expect(screen.getByRole('alert')).not.toHaveTextContent(sentinel);
    expect(document.body).not.toHaveTextContent(sentinel);
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain(sentinel);
    expect(resend).toHaveBeenCalledWith({ type: 'signup', email: 'user@example.com' });
    consoleError.mockRestore();
  });
});
