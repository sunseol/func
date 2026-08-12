import { test, expect } from '@playwright/test';
import { credentialsFor, login, serviceEnvironmentReady } from './account-helpers';

const user = credentialsFor('user');

test.describe('shell and error scenarios', () => {
  test('QA-ERROR-001 Given an unknown public URL, When the route is loaded, Then the 404 recovery UI is shown without a stack trace', async ({ page }) => {
    const missingPath = `/qa-missing-${Date.now().toString(36)}`;
    const response = await page.goto(missingPath);
    expect(response?.status()).toBe(404);
    expect(new URL(page.url()).pathname).toBe(missingPath);
    await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다' })).toBeVisible();
    await expect(page.getByRole('link', { name: '홈으로 가기' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Error:|at [A-Za-z_$]/);
    await page.getByRole('link', { name: '홈으로 가기' }).click();
    await page.waitForURL((url) => url.pathname === '/landing');
  });

  test('QA-SHELL-001 Given a public auth form, When the theme switch is changed, Then the root class and persisted localStorage theme survive reload', async ({ page }) => {
    await page.goto('/signup');
    const themeSwitch = page.getByRole('switch').first();
    await themeSwitch.click();
    await expect.poll(async () => page.locator('html').getAttribute('class')).toContain('dark');
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('darkMode'))).toBe('true');
    await page.reload();
    await expect.poll(async () => page.locator('html').getAttribute('class')).toContain('dark');
    await themeSwitch.click();
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('darkMode'))).toBe('false');
  });

  test('QA-SHELL-003 Given a signed-in mobile viewport, When the hamburger drawer is opened and escaped, Then the drawer closes, focus returns, and no horizontal overflow exists', async ({ page }, testInfo) => {
    testInfo.skip(!user || !serviceEnvironmentReady(), 'blocked-env: E2E_USER credentials and Supabase service credentials are required.');
    if (!user) return;
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, user);
    await expect(page.getByRole('button', { name: '메뉴 열기' })).toBeVisible();
    await page.getByRole('button', { name: '메뉴 열기' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const touchTargets = page.getByRole('dialog').getByRole('link');
    const targetCount = await touchTargets.count();
    for (let index = 0; index < targetCount; index += 1) {
      const box = await touchTargets.nth(index).boundingBox();
      expect(box).not.toBeNull();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('button', { name: '메뉴 열기' })).toBeFocused();
  });

  test('QA-SHELL-004 Given a signed-in mobile page, When the browser goes offline and returns online, Then the offline banner and recovery transition are observable', async ({ page, context }, testInfo) => {
    testInfo.skip(!user || !serviceEnvironmentReady(), 'blocked-env: E2E_USER credentials and Supabase service credentials are required.');
    if (!user) return;
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, user);
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect.poll(async () => page.evaluate(() => navigator.onLine)).toBe(false);
    await expect(page.getByText('인터넷 연결이 끊어졌습니다')).toBeVisible();
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect.poll(async () => page.evaluate(() => navigator.onLine)).toBe(true);
    await expect(page.getByText('인터넷 연결이 끊어졌습니다')).toBeHidden();
  });

  test('QA-SHELL-005 Given the public login form, When keyboard focus traverses its controls, Then labels, roles, and submit focus are exposed without an unlabeled control', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('이메일')).toHaveAttribute('type', 'email');
    await expect(page.getByLabel('비밀번호')).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
    await page.getByLabel('이메일').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('비밀번호')).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focusedRole = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.getAttribute('role') ?? document.activeElement?.tagName ?? '');
    expect(focusedRole).not.toBe('');
    const unlabeledInputs = await page.locator('input').evaluateAll((elements) => elements.filter((element) => !element.getAttribute('aria-label') && !element.getAttribute('placeholder')).length);
    expect(unlabeledInputs).toBe(0);
    await expect(page.getByRole('link', { name: '회원가입' })).toHaveAttribute('href', '/signup');
  });
});
