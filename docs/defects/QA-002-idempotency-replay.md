# QA-002 — JSONB 破壞冪等重播的原始回應位元組

| 欄位 | 內容 |
|---|---|
| 狀態 | Fixed；upstream predecessor/raw-replay regression 與 dedicated affected/fixed persistence gate passed |
| Severity | **S2 High** — 對外冪等契約不一致，阻擋 API release |
| 類型 | API contract／PostgreSQL persistence |
| 重現案例 | DEF-002、API-006 |
| Affected revision | [`6aa9546187e91bda44b8481dedcd3b7ed430238a`](https://github.com/419vive/partnerops/commit/6aa9546187e91bda44b8481dedcd3b7ed430238a) |
| Fixed revision | [`c4e794a83a4536bb40627f0b34e0ec8ed161b03e`](https://github.com/419vive/partnerops/commit/c4e794a83a4536bb40627f0b34e0ec8ed161b03e) |
| Final regression revision | [`5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65`](https://github.com/419vive/partnerops/commit/5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65) |

## 摘要與影響

PartnerOps OpenAPI 承諾：同一 credential 在 24 小時內以相同 `Idempotency-Key` 與相同 validated body 重送時，回傳原始 status/body，且不建立第二筆 request。Affected schema 把 cached `response_body` 存成 PostgreSQL `jsonb`；`jsonb` 會 canonicalize／重排 object keys。第一次回應由 presenter 的 array 順序序列化，重播則從 `jsonb` hydrate 後再序列化，因此兩份 JSON 的語意可相同，**raw response bytes 卻不同**。

沒有證據顯示此 defect 建立重複 request、造成資料損失或曾發生 production incident；它是 exact-replay API contract 的 release blocker，不能誇大成上述事件。

## 環境與前置條件

- PostgreSQL 16；使用 affected revision 建立的 `idempotency_record.response_body JSONB` schema。
- 公開 Acme fixture token、合法且唯一的 `Idempotency-Key`。
- 同一份 raw request payload；比較 response 前不得先 parse／排序 JSON。
- 合成資料庫可在每次 run 前重建。

## 重現步驟

1. Checkout `6aa9546187e91bda44b8481dedcd3b7ed430238a`，重建 PostgreSQL database 並執行 migration／fixtures。
2. 確認 `information_schema.columns` 中 `idempotency_record.response_body` 的 `data_type` 是 `jsonb`。
3. 以唯一 key 對 `POST /api/v1/requests` 送出合法 payload；保存未解析的第一次 status、headers 與 response bytes。
4. 用完全相同 key／payload 重送；保存未解析的第二次 response bytes。
5. 先做 raw byte comparison，再把兩者 parse 成 JSON 進行語意對照；最後核對 request／idempotency／audit counts。
6. 自動 workflow 只有在 schema 確認為 `jsonb`、觀察到固定 canonical JSONB 順序，且 raw responses 不同時才輸出下列 signature。

## Expected／Actual

**Expected**

- 第一次與重播都是 `201`；重播 header 為 `Idempotent-Replayed: true`。
- status、`Location`、public ID 與 **raw response bytes 全部相同**。
- database 只有一筆 request、一筆該 key 的 idempotency record 與一筆 `request.created` audit。

**Actual on affected schema**

- JSON parse 後的物件內容相同，且 request 仍只建立一次。
- PostgreSQL `jsonb` 改變 object key order，使第一次與重播的 raw response bytes 不同；raw comparison 非零。
- Portfolio workflow 的精確 failure signature 定義為：

  ```text
  QA-002: replay raw response differs after JSONB reorders keys
  ```

只比較 public ID 或 parsed object 會漏掉此 defect，因此不接受作為重現或 retest gate。

## 根因與修復

Fixed revision 新增 forward migration `Version20260718000100`，把 cached response 從 `jsonb` 轉為保留 key order 的 PostgreSQL `json`，並用 `json_build_object` 明確重建已存在資料的 presenter key order；database 仍以 `json_typeof(response_body) = 'object'` 驗證內容。ORM mapping 同步取消 `jsonb` option。

修復沒有重寫已公開的 initial migration 歷史；CI 分別模擬短暫公開過的 `json` predecessor 與原始 `jsonb` predecessor，再套同一個 forward migration。公開 diff：[affected → fixed](https://github.com/419vive/partnerops/compare/6aa9546187e91bda44b8481dedcd3b7ed430238a...c4e794a83a4536bb40627f0b34e0ec8ed161b03e)。

## Fixed retest

1. [Fixed-revision upstream CI run 29642501363](https://github.com/419vive/partnerops/actions/runs/29642501363) 通過：
   - `Apply and validate database migrations`
   - `Verify migration-only database invariants`
   - `Verify the published JSON predecessor upgrade`
   - `Run backend test suite`（包含第一次 body 與 19 次 replay 的 raw response equality）
2. 該 run 的整體 conclusion 是 failure，但失敗發生在後面的 `Build production container`，signature 是 QA-003 的 missing `.env`，不是 QA-002。上述 QA-002 fixed gates 因此是 **PASS**，但不能把 intermediate revision 寫成整體 Go。
3. [Final upstream CI run 29642823042](https://github.com/419vive/partnerops/actions/runs/29642823042) 對最終 SHA 再次通過 predecessor upgrade、migration invariants、backend suite 與其餘完整 gates，run conclusion 為 success。
4. [Portfolio run 29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964) 在 affected JSONB schema 取得 controlled exit `42` 與 exact signature，fixed JSON schema 對同一 PHP/PDO raw-body gate 通過；artifact：[`qa-002-idempotency-replay-29685454964`](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964/artifacts/8441923864)。

獨立 portfolio workflow 的 `idempotency-replay` job 已以同一個 PHP/PDO behavioral gate 執行 `Reproduce affected and verify fixed raw replay gate`；affected 只有在 schema 為 `jsonb`、JSON 值相同但 key order／raw bytes 改變時，才以受控 exit `42` 與 exact signature 算重現。這是 persistence-level behavioral gate，不冒充完整 affected HTTP stack run。

## 證據界線與限制

- [Intermediate upstream run 29641007621](https://github.com/419vive/partnerops/actions/runs/29641007621) 在 schema sync gate 已失敗，沒有跑到 raw replay；它**不是** QA-002 affected failure evidence，僅用來辨識 affected revision 的 CI 邊界。
- Run 29642501363 以 fixed revision 內的 deterministic predecessor simulation 證明 `jsonb` 重排與 forward migration；affected SHA 本身的 red execution 現已由 run 29685454964 的獨立 historical workflow 留存，而非以 source diff 冒充。
- 本 defect 是 raw HTTP contract 差異；不宣稱產生重複資料、金額錯誤、客戶事故或 production 影響。
