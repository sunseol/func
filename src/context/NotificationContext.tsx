'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationSettings {
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

interface NotificationHistory {
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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // 알림 설정 불러오기
  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('알림 설정 조회 오류:', error);
        
        // 테이블이 없거나 데이터가 없는 경우
        if (error.code === 'PGRST116' || error.code === '42P01') {
          try {
            // 기본 설정 생성 시도
            const defaultSettings = {
              user_id: user.id,
              morning_reminder_enabled: true,
              morning_reminder_time: '09:00:00',
              evening_reminder_enabled: true,
              evening_reminder_time: '18:00:00',
              weekend_reminders: false,
              email_notifications: false,
              browser_notifications: true,
            };

            const { data: newData, error: insertError } = await supabase
              .from('notification_settings')
              .insert([defaultSettings])
              .select()
              .single();

            if (insertError) {
              console.error('기본 설정 생성 실패:', insertError);
              // 기본 설정을 메모리에만 저장
              setSettings({
                id: 'temp',
                ...defaultSettings,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            } else {
              setSettings(newData);
            }
          } catch (createError) {
            console.error('기본 설정 생성 중 오류:', createError);
            // 최소한의 기본 설정
            setSettings({
              id: 'temp',
              user_id: user.id,
              morning_reminder_enabled: true,
              morning_reminder_time: '09:00:00',
              evening_reminder_enabled: true,
              evening_reminder_time: '18:00:00',
              weekend_reminders: false,
              email_notifications: false,
              browser_notifications: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        } else {
          throw error;
        }
      } else {
        setSettings(data);
      }
    } catch (err) {
      console.error('알림 설정 불러오기 오류:', err);
      // 오류 발생 시에도 기본 설정 제공
      setSettings({
        id: 'temp',
        user_id: user.id,
        morning_reminder_enabled: true,
        morning_reminder_time: '09:00:00',
        evening_reminder_enabled: true,
        evening_reminder_time: '18:00:00',
        weekend_reminders: false,
        email_notifications: false,
        browser_notifications: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }, [user, supabase]);

  // 알림 히스토리 불러오기
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_history')
        .select('id, user_id, notification_type, title, message, is_read, sent_at, read_at')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('알림 히스토리 조회 오류:', error);
        // 테이블이 없거나 권한 문제인 경우 빈 배열로 설정
        if (error.code === 'PGRST116' || error.code === '42P01') {
          setNotifications([]);
          return;
        }
        throw error;
      }
      
      // ID가 없는 항목 필터링
      const validNotifications = (data || []).filter(item => item.id);
      setNotifications(validNotifications);
    } catch (err) {
      console.error('알림 히스토리 불러오기 오류:', err);
      setNotifications([]);
    }
  }, [user, supabase]);

  // 초기 데이터 로드
  useEffect(() => {
    if (user) {
      Promise.all([fetchSettings(), fetchNotifications()]).finally(() => {
        setLoading(false);
      });
    } else {
      setSettings(null);
      setNotifications([]);
      setLoading(false);
    }
  }, [user, fetchSettings, fetchNotifications]);

