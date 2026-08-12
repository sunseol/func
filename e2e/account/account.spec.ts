import { test, expect } from '@playwright/test';
import {
  beginAccountSeed,
  cleanupAuthUser,
  cleanupRows,
  credentialsFor,
  login,
  readProfileName,
  restoreProfileName,
  RUN_ID,
  seedNotification,
  serviceEnvironmentReady,
} from './account-helpers';

const admin = credentialsFor('admin');
const user = credentialsFor('user');

test.describe('account and notification scenarios', () => {
  test('QA-SIGN-001 Given a unique signup identity, When the form is submitted, Then confirmation feedback is shown and the disposable auth user is removed', async ({ page }, testInfo) => {
    testInfo.skip(!serviceEnvironmentReady(), 'blocked-env: Supabase service credentials are required for signup cleanup.');
    const email = `qa-${RUN_ID}@example.test`;
    const password = `qa-${RUN_ID}-pw`;
    try {
      await page.goto('/signup');
      const signup = page.waitForRequest((request) => request.url().includes('/auth/v1/signup'));
      await page.getByPlaceholder('이름').fill(`QA Signup ${RUN_ID}`);
      await page.getByPlaceholder('이메일').fill(email);
      await page.getByPlaceholder('비밀번호 (6자 이상)').fill(password);
      await page.getByRole('button', { name: '회원가입' }).click();
      const signupRequest = await signup;
      expect(signupRequest.method()).toBe('POST');
      const signupAlert = page
        .locator('.ant-alert[role="alert"]')
        .filter({ hasText: '가입 요청을 처리했습니다' });
      await expect(signupAlert).toBeVisible();
      await expect(signupAlert).toContainText('가입 요청을 처리했습니다');
      await expect(page.getByPlaceholder('이메일')).toHaveValue('');
    } finally {
      await cleanupAuthUser(email);
    }
  });

  test('QA-SIGN-002 Given an existing account email, When signup is submitted, Then generic feedback is shown without account disclosure', async ({ page }, testInfo) => {
    testInfo.skip(!user || !serviceEnvironmentReady(), 'blocked-env: E2E_USER credentials and Supabase service credentials are required.');
    if (!user) return;
    await page.goto('/signup');
    const signupRequests: string[] = [];
    const checkEmailRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/auth/v1/signup')) signupRequests.push(request.url());
      if (request.url().includes('/api/auth/check-email')) checkEmailRequests.push(request.url());
    });
    const signup = page.waitForRequest((request) => request.url().includes('/auth/v1/signup'));
    await page.getByPlaceholder('이름').fill(`Duplicate ${RUN_ID}`);
    await page.getByPlaceholder('이메일').fill(user.email);
    await page.getByPlaceholder('비밀번호 (6자 이상)').fill(`qa-${RUN_ID}-pw`);
    await page.getByRole('button', { name: '회원가입' }).click();
    const signupRequest = await signup;
    expect(signupRequest.method()).toBe('POST');
    const genericAlert = page
      .locator('.ant-alert[role="alert"]')
      .filter({ hasText: '가입 요청을 처리했습니다' });
    await expect(genericAlert).toBeVisible();
    await expect(genericAlert).toContainText('가입 요청을 처리했습니다');
    await expect(genericAlert).not.toContainText(/이미 가입된 이메일|이미 가입된 계정/);
    expect(signupRequests).toHaveLength(1);
    expect(checkEmailRequests).toHaveLength(0);
    await expect(page.getByRole('link', { name: '로그인' })).toBeVisible();
  });

  test('QA-SIGN-003 Given invalid signup fields, When the form is submitted, Then field validation is visible and no signup request is made', async ({ page }) => {
    await page.goto('/signup');
    let signupRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/auth/v1/signup')) signupRequests += 1;
    });
    await page.getByPlaceholder('이메일').fill('not-an-email');
    await page.getByPlaceholder('비밀번호 (6자 이상)').fill('short');
    await page.getByRole('button', { name: '회원가입' }).click();
    await expect(page.getByText('이름을 입력해주세요.')).toBeVisible();
    await expect(page.getByText('올바른 이메일 형식이 아닙니다.')).toBeVisible();
    await expect(page.getByText('비밀번호는 최소 6자 이상이어야 합니다.')).toBeVisible();
    expect(signupRequests).toBe(0);
  });

  test('QA-NOTIFY-001 Given a signed-in user, When reminder settings are toggled, Then the upsert is observable and the value survives reload', async ({ page }, testInfo) => {
    testInfo.skip(!user || !serviceEnvironmentReady(), 'blocked-env: E2E_USER credentials and Supabase service credentials are required.');
    if (!user) return;
    await login(page, user);
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: '알림 설정' })).toBeVisible();
    const morning = page.getByRole('switch', { name: '출근 보고서 알림' });
    const nextValue = !(await morning.isChecked());
    const upsert = page.waitForResponse((response) => (
      response.url().includes('/rest/v1/notification_settings') &&
      response.request().method() === 'POST' &&
      response.ok()
    ));
    await morning.setChecked(nextValue);
    await upsert;
    await expect(morning).toBeChecked({ checked: nextValue });
    await page.reload();
    await expect(page.getByRole('switch', { name: '출근 보고서 알림' })).toBeChecked({ checked: nextValue });
  });

  test('QA-NOTIFY-002 Given seeded unread notification history, When an item is marked read, Then the badge decreases and the database update is sent', async ({ page }, testInfo) => {
    testInfo.skip(!user || !serviceEnvironmentReady(), 'blocked-env: E2E_USER credentials and Supabase service credentials are required.');
    if (!user) return;
    const seed = await beginAccountSeed(user);
    const notification = await seedNotification(seed, true);
    try {
      await login(page, user);
      await page.goto('/notifications');
      const notificationRow = page.getByRole('listitem', { name: `알림: QA-${RUN_ID}-notification` });
      await expect(notificationRow).toBeVisible();
      await expect(page.getByText('알림 히스토리', { exact: true })).toBeVisible();
      const update = page.waitForRequest((request) => request.url().includes('/rest/v1/notification_history') && request.method() === 'PATCH');
      await notificationRow.getByRole('button', { name: '읽음' }).click();
      await update;
      await expect(notificationRow.getByRole('button', { name: '읽음' })).toHaveCount(0);
    } finally {
      await cleanupRows(seed, { notificationIds: [notification.id] });
    }
  });

  test('QA-NOTIFY-003 Given notification permission and offline browser states, When permission is requested while offline, Then the page exposes a bounded permission result without crashing', async ({ page, context }, testInfo) => {
    testInfo.skip(!user || !serviceEnvironmentReady(), 'blocked-env: E2E_USER credentials and Supabase service credentials are required.');
    if (!user) return;
    await login(page, user);
    await page.goto('/notifications');
    await context.clearPermissions();
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByRole('heading', { name: '알림 설정' })).toBeVisible();
    await page.getByRole('button', { name: '권한 요청' }).click();
    const permissionAlert = page
      .getByRole('alert')
      .filter({ hasText: /브라우저 알림 권한이 (허용|거부)/ });
    await expect(permissionAlert).toBeVisible();
    await expect(permissionAlert).toContainText(/브라우저 알림 권한이 (허용|거부)/);
    await context.setOffline(false);
  });

  test('QA-PROFILE-001 Given a signed-in profile, When a new full name is saved, Then success feedback and persisted values are observable', async ({ page }, testInfo) => {
    testInfo.skip(!user || !serviceEnvironmentReady(), 'blocked-env: E2E_USER credentials and Supabase service credentials are required.');
    if (!user) return;
    const seed = await beginAccountSeed(user);
    const original = await readProfileName(seed);
    const updated = `QA Profile ${RUN_ID}`;
    try {
      await login(page, user);
      await page.goto('/profile');
      await page.getByLabel('Full name').fill(updated);
      const authUpdate = page.waitForRequest((request) => request.url().includes('/auth/v1/user') && request.method() === 'PUT');
      const profileUpdate = page.waitForRequest((request) => request.url().includes('/rest/v1/user_profiles') && request.method() === 'PATCH');
      await page.getByRole('button', { name: 'Save changes' }).click();
      const authRequest = await authUpdate;
      await profileUpdate;
      expect(authRequest.method()).toBe('PUT');
      const profileAlert = page
        .locator('.ant-alert[role="alert"]')
        .filter({ hasText: 'Profile updated.' });
      await expect(profileAlert).toBeVisible();
      await expect(profileAlert).toContainText('Profile updated.');
      await page.reload();
      await expect(page.getByLabel('Full name')).toHaveValue(updated);
      await page.getByLabel('Full name').fill('');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByText('Please enter your name.')).toBeVisible();
    } finally {
      await restoreProfileName(seed, original);
    }
  });
});
