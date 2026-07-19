import { expect, test, type Page } from '@playwright/test';

import { login, logout } from '../support/auth.js';
import { DEMO_USERS, uniqueValue } from '../support/fixtures.js';

async function expectNoWholePageOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));

  expect(Math.max(widths.document, widths.body), JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport);
}

test('MWEB-001 client creates and comments on a request without whole-page overflow', async ({ page }, testInfo) => {
  const title = uniqueValue('Mobile web request', testInfo.project.name);
  const description = uniqueValue('Created through the responsive client form', testInfo.project.name);
  const comment = uniqueValue('Mobile web client follow-up', testInfo.project.name);

  await login(page, DEMO_USERS.acme);
  await expectNoWholePageOverflow(page);

  await page.getByRole('link', { name: /建立服務請求/ }).click();
  await expect(page.getByRole('heading', { name: /建立.*請求/ })).toBeVisible();
  await expectNoWholePageOverflow(page);
  await page.getByLabel('標題').fill(title);
  await page.getByLabel('需求說明').fill(description);
  await page.getByLabel('優先級').selectOption('high');
  await page.getByRole('button', { name: '建立服務請求' }).click();

  await expect(page).toHaveURL(/\/requests\/[0-9A-HJKMNP-TV-Z]{26}$/);
  await expect(page.getByRole('status')).toContainText('服務請求已建立');
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expectNoWholePageOverflow(page);

  await expect(page.getByLabel('僅團隊內部可見')).toHaveCount(0);
  await page.getByLabel('留言').fill(comment);
  await page.getByRole('button', { name: '新增留言' }).click();

  await expect(page.getByRole('status')).toContainText('留言已新增');
  await expect(page.getByRole('article').filter({ hasText: comment })).toBeVisible();
  await expectNoWholePageOverflow(page);

  await page.reload();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: comment })).toBeVisible();
  await expectNoWholePageOverflow(page);

  await logout(page);
});
