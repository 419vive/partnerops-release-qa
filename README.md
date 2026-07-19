# PartnerOps Release QA

[![Release QA](https://github.com/419vive/partnerops-release-qa/actions/workflows/qa.yml/badge.svg)](https://github.com/419vive/partnerops-release-qa/actions/workflows/qa.yml)
[![Historical Defects](https://github.com/419vive/partnerops-release-qa/actions/workflows/historical-defects.yml/badge.svg)](https://github.com/419vive/partnerops-release-qa/actions/workflows/historical-defects.yml)

這是一套針對公開 B2B 服務營運平台 [PartnerOps](https://github.com/419vive/partnerops) 的風險式版本放行案例，不是另造一個假 App。受測系統固定在不可變 commit [`5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65`](https://github.com/419vive/partnerops/commit/5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65)，所有資料都是可重建的公開合成 fixtures。

## Release decision

| 項目 | 狀態 |
|---|---|
| 本機靜態 gate | **PASS** — typecheck、13 個 Playwright executions discovery、4 個 shell contracts、public-file scan |
| 最終 Web／API／PostgreSQL gate | **FAIL** — API 7/7 passed；6 個 Web executions 皆因同一登入 audit constraint 失敗；SQL fail-fast 未執行 |
| 歷史缺陷 affected／fixed pair | **PASS** — [Historical Defects run 29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964)；3/3 jobs passed，affected exact signatures reproduced、fixed gates passed |
| 目前建議 | **NO-GO** — [QA-004](docs/defects/QA-004-auth-audit-metadata.md) 是 S2 release blocker；剩餘 SQL scope 亦不完整 |

最新、可稽核的數量與判斷以 [release report](docs/reports/release-5c855e8.md) 為準；required scope 只要 failed、skipped 或 not-run，不會被包裝成通過。

## 優先驗證的商業風險

| 風險 | 驗證方式 |
|---|---|
| Acme 看見 Globex 或內部留言 | UI 與 API 交叉驗證 404、內容不洩漏、PostgreSQL tenant ownership |
| 整合端重送造成契約不一致 | 首次與 replay 的 raw response bytes、Location、狀態及單筆持久化 |
| Web／API／DB 結果互相矛盾 | 角色流程、HTTP contract、audit event、idempotency row 與 constraints；本輪在此找到 QA-004 |
| migration 或 production image 阻擋放行 | 真實 affected/fixed commits、精確 failure signature、同一 gate retest |
| 部分平台未跑卻產生 false Go | Chromium／Firefox／WebKit、兩個 mobile-web projects 與 SQL 全部 blocking |
| 公開證據洩漏秘密 | 合成身份、ignored artifacts、tracked-file secret scan、失敗 log 遮罩 |

完整風險、需求與案例的雙向關係在 [traceability matrix](docs/traceability.md)。

## 覆蓋範圍

- Web：登入、搜尋／篩選、指派、狀態轉換、內部留言、dashboard delta、跨客戶隔離。
- Mobile web：Pixel 7 Chromium 與 iPhone 13 WebKit emulation 下建立請求、留言與 viewport overflow。
- API：health、認證、RFC 9457 validation、建立／讀取、跨客戶 404、冪等 replay、409 conflict。
- PostgreSQL：tenant ownership、單一 idempotency record、`request.created` audit 與 database constraints。
- CI：乾淨 checkout、full SHA 驗證、migration、fixtures、evidence upload、失敗診斷與專屬 volume cleanup。
- Defect lifecycle：三筆公開 release defect 的 affected/fixed 驗證，與當前 release gate 分離。

Pixel／iPhone 專案是 **mobile-web emulation**，不是原生 Android／iOS App、模擬器或實體手機測試。

## 真實缺陷與修復驗證

| ID | Release blocker | Affected → fixed | 公開證據 |
|---|---|---|---|
| [QA-004](docs/defects/QA-004-auth-audit-metadata.md) | 空 PHP metadata 變成 JSON `[]`，所有 Web authentication audit 違反 object constraint | `5c855e8` → **open** | 本 repo [No-Go run 29685275310](https://github.com/419vive/partnerops-release-qa/actions/runs/29685275310)：API 7 passed、Web 6 failed |
| [QA-001](docs/defects/QA-001-dbal4-migration.md) | DBAL 4 移除 `getName()`，乾淨 migration fatal | `7079d99` → `6aa9546` | [affected run 29640902228](https://github.com/419vive/partnerops/actions/runs/29640902228)；fixed migration step [29641007621](https://github.com/419vive/partnerops/actions/runs/29641007621)；dedicated pair [29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964) passed |
| [QA-002](docs/defects/QA-002-idempotency-replay.md) | JSONB 重排 key，破壞 byte-identical replay | `6aa9546` → `c4e794a` | fixed predecessor/replay gates [29642501363](https://github.com/419vive/partnerops/actions/runs/29642501363)；dedicated pair [29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964) passed |
| [QA-003](docs/defects/QA-003-container-dotenv.md) | production image build 依賴被排除的 `.env` | `c4e794a` → `5c855e8` | [affected run 29642501363](https://github.com/419vive/partnerops/actions/runs/29642501363)；[fixed run 29642823042](https://github.com/419vive/partnerops/actions/runs/29642823042)；dedicated pair [29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964) passed |

QA-001–003 已有 fixed revision；QA-004 是本輪新發現且仍 open。這些都是公開 CI/release defect；沒有資料支持 production incident、客戶事故或 SLA 影響，因此不做這些宣稱。

## 一條命令重跑

需要 Git、Node.js 22、Docker Engine/Desktop 27+ 與 Compose v2：

```bash
npm ci
npx playwright install chromium firefox webkit
npm run qa:check
npm run qa:release
```

`qa:release` 會 checkout pinned SUT、啟動專屬 Compose project、重建 PostgreSQL、執行 migration／fixtures、跑 Web／mobile-web／API／SQL gates，最後只清除它擁有的合成 containers 與 volume。完整步驟見 [quickstart](specs/001-release-qa/quickstart.md)。

## 與測試工程師職缺的能力對照

| 職缺能力 | 本案例的可查證產出 |
|---|---|
| 預估時程、測試計畫、案例設計 | [test plan](docs/test-plan.md)、[test cases](docs/test-cases.md)、[traceability](docs/traceability.md) |
| 建立測試環境與維護測試程式 | pinned SUT、專屬 Compose lifecycle、shell contract tests、GitHub Actions |
| Web 手動／自動與整合／回歸 | 三桌面 browser、角色流程、historical fixed regression |
| Android／iOS 平台概念 | Pixel／iPhone **mobile-web emulation**；沒有聲稱 native／真機 |
| API 測試 | 認證、RFC 9457、tenant isolation、raw-byte idempotency、409 conflict |
| SQL 與後端資料驗證 | PostgreSQL assertions 已實作；本輪因 QA-004 fail-fast 維持 not-run |
| 缺陷追蹤與修復驗證 | 三份 affected/fixed records，加一份本輪 open blocker、精確 signature、公開 runs |
| 測試報告 | HTML、JUnit、trace／screenshot 與 reviewed No-Go report 已留存；SQL output 待 blocker 修復後完整回歸 |

## 證據與文件

- [測試計畫](docs/test-plan.md)：範圍、估時、環境、entry/exit、severity 與限制。
- [測試案例](docs/test-cases.md)：手動步驟、預期結果與 automation path。
- [追溯矩陣](docs/traceability.md)：17 項 functional requirements、風險與案例雙向對照。
- [Release report](docs/reports/release-5c855e8.md)：同一 full SHA 的執行數量、證據與 Go／No-Go。
- [Spec Kit artifacts](specs/001-release-qa/)：spec、research、data model、contract、plan 與 tasks。

## 明確限制

- 不涵蓋 native App、真機、效能／壓力、滲透、長時間穩定性、災難復原或 production deployment。
- WebKit 是 Playwright browser engine，不等於實體 Safari 裝置。
- 固定 2026-07 fixtures 會隨日期改變 absolute overdue counts；案例只驗證操作造成的相對變化。
- Historical reproduction 可能受今日 runner、registry 或 base image 漂移影響；只有文件指定 signature 才算成功重現。

工具選擇刻意維持單一：Playwright 同時處理 Web、mobile-web 與 API，SQL 使用原生 `psql`。沒有為了工具清單重複加入 Cypress、Selenium、Postman、JMeter 或 Appium。
