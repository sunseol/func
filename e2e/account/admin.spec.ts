import { test, expect } from '@playwright/test';
import {
  beginAccountSeed,
  cleanupRows,
  credentialsFor,
  login,
  seedReport,
  serviceEnvironmentReady,
  switchAccount,
} from './account-helpers';

const admin = credentialsFor('admin');
const user = credentialsFor('user');

async function openAdmin(page: Parameters<typeof login>[0], credentials: NonNullable<typeof admin>): Promise<void> {
  await login(page, credentials, '/admin');
}

test.describe('administrator scenarios', () => {
  test('QA-ADMIN-001 Given user and admin sessions, When /admin is opened, Then the user is redirected and the admin gate exposes analytics', async ({ page }, testInfo) => {
    testInfo.skip(!admin || !user || !serviceEnvironmentReady(), 'blocked-env: E2E_ADMIN/E2E_USER credentials and Supabase service credentials are required.');
    if (!admin || !user) return;
    await login(page, user);
    await page.goto('/admin');
    await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });
    await switchAccount(page, admin, '/admin');
    await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();
    await expect(page.getByText('총 사용자')).toBeVisible();
  });

  test('QA-ADMIN-002 Given an admin data set, When analytics and reports tabs are opened, Then cards, filters, report rows, and detail content render', async ({ page }, testInfo) => {
    testInfo.skip(!admin || !user || !serviceEnvironmentReady(), 'blocked-env: E2E_ADMIN/E2E_USER credentials and Supabase service credentials are required.');
    if (!admin || !user) return;
    const seed = await beginAccountSeed(user);
    const report = await seedReport(seed);
    try {
      await openAdmin(page, admin);
      await expect(page.getByText('총 사용자')).toBeVisible();
      await expect(page.getByText('총 보고서')).toBeVisible();
      await expect(page.getByText('오늘 보고서')).toBeVisible();
      await expect(page.getByText('이번 주 보고서')).toBeVisible();
      await page.getByRole('tab', { name: /보고서 관리/ }).click();
      await expect(page.getByPlaceholder('작성자, 내용 또는 날짜로 검색')).toBeVisible();
      const row = page.locator('.ant-table-row').filter({ hasText: report.content });
      await expect(row).toBeVisible();
      await row.getByRole('button').first().click();
      await expect(page.getByRole('dialog')).toContainText(report.content);
    } finally {
      await cleanupRows(seed, { reportIds: [report.id] });
    }
  });

  test('QA-ADMIN-003 Given an admin report row, When delete is confirmed, Then the row disappears and the service database has no row', async ({ page }, testInfo) => {
    testInfo.skip(!admin || !user || !serviceEnvironmentReady(), 'blocked-env: E2E_ADMIN/E2E_USER credentials and Supabase service credentials are required.');
    if (!admin || !user) return;
    const seed = await beginAccountSeed(user);
    const report = await seedReport(seed);
    try {
      await openAdmin(page, admin);
      await page.getByRole('tab', { name: /보고서 관리/ }).click();
      const row = page.locator('.ant-table-row').filter({ hasText: report.content });
      await row.getByRole('button').last().click();
      await expect(page.getByRole('dialog')).toContainText('삭제하시겠습니까');
      const deleteRequest = page.waitForRequest((request) => request.url().includes('/rest/v1/daily_reports') && request.method() === 'DELETE');
      await page.getByRole('dialog').getByRole('button', { name: '삭제' }).click();
      await deleteRequest;
      await expect(page.locator('.ant-table-row').filter({ hasText: report.content })).toHaveCount(0);
      const { data, error } = await seed.client.from('daily_reports').select('id').eq('id', report.id);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    } finally {
      await cleanupRows(seed, { reportIds: [report.id] });
    }
  });

  test('QA-ADMIN-004 Given an admin and disposable user profile, When the role action is toggled, Then the role label and database value change while self-delete remains unavailable', async ({ page }, testInfo) => {
    testInfo.skip(!admin || !user || !serviceEnvironmentReady(), 'blocked-env: E2E_ADMIN/E2E_USER credentials and Supabase service credentials are required.');
    if (!admin || !user) return;
    const seed = await beginAccountSeed(user);
    const { data: original, error: readError } = await seed.client.from('user_profiles').select('role').eq('id', seed.userId).single();
    if (readError) throw new Error(`Unable to read disposable role: ${readError.message}`);
    const originalRole = String(original.role ?? 'user');
    const expectedRole = originalRole === 'admin' ? 'user' : 'admin';
    try {
      await openAdmin(page, admin);
      await page.getByRole('tab', { name: /사용자 관리/ }).click();
      const selfRow = page.locator('.ant-table-row').filter({ hasText: admin.email });
      await expect(selfRow).toBeVisible();
      await expect(selfRow.getByRole('button', { name: /관리자 지정|관리자 해제/ })).toHaveCount(0);
      const row = page.locator('.ant-table-row').filter({ hasText: user.email });
      await expect(row).toBeVisible();
      const update = page.waitForResponse((response) => (
        response.url().includes('/rest/v1/user_profiles') &&
        response.request().method() === 'PATCH' &&
        response.ok()
      ));
      await row.getByRole('button', { name: /관리자 지정|관리자 해제/ }).click();
      const updateResponse = await update;
      expect(updateResponse.ok()).toBe(true);
      await expect.poll(async () => {
        const { data: changed, error: changedError } = await seed.client
          .from('user_profiles')
          .select('role')
          .eq('id', seed.userId)
          .single();
        if (changedError) throw new Error(`Unable to read changed role: ${changedError.message}`);
        return String(changed?.role ?? '');
      }, { timeout: 15_000, message: 'service database did not confirm the requested role change' }).toBe(expectedRole);
      await expect(row).toContainText(expectedRole === 'admin' ? '관리자' : '일반 사용자');
      await expect(row.getByRole('button', { name: /삭제/ })).toHaveCount(0);
    } finally {
      const { error } = await seed.client.from('user_profiles').update({ role: originalRole }).eq('id', seed.userId);
      if (error) throw new Error(`Unable to restore disposable role: ${error.message}`);
    }
  });

  test('QA-ADMIN-005 Given authorized admin report context, When a summary question is sent, Then the deterministic AI response is rendered without exposing a client secret', async ({ page }, testInfo) => {
    testInfo.skip(!admin || !serviceEnvironmentReady(), 'blocked-env: E2E_ADMIN credentials and Supabase service credentials are required.');
    if (!admin) return;
    await openAdmin(page, admin);
    const aiRequest = page.waitForRequest((request) => request.url().endsWith('/api/groq'));
    await page.getByPlaceholder('보고서에 대해 궁금한 것을 물어보세요...').fill('이번 주 보고서를 요약해주세요.');
    await page.route('**/api/groq', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: 'QA deterministic admin summary' }) });
    });
    await page.getByRole('button', { name: '전송' }).click();
    const request = await aiRequest;
    const body = request.postData() ?? '';
    expect(body).toContain('이번 주 보고서를 요약해주세요.');
    await expect(page.getByText('QA deterministic admin summary')).toBeVisible();
    expect(body).not.toContain(process.env.GROQ_API_KEY ?? '__absent__');
  });
});
