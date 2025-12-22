'use client';

import React, { useState } from 'react';
import { Card, Switch, TimePicker, Button, Space, Typography, Divider, List, Badge, App } from 'antd';
import { BellOutlined, SettingOutlined, CheckOutlined } from '@ant-design/icons';
import { useNotification } from '@/contexts/NotificationContext';
import { useTheme } from '@/app/components/ThemeProvider';
import dayjs from 'dayjs';

const { Text } = Typography;

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

  const { isDarkMode } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const { message: messageApi } = App.useApp();

  const handleSettingChange = async (key: string, value: any) => {
    if (!settings) return;

    setIsSaving(true);
    try {
      await updateSettings({ [key]: value });
      messageApi.success('알림 설정이 저장되었습니다.');
    } catch (err) {
      messageApi.error('알림 설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimeChange = async (key: string, time: dayjs.Dayjs | null) => {
    if (!time || !settings) return;

    const timeString = time.format('HH:mm:ss');
    await handleSettingChange(key, timeString);
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      messageApi.success('브라우저 알림 권한이 허용되었습니다.');
      sendBrowserNotification('알림 테스트', '알림이 정상적으로 작동합니다! 🎉');
    } else {
      messageApi.error('브라우저 알림 권한이 거부되었습니다.');
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
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span style={{ color: isDarkMode ? '#fff' : '#000' }}>알림 설정</span>
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
                  checked={settings.browser_notifications}
                  onChange={(checked) => handleSettingChange('browser_notifications', checked)}
                  loading={isSaving}
                />
              </div>
              
              {settings.browser_notifications && (
                <Space>
                  <Button size="small" onClick={handleRequestPermission}>
                    권한 요청
                  </Button>
                  <Button size="small" onClick={handleTestNotification}>
                    테스트 알림
                  </Button>
                </Space>
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
                checked={settings.morning_reminder_enabled}
                onChange={(checked) => handleSettingChange('morning_reminder_enabled', checked)}
                loading={isSaving}
              />
            </div>
            
            {settings.morning_reminder_enabled && (
              <div style={{ marginLeft: 16 }}>
                <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>알림 시간: </Text>
                <TimePicker
                  value={dayjs(settings.morning_reminder_time, 'HH:mm:ss')}
                  format="HH:mm"
                  onChange={(time) => handleTimeChange('morning_reminder_time', time)}
                  size="small"
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
                checked={settings.evening_reminder_enabled}
                onChange={(checked) => handleSettingChange('evening_reminder_enabled', checked)}
                loading={isSaving}
              />
            </div>
            
            {settings.evening_reminder_enabled && (
              <div style={{ marginLeft: 16 }}>
                <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>알림 시간: </Text>
                <TimePicker
                  value={dayjs(settings.evening_reminder_time, 'HH:mm:ss')}
                  format="HH:mm"
                  onChange={(time) => handleTimeChange('evening_reminder_time', time)}
                  size="small"
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
              checked={settings.weekend_reminders}
              onChange={(checked) => handleSettingChange('weekend_reminders', checked)}
              loading={isSaving}
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
              checked={settings.email_notifications}
              onChange={(checked) => handleSettingChange('email_notifications', checked)}
              loading={isSaving}
              disabled
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
            <Button size="small" icon={<CheckOutlined />} onClick={markAllAsRead}>
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
            renderItem={(item: any) => (
              <List.Item
                key={item.id}
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
                      icon={<CheckOutlined />}
                      onClick={() => markAsRead(item.id)}
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
