import { test, expect } from '@playwright/test';

test.describe('Basic E2E Test', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/landing');

    await expect(page).toHaveURL(/\/landing$/);
    await expect(
      page.getByRole('heading', { level: 1, name: /흩어져 있는 모든 업무/ }),
    ).toBeVisible();
    await expect(page.locator('header')).toBeVisible();

    await page.screenshot({ path: 'test-results/landing.png' });
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 2, name: 'FunCommute' })).toBeVisible();
    await expect(page.getByText('로그인하여 시작하세요')).toBeVisible();
    await expect(page.getByLabel('이메일')).toBeVisible();
    await expect(page.getByPlaceholder('비밀번호')).toBeVisible();
  });
});
