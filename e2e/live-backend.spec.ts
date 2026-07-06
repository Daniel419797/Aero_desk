import { expect, test } from '@playwright/test';

const runRealBackendSmoke = process.env.AERODESK_E2E_REAL_BACKEND === '1';
const email = process.env.AERODESK_E2E_EMAIL || 'qa.super.admin@example.com';
const password = process.env.AERODESK_E2E_PASSWORD || 'QaSuperAdmin123!';
const apiBaseUrl = (process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

test.describe('real backend integration', () => {
  test.skip(!runRealBackendSmoke, 'Set AERODESK_E2E_REAL_BACKEND=1 to run against a real backend.');

  test('logs in through the frontend and loads backend-backed reports', async ({ page }) => {
    test.setTimeout(60_000);
    const backendErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('response', response => {
      const url = response.url();
      if (url.startsWith(apiBaseUrl) && response.status() >= 500) {
        backendErrors.push(`${response.status()} ${url}`);
      }
    });

    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();

    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'Authoritative reports' })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('heading', { name: 'Staff sign in' })).toHaveCount(0);

    const accessToken = await page.evaluate(() => sessionStorage.getItem('aerodesk_access_token'));
    expect(accessToken).toBeTruthy();
    expect(backendErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
