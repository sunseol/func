'use client';

import React, { useState } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { useTheme } from 'next-themes';
import { Bell, Settings, Check, Clock, Globe, Sun, Moon, Calendar, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

export default function NotificationSettings() {
  const {
    settings,
    notifications,
    unreadCount,
    loading,
    updateSettings,
    markAsRead,
    markAllAsRead,
    requestNotificationPermission,
    sendBrowserNotification,
  } = useNotification();

  const [isSaving, setIsSaving] = useState(false);

  const handleSettingChange = async (key: string, value: any) => {
    if (!settings) return;

    setIsSaving(true);
    try {
      await updateSettings({ [key]: value });
      toast.success('알림 설정이 저장되었습니다.');
    } catch (err) {
      toast.error('알림 설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimeChange = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const timeString = e.target.value;
    // Append seconds for compatibility if needed, though usually HH:mm is fine for input
    await handleSettingChange(key, `${timeString}:00`);
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      toast.success('브라우저 알림 권한이 허용되었습니다.');
      // Browser notification logic inside context usually handles the actual prompt
      sendBrowserNotification('알림 테스트', '알림이 정상적으로 작동합니다! 🎉');
    } else {
      toast.error('브라우저 알림 권한이 거부되었습니다.');
    }
  };

  const handleTestNotification = () => {
    sendBrowserNotification('테스트 알림', '알림 기능이 정상적으로 작동합니다! 🔔');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">알림 설정을 불러올 수 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  // Format time for input value (HH:mm)
  const formatTimeForInput = (timeStr: string | null) => {
    if (!timeStr) return '';
    return dayjs(timeStr, 'HH:mm:ss').format('HH:mm');
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>알림 설정</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" /> 브라우저 알림
              </div>
              <p className="text-xs text-muted-foreground">
                브라우저에서 데스크톱 알림을 받습니다
              </p>
            </div>
            <Switch
              checked={settings.browser_notifications}
              onCheckedChange={(checked) => handleSettingChange('browser_notifications', checked)}
              disabled={isSaving}
            />
          </div>

          {settings.browser_notifications && (
            <div className="flex items-center gap-2 pl-6">
              <Button size="sm" variant="outline" onClick={handleRequestPermission}>권한 요청</Button>
              <Button size="sm" variant="outline" onClick={handleTestNotification}>테스트 알림</Button>
            </div>
          )}

          <Separator />

          {/* Morning Reminder */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium flex items-center gap-2">
                <Sun className="h-4 w-4" /> 출근 보고서 알림
              </div>
              <p className="text-xs text-muted-foreground">
                출근 보고서 작성 시간을 알려드립니다
              </p>
            </div>
            <Switch
              checked={settings.morning_reminder_enabled}
              onCheckedChange={(checked) => handleSettingChange('morning_reminder_enabled', checked)}
              disabled={isSaving}
            />
          </div>

          {settings.morning_reminder_enabled && (
            <div className="flex items-center gap-4 pl-6">
              <span className="text-sm font-medium">알림 시간:</span>
              <Input
                type="time"
                className="w-32"
                value={formatTimeForInput(settings.morning_reminder_time)}
                onChange={(e) => handleTimeChange('morning_reminder_time', e)}
              />
            </div>
          )}

          <Separator />

          {/* Evening Reminder */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium flex items-center gap-2">
                <Moon className="h-4 w-4" /> 퇴근 보고서 알림
              </div>
              <p className="text-xs text-muted-foreground">
                퇴근 보고서 작성 시간을 알려드립니다
              </p>
            </div>
            <Switch
              checked={settings.evening_reminder_enabled}
              onCheckedChange={(checked) => handleSettingChange('evening_reminder_enabled', checked)}
              disabled={isSaving}
            />
          </div>

          {settings.evening_reminder_enabled && (
            <div className="flex items-center gap-4 pl-6">
              <span className="text-sm font-medium">알림 시간:</span>
              <Input
                type="time"
                className="w-32"
                value={formatTimeForInput(settings.evening_reminder_time)}
                onChange={(e) => handleTimeChange('evening_reminder_time', e)}
              />
            </div>
          )}

          <Separator />

          {/* Weekend Reminder */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" /> 주말 알림
              </div>
              <p className="text-xs text-muted-foreground">
                주말에도 알림을 받습니다
              </p>
            </div>
            <Switch
              checked={settings.weekend_reminders}
              onCheckedChange={(checked) => handleSettingChange('weekend_reminders', checked)}
              disabled={isSaving}
            />
          </div>

          <Separator />

          {/* Email Notifications */}
          <div className="flex items-center justify-between opacity-60">
            <div className="space-y-0.5">
              <div className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" /> 이메일 알림
              </div>
              <p className="text-xs text-muted-foreground">
                이메일로 알림을 받습니다 (향후 지원 예정)
              </p>
            </div>
            <Switch
              checked={settings.email_notifications}
              disabled
            />
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>알림 히스토리</CardTitle>
            {unreadCount > 0 && <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>}
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" className="gap-1 h-8" onClick={markAllAsRead}>
              <Check className="h-4 w-4" /> 모두 읽음
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">알림 히스토리가 없습니다.</p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {notifications.slice(0, 10).map((item: any) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-1 p-3 rounded-lg border text-sm transition-colors",
                      !item.is_read ? "bg-muted/50 border-primary/20" : "bg-card"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-medium flex items-center gap-2">
                        {item.title}
                        {!item.is_read && <span className="block h-2 w-2 rounded-full bg-blue-500" />}
                      </span>
                      {!item.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => markAsRead(item.id)}
                        >
                          읽음 처리
                        </Button>
                      )}
                    </div>
                    <p className="text-muted-foreground">{item.message}</p>
                    <span className="text-[10px] text-muted-foreground/60">
                      {new Date(item.sent_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}