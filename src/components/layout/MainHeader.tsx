'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { Layout, Button, Space, Switch, Typography, Drawer, Divider } from 'antd';
import { SunOutlined, MoonOutlined, BellOutlined, MenuOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/app/components/ThemeProvider';
import { useNotification } from '@/contexts/NotificationContext';
import { useRouter } from 'next/navigation';

const { Header } = Layout;

export default function MainHeader() {
  const { isDarkMode, setIsDarkMode } = useTheme();
  const { user, loading: authLoading, signOut } = useAuth();
  const { unreadCount } = useNotification();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/landing');
  }, [signOut, router]);

  return (
    <Header
      // 인라인 스타일은 SSR/CSR 모두 동일한 값이 되도록 isDarkMode의 초기값(false)을 사용합니다.
      style={{
        backgroundColor: isDarkMode ? '#0B1420' : '#001529',
        padding: '0 24px',
      }}
    >
      <div className="flex items-center justify-between w-full gap-2">
        <Link href="/landing" className="flex items-center gap-2 min-w-0 max-w-full" aria-label="FunCommute Home">
          <img
            src="/logo-funcommute.svg"
            alt="FunCommute"
            width={28}
            height={28}
            className="h-7 w-7 sm:h-8 sm:w-8"
          />
          <span className="text-white font-semibold tracking-wide text-base sm:text-lg truncate">
            FunCommute
          </span>
        </Link>
        <Space align="center" className="flex-shrink-0 gap-2">
          {/* 모바일 햄버거 - 부모에 sm:hidden 적용으로 데스크톱에서 제거 */}
          <span className="block sm:hidden">
            <Button
              aria-label="메뉴 열기"
              type="text"
              className="text-white"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
            />
          </span>
          {/* 다크 토글: 데스크톱에서만 */}
          <Switch
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
            checked={isDarkMode}
            onChange={setIsDarkMode}
            className="hidden sm:inline-flex"
          />
          {authLoading ? (
            <span className="hidden sm:inline">
              <Typography.Text style={{ color: 'white' }}>로딩 중...</Typography.Text>
            </span>
          ) : user ? (
            <div className="hidden sm:flex items-center">
             <Space align="center" className="gap-1">
            <Typography.Text className="hidden sm:inline" style={{ color: 'white', marginRight: 8 }}>
              {user.user_metadata?.full_name || user.email?.split('@')[0]}
            </Typography.Text>
            <Link href="/">
                 <Button type="link" size="small" className="px-2 text-white hidden sm:inline-block">
                📝 보고서 작성
              </Button>
            </Link>
            <Link href="/ai-pm">
                 <Button type="link" size="small" className="px-2 text-white hidden sm:inline-block">
                🤖 AI PM
              </Button>
            </Link>
            <Link href="/my-reports">
                 <Button type="link" size="small" className="px-2 text-white hidden sm:inline-block">
                내 보고서
              </Button>
            </Link>
            <Link href="/report-generator">
                 <Button type="link" size="small" className="px-2 text-white hidden md:inline-block">
                리포트 요약
              </Button>
            </Link>
            <Link href="/notifications">
                 <Button type="link" size="small" className="px-2 text-white relative" icon={<BellOutlined />}>
                알림
                {unreadCount > 0 && (
                     <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/profile">
                 <Button type="link" size="small" className="px-2 text-white hidden sm:inline-block">
                 ???
                 </Button>
            </Link>
            {(user.email === 'jakeseol99@keduall.com' || user.user_metadata?.role === 'admin') && (
              <Link href="/admin">
                <Button type="link" size="small" style={{ padding: '0 8px', color: 'white' }}>
                  관리자
                </Button>
              </Link>
            )}
               <Button type="primary" danger onClick={handleSignOut} size="small" className="ml-1">
              로그아웃
            </Button>
             </Space>
            </div>
        ) : (
            <Link href="/login" className="hidden sm:inline-block">
            <Button type="primary" size="small">로그인</Button>
          </Link>
        )}
        </Space>
      </div>
      {/* 모바일 드로어 메뉴 */}
      <Drawer
        title={
          <div className="flex items-center justify-between">
            <span className="font-semibold">메뉴</span>
            <Switch
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              checked={isDarkMode}
              onChange={setIsDarkMode}
            />
          </div>
        }
        placement="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        width={300}
      >
        {authLoading ? (
          <Typography.Text>로딩 중...</Typography.Text>
        ) : user ? (
          <div className="flex flex-col gap-2">
            <Typography.Text className="mb-2">{user.user_metadata?.full_name || user.email?.split('@')[0]}</Typography.Text>
            <Link href="/"><Button block type="text">📝 보고서 작성</Button></Link>
            <Link href="/ai-pm"><Button block type="text">🤖 AI PM</Button></Link>
            <Link href="/my-reports"><Button block type="text">내 보고서</Button></Link>
            <Link href="/report-generator"><Button block type="text">리포트 요약</Button></Link>
            <Link href="/notifications"><Button block type="text" icon={<BellOutlined />}>알림{unreadCount ? ` (${unreadCount})` : ''}</Button></Link>
            <Link href="/profile"><Button block type="text">???</Button></Link>
            {(user.email === 'jakeseol99@keduall.com' || user.user_metadata?.role === 'admin') && (
              <Link href="/admin"><Button block type="text">관리자</Button></Link>
            )}
            <Divider className="my-3" />
            <Button block danger type="primary" onClick={handleSignOut}>로그아웃</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link href="/login"><Button block type="primary">로그인</Button></Link>
          </div>
        )}
      </Drawer>
    </Header>
  );
} 
