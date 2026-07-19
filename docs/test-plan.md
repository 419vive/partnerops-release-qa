# PartnerOps 版本放行測試計畫

**文件版本**：1.0  
**測試標的**：[419vive/partnerops](https://github.com/419vive/partnerops)  
**最終受測版本**：[`5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65`](https://github.com/419vive/partnerops/commit/5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65)  
**資料分級**：只使用公開、可重建的合成資料  
**判斷目標**：對指定版本提出可稽核的 Go／No-Go 建議

## 1. 商業目標與品質風險

PartnerOps 是多客戶 B2B 服務請求平台。這次測試不追求最大案例數，而是優先回答版本放行時最昂貴的問題：

1. 客戶 A 是否可能看見或修改客戶 B 的資料。
2. 外部系統重送請求時，是否可能得到不一致結果或建立重複資料。
3. Web、HTTP 回應與 PostgreSQL 持久資料是否一致，且關鍵操作是否留下稽核紀錄。
4. 指定版本能否從乾淨環境完成 migration、啟動、測試與 production container gate。
5. 桌面與行動網頁的核心流程是否仍可操作。
6. 報告是否把 passed、failed、skipped 與 not-run 分開，避免在覆蓋不完整時誤判 Go。

風險與案例的雙向對照見 [traceability.md](./traceability.md)，可執行步驟見 [test-cases.md](./test-cases.md)。

## 2. 範圍

### 2.1 包含

- 乾淨 checkout、不可變 full SHA、Docker Compose 合成環境與 readiness。
- 角色式 Web 流程：團隊成員處理請求、Acme／Globex 客戶隔離、內部留言不可見。
- Chromium、Firefox、WebKit 桌面 smoke。
- Pixel 7（Chromium）與 iPhone 13（WebKit）的 Playwright **mobile-web emulation**。
- API 正反向案例：建立、讀取、缺少／無效認證、輸入驗證、跨客戶 404、冪等重播、同 key 不同 payload 衝突。
- PostgreSQL 只讀核對：租戶歸屬、請求狀態、單一冪等紀錄、`request.created` 稽核事件與資料庫 constraint。
- 三個由 PartnerOps 公開 commit 與 GitHub Actions 證明的歷史 release defect；affected 與 fixed 驗證和正常 release gate 分開執行。
- HTML、JUnit、trace、截圖與 SQL 輸出；失敗證據不得包含秘密。

### 2.2 不包含

- 原生 Android／iOS App、Appium、Android Emulator、iOS Simulator、實體手機與 App Store build。
- 行動裝置相機、推播、GPS、背景執行、離線同步、電信網路切換或耗電測試。
- 真實客戶資料、production credential、production telemetry、production incident 或 SLA 主張。
- 長時間負載、壓力、滲透、災難復原與雲端部署驗證。
- 修改 PartnerOps 產品程式，或同時導入 Cypress、Selenium、Postman/Newman、JMeter 等重複工具。

> Pixel／iPhone 專案只模擬瀏覽器引擎、viewport、user agent 與觸控能力；它們不是原生 App、真機或一年行動測試年資的證據。

## 3. 測試策略

| 層級 | 主要方法 | 放行重點 |
|---|---|---|
| 環境／版本 | shell contract、自動 preflight、full SHA checkout、health probes | 不在錯誤版本或不完整環境產生結果 |
| 桌面 Web | Playwright，Chromium／Firefox／WebKit | 登入、篩選佇列、核心資訊可見、無阻擋操作的水平溢位 |
| 行動網頁 | Playwright Pixel 7／iPhone 13 emulation | 客戶建立請求與留言可完成、控制項可用、無阻擋操作的水平溢位 |
| 角色／隔離 | Chromium 單 worker、合成 Acme／Globex 身份 | 指派、狀態、內部留言、跨客戶拒絕與相對 dashboard delta |
| API | Playwright request context；先比較 raw bytes，再解析 JSON | 認證、RFC 9457、租戶隔離、冪等與衝突 |
| 資料庫 | SUT PostgreSQL 16 container 內的 `psql`，只讀 assertions | UI／API 結果、tenant、audit、idempotency 與 constraint 一致 |
| 歷史缺陷 | affected/fixed full SHA 分開執行，只接受指定 failure signature | 真實 red/green，不植入假 bug，不混入正常 gate |

### 3.1 執行順序

1. `qa:check`：型別、測試 discovery、shell contract、追蹤檔與秘密檢查。
2. `qa:up`：checkout 指定 SHA、啟動專屬 Compose project、重建並載入合成資料、等待 readiness。
3. API 與 Web/mobile-web 專案以單 worker 執行，避免共享資料互撞。
4. SQL 只讀核對跨邊界結果。
5. 彙整 passed／failed／skipped／not-run，套用放行規則。
6. `qa:down` 只清除本 repo 專屬 Compose project 與合成 volume。

歷史 affected/fixed 案例由獨立的手動 GitHub Actions workflow 執行，不得使一般 pull request 的最終版本 gate 因「預期失敗」而變紅。

## 4. 環境與測試資料

| 項目 | 基準 |
|---|---|
| QA harness | Node.js 22、TypeScript 7.0.2、Playwright 1.61.1 |
| SUT runtime | PartnerOps 既有 Docker Compose；PHP 8.4、PostgreSQL 16 |
| 本機 | macOS arm64、Docker Desktop／Engine 27+、Compose v2 |
| CI | GitHub-hosted Ubuntu runner；版本以 workflow log 為準 |
| 桌面 | Desktop Chrome、Desktop Firefox、Desktop Safari（Playwright WebKit） |
| 行動網頁 | Pixel 7（Chromium emulation）、iPhone 13（WebKit emulation） |
| 時區 | 產品規則為 Asia/Taipei；跨系統時間比較以可觀察 UTC instant 為準 |
| 帳號 | `admin@partnerops.test`、`agent@partnerops.test`、`client@acme.test`、`client@globex.test` |
| API | PartnerOps quickstart 公開的 Acme／Globex fixture token；只限合成環境 |

每次 release run 都重建專屬資料庫。測試建立的 title 與 idempotency key 含 run-specific suffix；不得重用真實 email、token、cookie 或 `.env`。產物、SUT checkout、storage state 與環境檔均不進 Git。

## 5. 估時

下表是第一版規劃估時，不是已量測工時或 SLA。

| 工作包 | 工程估時 |
|---|---:|
| 風險分析、案例與追溯 | 3–4 小時 |
| 可重建環境、preflight 與安全 cleanup | 4–5 小時 |
| 桌面／行動網頁角色流程 | 4–5 小時 |
| API raw-body 與 PostgreSQL 核對 | 4–5 小時 |
| 三個歷史缺陷 red/green 證據 | 3–4 小時 |
| CI、報告、連結與秘密審查 | 3–4 小時 |
| **合計** | **21–27 小時** |

執行目標：本機 preflight 在 30 秒內指出缺少工具或無效 revision；warm read-only smoke 在 5 分鐘內；warm CI release gate 在 20 分鐘內。首次 clone、image pull 與 browser download 另計；達標與否只依實際 run 記錄，不把目標當結果。

## 6. 進入、暫停與離開條件

### 6.1 進入條件

- SUT repository 可讀，且 `SUT_REF` 可解析為文件指定的 full SHA。
- Git、Node.js 22、npm、Docker daemon 與 Compose v2 可用。
- lockfile 安裝成功，三個桌面 browser 與兩個 mobile-web projects 可 discovery。
- Compose project name 與 SUT path 通過範圍檢查；不接受空值或 repository 外的破壞性目標。
- readiness 成功、migration 與 fixtures 完成；只使用公開合成身份。

任何條件不成立時，測試狀態是 **not-run**，不得產生 Go。

### 6.2 暫停／恢復條件

- Docker、資料初始化或 readiness 失敗：在案例前停止，保留已遮罩的 setup log；修復環境後由乾淨資料庫重跑。
- required browser 無法啟動：整體決策保持 incomplete，不把其餘 browser 結果外推。
- 失敗 signature 與歷史缺陷文件不同：視為新的調查項，不把它算成「成功重現」。
- log 出現 token、cookie、密碼或環境值：停止發布證據，先遮罩或刪除產物再重跑。

### 6.3 Go 離開條件

- 所有 release-blocking 案例 passed；required scope 的 failed、skipped、not-run 均為 0。
- Chromium、Firefox、WebKit、Pixel 7 mobile-web、iPhone 13 mobile-web、API 與 SQL 必要案例均實際執行。
- tenant isolation、raw-byte replay、單筆持久化、audit 與 database invariant 均通過。
- HTML／JUnit 與失敗診斷（若有）可追溯至同一 full SHA，且公開證據未含秘密。
- release report 列出範圍、數量、限制、blocker 與決策。

任一 blocking case 失敗即 **No-Go**。required scope 被 skipped 或未執行時是 **incomplete**，也不得建議 Go。

## 7. 嚴重度與優先處理規則

| 等級 | 定義 | 放行處置 |
|---|---|---|
| S1 Critical | 可造成跨客戶資料洩漏／越權、不可回復資料損失、秘密外洩，或整體服務無安全替代路徑 | 立即 No-Go；優先隔離風險並保存證據 |
| S2 High | 核心流程、migration、production image、認證或對外契約失敗；無安全 workaround | No-Go；修復後重跑受影響層與完整回歸 |
| S3 Medium | 非核心功能或特定 browser 顯著退化，但有安全且文件化 workaround | 由產品／工程共同接受才可有條件放行；不得隱藏 |
| S4 Low | 不阻擋任務的外觀、文字或低風險可用性問題 | 可排入 backlog；仍記錄範圍與證據 |

嚴重度依影響與可恢復性，不依測試工具名稱、錯誤訊息長度或修復行數決定。

## 8. 證據與報告

- 人類可讀：Playwright HTML report 與 reviewed Markdown release report。
- 機器可讀：JUnit XML。
- 失敗診斷：trace、screenshot、setup/runtime log；只在失敗時保留必要內容。
- 資料層：`psql` assertion output。
- 歷史缺陷：affected/fixed full SHA、指定 failure signature、公開 commit diff 與 GitHub Actions run URL。

執行結果不寫回案例規格；最新決策以 `docs/reports/release-5c855e8.md` 與對應 GitHub Actions run 為準。所有報告必須保留 passed、failed、skipped、not-run 四種狀態。

## 9. 已知限制與觀察

1. PartnerOps quickstart 寫「指派並轉為處理中後，逾期與未指派數都改變」；實作只有未指派數會下降，逾期請求在 resolved／closed 前仍屬逾期。這裡記為 **OBS-001 文件／可測試性落差**，不是 production incident。自動化應比對相對 delta，不依賴固定絕對值。
2. fixture 使用 2026 年 7 月固定日期，absolute overdue／due-soon 數會隨執行日變化；案例只驗證與操作直接相關的相對變化。
3. WebKit 是 Playwright browser engine，不等同實體 Safari 裝置；mobile projects 也不是 native 或真機覆蓋。
4. 歷史 affected commit 可能受今日 runner／上游 image 變化影響；只有觀察到文件指定 signature 才算重現，否則標為受限並調查。
5. 本計畫不根據公開 commit 推論曾發生 production incident；三個 defect 都是 release／CI 證據。
6. Final release run [29685275310](https://github.com/419vive/partnerops-release-qa/actions/runs/29685275310) 再次確認 [QA-004](./defects/QA-004-auth-audit-metadata.md)：空 audit metadata 被保存為 JSON array，合法 Web 登入在 audit insert 回 500。此 S2 finding 使目前決策為 No-Go；SQL scope 因 fail-fast 保持 not-run。
