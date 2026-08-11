import { expect, test } from '@playwright/test';
import {
  cleanupSeededUser,
  hasLocalBackendCapability,
  loginSeededUser,
  readSeededReportIds,
  seedUserWithReports,
  type SeededUser,
} from './test-support';

test.describe('daily and weekly reports', () => {
  let seededUser: SeededUser | undefined;

  test.beforeEach(async () => {
    test.skip(!hasLocalBackendCapability(), 'Supabase local backend capability is unavailable');
  });

  test.afterEach(async () => {
    if (seededUser) await cleanupSeededUser(seededUser);
    seededUser = undefined;
  });

  test('QA-REPORT-001 Given an authenticated user, When daily inputs and the morning report type are entered, Then the default preview reflects the work and AI is enabled', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-REPORT-001');
    await loginSeededUser(page, seededUser);
    await page.getByLabel('이름').fill('출근 사용자');
    await page.getByLabel('날짜').fill('2026-08-11');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: '프로젝트 추가' }).click();
    await page.getByLabel('프로젝트명').fill('제품 개선');
    await page.getByPlaceholder('예: 사용자 인터페이스 설계').fill('검색 화면 개선');

    await expect(page.getByTestId('report-preview-text')).toContainText('검색 화면 개선');
    await expect(page.getByRole('button', { name: '✨ AI야 도와줘' })).toBeEnabled();
  });

  test('QA-REPORT-002 Given valid evening content, When AI report generation is requested, Then the loading result resolves to generated text with a successful API response', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-REPORT-002');
    await page.route('**/api/groq', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '결정적 퇴근 보고서 결과' }) });
    });
    await loginSeededUser(page, seededUser);
    await page.locator('label').filter({ hasText: '퇴근 보고서 (진행 업무)' }).click();
    await page.getByLabel('이름').fill('퇴근 사용자');
    await page.getByLabel('날짜').fill('2026-08-11');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: '프로젝트 추가' }).click();
    await page.getByLabel('프로젝트명').fill('제품 개선');
    await page.getByPlaceholder('예: 사용자 인터페이스 설계').fill('배포 점검');
    await page.getByRole('button', { name: '✨ AI야 도와줘' }).click();

    await expect(page.getByText('결정적 퇴근 보고서 결과')).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'AI 보고서 생성 완료' })).toBeVisible();
  });

  test('QA-REPORT-003 Given a populated daily preview, When the report is saved, Then a success alert appears and the namespaced report remains in the database', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-REPORT-003');
    await loginSeededUser(page, seededUser);
    await page.getByLabel('이름').fill('저장 사용자');
    await page.getByLabel('날짜').fill('2026-08-11');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: '프로젝트 추가' }).click();
    await page.getByLabel('프로젝트명').fill('저장 프로젝트');
    await page.getByPlaceholder('예: 사용자 인터페이스 설계').fill('저장할 업무');
    await page.getByRole('button', { name: '보고서 저장' }).click();

    await expect(page.getByRole('alert').filter({ hasText: '보고서가 성공적으로 저장되었습니다' })).toBeVisible();
    const reportIds = await readSeededReportIds(seededUser);
    expect(reportIds).toHaveLength(2);
  });

  test('QA-REPORT-004 Given missing daily report fields, When save is attempted, Then validation feedback appears without inserting a new report while AI remains disabled', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-REPORT-004');
    await loginSeededUser(page, seededUser);
    await expect(page.getByRole('button', { name: '✨ AI야 도와줘' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '보고서 저장' })).toBeEnabled();
    await page.getByRole('button', { name: '보고서 저장' }).click();
    await expect(page.getByRole('alert').filter({ hasText: '보고서 날짜' })).toBeVisible();
    expect(await readSeededReportIds(seededUser)).toHaveLength(1);
  });

  test('QA-WEEK-001 Given an authenticated user, When the weekly tab and manual mode are selected, Then weekly draft controls and a weekly report type are visible', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-WEEK-001', ['morning', 'evening']);
    await loginSeededUser(page, seededUser);
    await page.getByRole('tab', { name: '주간 보고서' }).click();
    await page.getByRole('button', { name: '직접 작성하기' }).click();
    await expect(page.getByText('주간 보고서 작성 가이드')).toBeVisible();
    await expect(page.getByLabel('주간 보고서 이름')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('QA-WEEK-002 Given weekly source reports, When weekly AI generation is requested, Then the deterministic provider result is rendered and the report remains weekly', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-WEEK-002', ['morning', 'evening']);
    await page.route('**/api/groq', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '결정적 주간 보고서 결과' }) });
    });
    await loginSeededUser(page, seededUser);
    await page.getByRole('tab', { name: '주간 보고서' }).click();
    await page.getByRole('button', { name: '이번 주 보고서로 자동 생성' }).click();
    await expect(page.getByText(/일일 보고서 선택/)).toBeVisible();
    const generateButton = page.getByRole('button', { name: /선택한 .*개 보고서로 AI 생성하기/ });
    await expect(generateButton).toBeEnabled();
    await generateButton.click();
    await expect(page.getByText('결정적 주간 보고서 결과')).toBeVisible();
  });
});
