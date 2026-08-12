import { expect, test } from '@playwright/test';
import { authCredentialsFor, logout, resetEmailFor } from './account/account-helpers';
import { TestHelpers, type TestUser } from './utils/test-helpers';

test.describe('authentication navigation contract', () => {
  test('QA-AUTH-001 protected routes preserve the safe requested path', async ({ page }) => {
    for (const path of ['/', '/my-reports', '/report-generator', '/notifications', '/profile', '/admin', '/ai-pm']) {
      await page.context().clearCookies();
      await page.goto(path);
      await page.waitForURL((url) => url.pathname === '/login');
      expect(new URL(page.url()).searchParams.get('redirect')).toBe(path);
    }
  });

  test('QA-AUTH-003 invalid credentials remain on login with a user-visible error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill('invalid@example.com');
    await page.getByLabel('비밀번호').fill('invalid-password');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    const loginError = page.locator('form').getByRole('alert').filter({
      hasText: /(?:아이디 혹은 비밀번호가 틀렸습니다\. 다시 확인해주세요\.|로그인 중 오류가 발생했습니다\.|Supabase is not configured\. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY\.)/i,
    });
    await expect(loginError).toHaveCount(1);
    await expect(loginError).toBeVisible();
    await expect(loginError).toHaveText(
      /^(?:아이디 혹은 비밀번호가 틀렸습니다\. 다시 확인해주세요\.|로그인 중 오류가 발생했습니다\.|Supabase is not configured\. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY\.)$/i,
    );
    await expect(loginError).not.toContainText(/(?:stack trace|SUPABASE_SERVICE_ROLE_KEY|service_role|eyJ[A-Za-z0-9_-]{20,})/i);
  });

  test('QA-RESET-002 reset callback remains public without a session', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/reset-password#access_token=test-token&type=recovery');

    await expect(page).toHaveURL(/\/reset-password#access_token=test-token&type=recovery$/);
    await expect(page.getByRole('heading', { name: '비밀번호 재설정' })).toBeVisible();
  });

  test('QA-AUTH-002 valid login honors a safe requested destination', async ({ page }) => {
    const auth = authCredentialsFor();
    test.skip(!auth, 'local loopback Supabase or explicit E2E_AUTH credentials are required');
    if (!auth) return;
    await page.goto('/login?redirect=%2Fmy-reports');
    await page.getByLabel('이메일').fill(auth.email);
    await page.getByLabel('비밀번호').fill(auth.password);
    await page.getByRole('button', { name: '로그인' }).click();

    await page.waitForURL((url) => url.pathname === '/my-reports');
  });

  test('QA-AUTH-004 authenticated login bypasses to the safe destination', async ({ page }) => {
    const auth = authCredentialsFor();
    test.skip(!auth, 'local loopback Supabase or explicit E2E_AUTH credentials are required');
    if (!auth) return;
    await page.goto('/login');
    await page.getByLabel('이메일').fill(auth.email);
    await page.getByLabel('비밀번호').fill(auth.password);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL((url) => url.pathname === '/');

    await page.goto('/login?redirect=%2Fmy-reports');
    await page.waitForURL((url) => url.pathname === '/my-reports');
  });

  test('QA-AUTH-005 logout returns to the public landing page', async ({ page }) => {
    const auth = authCredentialsFor();
    test.skip(!auth, 'local loopback Supabase or explicit E2E_AUTH credentials are required');
    if (!auth) return;
    await page.goto('/login');
    await page.getByLabel('이메일').fill(auth.email);
    await page.getByLabel('비밀번호').fill(auth.password);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL((url) => url.pathname === '/');

    await logout(page);
  });

  test('QA-SHELL-002 authenticated desktop sidebar selects each route and logout lands on landing', async ({ page }) => {
    const auth = authCredentialsFor();
    test.skip(!auth, 'local loopback Supabase or explicit E2E_AUTH credentials are required');
    if (!auth) return;
    const helper = new TestHelpers(page);
    const user: TestUser = {
      email: auth.email,
      password: auth.password,
      role: auth.role,
      name: auth.name,
    };
    await helper.login(user);

    const routes = [
      { label: '보고서 작성', path: '/' },
      { label: 'AI PM', path: '/ai-pm' },
      { label: '내 보고서', path: '/my-reports' },
      { label: '리포트 요약', path: '/report-generator' },
      { label: '알림', path: '/notifications' },
      { label: '프로필', path: '/profile' },
      ...(auth.role === 'admin' ? [{ label: '관리자', path: '/admin' }] : []),
    ] as const;

    for (const route of routes) {
      const link = page.getByRole('link', { name: route.label, exact: true });
      await expect(link).toBeVisible();
      await link.click();
      await page.waitForURL((url) => url.pathname === route.path);
      await expect(page.locator(`li.ant-menu-item-selected a[href="${route.path}"]`)).toHaveCount(1);
    }

    await logout(page);
  });

  test('QA-RESET-001 reset request uses the public callback URL', async ({ page }) => {
    const resetEmail = resetEmailFor();
    test.skip(!resetEmail, 'local loopback Supabase or explicit E2E_RESET_EMAIL is required');
    if (!resetEmail) return;
    await page.goto('/login');
    await page.getByLabel('이메일').fill(resetEmail);
    const recover = page.waitForRequest((request) => request.url().includes('/auth/v1/recover'));
    await page.getByRole('button', { name: '비밀번호를 잊으셨나요?' }).click();
    const request = await recover;
    expect(request.postDataJSON()).toMatchObject({ email: resetEmail });
    expect(new URL(request.url()).searchParams.get('redirect_to')).toBe(
      `${new URL(page.url()).origin}/reset-password`,
    );
    const resetFeedback = page.getByRole('alert').filter({
      hasText: '비밀번호 재설정 링크가 이메일로 전송되었습니다.',
    });
    await expect(resetFeedback).toBeVisible();
    await expect(resetFeedback).toHaveText('비밀번호 재설정 링크가 이메일로 전송되었습니다.');
  });
});
