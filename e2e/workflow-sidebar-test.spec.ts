import { expect, test } from '@playwright/test';

test.describe('Workflow sidebar smoke', () => {
  test('QA-SHELL-003 public route remains usable at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/landing');
    await expect(page.locator('body')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
