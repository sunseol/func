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
      <Content className="px-3 sm:px-6 md:px-12 py-6" style={{ transition: 'background-color 0.3s' }}>
        <div className="rounded-lg" style={{ background: isDarkMode ? '#141414' : '#fff', padding: 12, transition: 'background-color 0.3s' }}>
          <NotificationSettings />
        </div>
      </Content>
    </Layout>
  );
}