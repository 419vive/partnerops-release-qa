# PartnerOps 風險與需求追溯矩陣

**規格真相源**：[Feature specification](../specs/001-release-qa/spec.md)  
**案例定義**：[test-cases.md](./test-cases.md)  
**受測版本**：[`5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65`](https://github.com/419vive/partnerops/commit/5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65)

本矩陣只宣告覆蓋關係，不把 planned case 當成 passed。最新 execution outcome 必須來自同一 full SHA 的 JUnit、SQL output（若已執行）或 report 中明確的 not-run 記錄、GitHub Actions 與 `docs/reports/release-5c855e8.md`；required case 若是 skipped／not-run，決策保持 incomplete。

## 高風險項目

| Risk | 失敗模式 | 影響 | Blocking | 對應案例 |
|---|---|---|---:|---|
| RISK-001 | 測到錯誤 revision 或 setup 不完整仍產生報告 | false Go | 是 | ENV-001–004、API-001、CI-001 |
| RISK-002 | Acme 可讀取 Globex 或 internal-only 資料 | 跨客戶資料洩漏 | 是 | API-005、WEB-002、DB-001 |
| RISK-003 | 冪等重播 body 不一致或建立重複資料 | 外部整合失序／契約破壞 | 是 | API-002、API-006、API-007、DB-001、DEF-002 |
| RISK-004 | migration 無法在 locked DBAL/PostgreSQL 執行 | release 無法部署 | 是 | DEF-001 |
| RISK-005 | production image 依賴被排除的環境檔 | image 無法交付 | 是 | DEF-003 |
| RISK-006 | 主要 browser／mobile web 無法完成任務 | 使用者阻塞 | 是 | WEB-001、MWEB-001 |
| RISK-007 | UI/API 與持久資料／audit 不一致 | 錯誤狀態、不可稽核 | 是 | API-002、API-006、WEB-002、DB-001 |
| RISK-008 | skipped／not-run 被算成 passed | 錯誤放行決策 | 是 | CI-001、REP-001 |
| RISK-009 | log／artifact／tracked file 洩漏秘密 | credential exposure | 是 | ENV-003–004、SEC-001、CI-001 |
| RISK-010 | authentication audit 的空 metadata 與 DB object constraint 不一致 | 所有 Web 登入回 500 | 是 | WEB-001、WEB-002、MWEB-001、DEF-004 |

OBS-001（quickstart 對 overdue count 的描述與實作不一致）只記為文件／可測試性觀察；WEB-002 使用相對 delta，不把它描述成 production incident。詳見 [測試計畫](./test-plan.md#9-已知限制與觀察)。

## Requirement → Case

| Requirement | 驗證重點 | Case／文件 | 可重跑證據 |
|---|---|---|---|
| FR-001 | final、affected、fixed revision 皆為 full SHA | ENV-004、DEF-001–003 | shell contract、三份 defect record |
| FR-002 | 隔離環境、合成資料、明確 setup failure | ENV-001–004、API-001 | `tests/scripts/qa-script.test.mjs`、`tests/api/release-health.spec.ts` |
| FR-003 | scope、排除、假設、估時、entry/exit、severity | 測試計畫 | [test-plan.md](./test-plan.md) |
| FR-004 | 高風險需求與自動案例雙向追溯 | 全案例、本矩陣 | case title ID + 本文件 reverse matrix |
| FR-005 | 角色式 Web 核心流程與跨客戶拒絕 | WEB-002、API-005 | `tests/web/triage-and-isolation.spec.ts`、`tests/api/requests.spec.ts` |
| FR-006 | 三桌面家族＋Pixel/iPhone mobile-web | WEB-001、MWEB-001 | Playwright 五個 browser/device projects |
| FR-007 | create、auth、validation、read、replay、conflict | API-002–007 | `tests/api/requests.spec.ts` |
| FR-008 | parse 前比較原始 response bytes | API-006、DEF-002 | API test + historical `idempotency-replay` job |
| FR-009 | tenant、status、audit、DB invariant | API-002、API-005–006、WEB-002、DB-001 | Playwright + `tests/sql/release-assertions.sql` |
| FR-010 | 三個公開、非人工植入歷史 defect | DEF-001–003 | [QA-001](./defects/QA-001-dbal4-migration.md)、[QA-002](./defects/QA-002-idempotency-replay.md)、[QA-003](./defects/QA-003-container-dotenv.md) |
| FR-011 | 每筆 defect 的 env、steps、expected/actual、severity、SHA、retest | DEF-001–003 | 三份 defect record + public Actions URLs |
| FR-012 | HTML/JUnit；失敗 trace/screenshot/log | CI-001 | Playwright reporter + workflow artifacts |
| FR-013 | PR/main release gate 與證據 retention | CI-001 | `.github/workflows/qa.yml` |
| FR-014 | README 先呈現風險、發現、決策、限制 | REP-001 | README/release report 人工核對 |
| FR-015 | 一條主要命令，可改 ref/base URL | ENV-001、ENV-004 | `npm run qa:release` + release-gate contract |
| FR-016 | ignore SUT、依賴、秘密與生成產物 | ENV-003–004、SEC-001、CI-001 | `.gitignore` + `npm run qa:check` |
| FR-017 | 四種結果分開；blocker 強制 No-Go | REP-001、CI-001 | JUnit/workflow/release report reconciliation |

## Case → Requirement（反向）

| Case | Requirements | Automation source |
|---|---|---|
| ENV-001 | FR-002、FR-015 | `tests/scripts/qa-script.test.mjs` |
| ENV-002 | FR-002、FR-015 | `tests/scripts/qa-script.test.mjs` |
| ENV-003 | FR-002、FR-016 | `tests/scripts/qa-script.test.mjs` |
| ENV-004 | FR-001、FR-002、FR-015、FR-016 | `tests/scripts/qa-script.test.mjs` |
| API-001 | FR-002、FR-012 | `tests/api/release-health.spec.ts` |
| API-002 | FR-007、FR-009 | `tests/api/requests.spec.ts` |
| API-003 | FR-007 | `tests/api/requests.spec.ts` |
| API-004 | FR-007 | `tests/api/requests.spec.ts` |
| API-005 | FR-005、FR-007、FR-009 | `tests/api/requests.spec.ts` |
| API-006 | FR-007、FR-008、FR-009 | `tests/api/requests.spec.ts` + SQL |
| API-007 | FR-007 | `tests/api/requests.spec.ts` |
| WEB-001 | FR-005、FR-006 | `tests/web/smoke.spec.ts` |
| MWEB-001 | FR-005、FR-006 | `tests/web/mobile-client.spec.ts` |
| WEB-002 | FR-005、FR-009 | `tests/web/triage-and-isolation.spec.ts` |
| DB-001 | FR-009 | `tests/sql/release-assertions.sql` |
| SEC-001 | FR-016 | `npm run qa:check` |
| CI-001 | FR-012、FR-013、FR-016、FR-017 | `.github/workflows/qa.yml` |
| REP-001 | FR-014、FR-017 | reviewed release report |
| DEF-001 | FR-001、FR-010、FR-011 | historical `dbal-migration` job |
| DEF-002 | FR-001、FR-008、FR-010、FR-011 | historical `idempotency-replay` job |
| DEF-003 | FR-001、FR-010、FR-011 | historical `production-container` job |
| DEF-004 | FR-005、FR-006、FR-009、FR-017 | final release Web projects + [QA-004](./defects/QA-004-auth-audit-metadata.md) |

## 執行結果連結規則

- Case ID 必須出現在 Playwright title、SQL assertion section、defect job 或 reviewed report 中，讓 JUnit／log 能反查本矩陣。
- Final release evidence 與 historical expected-failure evidence分開；歷史紅燈不得算進 current release failure count。
- QA-001 的 upstream affected/fixed evidence 是 [29640902228](https://github.com/419vive/partnerops/actions/runs/29640902228)／[29641007621](https://github.com/419vive/partnerops/actions/runs/29641007621)；QA-002 fixed evidence 是 [29642501363](https://github.com/419vive/partnerops/actions/runs/29642501363)；QA-003 affected/fixed evidence 是 [29642501363](https://github.com/419vive/partnerops/actions/runs/29642501363)／[29642823042](https://github.com/419vive/partnerops/actions/runs/29642823042)。各 run 的限制以 defect record 為準。
- 專用 [Historical Defects run 29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964) 已通過三組 affected/fixed pairs；各 exact signature、fixed outcome 與 artifact URL 已追加到相應 defect record，不以 source diff 取代 execution result。
