'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { useNotification } from '@/context/NotificationContext';
import { useRouter } from 'next/navigation';
import { Bell, Menu, Moon, Sun, FileText, Bot, FileStack, Settings, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
// import { Switch } from '@/components/ui/switch'; // Switch functionality moved to button toggle or dropdown

export default function MainHeader() {
  const { setTheme, theme } = useTheme();
  const { user, loading: authLoading, signOut } = useAuth();
  const { unreadCount } = useNotification();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/landing');
    setMobileMenuOpen(false);
  }, [signOut, router]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2" aria-label="FunCommute Home">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg">
              <Image
                src="/logo-funcommute.svg"
                alt="FunCommute"
                fill
                className="object-cover"
                priority
              />
            </div>
            <span className="hidden font-bold sm:inline-block">FunCommute</span>
          </Link>

          {authLoading ? (
            <span className="text-sm text-muted-foreground hidden md:inline-block">Loading...</span>
          ) : user ? (
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
              <Link href="/" className="transition-colors hover:text-foreground/80 text-foreground/60">보고서 작성</Link>
              <Link href="/ai-pm" className="transition-colors hover:text-foreground/80 text-foreground/60">AI PM</Link>
              <Link href="/my-reports" className="transition-colors hover:text-foreground/80 text-foreground/60">내 보고서</Link>
              <Link href="/report-generator" className="transition-colors hover:text-foreground/80 text-foreground/60">리포트 요약</Link>
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="hidden sm:flex"
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {authLoading ? (
            <div className="hidden sm:block h-8 w-8 animate-pulse bg-muted rounded-full" />
          ) : user ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </Link>

              {(user.email === 'jakeseol99@keduall.com' || user.user_metadata?.role === 'admin') && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm">관리자</Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                로그아웃
              </Button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login">
                <Button size="sm">로그인</Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>FunCommute</SheetTitle>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">테마 변경</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                </div>
                <Separator />

                {user ? (
                  <>
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      {user.user_metadata?.full_name || user.email}
                    </div>
                    <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-2 py-1 text-sm font-medium hover:underline">
                      <FileText className="h-4 w-4" /> 보고서 작성
                    </Link>
                    <Link href="/ai-pm" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-2 py-1 text-sm font-medium hover:underline">
                      <Bot className="h-4 w-4" /> AI PM
                    </Link>
                    <Link href="/my-reports" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-2 py-1 text-sm font-medium hover:underline">
                      <FileStack className="h-4 w-4" /> 내 보고서
                    </Link>
                    <Link href="/report-generator" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-2 py-1 text-sm font-medium hover:underline">
                      <FileText className="h-4 w-4" /> 리포트 요약
                    </Link>
                    <Link href="/notifications" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-2 py-1 text-sm font-medium hover:underline">
                      <Bell className="h-4 w-4" /> 알림 {unreadCount > 0 && `(${unreadCount})`}
                    </Link>
                    {(user.email === 'jakeseol99@keduall.com' || user.user_metadata?.role === 'admin') && (
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-2 py-1 text-sm font-medium hover:underline">
                        <Settings className="h-4 w-4" /> 관리자
                      </Link>
                    )}
                    <Separator />
                    <Button variant="destructive" onClick={handleSignOut} className="w-full justify-start mt-2">
                      <LogOut className="mr-2 h-4 w-4" /> 로그아웃
                    </Button>
                  </>
                ) : (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">로그인</Button>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
