'use client';

import React from 'react';
import { Layout } from 'antd';
import { useTheme } from '@/app/components/ThemeProvider';
import NotificationSettings from '@/app/components/NotificationSettings';

const { Content } = Layout;

export default function NotificationsPage() {
  const { isDarkMode, setIsDarkMode } = useTheme();

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
