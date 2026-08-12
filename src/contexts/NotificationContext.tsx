'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationSettings {
  id: string;
  user_id: string;
  morning_reminder_enabled: boolean;
  morning_reminder_time: string;
  evening_reminder_enabled: boolean;
  evening_reminder_time: string;
  weekend_reminders: boolean;
  email_notifications: boolean;
  browser_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationHistory {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  sent_at: string;
  read_at?: string;
}

interface NotificationContextType {
  settings: NotificationSettings | null;
  notifications: NotificationHistory[];
  unreadCount: number;
  loading: boolean;
  loadError: string | null;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  sendBrowserNotification: (title: string, message: string, type?: string) => void;
  checkTodayReports: () => Promise<{ morning: boolean; evening: boolean }>;
}

interface BrowserNotificationEligibility {
  userId: string;
  enabled: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const DEFAULT_SETTINGS = {
  morning_reminder_enabled: true,
  morning_reminder_time: '09:00:00',
  evening_reminder_enabled: true,
  evening_reminder_time: '18:00:00',
  weekend_reminders: false,
  email_notifications: false,
  browser_notifications: true,
} as const;

const NOTIFICATION_PERMISSION_TIMEOUT_MS = 3000;

function createLocalSettings(userId: string): NotificationSettings {
  const now = new Date().toISOString();
  return {
    id: '',
    user_id: userId,
    ...DEFAULT_SETTINGS,
    created_at: now,
    updated_at: now,
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [browserNotificationEligibility, setBrowserNotificationEligibility] =
    useState<BrowserNotificationEligibility | null>(null);
  const settingsRequestIdRef = useRef(0);
  const activeUserIdRef = useRef<string | null>(null);

  const unreadCount = notifications.reduce((count, item) => count + (item.is_read ? 0 : 1), 0);

  const loadSettings = useCallback(async (requestId: number) => {
    if (!user) return;
    const isCurrentRequest = () =>
      requestId === settingsRequestIdRef.current && activeUserIdRef.current === user.id;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        if (!isCurrentRequest()) return;
        setSettings(data);
        setBrowserNotificationEligibility({ userId: user.id, enabled: data.browser_notifications });
        return;
      }

      if (error) {
        console.error('Notification settings query error:', error);
        if (isCurrentRequest()) {
          setSettings(createLocalSettings(user.id));
          setBrowserNotificationEligibility(null);
          setLoadError('알림 설정을 불러오지 못해 기본 설정을 표시합니다.');
        }
        return;
      }

      const { data: created, error: createError } = await supabase
        .from('notification_settings')
        .upsert({ user_id: user.id, ...DEFAULT_SETTINGS }, { onConflict: 'user_id' })
        .select()
        .single();

      if (!createError && created) {
        if (!isCurrentRequest()) return;
        setSettings(created);
        setBrowserNotificationEligibility({ userId: user.id, enabled: created.browser_notifications });
        return;
      }

      if (createError) {
        console.error('Notification settings upsert error:', createError);
      }
      if (isCurrentRequest()) setLoadError('알림 설정을 불러오지 못해 기본 설정을 표시합니다.');
    } catch (error) {
      console.error('Notification settings load error:', error);
      if (isCurrentRequest()) setLoadError('알림 설정을 불러오지 못해 기본 설정을 표시합니다.');
    }

    if (isCurrentRequest()) {
      setSettings(createLocalSettings(user.id));
      setBrowserNotificationEligibility(null);
    }
  }, [supabase, user]);

  const loadNotifications = useCallback(async (requestId: number) => {
    if (!user) return;
    const isCurrentRequest = () =>
      requestId === settingsRequestIdRef.current && activeUserIdRef.current === user.id;

    try {
      const { data, error } = await supabase
        .from('notification_history')
        .select('id, user_id, notification_type, title, message, is_read, sent_at, read_at')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(50);
      if (error) {
        console.error('Notification history query error:', error);
        if (isCurrentRequest()) {
          setNotifications([]);
          setLoadError('알림 이력을 불러오지 못했습니다.');
        }
        return;
      }

      const rows = (data ?? []) as NotificationHistory[];
      if (isCurrentRequest()) setNotifications(rows.filter((item) => item.id));
    } catch (error) {
      console.error('Notification history load error:', error);
      if (isCurrentRequest()) {
        setNotifications([]);
        setLoadError('알림 이력을 불러오지 못했습니다.');
      }
    }
  }, [supabase, user]);

