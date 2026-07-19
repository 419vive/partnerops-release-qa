# Evidence Data Model: PartnerOps Release QA Case

The repository has no runtime database of its own. These entities describe the documents, tests, and generated evidence that support a release decision.

## RiskRequirement

| Field | Rule |
|---|---|
| `id` | Stable `FR-nnn` or `RISK-nnn` identifier |
| `title` | Plain-language failure or required outcome |
| `impact` | Critical, high, medium, or low |
| `release_blocking` | Boolean with rationale |
| `source` | Feature spec, upstream contract, or observed gap |
| `case_ids` | At least one linked TestCase for high/critical items |

## TestCase

| Field | Rule |
|---|---|
| `id` | Stable `WEB-nnn`, `API-nnn`, `DB-nnn`, or `DEF-nnn` |
| `requirement_ids` | One or more RiskRequirement IDs |
| `level` | Web, mobile-web, API, database, migration, or container |
| `environment` | Browser/device project or runtime boundary |
| `preconditions` | Synthetic identity, SUT revision, and data state |
| `steps` | Minimal reproducible sequence |
| `expected` | Observable result, never an implementation guess |
| `automation` | Automated or manual-review |
| `blocking` | Whether failure forces No-Go |

## ExecutionResult

| Field | Rule |
|---|---|
| `case_id` | Existing TestCase ID |
| `sut_revision` | Full immutable commit SHA |
| `started_at` | UTC timestamp |
| `duration_ms` | Non-negative integer |
| `outcome` | Passed, failed, skipped, or not-run |
| `evidence` | Artifact path or public CI URL |
| `failure_signature` | Required when failed; sanitized |

## DefectRecord

| Field | Rule |
|---|---|
| `id` | Stable `QA-nnn` |
| `summary` | User/release impact, not tool-only wording |
| `severity` | Published severity definition |
| `affected_revision` | Full commit SHA |
| `fixed_revision` | Full commit SHA after forward-compatible fix |
| `reproduction_case` | One DEF TestCase ID |
| `expected_failure` | Exact signature that proves reproduction |
| `retest_result` | ExecutionResult on fixed revision |
| `limitations` | Runner drift or scope boundaries |
| `source_evidence` | Public diff and/or upstream CI run |

## ReleaseDecision

| Field | Rule |
|---|---|
| `sut_revision` | Exactly one final revision |
| `scope` | Executed platforms and layers |
| `passed` / `failed` / `skipped` / `not_run` | Separate non-negative counts |
| `blockers` | Failed release-blocking case IDs |
| `known_limitations` | Explicit uncovered risks |
| `decision` | Go only when blockers are empty and required scope ran; otherwise No-Go |
| `evidence_links` | Live CI and local command references |

## Relationships

```text
RiskRequirement 1 ──* TestCase 1 ──* ExecutionResult
DefectRecord     1 ──1 reproduction TestCase
DefectRecord     1 ──2+ ExecutionResult (affected + fixed)
ReleaseDecision  1 ──* ExecutionResult
```

## State Transitions

### Test execution

`planned → running → passed | failed | skipped`

- `not-run` is a report state before execution, not a pass.
- A rerun creates a new ExecutionResult; it does not overwrite history.

### Defect lifecycle

`documented → reproduced-on-affected → fix-identified → retested-on-fixed → verified`

- A defect cannot reach `verified` from a source diff alone.
- An unexpected failure signature returns the defect to `documented` for investigation.

### Release decision

`incomplete → Go | No-Go`

- Any failed blocking case forces `No-Go`.
- Missing required browser/API/DB scope leaves the decision `incomplete`, never implicit Go.
