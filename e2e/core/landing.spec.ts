import { expect, test } from '@playwright/test';

test.describe('landing', () => {
  test('QA-LAND-001 Given an unauthenticated visitor, When /landing loads, Then every landing section and footer landmark is visible', async ({ page }) => {
    const mutations: string[] = [];
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) mutations.push(request.method());
    });

    await page.goto('/landing');
    await expect(page).toHaveURL(/\/landing$/);
    for (const sectionId of ['hero', 'problem', 'solution', 'features', 'reviews', 'pricing', 'final-cta', 'faq']) {
      await expect(page.locator(`#${sectionId}`)).toBeVisible();
    }
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: '자주 묻는 질문' })).toBeVisible();
    expect(mutations).toEqual([]);
  });

  test('QA-LAND-002 Given the landing page, When a visitor selects a report CTA, Then navigation stays within the supported login or signup routes', async ({ page }) => {
    await page.goto('/landing');
    await page.getByRole('button', { name: '지금 바로 무료로 시작하기' }).first().click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/landing');
    await page.getByRole('link', { name: '보고서 작성' }).first().click();
    await expect(page).toHaveURL(/\/login$/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/landing');
    await page.locator('header svg').first().click();
    await expect(page.getByText('요금안내').last()).toBeVisible();
    await expect(page.getByRole('link', { name: '보고서 작성' }).last()).toHaveAttribute('href', '/login');
  });

  test('QA-LAND-003 Given the pricing and FAQ copy, When a visitor opens an FAQ item and selects a plan, Then copy is visible without a mutation request', async ({ page }) => {
    const mutations: string[] = [];
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) mutations.push(request.method());
    });

    await page.goto('/landing');
    const question = page.getByText('기존에 사용하던 데이터를 옮길 수 있나요?', { exact: true });
    await question.click();
    await expect(page.getByText(/마이그레이션 전문가가 안전하게 이전/)).toBeVisible();
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: '시작하기' }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    expect(mutations).toEqual([]);
  });
});