  useEffect(() => {
    const requestId = ++settingsRequestIdRef.current;
    activeUserIdRef.current = user?.id ?? null;
    let cancelled = false;

    (async () => {
      if (!user) {
        setSettings(null);
        setNotifications([]);
        setLoadError(null);
        setBrowserNotificationEligibility(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);
      setBrowserNotificationEligibility(null);
      await Promise.all([loadSettings(requestId), loadNotifications(requestId)]);
      if (!cancelled && requestId === settingsRequestIdRef.current && activeUserIdRef.current === user.id) {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadNotifications, loadSettings, user]);

  const updateSettings = useCallback(
    async (patch: Partial<NotificationSettings>) => {
      if (!user) return;

      const requestId = ++settingsRequestIdRef.current;
      activeUserIdRef.current = user.id;
      setBrowserNotificationEligibility(null);
      const previousSettings = settings;
      setSettings((current) => (current ? { ...current, ...patch } : current));

      try {
        const { data, error } = await supabase
          .from('notification_settings')
          .upsert({ ...patch, user_id: user.id }, { onConflict: 'user_id' })
          .select()
          .single();
        if (error) throw error;

        if (requestId !== settingsRequestIdRef.current || activeUserIdRef.current !== user.id) return;

        setSettings(data);
        setBrowserNotificationEligibility({ userId: user.id, enabled: data.browser_notifications });
      } catch (error) {
        if (requestId === settingsRequestIdRef.current && activeUserIdRef.current === user.id) {
          setSettings(previousSettings);
          setBrowserNotificationEligibility(null);
        }
        throw error;
      }
    },
    [settings, supabase, user],
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      const { error } = await supabase
        .from('notification_history')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);
      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)),
      );
    },
    [supabase, user],
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('notification_history')
      .update({ is_read: true, read_at: now })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) throw error;

    setNotifications((prev) => prev.map((n) => (n.is_read ? n : { ...n, is_read: true, read_at: now })));
  }, [supabase, user]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.Notification === 'undefined') return false;
    if (window.Notification.permission === 'granted') return true;

    let timeoutId: number | undefined;
    try {
      const permission = await Promise.race([
        window.Notification.requestPermission(),
        new Promise<NotificationPermission>((resolve) => {
          timeoutId = window.setTimeout(() => resolve('denied'), NOTIFICATION_PERMISSION_TIMEOUT_MS);
        }),
      ]);
      return permission === 'granted';
    } catch (error) {
      console.error('Browser notification permission error:', error);
      return false;
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    }
  }, []);

  const sendBrowserNotification = useCallback(
    (title: string, message: string) => {
      if (!user) return;
      if (browserNotificationEligibility?.userId !== user.id || !browserNotificationEligibility.enabled) return;
      if (typeof window === 'undefined' || typeof window.Notification === 'undefined') return;
      if (window.Notification.permission !== 'granted') return;

      try {
        new window.Notification(title, { body: message });
      } catch (err) {
        console.error('Browser notification error:', err);
      }
    },
    [browserNotificationEligibility, user],
  );

  const checkTodayReports = useCallback(async () => {
    if (!user) return { morning: false, evening: false };
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('daily_reports')
      .select('report_type, report_date')
      .eq('user_id', user.id)
      .eq('report_date', today);
    if (error) throw error;

    type TodayReportRow = { report_type: 'morning' | 'evening'; report_date: string };
    const rows = (data ?? []) as TodayReportRow[];
    return {
      morning: rows.some((r) => r.report_type === 'morning'),
      evening: rows.some((r) => r.report_type === 'evening'),
    };
  }, [supabase, user]);

  const value = useMemo<NotificationContextType>(
    () => ({
      settings,
      loadError,
      notifications,
      unreadCount,
      loading,
      updateSettings,
      markAsRead,
      markAllAsRead,
      requestNotificationPermission,
      sendBrowserNotification,
      checkTodayReports,
    }),
    [
      checkTodayReports,
      loading,
      markAllAsRead,
      markAsRead,
      notifications,
      requestNotificationPermission,
      sendBrowserNotification,
      settings,
      loadError,
      unreadCount,
      updateSettings,
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
}
