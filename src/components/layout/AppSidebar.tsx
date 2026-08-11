'use client';

import React, { useMemo, useRef, useState } from 'react';
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

const menuItemStyle = {
  minHeight: 44,
  lineHeight: '44px',
} satisfies React.CSSProperties;

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
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

  const selectedKey = pickSelectedKey(pathname);

  const handleMobileClose = () => {
    setMobileOpen(false);
    window.requestAnimationFrame(() => mobileTriggerRef.current?.focus());
  };

  const items = useMemo<MenuProps['items']>(() => {
    const base: MenuProps['items'] = [
      {
        key: '/',
        icon: <FileTextOutlined />,
        style: menuItemStyle,
        label: <Link href="/" style={{ display: 'flex', alignItems: 'center', minHeight: 44, width: '100%' }}>보고서 작성</Link>,
      },
      {
        key: '/ai-pm',
        icon: <RobotOutlined />,
        style: menuItemStyle,
        label: <Link href="/ai-pm" style={{ display: 'flex', alignItems: 'center', minHeight: 44, width: '100%' }}>AI PM</Link>,
      },
      {
        key: '/my-reports',
        icon: <ProfileOutlined />,
        style: menuItemStyle,
        label: <Link href="/my-reports" style={{ display: 'flex', alignItems: 'center', minHeight: 44, width: '100%' }}>내 보고서</Link>,
      },
      {
        key: '/report-generator',
        icon: <SettingOutlined />,
        style: menuItemStyle,
        label: <Link href="/report-generator" style={{ display: 'flex', alignItems: 'center', minHeight: 44, width: '100%' }}>리포트 요약</Link>,
      },
      {
        key: '/notifications',
        style: menuItemStyle,
        icon: (
          <Badge count={unreadCount} size="small" offset={[6, -2]}>
            <BellOutlined />
          </Badge>
        ),
        label: <Link href="/notifications" style={{ display: 'flex', alignItems: 'center', minHeight: 44, width: '100%' }}>알림</Link>,
      },
      {
        key: '/profile',
        icon: <UserOutlined />,
        style: menuItemStyle,
        label: <Link href="/profile" style={{ display: 'flex', alignItems: 'center', minHeight: 44, width: '100%' }}>프로필</Link>,
      },
    ];

    if (isAdmin) {
      base.push({
        key: '/admin',
        icon: <SettingOutlined />,
        style: menuItemStyle,
        label: <Link href="/admin" style={{ display: 'flex', alignItems: 'center', minHeight: 44, width: '100%' }}>관리자</Link>,
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
          onClick={() => {
            if (mobileOpen) handleMobileClose();
          }}
        />
      </div>

      {!authLoading && user && (
        <div style={{ padding: 12, borderTop: `1px solid ${isDarkMode ? '#1f1f1f' : '#f0f0f0'}` }}>
          <Button danger block icon={<LogoutOutlined />} onClick={handleLogout} style={{ minHeight: 44 }}>
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
      className="mobile-sidebar-trigger"
      style={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: 1000,
        borderRadius: 999,
        minWidth: 44,
        minHeight: 44,
      }}
      aria-label="메뉴 열기"
      ref={mobileTriggerRef}
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
        onClose={handleMobileClose}
        width={300}
        styles={{ body: { overflowX: 'hidden', padding: 0 } }}
      >
        {siderContent}
      </Drawer>
    </>
  );
}
