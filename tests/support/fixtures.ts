export const FINAL_SUT_REF = '5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65';

export const DEMO_PASSWORD = 'PartnerOps!2026';

export const DEMO_USERS = {
  admin: 'admin@partnerops.test',
  agent: 'agent@partnerops.test',
  acme: 'client@acme.test',
  globex: 'client@globex.test',
} as const;

// Public synthetic fixture tokens from the PartnerOps quickstart, never production credentials.
export const API_TOKENS = {
  acme: 'ptk_demo01.k7s3P2mQ8vN5xR1aC9dF4gH6jL0wY2uB7eT8iO5pZ3A',
  globex: 'ptk_demo02.s4F8mN2qR6vK1xC9dH5jL0wY3uB7eT8iO5pZ3A6gQ2W',
} as const;

export const SEEDED_REQUESTS = {
  acmeOverdue: '01J00000000000000000000009',
  acmeInProgress: '01J00000000000000000000010',
  globex: '01J00000000000000000000011',
  acmeApi: '01J00000000000000000000014',
} as const;

const runId = (process.env.QA_RUN_ID ?? `${Date.now()}-${process.pid}`).replace(/[^A-Za-z0-9_-]/g, '-');

export function uniqueValue(prefix: string, project = ''): string {
  const suffix = project.replace(/[^A-Za-z0-9_-]/g, '-');
  return [prefix, suffix, runId].filter(Boolean).join('-').slice(0, 120);
}
