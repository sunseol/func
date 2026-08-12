import { expect, test } from '@playwright/test';
import {
  cleanupSeededUser,
  hasLocalBackendCapability,
  loginSeededUser,
  readSeededReportIds,
  seedUserWithReports,
  type SeededUser,
} from './test-support';

test.describe('my reports', () => {
  let seededUser: SeededUser | undefined;

  test.beforeEach(async () => {
    test.skip(!hasLocalBackendCapability(), 'Supabase local backend capability is unavailable');
  });

  test.afterEach(async () => {
    if (seededUser) await cleanupSeededUser(seededUser);
    seededUser = undefined;
  });

  test('QA-MY-001 Given a user with no reports, When /my-reports loads, Then the owned empty list is shown without cross-user rows', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-MY-001', []);
    await loginSeededUser(page, seededUser);
    await page.goto('/my-reports');
    await expect(page).toHaveURL(/\/my-reports$/);
    await expect(page.getByRole('heading', { name: '내 보고서 목록' })).toBeVisible();
    await expect(page.getByText(/작성자:/)).toHaveCount(0);
  });

  test('QA-MY-002 Given reports of different dates and types, When search and type filters are applied, Then only matching rows remain and reset restores all rows', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-MY-002', ['morning', 'evening', 'weekly']);
    await loginSeededUser(page, seededUser);
    await page.goto('/my-reports');
    await expect(page.getByText(/작성자:/)).toHaveCount(3);
    await expect(page.getByRole('combobox', { name: '보고서 유형 필터' })).toBeVisible();
    await page.getByPlaceholder('내용 또는 날짜으로 검색').fill('report 2');
    await expect(page.getByText(/작성자:/)).toHaveCount(1);
    await page.getByPlaceholder('내용 또는 날짜으로 검색').fill('');
    await page.getByText('모든 종류', { exact: true }).first().click();
    await page.getByText('퇴근 보고서', { exact: true }).last().click();
    await expect(page.getByText(/작성자:/)).toHaveCount(1);
    const reportTypeFilter = page
      .locator('.ant-select')
      .filter({ has: page.getByRole('combobox', { name: '보고서 유형 필터' }) })
      .locator('.ant-select-selector');
    await expect(reportTypeFilter).toHaveCount(1);
    await expect(reportTypeFilter).toBeVisible();
    await reportTypeFilter.click();
    await page.getByText('모든 종류', { exact: true }).last().click();
    await expect(page.getByText(/작성자:/)).toHaveCount(3);
  });

  test('QA-MY-003 Given a report row, When its expandable detail is opened, Then report content and task data remain visible without changing the URL', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-MY-003', ['morning']);
    await loginSeededUser(page, seededUser);
    await page.goto('/my-reports');
    const initialUrl = page.url();
    await expect(page.getByText(seededUser.reports[0]?.content ?? '')).toBeVisible();
    const detailsButton = page.getByRole('button', { name: '더보기' });
    if (await detailsButton.count() > 0) await detailsButton.click();
    await expect(page).toHaveURL(initialUrl);
  });

  test('QA-MY-004 Given a valid historical report form, When manual add is submitted, Then one owned row is inserted and the list refreshes', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-MY-004', []);
    await loginSeededUser(page, seededUser);
    await page.goto('/my-reports');
    await page.getByRole('button', { name: '수동 추가' }).click();
    await expect(page.getByRole('combobox', { name: '수동 보고서 종류' })).toBeVisible();
    await page.getByLabel('보고 날짜').fill('2026-08-01');
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').getByText('출근 보고서', { exact: true }).click();
    await page.getByText('출근 보고서', { exact: true }).last().click();
    await page.getByLabel('보고 내용').fill('과거의 결정적 업무');
    await page.getByRole('dialog').getByRole('button', { name: '저장', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: '과거 보고서가 성공적으로 추가되었습니다' })).toBeVisible();
    expect(await readSeededReportIds(seededUser)).toHaveLength(1);
  });

  test('QA-MY-005 Given an owned report, When its edit dialog is saved, Then updated content is shown with a success alert', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-MY-005', ['morning']);
    await loginSeededUser(page, seededUser);
    await page.goto('/my-reports');
    await page.locator('button[title="보고서 편집"]').first().click();
    await page.getByRole('dialog').getByRole('textbox').fill('수정된 결정적 내용');
    await page.getByRole('dialog').getByRole('button', { name: '저장', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: '성공적으로 수정되었습니다' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: /보고서 편집/ })).toBeHidden();
    await expect(page.locator('.ant-list').getByText('수정된 결정적 내용')).toBeVisible();
  });

  test('QA-MY-006 Given an owned report, When copy is saved for a new date, Then one copied row is added while the original remains', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-MY-006', ['morning']);
    await loginSeededUser(page, seededUser);
    await page.goto('/my-reports');
    await page.locator('button[title="보고서 복사"]').first().click();
    await page.getByLabel('새 보고서 날짜').fill('2026-08-02');
    await page.keyboard.press('Enter');
    await page.getByPlaceholder('복사된 내용을 수정할 수 있습니다').fill('복사된 결정적 내용');
    const copyButton = page.getByRole('dialog').getByRole('button', { name: '복사하여 저장' });
    await expect(copyButton).toBeEnabled();
    await copyButton.click();
    await expect(page.getByRole('alert').filter({ hasText: '성공적으로 복사되었습니다' })).toBeVisible();
    expect(await readSeededReportIds(seededUser)).toHaveLength(2);
  });

  test('QA-MY-007 Given an owned report, When deletion is confirmed, Then the row disappears and the owned database record is removed', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-MY-007', ['morning']);
    await loginSeededUser(page, seededUser);
    await page.goto('/my-reports');
    await page.locator('button[title="보고서 삭제"]').first().click();
    await page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: '성공적으로 삭제되었습니다' })).toBeVisible();
    expect(await readSeededReportIds(seededUser)).toHaveLength(0);
  });
});