  // 알림 설정 업데이트
  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user || !settings) return;

    try {
      // 임시 설정인 경우 메모리에서만 업데이트
      if (settings.id === 'temp') {
        setSettings(prev => prev ? { ...prev, ...newSettings } : null);
        return;
      }

      const { data, error } = await supabase
        .from('notification_settings')
        .update(newSettings)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('알림 설정 업데이트 오류:', error);
        // 업데이트 실패 시 메모리에서만 업데이트
        setSettings(prev => prev ? { ...prev, ...newSettings } : null);
        throw error;
      }
      setSettings(data);
    } catch (err) {
      console.error('알림 설정 업데이트 오류:', err);
      throw err;
    }
  };

  // 알림 읽음 처리
  const markAsRead = async (notificationId: string) => {
    if (!user || !notificationId) {
      console.error('사용자 또는 알림 ID가 없습니다:', { user: !!user, notificationId });
      return;
    }

    try {
      const { error } = await supabase
        .from('notification_history')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase 오류:', error);
        throw error;
      }

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (err) {
      console.error('알림 읽음 처리 오류:', err);
    }
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    if (!user) {
      console.error('사용자가 없습니다');
      return;
    }

    // 읽지 않은 알림이 있는지 확인
    const unreadNotifications = notifications.filter(n => !n.is_read && n.id);
    if (unreadNotifications.length === 0) {
      console.log('읽지 않은 알림이 없습니다');
      return;
    }

    try {
      // 각 알림을 개별적으로 업데이트
      const updatePromises = unreadNotifications.map(notification => 
        supabase
          .from('notification_history')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', notification.id)
          .eq('user_id', user.id)
      );

      const results = await Promise.all(updatePromises);
      
      // 오류가 있는지 확인
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('일부 알림 업데이트 실패:', errors);
      }

      // 성공한 업데이트만 반영
      const successfulIds = results
        .map((result, index) => result.error ? null : unreadNotifications[index].id)
        .filter(Boolean);

      setNotifications(prev =>
        prev.map(n => 
          successfulIds.includes(n.id)
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (err) {
      console.error('모든 알림 읽음 처리 오류:', err);
    }
  };

  // 브라우저 알림 권한 요청
  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('이 브라우저는 알림을 지원하지 않습니다.');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  // 브라우저 알림 전송
  const sendBrowserNotification = (title: string, message: string, type: string = 'info') => {
    if (!settings?.browser_notifications) return;
    if (Notification.permission !== 'granted') return;

    const notification = new Notification(title, {
      body: message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: type,
    });

    // 알림 클릭 시 창 포커스
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // 5초 후 자동 닫기
    setTimeout(() => {
      notification.close();
    }, 5000);
  };

  // 오늘 보고서 작성 여부 확인
  const checkTodayReports = async (): Promise<{ morning: boolean; evening: boolean }> => {
    if (!user) return { morning: false, evening: false };

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_reports')
        .select('report_type')
        .eq('user_id', user.id)
        .eq('report_date', today);

      if (error) throw error;

      const reports = data || [];
      return {
        morning: reports.some(r => r.report_type === 'morning'),
        evening: reports.some(r => r.report_type === 'evening'),
      };
    } catch (err) {
      console.error('오늘 보고서 확인 오류:', err);
      return { morning: false, evening: false };
    }
  };

  // 알림 히스토리에 추가
  const addNotificationHistory = async (type: string, title: string, message: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_history')
        .insert([{
          user_id: user.id,
          notification_type: type,
          title,
          message,
        }])
        .select()
        .single();

      if (error) {
        console.error('알림 히스토리 추가 오류:', error);
        // 테이블이 없거나 권한 문제인 경우 무시
        if (error.code === 'PGRST116' || error.code === '42P01') {
          return;
        }
        throw error;
      }

      // 데이터가 유효한 경우에만 추가
      if (data && data.id) {
        setNotifications(prev => [data, ...prev]);
      }
    } catch (err) {
      console.error('알림 히스토리 추가 오류:', err);
    }
  };

  // 정기 알림 체크 (1분마다)
  useEffect(() => {
    if (!user || !settings) return;

    const checkReminders = async () => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM 형식
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;

      // 주말 알림이 비활성화되어 있고 주말이면 스킵
      if (isWeekend && !settings.weekend_reminders) return;

      const todayReports = await checkTodayReports();

      // 아침 알림 체크
      if (
        settings.morning_reminder_enabled &&
        currentTime === settings.morning_reminder_time.slice(0, 5) &&
        !todayReports.morning
      ) {
        const title = '🌅 출근 보고서 작성 알림';
        const message = '오늘의 출근 보고서를 작성해주세요!';
        
        sendBrowserNotification(title, message, 'morning_reminder');
        await addNotificationHistory('morning_reminder', title, message);
      }

      // 저녁 알림 체크
      if (
        settings.evening_reminder_enabled &&
        currentTime === settings.evening_reminder_time.slice(0, 5) &&
        !todayReports.evening
      ) {
        const title = '🌙 퇴근 보고서 작성 알림';
        const message = '오늘의 퇴근 보고서를 작성해주세요!';
        
        sendBrowserNotification(title, message, 'evening_reminder');
        await addNotificationHistory('evening_reminder', title, message);
      }
    };

    // 즉시 체크
    checkReminders();

    // 1분마다 체크
    const interval = setInterval(checkReminders, 60000);

    return () => clearInterval(interval);
  }, [user, settings]);

  const value: NotificationContextType = {
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
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}