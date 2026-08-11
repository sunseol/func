import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppSidebar from './AppSidebar';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'planner@example.com', user_metadata: { full_name: 'Planner' } },
    loading: false,
    isAdmin: false,
    signOut: jest.fn(),
  }),
}));

jest.mock('@/contexts/NotificationContext', () => ({
  useNotification: () => ({ unreadCount: 0 }),
}));

jest.mock('@/app/components/ThemeProvider', () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

describe('AppSidebar responsive controls', () => {
  it('keeps the mobile trigger touch-safe and available for keyboard focus', async () => {
    render(<AppSidebar />);

    const trigger = await screen.findByRole('button', { name: '메뉴 열기' });
    expect(trigger).toHaveClass('mobile-sidebar-trigger');
    expect(trigger).toHaveStyle({ minWidth: '44px', minHeight: '44px' });
    await waitFor(() => expect(screen.getByRole('button', { name: /로그아웃/ })).toHaveStyle('min-height: 44px'));
  });
});
