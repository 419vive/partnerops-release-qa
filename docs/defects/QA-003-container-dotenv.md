# QA-003 — production image build 依賴已排除的 `.env`

| 欄位 | 內容 |
|---|---|
| 狀態 | Fixed；upstream production build/runtime smoke 與 dedicated affected/fixed build pair passed |
| Severity | **S2 High** — production image 無法產生，直接阻擋 release |
| 類型 | Container build／environment contract |
| 重現案例 | DEF-003 |
| Affected revision | [`c4e794a83a4536bb40627f0b34e0ec8ed161b03e`](https://github.com/419vive/partnerops/commit/c4e794a83a4536bb40627f0b34e0ec8ed161b03e) |
| Fixed revision | [`5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65`](https://github.com/419vive/partnerops/commit/5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65) |

## 摘要與影響

PartnerOps 正確地用 `.dockerignore` 排除 `.env*`，避免把秘密烘進 image；但 Symfony Runtime 在 production build 的 `asset-map:compile` 仍嘗試讀 `/var/www/html/.env`。因檔案刻意不在 build context，production target 在最後階段 fatal，image 無法完成，runtime smoke 也因此未執行。

這是公開 GitHub Actions 的 build/release defect。沒有證據顯示已部署 container 曾停機，本文件不稱它為 production incident、outage 或 startup failure；affected run 的直接證據是 **image build failure**。

## 環境與前置條件

- Checkout affected full SHA。
- Docker BuildKit 可用；不建立或複製 `.env` 到 build context。
- Dockerfile `production` target；只使用 build command 內明示的合成 placeholder environment values。

## 重現步驟

1. Checkout `c4e794a83a4536bb40627f0b34e0ec8ed161b03e`。
2. 確認 `.dockerignore` 排除 `.env*`，且 repository/build context 沒有 production secret。
3. 執行：

   ```bash
   docker build --target production --tag partnerops:ci .
   ```

4. 觀察 production stage 的 `php bin/console asset-map:compile --env=prod --no-debug` 與 Docker exit code。

## Expected／Actual

**Expected**

- production image 只依賴 process environment，不要求把 `.env` 複製進 image。
- asset compile 與 image build exit `0`，之後可執行 non-root runtime smoke。

**Actual on affected revision**

- `asset-map:compile` 在 Symfony Runtime 初始化時 exit `255`；Docker build 最終 exit `1`。
- 精確 failure signature：

  ```text
  Symfony\Component\Dotenv\Exception\PathException: Unable to read the "/var/www/html/.env" environment file.
  ```

- `Smoke-test production container` 被 skipped；它不是 failed，也不是 passed。

## 根因與修復

Fixed commit 在所有 container targets 的共同 base 設定：

```dockerfile
APP_RUNTIME_OPTIONS='{"disable_dotenv":true}'
```

並把 PHP `variables_order` 設為 `EGPCS`，讓 process environment 能被 runtime 讀取，而不必複製 `.env` 或秘密。該 commit 也 pin Composer 2.10.2 並更新官方 setup actions；這些是同一 hardening commit 的其他變更，不拿來冒充 dotenv 根因修復。公開 diff：[affected → fixed](https://github.com/419vive/partnerops/compare/c4e794a83a4536bb40627f0b34e0ec8ed161b03e...5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65)。

## Fixed retest

1. [Affected upstream CI run 29642501363](https://github.com/419vive/partnerops/actions/runs/29642501363) 的 `Build production container` 觀察到上述 exact `PathException`；run conclusion 為 failure，runtime smoke 被 skipped。
2. [Fixed upstream CI run 29642823042](https://github.com/419vive/partnerops/actions/runs/29642823042) 在 exact fixed SHA 通過 `Build production container`，接著通過 `Smoke-test production container`；run conclusion 為 success。因此 defect-specific retest 與完整 upstream regression 均 **PASS**。
3. [Portfolio run 29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964) 重現 affected dotenv `PathException`，並使 fixed production build gate 通過；artifact：[`qa-003-production-container-29685454964`](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964/artifacts/8441938857)。

獨立 portfolio workflow 的 `production-container` job 已執行 `Reproduce affected production build failure` 與 `Verify fixed production build gate`；affected exact signature 與 fixed build 均符合 gate。affected 若 build 通過或出現不同 failure signature，job 仍會失敗以揭露 runner drift。

## Retest 限制

- Runtime smoke 證據來自 upstream run 29642823042；portfolio historical job 只驗證 affected/fixed production build gate。兩者都不等同長時間 production traffic、orchestrator rollout 或 recovery 測試。
- 今日重跑可能受 base image／registry 變動影響；只有 exact `Dotenv PathException` 算 QA-003 reproduced。
- 安全修復是停用 container 內 dotenv 並使用 process environment；把 `.env` 複製進 image 不可接受，也不算替代修復。
