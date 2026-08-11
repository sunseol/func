import { render, screen } from '@testing-library/react';
import ClientLayoutContent from './ClientLayoutContent';

jest.mock('next/navigation', () => ({
  usePathname: () => '/login',
}));

jest.mock('./components/ThemeProvider', () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

jest.mock('@/hooks/useComponentPreloader', () => ({
  useComponentPreloader: jest.fn(),
}));

jest.mock('@/components/layout/AppSidebar', () => ({
  __esModule: true,
  default: () => <aside data-testid="app-sidebar" />,
}));

describe('ClientLayoutContent public shell', () => {
  it('does not render the authenticated sidebar on login', () => {
    render(
      <ClientLayoutContent>
        <h1>Login</h1>
      </ClientLayoutContent>,
    );

    expect(screen.queryByTestId('app-sidebar')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Login' })).not.toBeNull();
  });
});
