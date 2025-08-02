'use client';

import React from 'react';
import Link from 'next/link';
import { Layout, Button, Space, Switch, Typography } from 'antd';
import { SunOutlined, MoonOutlined, BellOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/app/components/ThemeProvider';
import { useNotification } from '@/context/NotificationContext';

const { Header } = Layout;
const { Title, Paragraph } = Typography;

export default function MainHeader() {
  const { isDarkMode, setIsDarkMode } = useTheme();
  const { user, loading: authLoading, signOut } = useAuth();
  const { unreadCount } = useNotification();

  return (
    <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', backgroundColor: isDarkMode ? '#001529' : '#001529' }}>
      <Title level={3} style={{ color: 'white', margin: 0 }}>
        <Link href="/">FunCommute</Link>
      </Title>
      <Space align="center">
        <Switch
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          checked={isDarkMode}
          onChange={setIsDarkMode}
          style={{ marginRight: '20px' }}
        />
        {authLoading ? (
          <Typography.Text style={{ color: 'white' }}>로딩 중...</Typography.Text>
        ) : user ? (
          <Space align="center">
            <Typography.Text style={{ color: 'white', marginRight: '8px' }}>
              {user.user_metadata?.full_name || user.email?.split('@')[0]}
            </Typography.Text>
            <Link href="/ai-pm">
              <Button type="link" size="small" style={{ padding: '0 8px', color: 'white' }}>
                🤖 AI PM
              </Button>
            </Link>
            <Link href="/my-reports">
              <Button type="link" size="small" style={{ padding: '0 8px', color: 'white' }}>
                내 보고서
              </Button>
            </Link>
            <Link href="/report-generator">
              <Button type="link" size="small" style={{ padding: '0 8px', color: 'white' }}>
                리포트 요약
              </Button>
            </Link>
            <Link href="/notifications">
              <Button 
                type="link" 
                size="small" 
                style={{ padding: '0 8px', color: 'white', position: 'relative' }}
                icon={<BellOutlined />}
              >
                알림
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      backgroundColor: '#ff4d4f',
                      color: 'white',
                      borderRadius: '50%',
                      width: 16,
                      height: 16,
                      fontSize: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            {(user.email === 'jakeseol99@keduall.com' || user.user_metadata?.role === 'admin') && (
              <Link href="/admin">
                <Button type="link" size="small" style={{ padding: '0 8px', color: 'white' }}>
                  관리자
                </Button>
              </Link>
            )}
            <Button type="primary" danger onClick={signOut} size="small">
              로그아웃
            </Button>
          </Space>
        ) : (
          <Link href="/login">
            <Button type="primary" size="small">로그인</Button>
          </Link>
        )}
      </Space>
    </Header>
  );
} 