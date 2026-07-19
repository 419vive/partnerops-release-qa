# Feature Specification: PartnerOps Release QA Case

**Feature Branch**: `main`

**Created**: 2026-07-19

**Status**: Approved

**Input**: User description: "為庠菻有限公司測試工程師職缺打造可展示的商業級 QA 案例，完成規格、計畫、任務、實作、驗證並發布到 GitHub。"

## User Scenarios & Testing

### User Story 1 - 做出可稽核的版本放行判斷 (Priority: P1)

品質工程師需要從乾淨環境重建指定版本、執行最高風險案例，並取得足以支持 Go／No-Go 決策的結果，而不是只看到一串綠色勾勾。

**Why this priority**: 版本能否安全交付是測試工作的核心商業結果；環境、風險、結果與決策缺一不可。

**Independent Test**: 從乾淨 checkout 執行單一 release-gate 流程，確認指定受測版本被啟動、合成資料被建立、關鍵案例完成，並產出含決策與限制的報告。

**Acceptance Scenarios**:

1. **Given** 一台具備必要執行環境的乾淨機器，**When** 工程師依快速指南執行 release gate，**Then** 系統使用文件指定的不可變版本與合成資料完成測試，且不需要真實憑證。
2. **Given** 所有阻擋放行的案例通過，**When** 報告彙整結果，**Then** 報告清楚列出範圍、通過／失敗數、已知限制與 Go 建議。
3. **Given** 任一阻擋放行的案例失敗，**When** 報告彙整結果，**Then** 決策為 No-Go，並保留足以重現問題的診斷證據。

---

### User Story 2 - 驗證跨介面與跨瀏覽器的核心風險 (Priority: P2)

品質工程師需要驗證同一商業流程在桌面瀏覽器、行動網頁、HTTP 介面與資料庫之間保持一致，特別是客戶隔離、授權、冪等與稽核資料。

**Why this priority**: 招募職缺要求 Web、行動平台、API 與後端資料驗證；跨邊界錯誤最容易造成客戶資料外洩或重複交易。

**Independent Test**: 使用公開合成帳號與資料完成一組角色流程、API 正反向案例及資料核對，證明同一需求在各邊界一致；行動範圍明確標示為 mobile-web emulation。

**Acceptance Scenarios**:

1. **Given** 管理者、團隊成員與兩個不同客戶的合成身份，**When** 他們存取與操作服務請求，**Then** 每個身份只能看到並修改被授權的資料。
2. **Given** 支援的桌面瀏覽器與 Android／iPhone 行動網頁模擬環境，**When** 執行關鍵 smoke flow，**Then** 使用者可完成主要任務，且頁面沒有阻擋操作的水平溢位或不可用控制項。
3. **Given** 合法、缺少、失效及重複的 API 請求，**When** 系統處理請求，**Then** 回應狀態、錯誤形狀、資料寫入與冪等重播符合公開契約。
4. **Given** 介面操作已完成，**When** 工程師執行只讀資料核對，**Then** 租戶關聯、請求狀態、稽核事件與不可變條件與介面結果一致。

---

### User Story 3 - 重現真實缺陷並驗證修復 (Priority: P3)

品質工程師需要用版本化證據說明問題如何被發現、如何評級，以及修復後如何避免回歸；不得用人工植入缺陷或杜撰事故代替。

**Why this priority**: 缺陷生命週期比單純測試數量更能證明與開發團隊合作、追蹤問題與驗證修復的能力。

**Independent Test**: 對三個公開歷史缺陷分別執行受影響版本與修復版本，確認前者產生預期失敗、後者通過，且每筆缺陷均有步驟、嚴重度、證據及限制。

**Acceptance Scenarios**:

1. **Given** 一筆文件化的歷史缺陷，**When** 對受影響版本執行重現，**Then** 驗證器只在觀察到指定失敗特徵時判定重現成功。
2. **Given** 同一缺陷的修復版本，**When** 執行相同驗證，**Then** 案例通過且沒有改寫預期結果來遷就修復。
3. **Given** 招募者只閱讀公開 repository，**When** 檢視缺陷與 release report，**Then** 可追溯每項主張至 commit、案例與執行方式，並看見 mobile-web 與 native 的明確界線。

### Edge Cases

- 受測 repository 無法下載、指定 revision 不存在或 Docker daemon 未啟動時，流程必須在測試前失敗並指出修復方式。
- 服務健康檢查逾時、資料初始化失敗或測試執行中斷時，不得產出誤導性的 Go 決策。
- 測試重跑時，合成資料與 idempotency key 不得互相污染造成假失敗。
- 只有部分瀏覽器可執行時，報告必須標為不完整，不得把部分結果外推為全平台通過。
- 歷史缺陷因上游依賴或 runner 改變而無法穩定重現時，必須保留原始 commit 證據並把自動重現標示為受限。
- 診斷輸出出現 token、cookie、密碼或環境值時，流程必須遮罩或拒絕發布該證據。

## Requirements

### Functional Requirements

