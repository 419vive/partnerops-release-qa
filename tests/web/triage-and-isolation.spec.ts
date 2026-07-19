import { expect, test, type Page } from '@playwright/test';

import { login, logout } from '../support/auth.js';
import { API_TOKENS, DEMO_USERS, SEEDED_REQUESTS, uniqueValue } from '../support/fixtures.js';

async function metricValue(page: Page, label: string): Promise<number> {
  const metric = page.getByRole('article').filter({ hasText: label });
  await expect(metric).toHaveCount(1);

  const value = Number.parseInt(await metric.locator('strong').innerText(), 10);
  expect(Number.isInteger(value)).toBe(true);

  return value;
}

test.describe.configure({ mode: 'serial' });

test('WEB-002 Chromium triage preserves dashboard deltas and Acme/Globex isolation', async ({ page, request }) => {
  const title = uniqueValue('QA Web triage', 'chromium');
  const description = uniqueValue('Created for repeatable Chromium triage', 'chromium');
  const internalNote = uniqueValue('Internal triage note', 'chromium');
  const createdResponse = await request.post('/api/v1/requests', {
    headers: {
      Authorization: `Bearer ${API_TOKENS.acme}`,
      'Idempotency-Key': uniqueValue('qa-web-triage', 'chromium'),
    },
    data: { title, description, priority: 'urgent' },
  });
  expect(createdResponse.status()).toBe(201);
  const created = (await createdResponse.json()) as { id: string };
  expect(created.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);

  await login(page, DEMO_USERS.agent);
  const overdueBefore = await metricValue(page, '已逾期');
  const unassignedBefore = await metricValue(page, '尚未指派');

  await page.goto(`/requests/${created.id}`);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await page.getByLabel('負責人').selectOption({ label: '林顧問' });
  await page.getByRole('button', { name: '儲存工作安排' }).click();
  await expect(page.getByRole('status')).toContainText('工作安排已更新');
  await expect(page.getByLabel('負責人').locator('option:checked')).toHaveText('林顧問');

  await page.getByRole('button', { name: '變更為處理中' }).click();
  await expect(page.getByRole('status')).toContainText('請求狀態已更新');
  await expect(page.getByRole('article').filter({ hasText: '狀態由「新建」變更為「處理中」' })).toBeVisible();

  await page.getByLabel('留言').fill(internalNote);
  await page.getByLabel('僅團隊內部可見').check();
  await page.getByRole('button', { name: '新增留言' }).click();
  const teamNote = page.getByRole('article').filter({ hasText: internalNote });
  await expect(teamNote).toBeVisible();
  await expect(teamNote).toContainText('內部');

  await page.goto('/');
  expect(await metricValue(page, '尚未指派')).toBe(unassignedBefore - 1);
  expect(await metricValue(page, '已逾期')).toBe(overdueBefore);

  await logout(page);
  await login(page, DEMO_USERS.acme);
  await page.goto(`/requests/${created.id}`);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText(internalNote);

  const acmeDenied = await page.goto(`/requests/${SEEDED_REQUESTS.globex}`);
  expect(acmeDenied?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText('Globex 創意');
  await expect(page.locator('body')).not.toContainText('首頁標題文案更新');
  await expect(page.locator('body')).not.toContainText('請協助將品牌首頁標題更新為七月的新版本文案。');

  await page.context().clearCookies();
  await login(page, DEMO_USERS.globex);
  await page.goto(`/requests/${SEEDED_REQUESTS.globex}`);
  await expect(page.getByRole('heading', { name: '首頁標題文案更新' })).toBeVisible();

  const globexDenied = await page.goto(`/requests/${created.id}`);
  expect(globexDenied?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText('Acme 電商');
  await expect(page.locator('body')).not.toContainText(title);
  await expect(page.locator('body')).not.toContainText(description);
});
