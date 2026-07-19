# PartnerOps Release QA Constitution

## Core Principles

### I. Evidence Before Claims
Every quality claim MUST be backed by a rerunnable command, an immutable
system-under-test revision, and retained output. Historical defects MUST name the
failing revision, fixed revision, reproduction, and retest evidence. Synthetic
defects, clients, incidents, native-device coverage, and production outcomes MUST
never be presented as real.

### II. Risk-Based Traceability
Testing MUST start from business and release risk. Every critical risk MUST map
to at least one test case and every automated case MUST map back to a documented
requirement or defect. Severity and release decisions MUST use published criteria,
not tool output alone.

### III. Test First and Reproduce the Failure
Non-trivial automation MUST be written before helper implementation and observed
failing for the expected reason. Defect verification MUST demonstrate red on the
affected revision and green on the fixed revision. Small configuration-only edits
may use the narrowest runnable validation instead of a new test.

### IV. Verify Across Boundaries
Critical workflows MUST be checked at the user interface, HTTP contract, and
persistent-data boundary when those layers participate in the risk. Authorization,
tenant isolation, idempotency, and audit behavior require negative-path evidence.

### V. Honest, Boring, Reproducible Scope
Use platform and standard tooling before adding dependencies. One browser
automation framework, Docker Compose supplied by the target application, and SQL
executed through its database client are sufficient. Mobile browser emulation MUST
be labeled as mobile web; it MUST NOT be described as native Android/iOS or real
device testing.

## Technical and Portfolio Constraints

- Public documentation and reports MUST use Traditional Chinese; code identifiers
  and machine-readable contracts MAY use English.
- The baseline toolchain is Node.js 22, TypeScript, Playwright Test, Docker Compose,
  and PostgreSQL `psql`. New frameworks require a measured gap.
- The PartnerOps repository is an external system under test and MUST be checked
  out at explicit revisions; its source is not copied into this repository.
- Only deterministic synthetic demo data may be used. No live credentials,
  personal data, API keys, or copied `.env` files may be committed or published.
- Version 1 excludes native mobile automation, real devices, Cypress, Selenium,
  Appium, JMeter, cloud deployment, and modification of PartnerOps production code.
- Generated reports, traces, screenshots, local SUT checkouts, dependencies, and
  environment files MUST remain untracked; representative sanitized evidence MAY
  be committed when it is stable and necessary to review the case.

## Delivery Gates

- A clean checkout MUST install with the lockfile and expose a single documented
  release-gate command.
- Type checking, test discovery, critical final-release tests, SQL assertions,
  documentation links, and secret scanning MUST pass before completion.
- The final PartnerOps revision MUST pass every required case; intentional failing
  historical reproductions MUST run separately and assert the expected failure.
- CI MUST retain machine-readable results and failure diagnostics without leaking
  credentials.
- The README MUST lead with risk, coverage, findings, fix verification, decision,
  and limitations; tool names are supporting detail.

## Governance

This constitution overrides conflicting plan or task guidance. Amendments require
a written rationale, a semantic version change, and revalidation of dependent
artifacts. Reviews MUST reject unsupported claims, unbounded scope, secret exposure,
unmapped tests, and unexplained dependencies. Complexity exceptions belong in the
plan and expire when their evidence no longer applies.

**Version**: 1.0.0 | **Ratified**: 2026-07-19 | **Last Amended**: 2026-07-19
