import { expect, test, type Page } from '@playwright/test';

import { login, logout } from '../support/auth.js';
import { DEMO_USERS } from '../support/fixtures.js';

async function expectNoWholePageOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));

  expect(Math.max(widths.document, widths.body), JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport);
}

test('WEB-001 desktop login and filtered queue smoke has no whole-page overflow', async ({ page }) => {
  await login(page, DEMO_USERS.agent);
  await expect(page.getByRole('heading', { name: /把風險/ })).toBeVisible();
  await expectNoWholePageOverflow(page);

  await page.getByRole('link', { name: '服務請求', exact: true }).click();
  await page.getByLabel('搜尋').fill('商品匯入');
  await page.getByLabel('狀態').selectOption('in_progress');
  await page.getByLabel('優先級').selectOption('high');
  await page.getByRole('button', { name: '套用篩選' }).click();

  await expect(page).toHaveURL(/\/requests\?.*q=/);
  await expect(page.getByRole('link', { name: '商品匯入排程調整' })).toBeVisible();
  await expect(page.getByRole('link', { name: '結帳頁金流間歇失敗' })).toHaveCount(0);
  await expect(page.getByLabel('搜尋')).toHaveValue('商品匯入');
  await expect(page.getByLabel('狀態')).toHaveValue('in_progress');
  await expect(page.getByLabel('優先級')).toHaveValue('high');
  await expectNoWholePageOverflow(page);

  await logout(page);
});
