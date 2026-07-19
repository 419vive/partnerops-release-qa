# Research: PartnerOps Release QA Case

## Decision 1 — Reuse a real system under test

**Decision**: Use public `419vive/partnerops` as the external SUT; pin the final release to `5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65`.

**Rationale**: It already exposes real Web roles, client-scoped APIs, PostgreSQL constraints, audit records, Docker, fixtures, OpenAPI, and a verifiable commit history. The QA case can therefore demonstrate release judgment instead of spending most effort building a toy product.

**Alternatives considered**: A new booking PWA would shift the portfolio toward application development. A new Expo app would add native-emulator flakiness and still not prove production mobile tenure. Both were rejected for version 1.

## Decision 2 — One browser and API framework

**Decision**: Pin Node.js 22, `@playwright/test` 1.61.1, TypeScript 7.0.2, and the matching `@types/node` 22.20.1 declarations. Use Playwright for Web and HTTP tests.

**Rationale**: One installed, mainstream framework covers Chromium, Firefox, WebKit, device profiles, API requests, HTML/JUnit reporting, screenshots, and traces. This directly covers the job's Playwright plus Web/API expectations without a keyword-driven tool pile.

**Alternatives considered**: Cypress, Selenium, Postman/Newman, and Appium would duplicate coverage or expand setup. Add one only after a requirement cannot be represented by Playwright.

## Decision 3 — Browser matrix is risk-shaped

**Decision**: Run the stateful triage/isolation flow only in desktop Chromium. Run a read-only smoke in Chromium, Firefox, and WebKit. Run a client create/comment smoke in Pixel 7 Chromium and iPhone 13 WebKit emulation. Set workers to one.

**Rationale**: Repeating every mutation in six projects creates data collisions and slow, low-value duplication. Read-only compatibility cases prove rendering/navigation; one stateful flow proves the business workflow. A shared synthetic database makes serial execution the safe first version.

**Alternatives considered**: Full matrix execution was rejected until per-worker databases exist. Native Android/iOS was explicitly excluded and mobile projects will be labeled mobile web.

## Decision 4 — Keep the API contract upstream, test behavior downstream

**Decision**: Treat the OpenAPI file at the pinned PartnerOps revision as the contract truth. Test status, headers, RFC 9457 shape, tenant isolation, validation, and idempotency through Playwright request fixtures. Compare replay responses as raw bytes before JSON parsing.

**Rationale**: Copying the OpenAPI document would create a second drifting contract. Raw-byte comparison is required because parsed objects would hide the historical PostgreSQL JSONB key-order defect.

**Alternatives considered**: Generating a client adds code without increasing risk coverage. Schema-only validation misses authorization, persistence, and replay semantics.

## Decision 5 — Use native SQL assertions without a database package

**Decision**: Execute `tests/sql/release-assertions.sql` through `docker compose exec -T db psql`.

**Rationale**: The SUT already supplies the exact PostgreSQL 16 client and synthetic database. SQL can verify request counts, tenant ownership, idempotency rows, and audit rows without adding a Node driver or embedding database credentials in test code.

**Alternatives considered**: A Node PostgreSQL client would add dependency and connection configuration. ORM assertions would test application abstractions instead of the database boundary requested by the role.

## Decision 6 — Separate final gate from historical expected failures

**Decision**: The normal `qa:release` gate tests only final `5c855e8`. A separate manually dispatchable historical workflow verifies these pairs:

| Defect | Affected | Fixed | Expected failure |
|---|---|---|---|
| QA-001 DBAL 4 migration | `7079d99ae802a32ffaa82b2390e858e26d065aed` | `6aa9546187e91bda44b8481dedcd3b7ed430238a` | `PostgreSQL120Platform::getName()` is undefined |
| QA-002 byte-identical replay | `6aa9546187e91bda44b8481dedcd3b7ed430238a` | `c4e794a83a4536bb40627f0b34e0ec8ed161b03e` | replay raw response differs after JSONB reorders keys |
| QA-003 production dotenv | `c4e794a83a4536bb40627f0b34e0ec8ed161b03e` | `5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65` | production build cannot read excluded `.env` |

**Rationale**: Expected failures must not make every pull request red or be confused with current release quality. Public upstream runs provide independent evidence: `29640902228`, `29641007621`, `29642501363`, and final green `29642823042`.

**Alternatives considered**: Artificially seeding bugs was rejected as misleading. Source-diff-only checks were rejected because they do not reproduce behavior.

## Decision 7 — Use the SUT's Docker Compose lifecycle

**Decision**: Clone/fetch the SUT under ignored `.sut/partnerops`, checkout `SUT_REF`, start its existing Compose stack under a dedicated project name, rebuild the disposable database, migrate, seed `AppFixtures`, and wait for readiness.

**Rationale**: This matches the public quickstart and includes PostgreSQL-specific behavior. It avoids host PHP/Composer requirements and preserves a production-like boundary.

**Alternatives considered**: A host PHP server is faster in CI but would require duplicating the SUT's runtime setup. A copied compose file would drift.

## Decision 8 — Reports are standard artifacts plus one reviewed decision

**Decision**: Keep Playwright HTML/JUnit/trace artifacts untracked. Commit a sanitized Markdown test plan, traceability matrix, defects, and a release report based on a fresh run. CI uploads the live artifacts.

**Rationale**: Reviewers need a stable narrative and rerunnable evidence. Committing generated HTML and screenshots would bloat the repo and become stale.

**Alternatives considered**: A custom dashboard/report generator was rejected; Playwright and GitHub Actions already provide the necessary machine and human outputs.

## Observation from requirements review

PartnerOps quickstart currently says assignment plus transition should change both overdue and unassigned dashboard counts. The implementation keeps an overdue request overdue until resolved/closed, so only unassigned changes in that flow. Fixed July 2026 fixture dates also make absolute overdue/due-soon counts time-sensitive. The QA case will assert deltas, record this as a documentation/testability observation, and will not call it a production incident.
