# Tasks: PartnerOps Release QA Case

**Input**: Design documents from `specs/001-release-qa/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/release-gate.md`, `quickstart.md`

**Tests**: Required. The repository is a QA deliverable, so test specifications and runnable verification precede orchestration/helper implementation wherever the harness itself has behavior.

**Organization**: Tasks are grouped by user story so each increment can be demonstrated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes a different file and has no incomplete dependency.
- **[Story]**: Maps the task to a user story from `spec.md`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a minimal, locked Node QA repository.

- [x] T001 Create tracked-file exclusions for `.sut/`, `node_modules/`, `.env*`, reports, traces, screenshots, results, logs, editor files, and OS files in `.gitignore`
- [x] T002 Initialize Node 22 metadata and install only `@playwright/test@1.61.1`, `typescript@7.0.2`, and `@types/node@22.20.1` in package.json and package-lock.json
- [x] T003 [P] Configure strict no-emit TypeScript and Node/Playwright types in tsconfig.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared projects, fixtures, and selectors used by every story.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [x] T004 Configure serial API, Chromium, Firefox, WebKit, Pixel 7 mobile-web, and iPhone 13 mobile-web projects plus HTML/JUnit/trace artifacts in playwright.config.ts
- [x] T005 [P] Define the pinned SUT revision, base URL, public synthetic identities/tokens, stable seeded request IDs, and unique key/title builders in tests/support/fixtures.ts
- [x] T006 [P] Implement semantic-label login/logout helpers without storage-state secrets or test IDs in tests/support/auth.ts

**Checkpoint**: `npx playwright test --list` discovers the planned project/file layout without starting the SUT.

---

## Phase 3: User Story 1 - 做出可稽核的版本放行判斷 (Priority: P1) 🎯 MVP

**Goal**: A clean machine can own a disposable PartnerOps environment, run a blocking gate, retain evidence, and produce an honest Go/No-Go report.

**Independent Test**: Run `npm run qa:release` from a clean checkout; it must pin the final revision, seed synthetic data, run health/SQL gates, retain results, and return non-zero on any blocker.

### Tests for User Story 1

- [x] T007 [US1] Write Node contract tests for `help`, missing-Docker preflight, empty Compose project rejection, and non-destructive command construction in tests/scripts/qa-script.test.mjs; run them and record the expected RED because scripts/qa.sh does not exist
- [x] T008 [P] [US1] Write final-release health/readiness and response-header acceptance cases in tests/api/release-health.spec.ts
- [x] T009 [P] [US1] Write read-only PostgreSQL release assertions with explicit exceptions and no credentials in tests/sql/release-assertions.sql

### Implementation for User Story 1

- [x] T010 [US1] Implement `help`, `check`, `up`, `test`, `sql`, `down`, and `release` actions with safe path/project validation, pinned checkout, database rebuild, readiness, cleanup trap, and distinct failure output in scripts/qa.sh
- [x] T011 [US1] Add the release-gate, focused-test, typecheck, shell-contract, and SQL npm scripts in package.json
- [x] T012 [P] [US1] Document risk scope, estimates, entry/exit gates, severity rules, environment, and explicit mobile/native boundary in docs/test-plan.md
- [x] T013 [P] [US1] Create initial FR-to-case traceability and manual/automated case catalog for the release gate in docs/traceability.md and docs/test-cases.md
- [x] T014 [US1] Implement the pull-request/main final release job, evidence upload, runtime logs-on-failure, and always-cleanup in .github/workflows/qa.yml
- [x] T015 [US1] Run the complete User Story 1 gate, preserve fresh counts/durations/limitations, and write the evidence-backed decision in docs/reports/release-5c855e8.md

**Checkpoint**: User Story 1 independently demonstrates environment planning, a release gate, SQL verification, reporting, and a Go/No-Go decision.

---

## Phase 4: User Story 2 - 驗證跨介面與跨瀏覽器的核心風險 (Priority: P2)

**Goal**: Prove that Web, mobile-web, API, and persistent data agree on authorization, tenant isolation, idempotency, and audit outcomes.

**Independent Test**: Start the seeded SUT, run `npm run test:api`, `npm run test:web`, and `npm run qa:sql`; verify the same synthetic requests and authorization rules across all boundaries.

### Tests for User Story 2

- [x] T016 [P] [US2] Implement API create/get, missing-invalid auth, validation, cross-client 404, raw-byte replay, and same-key/different-payload conflict cases in tests/api/requests.spec.ts
- [x] T017 [P] [US2] Implement read-only filtered queue/login smoke for Chromium, Firefox, and WebKit plus whole-page overflow checks in tests/web/smoke.spec.ts
- [x] T018 [P] [US2] Implement Pixel/iPhone client create/comment mobile-web flow with project-unique data, semantic controls, and explicit overflow assertions in tests/web/mobile-client.spec.ts
- [x] T019 [US2] Implement the Chromium stateful triage, internal-note visibility, Acme/Globex isolation, and relative dashboard-count assertions in tests/web/triage-and-isolation.spec.ts

### Integration and Documentation for User Story 2

