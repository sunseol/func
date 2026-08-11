import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from 'antd';
import NotificationSettings from './NotificationSettings';
import { useNotification, type NotificationHistory, type NotificationSettings as NotificationSettingsRecord } from '@/contexts/NotificationContext';

jest.mock('@/contexts/NotificationContext', () => ({
  useNotification: jest.fn(),
}));

jest.mock('@/app/components/ThemeProvider', () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

const useNotificationMock = useNotification as jest.MockedFunction<typeof useNotification>;

const settings: NotificationSettingsRecord = {
  id: 'settings-1',
  user_id: 'notification-owner',
  morning_reminder_enabled: true,
  morning_reminder_time: '09:00:00',
  evening_reminder_enabled: true,
  evening_reminder_time: '18:00:00',
  weekend_reminders: false,
  email_notifications: false,
  browser_notifications: true,
  created_at: '2026-08-12T00:00:00.000Z',
  updated_at: '2026-08-12T00:00:00.000Z',
};

const notification: NotificationHistory = {
  id: 'notification-1',
  user_id: settings.user_id,
  notification_type: 'e2e',
  title: 'Seeded notification',
  message: 'A row scoped to this user.',
  is_read: false,
  sent_at: '2026-08-12T00:00:00.000Z',
};

describe('NotificationSettings accessible controls', () => {
  const updateSettings = jest.fn().mockResolvedValue(undefined);
  const markAsRead = jest.fn().mockResolvedValue(undefined);
  const markAllAsRead = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationMock.mockReturnValue({
      settings,
      notifications: [notification],
      unreadCount: 1,
      loading: false,
      loadError: null,
      updateSettings,
      markAsRead,
      markAllAsRead,
      requestNotificationPermission: jest.fn().mockResolvedValue(false),
      sendBrowserNotification: jest.fn(),
      checkTodayReports: jest.fn().mockResolvedValue({ morning: false, evening: false }),
    });
  });

  function renderSettings() {
    return render(
      <App>
        <NotificationSettings />
      </App>,
    );
  }

  it('gives each reminder switch a stable accessible name', () => {
    renderSettings();

    expect(screen.getByRole('heading', { name: '알림 설정' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: '브라우저 알림' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: '출근 보고서 알림' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: '퇴근 보고서 알림' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: '주말 알림' })).toBeTruthy();
    expect(screen.getAllByRole('switch')[0]).toHaveStyle('height: 44px');
    expect(document.querySelector('.notification-time-picker')).toHaveStyle('min-height: 44px');
  });

  it('keeps switch hit areas expandable without changing their visual control size', () => {
    renderSettings();

    expect(screen.getByRole('switch', { name: '브라우저 알림' })).toHaveClass('notification-switch-touch-target');
    expect(screen.getByRole('button', { name: '권한 요청' })).toHaveStyle('min-height: 44px');
    expect(screen.getByRole('button', { name: '테스트 알림' })).toHaveStyle('min-height: 44px');
  });

  it('scopes a read action to the seeded notification row', async () => {
    renderSettings();

    const row = screen.getByRole('listitem', { name: '알림: Seeded notification' });
    fireEvent.click(within(row).getByRole('button', { name: '읽음' }));

    await waitFor(() => expect(markAsRead).toHaveBeenCalledWith(notification.id));
    expect(screen.getByRole('button', { name: '모두 읽음' })).toBeTruthy();
  });

  it('persists the morning switch through the typed settings callback', async () => {
    renderSettings();

    fireEvent.click(screen.getByRole('switch', { name: '출근 보고서 알림' }));

    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ morning_reminder_enabled: false }));
  });

  it('keeps a denied permission result visible as an alert', async () => {
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: '권한 요청' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('브라우저 알림 권한이 거부되었습니다.');
    });
  });

  it('keeps an allowed permission result visible as an alert', async () => {
    useNotificationMock.mockReturnValueOnce({
      settings,
      notifications: [],
      unreadCount: 0,
      loading: false,
      loadError: null,
      updateSettings,
      markAsRead,
      markAllAsRead,
      requestNotificationPermission: jest.fn().mockResolvedValue(true),
      sendBrowserNotification: jest.fn(),
      checkTodayReports: jest.fn().mockResolvedValue({ morning: false, evening: false }),
    });
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: '권한 요청' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('브라우저 알림 권한이 허용되었습니다.');
    });
  });

  it('converts a permission request failure into the same visible denied result', async () => {
    useNotificationMock.mockReturnValueOnce({
      settings,
      notifications: [],
      unreadCount: 0,
      loading: false,
      loadError: null,
      updateSettings,
      markAsRead,
      markAllAsRead,
      requestNotificationPermission: jest.fn().mockRejectedValue(new Error('offline permission failure')),
      sendBrowserNotification: jest.fn(),
      checkTodayReports: jest.fn().mockResolvedValue({ morning: false, evening: false }),
    });
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: '권한 요청' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('브라우저 알림 권한이 거부되었습니다.');
    });
  });

  it('shows a visible recovery warning while keeping controls usable', () => {
    useNotificationMock.mockReturnValueOnce({
      settings,
      notifications: [],
      unreadCount: 0,
      loading: false,
      loadError: '알림 이력을 불러오지 못했습니다.',
      updateSettings,
      markAsRead,
      markAllAsRead,
      requestNotificationPermission: jest.fn().mockResolvedValue(false),
      sendBrowserNotification: jest.fn(),
      checkTodayReports: jest.fn().mockResolvedValue({ morning: false, evening: false }),
    });
    renderSettings();

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('switch', { name: '출근 보고서 알림' })).toBeTruthy();
  });
});