- **FR-001**: 案例 MUST 指定受測系統、最終 release revision，以及每個歷史缺陷的 affected／fixed revision。
- **FR-002**: 案例 MUST 提供可重建的隔離環境、公開合成資料與明確的環境失敗訊息。
- **FR-003**: 案例 MUST 包含風險式測試計畫，記錄範圍、排除項目、假設、估時、進入／離開條件與嚴重度規則。
- **FR-004**: 每個高風險需求 MUST 追溯至至少一個手動或自動案例；每個自動案例 MUST 反向連回需求或缺陷。
- **FR-005**: 自動驗證 MUST 覆蓋至少一條角色式 Web 核心流程與一條跨客戶拒絕流程。
- **FR-006**: 關鍵 smoke flow MUST 在三個桌面瀏覽器家族及 Android／iPhone 行動網頁模擬執行；報告 MUST 明示這不是原生 App 或真機測試。
- **FR-007**: API 驗證 MUST 包含合法建立、缺少／無效認證、輸入錯誤、讀取、冪等重播及相同 key 不同 payload 的衝突。
- **FR-008**: API 冪等重播 MUST 比較原始回應內容，避免只比較解析後物件而漏掉位元組差異。
- **FR-009**: 只讀資料驗證 MUST 核對租戶歸屬、請求狀態、稽核事件及至少一項資料庫完整性規則。
- **FR-010**: 案例 MUST 文件化並驗證三個可由公開 commit 證明的歷史 release defect，不得人工植入或描述為 production incident。
- **FR-011**: 每筆缺陷 MUST 包含環境、前置條件、重現步驟、expected／actual、severity、affected／fixed revision 與 retest 結果。
- **FR-012**: 自動執行 MUST 產生人類可讀與機器可讀結果，失敗時保留 trace、截圖或等效診斷。
- **FR-013**: CI MUST 對 pull request 與主要分支執行最終 release gate，並保存測試結果與失敗證據。
- **FR-014**: README MUST 先呈現商業風險、覆蓋、發現、修復驗證、release decision 與限制，再介紹工具。
- **FR-015**: repository MUST 提供一條主要本機驗證命令，並允許透過設定改測其他明確版本或 base URL。
- **FR-016**: repository MUST 排除依賴、報告、trace、截圖、受測系統 checkout、環境檔與秘密；公開內容只能使用合成資料。
- **FR-017**: 最終報告 MUST 把未執行、略過與失敗分開計數，任何 release blocker 均 MUST 產生 No-Go。

### Key Entities

- **受測版本**: 受測 repository 與不可變 revision，包含用途（最終 release、affected 或 fixed）及驗證狀態。
- **風險／需求**: 商業或技術失敗模式、影響、優先級與對應案例。
- **測試案例**: 唯一編號、前置條件、步驟、預期結果、層級、環境與自動化狀態。
- **執行結果**: 案例、版本、時間、結果、持續時間與證據位置。
- **缺陷紀錄**: 重現步驟、嚴重度、affected／fixed revision、實際結果、修復驗證與限制。
- **Release Decision**: 受測版本、範圍、結果摘要、阻擋項目、已知限制與 Go／No-Go 結論。

### Out of Scope

- 原生 Android／iOS App、自動化模擬器、實體手機與 App store build。
- 真實客戶、production telemetry、production incident 或商業 SLA 主張。
- 另建受測產品、修改 PartnerOps 功能、雲端部署與長時間負載測試。
- 同時導入多套 UI 自動化框架，或為了工具清單加入無需求的測試。

## Success Criteria

### Measurable Outcomes

- **SC-001**: 新 reviewer 可在 20 分鐘內依快速指南啟動既有環境並取得明確 release decision；首次下載時間另列。
- **SC-002**: 100% 高風險需求均能雙向追溯至案例與最新執行結果，且沒有孤立的自動案例。
- **SC-003**: 最終 release revision 在三個桌面瀏覽器家族、兩個行動網頁模擬環境、API 與資料層的所有必要案例均通過。
- **SC-004**: 三個歷史缺陷各自具有 affected revision 的預期失敗證據與 fixed revision 的通過證據。
- **SC-005**: 每次失敗均在同一次執行留下可定位至案例與步驟的診斷；報告不把 skipped 或未執行計為 passed。
- **SC-006**: 公開 repository 與產物中的真實憑證、個資及未遮罩秘密數量為 0。
- **SC-007**: 招募 reviewer 只讀 README 與連結文件，即可在 5 分鐘內回答測了什麼、找到什麼、如何驗證修復、能否放行及哪些能力尚未證明。

## Assumptions

- PartnerOps 維持公開可讀，且文件中的 demo 帳號與 fixture token 僅供本機合成資料使用。
- 本機完整執行需要可用的 Docker Compose；CI 是跨機器的權威重現環境。
- Android／iPhone 覆蓋代表對應瀏覽器引擎與 viewport 的 mobile-web emulation，不代表原生、真機或一年工作年資。
- 測試資料可在每次 run 前安全重建；所有 destructive 指令僅能指向專案建立的合成資料 volume。
- 第一版以 release readiness 與缺陷生命週期為展示重點，不追求最大案例數或程式覆蓋率。
