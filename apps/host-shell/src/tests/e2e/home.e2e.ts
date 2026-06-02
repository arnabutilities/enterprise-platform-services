/**
 * Host Shell E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Host Shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the home page', async ({ page }) => {
    await expect(page).toHaveTitle(/Host Shell/);
  });

  test('should display welcome message', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toContainText('Host Shell');
  });

  test('should render shell header', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should render main content area', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});
