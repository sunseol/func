import { render, screen } from '@testing-library/react';
import Home from './page';

const replace = jest.fn();

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useState: (initialValue: unknown) => [initialValue, jest.fn()],
  };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, initialized: true }),
}));

jest.mock('./components/ThemeProvider', () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

jest.mock('@/contexts/NotificationContext', () => ({
  useNotification: () => ({ sendBrowserNotification: jest.fn() }),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: jest.fn() }),
}));

jest.mock('./components/InputForm', () => ({
  __esModule: true,
  default: () => <div data-testid="input-form" />,
}));

jest.mock('./components/ResultDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="result-display" />,
}));

jest.mock('./components/WeeklyReportForm', () => ({
  WeeklyReportForm: () => <div data-testid="weekly-report-form" />,
}));

describe('Home auth navigation', () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it('does not send an unauthenticated root request to the landing page', () => {
    render(<Home />);

    expect(screen.getByTestId('input-form')).not.toBeNull();
    expect(replace).not.toHaveBeenCalledWith('/landing');
  });
});
