'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Badge, Button, Drawer, Layout, Menu, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  BarsOutlined,
  FileTextOutlined,
  RobotOutlined,
  ProfileOutlined,
  BellOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useTheme } from '@/app/components/ThemeProvider';

const { Sider } = Layout;

type NavKey =
  | '/'
  | '/ai-pm'
  | '/my-reports'
  | '/report-generator'
  | '/notifications'
  | '/profile'
  | '/admin';

function pickSelectedKey(pathname: string | null): NavKey | undefined {
  if (!pathname) return undefined;
  if (pathname.startsWith('/ai-pm')) return '/ai-pm';
  if (pathname.startsWith('/my-reports')) return '/my-reports';
  if (pathname.startsWith('/report-generator')) return '/report-generator';
  if (pathname.startsWith('/notifications')) return '/notifications';
  if (pathname.startsWith('/profile')) return '/profile';
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname === '/') return '/';
  return undefined;
}

export default function AppSidebar() {
  const { user, loading: authLoading, isAdmin, signOut } = useAuth();
  const { unreadCount } = useNotification();
  const { isDarkMode } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);

  const selectedKey = pickSelectedKey(pathname);

  const items = useMemo<MenuProps['items']>(() => {
    const base: MenuProps['items'] = [
      {
        key: '/',
        icon: <FileTextOutlined />,
        label: <Link href="/">보고서 작성</Link>,
      },
      {
        key: '/ai-pm',
        icon: <RobotOutlined />,
        label: <Link href="/ai-pm">AI PM</Link>,
      },
      {
        key: '/my-reports',
        icon: <ProfileOutlined />,
        label: <Link href="/my-reports">내 보고서</Link>,
      },
      {
        key: '/report-generator',
        icon: <SettingOutlined />,
        label: <Link href="/report-generator">리포트 요약</Link>,
      },
      {
        key: '/notifications',
        icon: (
          <Badge count={unreadCount} size="small" offset={[6, -2]}>
            <BellOutlined />
          </Badge>
        ),
        label: <Link href="/notifications">알림</Link>,
      },
      {
        key: '/profile',
        icon: <UserOutlined />,
        label: <Link href="/profile">프로필</Link>,
      },
    ];

    if (isAdmin) {
      base.push({
        key: '/admin',
        icon: <SettingOutlined />,
        label: <Link href="/admin">관리자</Link>,
      });
    }

    return base;
  }, [isAdmin, unreadCount]);

  const handleLogout = async () => {
    await signOut();
    router.replace('/landing');
  };

  const siderContent = (
    <div className="h-full flex flex-col">
      <div
        style={{
          padding: '16px 16px 12px 16px',
          borderBottom: `1px solid ${isDarkMode ? '#1f1f1f' : '#f0f0f0'}`,
        }}
      >
        <Typography.Text strong style={{ color: isDarkMode ? '#fff' : '#111827' }}>
          FunCommute
        </Typography.Text>
        <div style={{ marginTop: 6 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {authLoading ? '로딩 중...' : user ? (user.user_metadata?.full_name || user.email?.split('@')[0]) : ''}
          </Typography.Text>
        </div>
      </div>

      <div style={{ flex: 1, padding: 8 }}>
        <Menu
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={items}
          style={{
            borderInlineEnd: 0,
            background: 'transparent',
          }}
          onClick={() => setMobileOpen(false)}
        />
      </div>

      {!authLoading && user && (
        <div style={{ padding: 12, borderTop: `1px solid ${isDarkMode ? '#1f1f1f' : '#f0f0f0'}` }}>
          <Button danger block icon={<LogoutOutlined />} onClick={handleLogout}>
            로그아웃
          </Button>
        </div>
      )}
    </div>
  );

  // 모바일에서만 보이는 "메뉴 열기" 버튼 (헤더 없이도 접근 가능하게)
  const mobileTrigger = (
    <Button
      type="primary"
      icon={<BarsOutlined />}
      onClick={() => setMobileOpen(true)}
      style={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: 1000,
        borderRadius: 999,
      }}
      aria-label="메뉴 열기"
    />
  );

  return (
    <>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        width={260}
        theme={isDarkMode ? 'dark' : 'light'}
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        {siderContent}
      </Sider>

      {/* 모바일에서 Sider가 접히면 Drawer로 네비게이션 제공 */}
      {mobileTrigger}
      <Drawer
        title="메뉴"
        placement="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        width={300}
      >
        {siderContent}
      </Drawer>
    </>
  );
}


