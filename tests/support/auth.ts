import { expect, type Page } from '@playwright/test';

import { DEMO_PASSWORD } from './fixtures.js';

export async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('電子郵件').fill(email);
  await page.getByLabel('密碼').fill(DEMO_PASSWORD);
  const loginResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/login',
  );
  await page.getByRole('button', { name: /進入工作台/ }).click();
  expect((await loginResponse).status(), 'login POST must not return a server error').toBeLessThan(500);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: '登出' })).toBeVisible();
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: '登出' }).click();
  await expect(page).toHaveURL(/\/login$/);
}
