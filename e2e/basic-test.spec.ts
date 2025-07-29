import { test, expect } from '@playwright/test';

test.describe('Basic E2E Test', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the page loaded successfully
    expect(page.url()).toContain('localhost:3000');
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'test-results/homepage.png' });
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/login');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're on the login page
    expect(page.url()).toContain('/login');
    
    // Look for common login elements
    const emailInput = page.locator('input[type="email"], input[name="email"], [data-testid*="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"], [data-testid*="password"]');
    
    // At least one of these should be visible
    const hasEmailInput = await emailInput.count() > 0;
    const hasPasswordInput = await passwordInput.count() > 0;
    
    expect(hasEmailInput || hasPasswordInput).toBeTruthy();
  });
});