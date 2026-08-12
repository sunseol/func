import { expect, test, type Page } from '@playwright/test';
import {
  cleanupSeededUser,
  hasLocalBackendCapability,
  loginSeededUser,
  seedUserWithReports,
  type SeededUser,
} from './test-support';

async function stubGeneratorApis(page: Page, report = '<h2>결정적 생성 결과</h2>'): Promise<void> {
  await page.route('**/api/report/summarize', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ summary: '결정적 요약' }) });
  });
  await page.route('**/api/report/generateHtml', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ report }) });
  });
}

test.describe('report generator', () => {
  let seededUser: SeededUser | undefined;

  test.beforeEach(async () => {
    test.skip(!hasLocalBackendCapability(), 'Supabase local backend capability is unavailable');
  });

  test.afterEach(async () => {
    if (seededUser) await cleanupSeededUser(seededUser);
    seededUser = undefined;
  });

  test('QA-GEN-001 Given an authenticated user, When text is generated, Then progress completes and the generated report is available to print', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-GEN-001');
    await stubGeneratorApis(page);
    await loginSeededUser(page, seededUser);
    await page.goto('/report-generator');
    await page.getByRole('tab', { name: '텍스트 직접 입력' }).click();
    await page.getByPlaceholder('여기에 리포트 원문 텍스트를 붙여넣으세요.').fill('프로젝트 진행 상황입니다.');
    await page.getByRole('button', { name: '리포트 생성' }).click();
    await expect(page.getByRole('heading', { name: '생성된 리포트' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '결정적 생성 결과' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PDF로 다운로드' })).toBeVisible();
  });

  test('QA-GEN-002 Given supported report fixtures, When each fixture is uploaded and generated, Then the parser flow reaches the generated result while unsupported types are rejected', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-GEN-002');
    await stubGeneratorApis(page);
    await loginSeededUser(page, seededUser);
    await page.goto('/report-generator');
    const fileInput = page.locator('input[type="file"]');
    for (const fixture of [
      { name: 'fixture.txt', mimeType: 'text/plain', buffer: Buffer.from('text fixture') },
      { name: 'fixture.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') },
      { name: 'fixture.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('PK fixture') },
    ]) {
      await fileInput.setInputFiles(fixture);
      await expect(page.getByText(fixture.name)).toBeVisible();
      await page.getByRole('button', { name: '리포트 생성' }).click();
      await expect(page.getByRole('heading', { name: '결정적 생성 결과' })).toBeVisible();
      await page.reload();
    }
    await fileInput.setInputFiles({ name: 'fixture.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('unsafe') });
    await expect(page.getByRole('alert').filter({ hasText: 'PDF, TXT, DOCX 파일만 업로드' })).toBeVisible();
  });

  test('QA-GEN-003 Given unsafe HTML and empty source text, When generation validation runs, Then executable markup is absent and empty input is rejected', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-GEN-003');
    await stubGeneratorApis(page, '<h2>안전한 결과</h2><script>window.bad = true</script>');
    await loginSeededUser(page, seededUser);
    await page.goto('/report-generator');
    await page.getByRole('tab', { name: '텍스트 직접 입력' }).click();
    await expect(page.getByRole('button', { name: '리포트 생성' })).toBeDisabled();
    await page.getByPlaceholder('여기에 리포트 원문 텍스트를 붙여넣으세요.').fill('<script>alert(1)</script> 정상 텍스트');
    await page.getByRole('button', { name: '리포트 생성' }).click();
    await expect(page.getByRole('heading', { name: '안전한 결과' })).toBeVisible();
    await expect(page.locator('.report-content-wrapper script')).toHaveCount(0);
  });

  test('QA-GEN-004 Given a generated report, When PDF print is selected, Then window.print is invoked for the report surface without a mutation request', async ({ page }) => {
    seededUser = await seedUserWithReports('QA-GEN-004');
    await stubGeneratorApis(page);
    await loginSeededUser(page, seededUser);
    await page.goto('/report-generator');
    await page.getByRole('tab', { name: '텍스트 직접 입력' }).click();
    await page.getByPlaceholder('여기에 리포트 원문 텍스트를 붙여넣으세요.').fill('인쇄할 결과');
    await page.getByRole('button', { name: '리포트 생성' }).click();
    await expect(page.getByRole('button', { name: 'PDF로 다운로드' })).toBeVisible();
    await page.evaluate(() => {
      window.print = () => {
        document.body.dataset.printInvoked = 'true';
      };
    });
    await page.getByRole('button', { name: 'PDF로 다운로드' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-print-invoked', 'true');
  });
});
