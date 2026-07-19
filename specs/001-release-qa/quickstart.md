# Quickstart Validation Guide

## Prerequisites

- Git
- Node.js 22 and npm
- Docker Engine/Desktop 27+ with Compose v2
- Network access to the public PartnerOps repository and browser binaries

No production credential or private environment file is required.

## 1. Install the QA harness

```bash
npm ci
npx playwright install chromium firefox webkit
```

Expected: install completes from the lockfile and the working tree remains unchanged.

## 2. Check the repository without starting the SUT

```bash
npm run qa:check
```

Expected: TypeScript passes, every planned test is discoverable, shell files parse, and tracked public files contain no prohibited secrets or generated evidence.

## 3. Run the final release gate

Start Docker Desktop/Engine, then run:

```bash
npm run qa:release
```

Expected sequence:

1. PartnerOps is checked out at the full final revision documented in [the CLI contract](./contracts/release-gate.md).
2. The dedicated Compose project becomes ready and its synthetic database is rebuilt, migrated, and seeded.
3. API, desktop browser, and explicitly labeled mobile-web projects run serially.
4. PostgreSQL assertions confirm persistence, isolation, idempotency, and audit evidence.
5. The process exits zero and leaves live HTML/JUnit results. A blocking failure exits non-zero and is No-Go.

Review `playwright-report/`, `results/junit.xml`, `results/sql.txt`, and `test-results/` as described by the contract. Generated evidence is intentionally untracked.

## 4. Run a focused investigation

```bash
npm run qa:up
npm run test:api
npm run test:web
npm run qa:sql
npm run qa:down
```

Expected: focused commands use the same synthetic environment and do not change the upstream PartnerOps checkout.

## 5. Validate historical defects

Use the manual `Historical Defects` GitHub Actions workflow after publishing the repository. Each job verifies one affected/fixed pair from [research.md](./research.md); expected historical failures never run inside the normal green release gate.

Expected: each affected revision produces only its documented failure signature, each fixed revision passes the same gate, and sanitized logs are retained.

## 6. Review the decision

Open `docs/reports/release-5c855e8.md` and follow every case/defect link back to the live artifacts. Confirm the report distinguishes passed, failed, skipped, and not-run results and explicitly states that Pixel/iPhone coverage is browser emulation, not native or real-device testing.

## Cleanup

```bash
npm run qa:down
```

This removes only the dedicated QA Compose project's synthetic containers and volume. The ignored SUT checkout can be retained for faster reruns.

## Deliberate scope

Playwright is reused for Web, mobile-web, and API coverage; SQL stays native `psql`. Native App/device and load testing remain explicitly out of scope, so no duplicate Selenium/Cypress/Postman/Appium/JMeter stack is installed.
