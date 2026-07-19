# Release QA Report — PartnerOps `5c855e8`

**受測系統**：[419vive/partnerops](https://github.com/419vive/partnerops)<br>
**受測版本**：[`5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65`](https://github.com/419vive/partnerops/commit/5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65)<br>
**執行證據**：[Release QA run 29685275310](https://github.com/419vive/partnerops-release-qa/actions/runs/29685275310)<br>
**QA harness revision**：[`78bdbf8ab7652893f9ffcfd58064f6cb34198b98`](https://github.com/419vive/partnerops-release-qa/commit/78bdbf8ab7652893f9ffcfd58064f6cb34198b98)<br>
**歷史缺陷證據**：[Historical Defects run 29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964)，harness [`a609e5b9b7e861a13b9e9409628b3df1ca4575ab`](https://github.com/419vive/partnerops-release-qa/commit/a609e5b9b7e861a13b9e9409628b3df1ca4575ab)<br>
**報告時間**：2026-07-19 19:40 GMT+8<br>
**資料**：公開、可重建的合成 fixtures<br>
**判斷**：**NO-GO — QA-004 是 S2 release blocker；SQL scope 因 fail-fast 維持 not-run**

## Executive summary

GitHub-hosted Ubuntu runner 成功驗證 full SHA、build SUT、重建 PostgreSQL、執行 migrations／fixtures 並在第一次 probe ready。API 7/7 通過，包含跨客戶 404、完整 resource contract、raw-byte idempotency replay 與 409 conflict。

第一個 Web login 揭露 [QA-004](../defects/QA-004-auth-audit-metadata.md)：合法 credential 驗證後，authentication audit 的空 PHP array 被寫成 JSON `[]`，違反 `chk_audit_metadata` 必須為 object 的 constraint，令 `POST /login` 回 500。同一 root cause 在 Chromium、Firefox、WebKit、Pixel mobile-web 與 iPhone mobile-web 造成 6/6 Web executions 失敗。這是 release blocker，故結論為 **No-Go**；release script 隨即停止，DB-001 誠實記為 not-run。

## Result summary

| Gate | Passed | Failed | Skipped | Not run | Evidence |
|---|---:|---:|---:|---:|---|
| TypeScript／discovery／public-file gate | 3 | 0 | 0 | 0 | `qa:check`, exit 0；13 executions in 5 files |
| Shell lifecycle contracts | 4 | 0 | 0 | 0 | Node TAP 4/4 passed |
| Environment／revision／migration／fixtures／readiness | 6 | 0 | 0 | 0 | SUT SHA matched；ready after 1 attempt |
| API | 7 | 0 | 0 | 0 | JUnit API suites 7/7 passed |
| Desktop Web | 0 | 4 | 0 | 0 | Chromium WEB-001/002、Firefox WEB-001、WebKit WEB-001 |
| Mobile web emulation | 0 | 2 | 0 | 0 | Pixel 7、iPhone 13 MWEB-001 |
| PostgreSQL DB-001 assertions | 0 | 0 | 0 | 1 | Not run after blocking Playwright exit 1 |
| Historical affected/fixed pairs | 3 | 0 | 0 | 0 | [Run 29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964)；三個 sanitized artifacts |

Playwright JUnit totals：**13 tests、7 passed、6 failed、0 skipped、0 errors，27.433 秒**。整個 job 3 分 18 秒；HTML、JUnit、6 組 screenshot／trace／error context、sanitized Compose log 與 SUT revision 均上傳為 [`release-qa-29685275310`](https://github.com/419vive/partnerops-release-qa/actions/runs/29685275310/artifacts/8441894739) artifact；依 fail-fast contract 沒有 SQL output。

## Failure signature and impact

所有 Web failure 的 server-side error 相同：

```text
SQLSTATE[23514]: Check violation: new row for relation "audit_event"
violates check constraint "chk_audit_metadata"
Failing row ... authentication.succeeded ... user_session ... [] ...
```

| 觀察 | 判定 |
|---|---|
| 合法 fixture credential 已走到 `authentication.succeeded` | 不是密碼、selector 或 browser 差異 |
| 三桌面 engines 與兩 mobile-web profiles 全部相同 500 | 共用 server persistence defect，不是單一 browser flake |
| API 7/7 通過 | API token boundary 可用；不可外推為 Web 可放行 |
| migration／fixtures 通過 | 現有 seeded audits 都有非空 metadata，未觸發空 map path |
| SQL 未執行 | fail-fast 符合 gate contract；不可把它記為 pass 或 skip |

影響是所有 Web 使用者無法登入核心工作台，沒有安全 workaround；severity 為 **S2 High**。沒有證據顯示這個 revision 曾部署 production 或造成真實客戶事故，因此不升格描述為 incident/outage。

## Findings and retest status

| Finding | Severity | Current status | Evidence |
|---|---|---|---|
| [QA-004 authentication audit metadata](../defects/QA-004-auth-audit-metadata.md) | S2 High | **Open；retest not-run** | Current No-Go run [29685275310](https://github.com/419vive/partnerops-release-qa/actions/runs/29685275310) |
| [QA-001 DBAL 4 migration](../defects/QA-001-dbal4-migration.md) | S2 High | Fixed；upstream 與 dedicated pair passed | Runs 29640902228／29641007621／29642823042／[29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964) |
| [QA-002 idempotency raw replay](../defects/QA-002-idempotency-replay.md) | S2 High | Fixed；upstream 與 dedicated pair passed | Runs 29642501363／29642823042／[29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964) |
| [QA-003 container dotenv](../defects/QA-003-container-dotenv.md) | S2 High | Fixed；upstream 與 dedicated pair passed | Runs 29642501363／29642823042／[29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964) |
| OBS-001 quickstart dashboard wording | Observation | Open documentation/testability gap | Automated delta follows implementation, not stale wording |

歷史 expected failures 不納入 current release failure count；QA-004 則是 final revision 的實際 blocker。

[Historical Defects run 29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964) 的 3/3 jobs 全部通過，證明 QA-001–003 的 affected exact signatures 與 fixed gates。這項獨立歷史證據不改變最終 SUT 的 No-Go：QA-004 仍 open，DB-001 仍 not-run。

## Decision

Go 必須同時滿足：

1. required API、Chromium、Firefox、WebKit、Pixel mobile-web、iPhone mobile-web 與 SQL 全部實際通過；
2. failed、skipped、not-run 都是 0；
3. tenant isolation、raw-byte replay、audit 與 constraints 都通過；
4. artifacts 可追溯至同一 full SHA 且沒有秘密。

本次有 6 個 blocking failures，且 DB-001 因 fail-fast 未執行。依規則結論是 **NO-GO**；不是「部分通過所以可放行」，也不是把未跑 SQL 算成 pass。

## Required retest

1. 在共用 audit persistence boundary 修正 empty map 的 JSON object 表示，並新增登入成功、登入失敗、登出 regression。
2. 對 fixed full SHA 重跑三桌面與兩 mobile-web login flows。
3. 重跑 WEB-002、DB-001 與完整 `npm run qa:release`；不可只重跑一個 Chromium happy path。
4. 確認 JUnit 的 failed/skipped/not-run 全為 0，再建立新的 reviewed release report；本報告不會被原地改寫成 pass。

## Known limitations

- Pixel／iPhone 是 mobile-web emulation，不是 native App、模擬器或真機。
- 不涵蓋 load/stress、security penetration、long soak、recovery 或 production rollout。
- 本機 Docker Desktop 與目前 arm64 主機不相容，故權威容器證據來自公開 Ubuntu runner。
- 固定 2026-07 fixtures 造成日期敏感的 absolute dashboard counts；案例使用相對 delta。
- 因 release blocker 先發生，WEB-001 登入後步驟、WEB-002、MWEB-001 與 DB-001 的後續 assertions 沒有執行；它們不得外推為 failed 或 passed。

## Harness correction history

首次 release run [29684910752](https://github.com/419vive/partnerops-release-qa/actions/runs/29684910752) 在產品啟動前發現 shell contract 假設 macOS PATH 且繼承 `KEEP_SUT_RUNNING`；commit `4adb66c` 隔離 runner environment 後，run 29684970834 的 harness gate 通過並發現 QA-004。commit `78bdbf8` 將登入 failure 收斂為明確的 HTTP 500 assertion，current run 29685275310 再次取得同一 7 pass／6 fail 產品 signature。這些 harness 修正不計為 PartnerOps finding。

首次 historical run [29685282485](https://github.com/419vive/partnerops-release-qa/actions/runs/29685282485) 未被接受為 pair evidence：QA-001／QA-002 因 Doctrine test database 名稱重複 suffix 而未完成 fixed gates，QA-003 passed。commit `a609e5b` 修正 base database URL 後，由 successful run [29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964) supersede；前者是 harness execution failure，不計為 PartnerOps regression。
