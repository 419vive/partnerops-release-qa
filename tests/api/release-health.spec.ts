import { expect, test, type APIResponse } from '@playwright/test';

import { uniqueValue } from '../support/fixtures.js';

function expectAcceptedHeaders(response: APIResponse, requestId: string): void {
  const headers = response.headers();

  expect(headers['content-type']).toContain('application/json');
  expect(headers['cache-control']).toContain('no-store');
  expect(headers['x-request-id']).toBe(requestId);
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toBe('camera=(), geolocation=(), microphone=()');
  expect(headers['x-powered-by']).toBeUndefined();
}

test('API-001 final release exposes live and ready probes with accepted response headers', async ({ request }) => {
  for (const [path, status] of [
    ['/health/live', 'live'],
    ['/health/ready', 'ready'],
  ] as const) {
    await test.step(`${path} reports ${status}`, async () => {
      const requestId = uniqueValue(`health-${status}`, 'api').slice(0, 64);
      const response = await request.get(path, { headers: { 'X-Request-ID': requestId } });

      expect(response.status()).toBe(200);
      expectAcceptedHeaders(response, requestId);
      expect(await response.json()).toEqual({ status });
    });
  }
});
