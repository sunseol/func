'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  sendBrowserNotification: (title: string, message: string, type?: string) => void;
  checkTodayReports: () => Promise<{ morning: boolean; evening: boolean }>;
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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.reduce((count, item) => count + (item.is_read ? 0 : 1), 0);

  const loadSettings = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;

    if (data) {
      setSettings(data);
      return;
    }

    const { data: created, error: createError } = await supabase
      .from('notification_settings')
      .upsert({ user_id: user.id, ...DEFAULT_SETTINGS }, { onConflict: 'user_id' })
      .select()
      .single();
    if (createError) throw createError;

    setSettings(created);
  }, [supabase, user]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notification_history')
      .select('id, user_id, notification_type, title, message, is_read, sent_at, read_at')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    const rows = (data ?? []) as NotificationHistory[];
    setNotifications(rows.filter((item) => item.id));
  }, [supabase, user]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!user) {
        setSettings(null);
        setNotifications([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await Promise.all([loadSettings(), loadNotifications()]);
      } catch (err) {
        console.error('Notification load error:', err);
        if (!cancelled) {
          setSettings(null);
          setNotifications([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadNotifications, loadSettings, user]);

  const updateSettings = useCallback(
    async (patch: Partial<NotificationSettings>) => {
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_settings')
        .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;

      setSettings(data);
    },
    [supabase, user],
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
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  const sendBrowserNotification = useCallback(
    (title: string, message: string) => {
      if (!settings?.browser_notifications) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      try {
        new Notification(title, { body: message });
      } catch (err) {
        console.error('Browser notification error:', err);
      }
    },
    [settings?.browser_notifications],
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

