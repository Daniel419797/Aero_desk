import { expect, test } from '@playwright/test';

test('renders the staff login and reports a rejected authentication attempt', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.route('**/auth/refresh', async route => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Refresh token is missing or expired.' }),
    });
  });

  await page.route('**/auth/login', async route => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Invalid email or password.' }),
    });
  });

  await page.goto('/reports');
  await expect(page).toHaveTitle(/AeroDesk/);
  await expect(page.getByRole('heading', { name: 'AeroDesk' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();
  await expect(page.getByText('Authoritative reports')).toHaveCount(0);

  await page.getByLabel('Email address').fill('completion-audit-invalid@example.invalid');
  await page.getByLabel('Password').fill('invalid-audit-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText(/Invalid email or password\./);
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();

  const screenshotPath = testInfo.outputPath('login-invalid-credentials.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const unexpectedConsoleErrors = consoleErrors.filter(message => (
    !message.includes('server responded with a status of 401')
  ));
  expect(unexpectedConsoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
