# PartnerOps 測試案例目錄

**受測版本**：[`5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65`](https://github.com/419vive/partnerops/commit/5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65)  
**共用資料**：PartnerOps 公開 `AppFixtures` 合成身份與 run-specific 測試值  
**結果真相源**：GitHub Actions／JUnit／SQL output 與 `docs/reports/release-5c855e8.md`

本文件定義「要怎麼測」；它不把預期結果寫成已通過。每次執行的 passed、failed、skipped、not-run 必須由同一受測 full SHA 的產物與 release report 提供。

## 共用前置條件

1. 依 [測試計畫](./test-plan.md)通過進入條件。
2. `SUT_REF` 解析為 `5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65`，而非 branch 名稱。
3. `COMPOSE_PROJECT_NAME` 使用 QA 專屬非空名稱；資料庫已重建、migration 與 `AppFixtures` 已完成。
4. `/health/live` 與 `/health/ready` 均回應 `200` 後才開始產品案例。
5. 所有帳號、token、request、comment 與 idempotency key 都是公開合成資料；每次 mutation 使用唯一 suffix。

## 案例總覽

| ID | 層級／專案 | 目的 | Blocking | 自動化 |
|---|---|---|---:|---|
| ENV-001 | shell contract | help 可離線說明完整生命週期 | 是 | `tests/scripts/qa-script.test.mjs` |
| ENV-002 | shell contract | Docker 缺失時在 mutation 前失敗 | 是 | `tests/scripts/qa-script.test.mjs` |
| ENV-003 | shell contract | 拒絕空 Compose project name | 是 | `tests/scripts/qa-script.test.mjs` |
| ENV-004 | shell contract | pin full SHA，cleanup 只限專屬 project | 是 | `tests/scripts/qa-script.test.mjs` |
| API-001 | API | liveness／readiness 與安全 cache header | 是 | `tests/api/release-health.spec.ts` |
| API-002 | API | 合法建立一筆 client-scoped request | 是 | `tests/api/requests.spec.ts` |
| API-003 | API | 缺少／無效 bearer token 一律拒絕 | 是 | `tests/api/requests.spec.ts` |
| API-004 | API | 無效／client-injected 欄位回 RFC 9457 error | 是 | `tests/api/requests.spec.ts` |
| API-005 | API | 同客戶可讀；跨客戶只得到 generic 404 | 是 | `tests/api/requests.spec.ts` |
| API-006 | API | 相同 key／payload 重播 raw bytes 相同且不重複寫入 | 是 | `tests/api/requests.spec.ts` + `tests/sql/release-assertions.sql` |
| API-007 | API | 相同 key／不同 payload 回 409 | 是 | `tests/api/requests.spec.ts` |
| WEB-001 | Chromium／Firefox／WebKit | 桌面登入、篩選與 read-only queue smoke | 是 | `tests/web/smoke.spec.ts` |
| MWEB-001 | Pixel 7／iPhone 13 emulation | 行動網頁建立請求、留言與 overflow | 是 | `tests/web/mobile-client.spec.ts` |
| WEB-002 | Chromium | 團隊 triage、內部留言、Acme／Globex 隔離 | 是 | `tests/web/triage-and-isolation.spec.ts` |
| DB-001 | PostgreSQL 16 | tenant、狀態、audit、idempotency 與 constraint 核對 | 是 | `tests/sql/release-assertions.sql` |
| SEC-001 | repository | 公開追蹤檔不含秘密／產物／SUT checkout | 是 | `npm run qa:check` |
| CI-001 | GitHub Actions | PR／main gate 保留機器與人類可讀證據 | 是 | `.github/workflows/qa.yml` |
| REP-001 | manual review | passed／failed／skipped／not-run 與決策一致 | 是 | release report review |
| DEF-001 | migration | DBAL 4 affected red／fixed green | 歷史 gate | [QA-001](./defects/QA-001-dbal4-migration.md) |
| DEF-002 | API／PostgreSQL | JSONB affected raw replay red／JSON fixed green | 歷史 gate | [QA-002](./defects/QA-002-idempotency-replay.md) |
| DEF-003 | container | dotenv affected build red／fixed build+smoke green | 歷史 gate | [QA-003](./defects/QA-003-container-dotenv.md) |
| DEF-004 | Web／PostgreSQL | authentication audit 空 metadata 阻斷所有 Web 登入 | 是；open | [QA-004](./defects/QA-004-auth-audit-metadata.md) |

## 環境與 release gate

### ENV-001 — help 不依賴 Docker

**需求**：FR-002、FR-015  
**前置**：只保留系統 shell PATH，不提供 Docker。  
**步驟**：執行 `bash scripts/qa.sh help`。  
**預期**：exit `0`；輸出列出 `check|up|test|sql|down|release`，並明示 mobile-web 範圍；不讀取 SUT、Docker 或 credential。

### ENV-002 — 缺少 Docker 時 fail fast

**需求**：FR-002、FR-015  
**前置**：PATH 不含 Docker。  
**步驟**：執行 `bash scripts/qa.sh up`。  
**預期**：非零退出；stderr 指出 Docker required；未 clone、未啟動 container、未刪除任何 path 或 volume。

### ENV-003 — 拒絕空 Compose project

**需求**：FR-002、FR-016  
**步驟**：以 `COMPOSE_PROJECT_NAME='' QA_DRY_RUN=1` 執行 `up`。  
**預期**：非零退出並指出 project name 不可為空；沒有 mutation。

### ENV-004 — pin revision 與破壞性操作範圍

**需求**：FR-001、FR-002、FR-015、FR-016  
**步驟**：以 `QA_DRY_RUN=1` 執行 `release` 並檢查命令輸出。  
**預期**：exit `0`；輸出含完整 SHA `5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65` 與 `docker compose -p partnerops_release_qa`；cleanup 只使用該 project 的 `down --volumes --remove-orphans`；不得出現 `rm -rf`、`git clean` 或 `git reset --hard`。

## API 案例

### API-001 — release health 與 readiness

**需求**：FR-002、FR-012  
**前置**：SUT 已啟動，PostgreSQL 可連線。  
**步驟**：

1. `GET /health/live`。
2. `GET /health/ready`。
3. 檢查 status、JSON body、`Content-Type` 與 cache policy。

**預期**：兩者皆 `200`；body 分別為 `{"status":"live"}` 與 `{"status":"ready"}`；health response 不可被共享快取誤用。若 ready 不成立，產品案例不得開始。

### API-002 — 合法建立 request

**需求**：FR-007、FR-009  
**前置**：Acme fixture token；新的 idempotency key 與 title。  
**步驟**：以合法 `title`、`description`、`priority` 對 `POST /api/v1/requests` 送出一次。  
**預期**：`201`；`Idempotent-Replayed: false`；`Location` 指向同一個 26 字元 public ID；body 符合 upstream OpenAPI `RequestResource`；資料歸 Acme，不由 request body 指定 client。

### API-003 — 缺少與無效認證

**需求**：FR-007  
**步驟**：分別不送 `Authorization`、送格式正確但無效的 bearer token 呼叫同一個 seeded request read endpoint。  
**預期**：兩者皆 `401` 與 `application/problem+json`；problem 至少含 `type/title/status/code/detail/instance/traceId`，且除動態 `traceId` 外形狀一致；不得回傳 client、request 或 token 內部資訊。

### API-004 — 輸入與 client boundary 驗證

**需求**：FR-007  
**步驟**：

1. 使用不符合長度／列舉／必填規則的 JSON body。
2. 在 body 注入不允許由 client 指定的欄位。

**預期**：回 `422 application/problem+json`；error 指向不合法欄位，client-injected 欄位不被接受；DB-001 以本案例的合成 title／key marker 確認沒有新增 request 或 idempotency row。

### API-005 — 讀取與跨客戶拒絕

**需求**：FR-005、FR-007、FR-009  
**前置**：一筆 Acme request public ID。  
**步驟**：先用 Acme token `GET`，再用 Globex token 對同一 URL `GET`。  
**預期**：Acme 得到 `200` 與 client-visible 資料；Globex 得到 generic `404` problem，回應不洩漏 Acme 名稱、title、status 或 request 是否存在。

### API-006 — byte-identical idempotency replay

**需求**：FR-007、FR-008、FR-009  
**前置**：Acme token、唯一 key、完全相同的 raw JSON request。  
**步驟**：

1. 第一次 POST，保存未解析的 response bytes、status、`Location` 與 public ID。
2. 以同 key 與同 payload 再 POST。
3. 不以 parsed object 取代比較，直接比較保存的兩份 raw response bytes；第一次 body 另行解析以核對完整 resource contract。
4. 執行 DB-001 的 request／idempotency／audit counts。

**預期**：第二次仍為 `201`、`Idempotent-Replayed: true`，status、`Location`、public ID 與 raw response bytes 逐位元相同；PostgreSQL 只有一筆 request、一筆該 key 的 idempotency record 與一筆 `request.created` audit。

### API-007 — 相同 key／不同 payload

**需求**：FR-007  
**前置**：本案例先以自己的唯一 key 建立 request。  
**步驟**：保留相同 key，但改變經驗證後會影響 fingerprint 的欄位再 POST。  
**預期**：`409 application/problem+json`、`code=idempotency_conflict`；以原 URL 重新讀取時 title 與原始 priority 不變。

## Web 與 mobile-web 案例

### WEB-001 — 三個桌面 browser 的 read-only smoke

**需求**：FR-005、FR-006  
**專案**：Chromium、Firefox、WebKit。  
**步驟**：

1. 以 team member 登入。
2. 開啟 dashboard／request queue，依關鍵字、status 與 priority 套用 filter。
3. 確認符合條件的 seeded request 可見、不符合者不可見，且 filter 值保留。
4. 在 dashboard 與 queue 比較 `scrollWidth` 與可視寬度。

**預期**：三個專案均可完成 read-only flow；filter 與內容一致；沒有阻擋主要任務的整頁水平 overflow 或不可用控制項。此案例不外推為完整 WCAG 或所有 Safari 版本覆蓋。

### MWEB-001 — Pixel／iPhone 行動網頁建立與留言

**需求**：FR-005、FR-006  
**專案**：`mobile-web-pixel-7`、`mobile-web-iphone-13`。  
**步驟**：

1. 以 Acme client 登入。
2. 使用 project/run-specific title 建立一筆 request。
3. 在該 request 新增 client-visible comment。
4. 重新載入並確認 title、comment 與主要 navigation/control。
5. 檢查整頁與關鍵區塊無阻擋操作的水平 overflow。

**預期**：兩個 emulation project 均可在 Acme session 完成建立、留言與 reload 後持久化檢查；control 可見且可用。跨客戶 ownership 由 API-005／WEB-002／DB-001 驗證。這是 mobile-web browser emulation，不是原生 Android／iOS、模擬器或真機測試。

### WEB-002 — triage、內部留言與租戶隔離

**需求**：FR-005、FR-009  
**專案**：Chromium，單 worker。  
**前置**：本案例以 Acme API token 建立 run-specific urgent request；另使用 seeded Globex request 驗證反向隔離。  
**步驟**：

1. 以 team member 記錄 dashboard 的相對計數，開啟未指派 Acme request。
2. 指派給目前 team member，轉為「處理中」，加入 internal-only note。
3. 回 dashboard 驗證與操作直接相關的相對 delta。
4. 登出，以 Acme client 開啟該 request，確認 internal note 不可見。
5. 以 Acme 直接開啟 seeded Globex URL，再以 Globex 開啟 run-specific Acme URL。

**預期**：指派、狀態與 timeline 一致；未指派數下降一，沒有 due date 的 run-specific request 不改變逾期數；Acme 看不到 internal note；兩個方向的跨客戶 URL 都呈 generic not-found 且不洩漏對方資訊。

**觀察**：upstream quickstart 說逾期數也會改變，但 repository 查詢邏輯並非如此；這是 [OBS-001](./test-plan.md#9-已知限制與觀察)，不是 production incident。固定 fixture 日期也使 absolute counts 時間敏感，因此只斷言相對變化。

## 資料庫、公開安全與報告案例

### DB-001 — 跨邊界 PostgreSQL assertions

**需求**：FR-009  
**前置**：API-004／006 與 Web mutation 已完成；只透過 SUT db container 的 `psql` 連線。  
**步驟**：執行 `tests/sql/release-assertions.sql`，不使用寫入 SQL。  
**預期**：

- 自動建立的 request 恰屬 Acme，狀態與 UI／API 一致。
- 指定 idempotency key 恰有一筆 row，且關聯到同一 request／credential。
- `request.created` audit 恰有一筆並指向同一 tenant／subject。
- 跨 tenant foreign-key 關係不存在。
- 至少一項實際 database constraint 存在且有效；任何 assertion 不符時 `psql` 非零退出。

### SEC-001 — 公開 repository hygiene

**需求**：FR-016  
**步驟**：執行 `npm run qa:check`，並檢查 Git tracked files。  
**預期**：`.sut/`、`node_modules/`、`.env*`、cookie/storage state、HTML/JUnit/trace/screenshot/log 不在 tracked files；沒有真實 credential、token、個資或未遮罩環境值。公開 fixture token 必須在文字附近標示 synthetic/local-only。

### CI-001 — release gate 與 evidence retention

**需求**：FR-012、FR-013  
**步驟**：對 pull request 或 main 執行 `.github/workflows/qa.yml`。  
**預期**：同一 job 使用指定 full SHA 執行 `qa:release`；任何 blocking step 非零使 job 失敗；無論成功或失敗都嘗試安全 cleanup；JUnit／HTML 與失敗時 trace、screenshot、runtime log 以 artifact 保存，且 log 無秘密。

### REP-001 — release decision integrity

**需求**：FR-014、FR-017  
**步驟**：將 JUnit、SQL、workflow steps 與 release report 逐項核對。  
**預期**：passed、failed、skipped、not-run 分開計數；任一 blocker 使決策 No-Go；required scope 未執行使決策 incomplete；Go 只能出現在 blockers 為空且所有 required scope 實際通過時。README／report 必須明示 mobile-web boundary 與其他已知限制。

## 歷史缺陷案例

### DEF-001 — DBAL 4 migration

affected/fixed SHA、精確 failure signature、重現與 retest 證據見 [QA-001](./defects/QA-001-dbal4-migration.md)。affected 只在觀察到 `PostgreSQL120Platform::getName()` undefined 時算重現；fixed 使用相同 migration gate。

### DEF-002 — idempotency raw replay

完整資料庫 predecessor、raw-byte 比較與 forward migration retest 見 [QA-002](./defects/QA-002-idempotency-replay.md)。解析後 JSON 相等不能取代 raw bytes 比較。

### DEF-003 — production container dotenv

build context、精確 `Dotenv PathException` 與 fixed build/smoke 見 [QA-003](./defects/QA-003-container-dotenv.md)。本案例是 CI/release defect 證據，不描述成 production outage。

### DEF-004 — authentication audit metadata

本輪 release gate 的環境、六平台重現、PostgreSQL signature、根因鏈與待 retest 範圍見 [QA-004](./defects/QA-004-auth-audit-metadata.md)。這是 open current-release blocker，不是 historical expected failure。
