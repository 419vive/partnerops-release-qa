# QA-004 — 空 audit metadata 使所有 Web 登入回傳 500

| 欄位 | 內容 |
|---|---|
| 狀態 | **Open；release blocker；retest pending** |
| Severity | **S2 High** — 合法身份驗證完成後仍回 500，Web 核心流程全部無法進入 |
| 類型 | Web authentication／audit persistence／PostgreSQL constraint |
| 發現案例 | WEB-001、WEB-002、MWEB-001 |
| Affected revision | [`5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65`](https://github.com/419vive/partnerops/commit/5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65) |
| 發現 run | [Release QA 29684970834](https://github.com/419vive/partnerops-release-qa/actions/runs/29684970834) |

## 摘要與影響

使用 PartnerOps 公開 fixture 的合法 email／password 登入時，credential 驗證成功，但 `AuthenticationAuditSubscriber` 隨即寫入 `authentication.succeeded` audit。該 audit 沒有 metadata；Doctrine 將空 PHP array 序列化成 JSON `[]`，違反資料庫要求 metadata 必須是 JSON object 的 `chk_audit_metadata`，使 `POST /login` 回 `500`。

公開 run 中 API 7/7 通過，但 Chromium、Firefox、WebKit、Pixel mobile-web 與 iPhone mobile-web 共 6 個 Web executions 都在登入時觀察到相同 failure。Web 使用者沒有安全替代入口，因此阻擋此版本放行。

這是合成 CI 環境發現的 release defect；目前沒有 production deployment、真實使用者事故或 outage 證據，本紀錄不做那些宣稱。

## 環境與前置條件

- Checkout exact affected full SHA。
- 依受測 repository 的 `compose.yaml` 啟動 development target 與 PostgreSQL 16。
- 從空 database 執行 migrations 與 `AppFixtures`。
- 使用任一公開 fixture Web identity，例如 `agent@partnerops.test` 與文件中的合成密碼。

## 重現步驟

1. `GET /login`，保存 session cookie 與頁面產生的 CSRF token。
2. 對 `POST /login` 送出合法 `_username`、`_password` 與 `_csrf_token`。
3. 檢查 HTTP status、頁面與 app/database log。
4. 在 Chromium、Firefox、WebKit 或任一 mobile-web project 重跑；不需改變身份或資料。

## Expected／Actual

**Expected**

- 合法登入寫入 append-only `authentication.succeeded` audit。
- `POST /login` redirect 至 dashboard；session 可繼續使用。
- audit metadata 即使沒有額外欄位，也以符合 schema 的 JSON object 保存。

**Actual**

- `POST /login` 回 `500`；dashboard 未開啟。
- PostgreSQL exact signature：

  ```text
  SQLSTATE[23514]: Check violation: new row for relation "audit_event" violates check constraint "chk_audit_metadata"
  Failing row ... authentication.succeeded ... user_session ... [] ...
  ```

- JUnit：13 executions、7 passed、6 failed、0 skipped；6 個 failure 都停在同一登入 boundary。
- Release script fail-fast，因此 DB-001 是 **not-run**，沒有被錯算成 passed。

## 根因證據

三個公開 source facts 形成同一條 failure path：

1. Migration [`Version20260718000000.php#L193-L204`](https://github.com/419vive/partnerops/blob/5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65/migrations/Version20260718000000.php#L193-L204) 將 metadata 定義為 `JSONB NOT NULL`，並要求 `jsonb_typeof(metadata) = 'object'`。
2. [`AuditEvent.php#L53-L75`](https://github.com/419vive/partnerops/blob/5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65/src/Entity/AuditEvent.php#L53-L75) 以 PHP `array` 儲存 JSONB，預設值是空 array。
3. [`AuthenticationAuditSubscriber.php#L34-L81`](https://github.com/419vive/partnerops/blob/5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65/src/EventSubscriber/AuthenticationAuditSubscriber.php#L34-L81) 的登入成功、登入失敗與登出事件都省略 metadata，因此會走空 array 路徑。

Fixtures 與 API request audits 都帶有非空 metadata，解釋了 migration、fixtures 與 API 為何通過，而第一個 Web authentication audit 才暴露 defect。

## 建議修復與 retest

修復應在 `AuditEvent` 的共用 persistence boundary 保證「空 map」仍序列化成 `{}`，或明確禁止空 metadata 並更新所有 callers；只對一個登入 caller 加特例會讓登入失敗、登出與其他空 metadata caller 繼續承受相同風險。不可單純移除 database constraint 來隱藏模型不一致。

修復後至少重跑：

1. 合法登入、無效登入與登出三種 authentication audits。
2. Chromium／Firefox／WebKit 的 WEB-001。
3. Pixel／iPhone mobile-web 的 MWEB-001。
4. WEB-002、DB-001 與完整 `qa:release` regression。

目前沒有 fixed revision，故 retest 狀態是 **not-run**；release decision 維持 **No-Go**。
