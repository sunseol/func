'use client';

import React, { useState } from 'react';
import { Alert, Card, Switch, TimePicker, Button, Space, Typography, Divider, List, Badge, App } from 'antd';
import { BellOutlined, SettingOutlined, CheckOutlined } from '@ant-design/icons';
import { useNotification, type NotificationHistory, type NotificationSettings as NotificationSettingsRecord } from '@/contexts/NotificationContext';
import { useTheme } from '@/app/components/ThemeProvider';
import dayjs from 'dayjs';

const { Text } = Typography;

type EditableSettingKey =
  | 'browser_notifications'
  | 'morning_reminder_enabled'
  | 'morning_reminder_time'
  | 'evening_reminder_enabled'
  | 'evening_reminder_time'
  | 'weekend_reminders'
  | 'email_notifications';
type EditableSettingValue = NotificationSettingsRecord[EditableSettingKey];

export default function NotificationSettings() {
  const {
    settings,
    notifications,
    unreadCount,
    loading,
    loadError,
    updateSettings,
    markAsRead,
    markAllAsRead,
    requestNotificationPermission,
    sendBrowserNotification,
  } = useNotification();

  const { isDarkMode } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [permissionResult, setPermissionResult] = useState<'granted' | 'denied' | null>(null);
  const { message: messageApi } = App.useApp();

  const handleSettingChange = async (key: EditableSettingKey, value: EditableSettingValue) => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const patch: Partial<NotificationSettingsRecord> = { [key]: value };
      await updateSettings(patch);
      messageApi.success('알림 설정이 저장되었습니다.');
    } catch (error) {
      console.error('Notification settings save error:', error);
      messageApi.error('알림 설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimeChange = async (
    key: 'morning_reminder_time' | 'evening_reminder_time',
    time: dayjs.Dayjs | null,
  ) => {
    if (!time || !settings) return;

    const timeString = time.format('HH:mm:ss');
    await handleSettingChange(key, timeString);
  };

  const handleRequestPermission = async () => {
    setPermissionResult(null);
    try {
      const granted = await requestNotificationPermission();
      setPermissionResult(granted ? 'granted' : 'denied');
      if (granted) {
        sendBrowserNotification('알림 테스트', '알림이 정상적으로 작동합니다! 🎉');
      }
    } catch (error) {
      console.error('Browser notification permission request failed:', error);
      setPermissionResult('denied');
    }
  };

  const handleTestNotification = () => {
    sendBrowserNotification('테스트 알림', '알림 기능이 정상적으로 작동합니다! 🔔');
  };

  if (loading) {
    return <Card loading />;
  }

  if (!settings) {
    return (
      <Card>
        <Text>알림 설정을 불러올 수 없습니다.</Text>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {loadError && <Alert type="warning" showIcon message={loadError} />}
      <Card
        title={
          <Space>
            <SettingOutlined />
            <h2
              style={{
                color: isDarkMode ? '#fff' : '#000',
                fontSize: 'inherit',
                fontWeight: 'inherit',
                margin: 0,
              }}
            >
              알림 설정
            </h2>
          </Space>
        }
        style={{
          backgroundColor: isDarkMode ? '#1f1f1f' : '#fff',
          borderColor: isDarkMode ? '#434343' : '#d9d9d9'
        }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ color: isDarkMode ? '#fff' : '#000' }}>브라우저 알림</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px', color: isDarkMode ? '#999' : '#666' }}>
                    브라우저에서 데스크톱 알림을 받습니다
                  </Text>
                </div>
                <Switch
                  className="notification-switch-touch-target"
                  aria-label="브라우저 알림"
                  checked={settings.browser_notifications}
                  onChange={(checked) => handleSettingChange('browser_notifications', checked)}
                  loading={isSaving}
                  style={{ width: 44, minWidth: 44, height: 44, minHeight: 44 }}
                />
              </div>
              
              <Space>
                <Button size="small" onClick={handleRequestPermission} style={{ minHeight: 44 }}>
                  권한 요청
                </Button>
                <Button size="small" onClick={handleTestNotification} style={{ minHeight: 44 }}>
                  테스트 알림
                </Button>
              </Space>
              {permissionResult && (
                <Alert
                  role="alert"
                  type={permissionResult === 'granted' ? 'success' : 'error'}
                  showIcon
                  message={`브라우저 알림 권한이 ${permissionResult === 'granted' ? '허용' : '거부'}되었습니다.`}
                />
              )}
            </Space>
          </div>

          <Divider />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <Text strong style={{ color: isDarkMode ? '#fff' : '#000' }}>🌅 출근 보고서 알림</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px', color: isDarkMode ? '#999' : '#666' }}>
                  출근 보고서 작성 시간을 알려드립니다
                </Text>
              </div>
              <Switch
                className="notification-switch-touch-target"
                aria-label="출근 보고서 알림"
                checked={settings.morning_reminder_enabled}
                onChange={(checked) => handleSettingChange('morning_reminder_enabled', checked)}
                loading={isSaving}
              />
            </div>
            
            {settings.morning_reminder_enabled && (
              <div style={{ marginLeft: 16 }}>
                <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>알림 시간: </Text>
                <TimePicker
                  className="notification-time-picker"
                  value={dayjs(settings.morning_reminder_time, 'HH:mm:ss')}
                  format="HH:mm"
                  onChange={(time) => handleTimeChange('morning_reminder_time', time)}
                  size="large"
                  style={{ minWidth: 91, minHeight: 44 }}
                />
              </div>
            )}
          </div>

          <Divider />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <Text strong style={{ color: isDarkMode ? '#fff' : '#000' }}>🌙 퇴근 보고서 알림</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px', color: isDarkMode ? '#999' : '#666' }}>
                  퇴근 보고서 작성 시간을 알려드립니다
                </Text>
              </div>
              <Switch
                className="notification-switch-touch-target"
                aria-label="퇴근 보고서 알림"
                checked={settings.evening_reminder_enabled}
                onChange={(checked) => handleSettingChange('evening_reminder_enabled', checked)}
                loading={isSaving}
                style={{ width: 44, minWidth: 44, height: 44, minHeight: 44 }}
              />
            </div>
            
            {settings.evening_reminder_enabled && (
              <div style={{ marginLeft: 16 }}>
                <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>알림 시간: </Text>
                <TimePicker
                  className="notification-time-picker"
                  value={dayjs(settings.evening_reminder_time, 'HH:mm:ss')}
                  format="HH:mm"
                  onChange={(time) => handleTimeChange('evening_reminder_time', time)}
                  size="large"
                  style={{ minWidth: 91, minHeight: 44 }}
                />
              </div>
            )}
          </div>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong style={{ color: isDarkMode ? '#fff' : '#000' }}>주말 알림</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px', color: isDarkMode ? '#999' : '#666' }}>
                주말에도 알림을 받습니다
              </Text>
            </div>
            <Switch
              className="notification-switch-touch-target"
              aria-label="주말 알림"
              checked={settings.weekend_reminders}
              onChange={(checked) => handleSettingChange('weekend_reminders', checked)}
              loading={isSaving}
              style={{ width: 44, minWidth: 44, height: 44, minHeight: 44 }}
            />
          </div>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong style={{ color: isDarkMode ? '#fff' : '#000' }}>이메일 알림</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px', color: isDarkMode ? '#999' : '#666' }}>
                이메일로 알림을 받습니다 (향후 지원 예정)
              </Text>
            </div>
            <Switch
              className="notification-switch-touch-target"
              aria-label="이메일 알림"
              checked={settings.email_notifications}
              onChange={(checked) => handleSettingChange('email_notifications', checked)}
              loading={isSaving}
              disabled
              style={{ width: 44, minWidth: 44, height: 44, minHeight: 44 }}
            />
          </div>
        </Space>
      </Card>

      <Card
        title={
          <Space>
            <BellOutlined />
            <span style={{ color: isDarkMode ? '#fff' : '#000' }}>알림 히스토리</span>
            {unreadCount > 0 && <Badge count={unreadCount} />}
          </Space>
        }
        style={{
          backgroundColor: isDarkMode ? '#1f1f1f' : '#fff',
          borderColor: isDarkMode ? '#434343' : '#d9d9d9'
        }}
        extra={
          unreadCount > 0 && (
            <Button size="small" aria-label="모두 읽음" icon={<CheckOutlined />} onClick={markAllAsRead} style={{ minHeight: 44 }}>
              모두 읽음
            </Button>
          )
        }
      >
        {notifications.length === 0 ? (
          <Text type="secondary" style={{ color: isDarkMode ? '#999' : '#666' }}>알림 히스토리가 없습니다.</Text>
        ) : (
          <List
            dataSource={notifications.slice(0, 10).filter(item => item && item.id)}
            renderItem={(item: NotificationHistory) => (
              <List.Item
                key={item.id}
                aria-label={`알림: ${item.title}`}
                style={{
                  backgroundColor: item.is_read 
                    ? 'transparent' 
                    : isDarkMode 
                      ? '#1f3a1f' 
                      : '#f6ffed',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  border: isDarkMode ? '1px solid #434343' : '1px solid #d9d9d9'
                }}
                actions={[
                  !item.is_read && (
                    <Button
                      key="read"
                      type="link"
                      size="small"
                      aria-label="읽음"
                      icon={<CheckOutlined />}
                      onClick={() => markAsRead(item.id)}
                      style={{ minHeight: 44, paddingInline: 12 }}
                    >
                      읽음
                    </Button>
                  ),
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span style={{ color: isDarkMode ? '#fff' : '#000' }}>{item.title}</span>
                      {!item.is_read && <Badge status="processing" />}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <Text style={{ color: isDarkMode ? '#ccc' : '#000' }}>{item.message}</Text>
                      <Text type="secondary" style={{ fontSize: '12px', color: isDarkMode ? '#999' : '#666' }}>
                        {new Date(item.sent_at).toLocaleString('ko-KR')}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
}