- [x] T020 [US2] Extend tests/sql/release-assertions.sql to verify the automated API request, exactly one idempotency row, matching client ownership, request.created audit, and an enforced database invariant
- [x] T021 [US2] Update exact case steps, expected results, automation paths, and bidirectional FR coverage for Web/mobile-web/API/SQL in docs/test-cases.md and docs/traceability.md

**Checkpoint**: User Stories 1 and 2 run serially against one disposable database without hiding skipped projects or claiming native coverage.

---

## Phase 5: User Story 3 - 重現真實缺陷並驗證修復 (Priority: P3)

**Goal**: Demonstrate three public, non-synthetic defect lifecycles with affected/fixed revisions, expected failure signatures, and retest evidence.

**Independent Test**: Manually dispatch `Historical Defects`; each affected revision must show only its documented failure and each fixed revision must pass the same behavioral gate.

### Defect Evidence for User Story 3

- [x] T022 [P] [US3] Document DBAL 4 migration impact, reproduction, severity, affected/fixed commits, upstream runs, and retest limits in docs/defects/QA-001-dbal4-migration.md
- [x] T023 [P] [US3] Document byte-identical API replay impact, raw-body reproduction, forward-migration fix, upstream runs, and retest limits in docs/defects/QA-002-idempotency-replay.md
- [x] T024 [P] [US3] Document production container dotenv impact, build reproduction, environment-only fix, upstream runs, and retest limits in docs/defects/QA-003-container-dotenv.md

### Automation for User Story 3

- [x] T025 [US3] Implement separate affected/fixed DBAL migration, idempotency regression, and production-container jobs that reject unexpected failure signatures in .github/workflows/historical-defects.yml
- [x] T026 [US3] Run the historical workflow, add sanitized run/artifact links and retest outcomes to docs/defects/QA-001-dbal4-migration.md, docs/defects/QA-002-idempotency-replay.md, docs/defects/QA-003-container-dotenv.md, and docs/reports/release-5c855e8.md

**Checkpoint**: All three user stories are independently reviewable and every defect claim resolves to public source plus behavioral evidence.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Make the repository safe, understandable, and reproducible for a hiring reviewer.

- [x] T027 [P] Lead with risk, coverage, findings, retest, decision, quick commands, evidence links, and honest limitations in README.md
- [x] T028 Run `npm run qa:check`, verify all relative document paths and public tracked files, and record any deliberate simplification in specs/001-release-qa/quickstart.md
- [x] T029 Run a fresh full release gate and GitHub Actions, reconcile result counts and run links in docs/reports/release-5c855e8.md, then mark every completed checklist item in specs/001-release-qa/tasks.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup**: Starts immediately.
- **Foundational**: Depends on Setup and blocks every story.
- **US1**: Depends on Foundational; supplies the environment and normal release gate.
- **US2**: Depends on Foundational and the US1 environment lifecycle, but its Web/API/SQL cases can be reviewed independently.
- **US3**: Depends only on Foundational for documentation; its workflow is separate from the normal gate and can be implemented alongside US2 after US1 lifecycle commands exist.
- **Polish**: Depends on all selected stories and fresh evidence.

### User Story Dependency Graph

```text
Setup → Foundation → US1 → US2 ─┐
                       └→ US3 ─┴→ Polish
```

### Within Each User Story

- Harness contract tests precede `scripts/qa.sh` implementation.
- Acceptance test files precede integration and report claims.
- Affected-revision failure evidence precedes fixed-revision verification.
- Reports are written only from fresh command/CI output.

### Parallel Opportunities

- T003 can run alongside T001/T002 after package intent is known.
- T005 and T006 touch separate support files.
- T008, T009, T012, and T013 touch separate paths after Foundation.
- T016, T017, and T018 are independent test files; T019 stays serial because it mutates shared state.
- T022, T023, and T024 are independent defect records.
- US2 documentation and US3 defect records can progress in parallel once US1 lifecycle is stable.

## Parallel Examples

### User Story 1

```text
T008: tests/api/release-health.spec.ts
T009: tests/sql/release-assertions.sql
T012: docs/test-plan.md
T013: docs/traceability.md + docs/test-cases.md
```

### User Story 2

```text
T016: tests/api/requests.spec.ts
T017: tests/web/smoke.spec.ts
T018: tests/web/mobile-client.spec.ts
```

### User Story 3

```text
T022: docs/defects/QA-001-dbal4-migration.md
T023: docs/defects/QA-002-idempotency-replay.md
T024: docs/defects/QA-003-container-dotenv.md
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundation.
2. Complete T007–T015 for US1.
3. Run `npm run qa:release` and review the first decision before expanding coverage.

### Incremental Delivery

1. US1 proves reproducible release readiness.
2. US2 adds the JD-relevant cross-browser, mobile-web, API, and SQL depth.
3. US3 adds genuine defect lifecycle and fix verification.
4. Polish makes the evidence safe and recruiter-readable.

## Notes

- `[P]` tasks modify separate files and have no incomplete same-file dependency.
- Pixel/iPhone means browser/device emulation only.
- Do not use the incorrect Kunjia `1,694 tests` claim or any unsupported production metric.
- Do not copy the PartnerOps source or OpenAPI into this repository.
- Keep historical expected failures in the separate workflow; a red normal release gate must correspond to a documented current blocker.
