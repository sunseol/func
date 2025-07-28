'use client';

import React from 'react';
import { Layout, Typography, Button, Space, Switch, Avatar } from 'antd';
import { LogoutOutlined, UserOutlined, SunOutlined, MoonOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useTheme } from '@/app/components/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import NotificationSettings from '@/app/components/NotificationSettings';
import Link from 'next/link';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function NotificationsPage() {
  const { isDarkMode, setIsDarkMode } = useTheme();
  const { user, handleLogout } = useAuth();

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: isDarkMode ? '#001529' : '#f0f2f5' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          width: '100%',
          backgroundColor: isDarkMode ? '#001529' : '#fff',
          borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
          padding: '0 24px',
          transition: 'background-color 0.3s, border-color 0.3s',
        }}
      >
        <Space align="center">
          <Link href="/" passHref>
            <Button icon={<ArrowLeftOutlined />} type="text" style={{ color: isDarkMode ? '#fff' : '#000' }}>
              돌아가기
            </Button>
          </Link>
          <Link href="/ai-pm" passHref>
            <Button type="text" style={{ color: isDarkMode ? '#fff' : '#000' }}>
              🤖 AI PM
            </Button>
          </Link>
          <Title level={3} style={{ margin: 0, color: isDarkMode ? '#fff' : '#000' }}>
            알림 설정
          </Title>
        </Space>
        
        <Space align="center" size="middle">
          <Switch
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
            checked={isDarkMode}
            onChange={setIsDarkMode}
          />
          {user && (
            <>
              <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
              <Typography.Text style={{ color: isDarkMode ? 'rgba(255,255,255,0.85)' : '#000' }}>
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </Typography.Text>
              <Button icon={<LogoutOutlined />} onClick={handleLogout} ghost={!isDarkMode}>
                로그아웃
              </Button>
            </>
          )}
        </Space>
      </Header>
      
      <Content style={{ padding: '24px 48px', transition: 'background-color 0.3s' }}>
        <div 
          style={{
            background: isDarkMode ? '#141414' : '#fff',
            padding: 24,
            borderRadius: 8,
            transition: 'background-color 0.3s'
          }}
        >
          <NotificationSettings />
        </div>
      </Content>
    </Layout>
  );
}