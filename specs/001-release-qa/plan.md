# Implementation Plan: PartnerOps Release QA Case

**Branch**: `main` | **Date**: 2026-07-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-release-qa/spec.md`

## Summary

建立一個獨立公開的 release QA repository，以公開的 PartnerOps B2B 服務營運平台作為真實受測系統。案例以風險與 release decision 為主線，使用單一 Playwright 測試框架覆蓋桌面 Web、Android／iPhone 行動網頁模擬與 API；以 `psql` 核對 PostgreSQL 資料；以公開 commit 與 GitHub Actions run 證明三個歷史缺陷的 affected／fixed 狀態。受測程式只在 `.sut/` checkout，不複製或修改上游來源。

## Technical Context

**Language/Version**: Node.js 22；TypeScript 7.0.2；POSIX shell

**Primary Dependencies**: `@playwright/test` 1.61.1、TypeScript 7.0.2、`@types/node` 22.20.1；受測系統既有 Docker Compose

**Storage**: 本 repo 無應用資料庫；測試透過受測系統的 PostgreSQL 16 container 執行只讀 assertions；結果存為 HTML、JUnit XML、trace、截圖與 Markdown

**Testing**: Playwright Test、TypeScript `tsc --noEmit`、`psql` assertions、shell syntax/preflight checks

**Target Platform**: 本機 macOS arm64 + Docker Desktop；GitHub Actions Ubuntu；Chromium、Firefox、WebKit、Pixel 7 mobile-web emulation、iPhone 13 mobile-web emulation

**Project Type**: 獨立外部 QA harness 與公開 portfolio case study

**Performance Goals**: warm CI release gate 20 分鐘內完成；read-only smoke 5 分鐘內完成；本機失敗在 30 秒內指出缺少 Docker／Git／Node 或無效 SUT revision

**Constraints**: 只能使用合成資料；不得聲稱 native／真機；stateful tests 單 worker；最終 revision 全綠，歷史 expected-failure 與正常 gate 分離；不修改上游 PartnerOps

**Scale/Scope**: 3 user stories、17 functional requirements、3 歷史 defect pairs、1 個 stateful Chromium flow、5 個 UI browser/device projects、API 與 SQL gates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Design evidence | Status |
|---|---|---|
| Evidence Before Claims | SUT 與 defect 皆使用 immutable commit；報告連到 commands、cases、runs | PASS |
| Risk-Based Traceability | `docs/traceability.md` 雙向連結 FR、風險、case 與結果 | PASS |
| Test First | 自動化先對 affected ref 觀察指定 failure，再在 fixed ref 通過 | PASS |
| Verify Across Boundaries | Web、API raw body 與 PostgreSQL assertions 對同一資料流核對 | PASS |
| Honest, Boring Scope | 單一 UI framework；mobile-web 明示非 native；不加入工具拼盤 | PASS |
| Secrets and Synthetic Data | 只使用上游公開 fixtures；`.env*`、`.sut/` 與產物全部 ignore | PASS |

Phase 0 前無違規。Phase 1 後資料模型、CLI contract 與 quickstart 均未引入新服務、資料庫或額外框架，重查仍全數 PASS；Complexity Tracking 不需要例外。

## Phase 0 Research Decisions

完整決策與替代方案見 [research.md](./research.md)。已解決所有技術未知數，沒有 `NEEDS CLARIFICATION`。

## Phase 1 Design

- Evidence model 與狀態：見 [data-model.md](./data-model.md)
- Release gate CLI／環境契約：見 [contracts/release-gate.md](./contracts/release-gate.md)
- 端到端驗證指南：見 [quickstart.md](./quickstart.md)
- 受測 API schema 以 PartnerOps revision 內的 `specs/001-partner-operations/contracts/openapi.yaml` 為唯一真相源，本 repo 不複製一份會漂移的 OpenAPI。

## Project Structure

### Documentation (this feature)

```text
specs/001-release-qa/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── release-gate.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Repository Root

```text
.github/workflows/
├── qa.yml
└── historical-defects.yml
docs/
├── test-plan.md
├── test-cases.md
├── traceability.md
├── defects/
│   ├── QA-001-dbal4-migration.md
│   ├── QA-002-idempotency-replay.md
│   └── QA-003-container-dotenv.md
└── reports/
    └── release-5c855e8.md
scripts/
└── qa.sh
tests/
├── api/
│   └── requests.spec.ts
├── web/
│   ├── smoke.spec.ts
│   └── triage-and-isolation.spec.ts
├── sql/
│   └── release-assertions.sql
└── support/
    ├── auth.ts
    └── fixtures.ts
playwright.config.ts
package.json
tsconfig.json
README.md
```

**Structure Decision**: 單一 Node QA harness；UI 與 API 由 Playwright 共用設定，SQL 保留原生 `.sql`，環境生命週期與 public-repo checks 集中在一個 `scripts/qa.sh`。沒有 `src/`，因為本 repo 不提供產品 runtime。

## Complexity Tracking

無 constitution violation；不建立例外。
