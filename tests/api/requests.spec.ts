import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';

import { API_TOKENS, SEEDED_REQUESTS, uniqueValue } from '../support/fixtures.js';

type RequestPayload = {
  title: string;
  description: string;
  priority: 'high' | 'urgent';
};

type CreateExchange = {
  body: Uint8Array;
  idempotencyKey: string;
  location: string;
  payload: RequestPayload;
};

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function createHeaders(token: string, idempotencyKey: string): Record<string, string> {
  return {
    ...bearer(token),
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
  };
}

async function expectProblem(response: APIResponse, status: number, code: string): Promise<Record<string, unknown>> {
  expect(response.status()).toBe(status);
  expect(response.headers()['content-type']).toContain('application/problem+json');

  const problem = (await response.json()) as Record<string, unknown>;
  expect(problem).toMatchObject({
    type: `/problems/${code}`,
    title: expect.any(String),
    status,
    code,
    detail: expect.any(String),
    instance: expect.any(String),
    traceId: expect.stringMatching(/^[A-Za-z0-9._-]{8,64}$/),
  });

  return problem;
}

async function createRequest(
  request: APIRequestContext,
  scenario: string,
  titlePrefix: string,
): Promise<CreateExchange> {
  const idempotencyKey = uniqueValue(`qa-${scenario}`, 'api');
  const payload: RequestPayload = {
    title: uniqueValue(titlePrefix, 'api'),
    description: uniqueValue(`Created by the ${scenario} release QA flow`, 'api'),
    priority: 'high',
  };
  const response = await request.post('/api/v1/requests', {
    headers: createHeaders(API_TOKENS.acme, idempotencyKey),
    data: payload,
  });

  expect(response.status()).toBe(201);
  expect(response.headers()['content-type']).toContain('application/json');
  expect(response.headers()['idempotent-replayed']).toBe('false');
  expect(response.headers()['x-request-id']).toMatch(/^[A-Za-z0-9._-]{8,64}$/);
  const location = response.headers().location;
  expect(location).toMatch(/^\/api\/v1\/requests\/[0-9A-HJKMNP-TV-Z]{26}$/);
  if (location === undefined) {
    throw new Error('Created response did not provide a Location header.');
  }

  return {
    body: await response.body(),
    idempotencyKey,
    location,
    payload,
  };
}

function expectCreatedResource(exchange: CreateExchange): string {
  const created = JSON.parse(new TextDecoder().decode(exchange.body)) as Record<string, unknown>;

  expect(created).toEqual({
    id: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{26}$/),
    title: exchange.payload.title,
    description: exchange.payload.description,
    priority: exchange.payload.priority,
    status: 'new',
    dueAt: null,
    assignee: null,
    createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
    updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
    comments: [],
    commentsPagination: { page: 1, perPage: 50, total: 0, pages: 1 },
  });

  const createdId = String(created.id);
  expect(exchange.location).toBe(`/api/v1/requests/${createdId}`);

  return createdId;
}

test.describe('client-scoped request API', () => {

  test('API-002 creates one Acme request with the documented contract', async ({ request }) => {
    expectCreatedResource(await createRequest(request, 'api-create', 'QA API create'));
  });

  test('API-005 reads the Acme request and conceals it from Globex with 404', async ({ request }) => {
    const exchange = await createRequest(request, 'api-isolation', 'QA API isolation');
    const createdId = expectCreatedResource(exchange);
    const ownResponse = await request.get(exchange.location, { headers: bearer(API_TOKENS.acme) });
    expect(ownResponse.status()).toBe(200);
    await expect(ownResponse.json()).resolves.toMatchObject({
      id: createdId,
      title: exchange.payload.title,
      description: exchange.payload.description,
    });

    const crossClientResponse = await request.get(exchange.location, { headers: bearer(API_TOKENS.globex) });
    const problem = await expectProblem(crossClientResponse, 404, 'not_found');
    expect(problem.detail).toBe('The requested resource was not found.');

    const concealedBody = await crossClientResponse.text();
    expect(concealedBody).not.toContain(exchange.payload.title);
    expect(concealedBody).not.toContain(exchange.payload.description);
  });

  test('API-006 replays the exact original response bytes', async ({ request }) => {
    const exchange = await createRequest(request, 'replay', 'QA API replay');
    const replay = await request.post('/api/v1/requests', {
      headers: createHeaders(API_TOKENS.acme, exchange.idempotencyKey),
      data: exchange.payload,
    });

    expect(replay.status()).toBe(201);
    expect(replay.headers()['idempotent-replayed']).toBe('true');
    expect(replay.headers().location).toBe(exchange.location);
    expect(Buffer.compare(await replay.body(), exchange.body)).toBe(0);
    expectCreatedResource(exchange);
  });

  test('API-007 rejects the same key with a different payload using 409', async ({ request }) => {
    const exchange = await createRequest(request, 'api-conflict', 'QA API conflict');
    expectCreatedResource(exchange);
    const response = await request.post('/api/v1/requests', {
      headers: createHeaders(API_TOKENS.acme, exchange.idempotencyKey),
      data: { ...exchange.payload, priority: 'urgent' },
    });

    const problem = await expectProblem(response, 409, 'idempotency_conflict');
    expect(problem.detail).toBe('This idempotency key was already used with a different request body.');

    const original = await request.get(exchange.location, { headers: bearer(API_TOKENS.acme) });
    expect(original.status()).toBe(200);
    await expect(original.json()).resolves.toMatchObject({
      title: exchange.payload.title,
      priority: exchange.payload.priority,
    });
  });
});

test('API-003 returns indistinguishable 401 problems for missing and invalid credentials', async ({ request }) => {
  const invalidToken = API_TOKENS.acme.replace(/[^.]+$/, 'A'.repeat(43));
  let baselineProblem: Record<string, unknown> | undefined;
  const attempts: Array<{ name: string; headers?: Record<string, string> }> = [
    { name: 'missing credential' },
    { name: 'invalid credential', headers: bearer(invalidToken) },
  ];

  for (const attempt of attempts) {
    await test.step(attempt.name, async () => {
      const response = await request.get(`/api/v1/requests/${SEEDED_REQUESTS.acmeOverdue}`, {
        headers: attempt.headers ?? {},
      });
      const problem = await expectProblem(response, 401, 'unauthorized');

      expect(response.headers()['www-authenticate']).toBe('Bearer');
      expect(problem.detail).toBe('Valid authentication is required.');

      const normalizedProblem = { ...problem, traceId: '<generated>' };
      if (baselineProblem === undefined) {
        baselineProblem = normalizedProblem;
      } else {
        expect(normalizedProblem).toEqual(baselineProblem);
      }
    });
  }
});

test('API-004 rejects invalid and client-injected fields using 422', async ({ request }) => {
  const response = await request.post('/api/v1/requests', {
    headers: createHeaders(API_TOKENS.acme, uniqueValue('qa-api-validation', 'api')),
    data: {
      title: 'x',
      description: 'too short',
      priority: 'critical',
      clientId: uniqueValue('forbidden-client', 'api'),
    },
  });

  const problem = await expectProblem(response, 422, 'validation_failed');
  expect(problem.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ field: 'clientId', code: 'additional_property' }),
      expect.objectContaining({ field: 'title', code: 'length' }),
      expect.objectContaining({ field: 'description', code: 'length' }),
      expect.objectContaining({ field: 'priority', code: 'choice' }),
    ]),
  );
});
