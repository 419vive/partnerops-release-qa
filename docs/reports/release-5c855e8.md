# Release QA Report — PartnerOps `5c855e8`

**受測系統**：[419vive/partnerops](https://github.com/419vive/partnerops)  
**受測版本**：[`5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65`](https://github.com/419vive/partnerops/commit/5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65)  
**報告時間**：2026-07-19 19:10 GMT+8  
**資料**：公開、可重建的合成 fixtures  
**判斷**：**INCOMPLETE — required GitHub Actions release scope 尚未執行，不得建議 Go**

## Executive summary

本機無 Docker 的靜態 release preflight 已通過：TypeScript、Playwright discovery、shell lifecycle contracts、shell syntax 與公開檔案 scan 均為綠色。完整 Web／mobile-web／API／PostgreSQL gate 必須在可用 Docker 的 GitHub-hosted Ubuntu runner 完成；在取得同一 full SHA 的公開 run 前，所有動態案例維持 not-run，決策保持 incomplete。

## Result summary

| Gate | Passed | Failed | Skipped | Not run | Evidence |
|---|---:|---:|---:|---:|---|
| TypeScript | 1 | 0 | 0 | 0 | `npm run typecheck`, exit 0 |
| Playwright discovery | 1 | 0 | 0 | 0 | `npx playwright test --list`, 13 executions in 5 files |
| Shell lifecycle contracts | 4 | 0 | 0 | 0 | Node TAP, 4/4 passed |
| Repository/public-file gate | 1 | 0 | 0 | 0 | `npm run qa:check`, exit 0 |
| Final API/Web/mobile-web runtime | 0 | 0 | 0 | 13 | Waiting for public Ubuntu/Docker run |
| PostgreSQL assertions | 0 | 0 | 0 | 1 | Waiting for public Ubuntu/Docker run |
| Historical affected/fixed pairs | 0 | 0 | 0 | 3 | Manual workflow after publication |

Discovery 只證明案例可被 runner 正確收集，不等同執行通過；因此 13 個 runtime cases 同時列為 not-run，不重複計入 release passed。

## Required runtime scope

- API：7 executions，包含 health、auth、validation、create/read、tenant concealment、raw-byte replay 與 conflict。
- Desktop Web：Chromium 2、Firefox 1、WebKit 1。
- Mobile web：Pixel 7 emulation 1、iPhone 13 emulation 1。
- Data：1 個 read-only SQL assertion transaction。
- Environment：migration、fixtures、readiness、pinned revision、evidence upload 與 cleanup。

## Findings and retest status

| Finding | Severity | Current status | Evidence boundary |
|---|---|---|---|
| [QA-001 DBAL 4 migration](../defects/QA-001-dbal4-migration.md) | S2 High | Fixed；upstream defect-specific retest passed | Dedicated pair not run yet |
| [QA-002 idempotency raw replay](../defects/QA-002-idempotency-replay.md) | S2 High | Fixed；upstream fixed gates passed | Dedicated affected/fixed pair not run yet |
| [QA-003 container dotenv](../defects/QA-003-container-dotenv.md) | S2 High | Fixed；upstream build/runtime gates passed | Dedicated pair not run yet |
| OBS-001 quickstart dashboard wording | Observation | Open documentation/testability gap | Implementation keeps overdue constant and decreases unassigned by one |

三筆 finding 均為公開 CI/release defect，不代表 production incident。歷史 expected failures 不納入 final release 的 failure count。

## Decision rule

Go 必須同時滿足：

1. required API、Chromium、Firefox、WebKit、Pixel mobile-web、iPhone mobile-web 與 SQL 全部實際通過；
2. failed、skipped、not-run 都是 0；
3. tenant isolation、raw-byte replay、audit 與 constraints 都通過；
4. artifacts 可追溯至同一 full SHA 且沒有秘密。

目前第 1–4 項尚無本 repo 的公開 runtime evidence，故判斷是 **Incomplete**，不是 Go，也不是產品缺陷造成的 No-Go。

## Known limitations

- Pixel／iPhone 是 mobile-web emulation，不是 native App、模擬器或真機。
- 不涵蓋 load/stress、security penetration、long soak、recovery 或 production rollout。
- 本機 Docker Desktop 與目前 arm64 主機不相容，故本機未執行容器 gate；權威動態證據交由公開 Ubuntu runner。
- 固定 2026-07 fixtures 造成日期敏感的 absolute dashboard counts；案例使用相對 delta。

## Next evidence update

首次 `Release QA` workflow 完成後，這份報告必須補上 run URL、commit verification、實際 passed/failed/skipped/not-run、duration、artifact links 與最終 Go／No-Go。`Historical Defects` 手動 workflow 完成後，再把三個 pair 的 live run 與 outcome 加回各 defect record。
