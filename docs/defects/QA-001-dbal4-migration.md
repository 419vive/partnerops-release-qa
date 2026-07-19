# QA-001 — DBAL 4 使初始 migration 無法執行

| 欄位 | 內容 |
|---|---|
| 狀態 | Fixed；upstream defect-specific retest 與 dedicated affected/fixed pair passed |
| Severity | **S2 High** — 新環境無法建立 schema，直接阻擋版本部署／驗證 |
| 類型 | Migration compatibility／release blocker |
| 重現案例 | DEF-001 |
| Affected revision | [`7079d99ae802a32ffaa82b2390e858e26d065aed`](https://github.com/419vive/partnerops/commit/7079d99ae802a32ffaa82b2390e858e26d065aed) |
| Fixed revision | [`6aa9546187e91bda44b8481dedcd3b7ed430238a`](https://github.com/419vive/partnerops/commit/6aa9546187e91bda44b8481dedcd3b7ed430238a) |
| Final regression revision | [`5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65`](https://github.com/419vive/partnerops/commit/5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65) |

## 摘要與影響

初始 migration 用 DBAL 3 的 `AbstractPlatform::getName()` 判斷 PostgreSQL；locked dependencies 實際使用 DBAL 4，`PostgreSQL120Platform` 已沒有該 method。乾淨 PostgreSQL 環境執行第一個 migration 立即 fatal，schema 未完成，後續 invariant、測試、asset 與 container gates 全部無法開始。

這是公開 CI 發現的 release defect；沒有證據顯示它曾進入 production，本文件不把它描述成 production incident 或 outage。

## 環境與前置條件

- PHP 8.4 與 affected revision 的 `composer.lock`。
- PostgreSQL 16 service 可連線，使用空的合成 test database。
- `APP_ENV=test`，不需要 production credential。
- 執行者必須 checkout **exact affected full SHA**，不可使用會移動的 branch。

## 重現步驟

1. Checkout `7079d99ae802a32ffaa82b2390e858e26d065aed`。
2. 依 lockfile 安裝 PHP dependencies，啟動 PostgreSQL 16 合成資料庫。
3. 執行：

   ```bash
   php bin/console doctrine:migrations:migrate --env=test --no-interaction
   ```

4. 檢查 process exit code 與 migration log；只接受下列 signature 為 QA-001 成功重現。

## Expected／Actual

**Expected**

- migration 正確辨識 PostgreSQL platform。
- `DoctrineMigrations\\Version20260718000000` 完成，process exit `0`。
- 後續 `doctrine:migrations:up-to-date` 與 schema gate 可以繼續。

**Actual on affected revision**

- migration 在 `Version20260718000000.php` 的 platform guard 停止。
- PHP process exit `255`。
- 精確 failure signature：

  ```text
  Call to undefined method Doctrine\DBAL\Platforms\PostgreSQL120Platform::getName()
  ```

- 同一 CI job 的後續測試被 skipped；不能把它們記為 passed 或 failed。

## 根因與修復

Fixed commit 只把 migration 的字串名稱判斷改成型別判斷：

```php
$this->connection->getDatabasePlatform() instanceof PostgreSQLPlatform
```

這同時覆蓋 DBAL 4 的 `PostgreSQL120Platform` subclass，且保留「非 PostgreSQL 必須中止」的安全邊界。公開 diff：[affected → fixed](https://github.com/419vive/partnerops/compare/7079d99ae802a32ffaa82b2390e858e26d065aed...6aa9546187e91bda44b8481dedcd3b7ed430238a)。

## Fixed retest

1. [Affected upstream CI run 29640902228](https://github.com/419vive/partnerops/actions/runs/29640902228) 在 `Apply and validate database migrations` 觀察到上述 exact signature，run conclusion 為 failure。
2. [Fixed-revision upstream CI run 29641007621](https://github.com/419vive/partnerops/actions/runs/29641007621) 用相同 migration command 成功執行 `Version20260718000000`：1 個 migration、57 個 SQL queries，並通過 `up-to-date`。這證明 QA-001 的 defect-specific retest **PASS**。
3. Run 29641007621 的整體 conclusion 仍為 failure，原因是後續 `doctrine:schema:validate` 回報 schema sync 差異；那不是 `getName()` signature，也不能寫成 QA-001 修復後整體 release 已綠。
4. [Final upstream CI run 29642823042](https://github.com/419vive/partnerops/actions/runs/29642823042) 在最終 SHA 再次通過 migration、migration invariants、published predecessor upgrade 與完整後續 gates，run conclusion 為 success。
5. [Portfolio run 29685454964](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964) 以 affected SHA 重現 exact `getName()` signature，並使 fixed SHA 的相同 migration command 通過；sanitized logs 與 outcome 保存於 [`qa-001-dbal-migration-29685454964`](https://github.com/419vive/partnerops-release-qa/actions/runs/29685454964/artifacts/8441925367)。

獨立 portfolio workflow 的 `dbal-migration` job 已執行 `Reproduce affected DBAL migration failure` 與 `Verify fixed DBAL migration gate`；affected 出現指定 signature、fixed gate exit `0`，job conclusion 為 success。workflow 仍會在 affected 意外通過或出現不同 signature 時失敗，避免把環境漂移誤報為成功重現。

## Retest 限制

- Run 29641007621 只證明本 defect 的 migration failure 已移除，不代表該 intermediate revision 可放行。
- 今日重新執行 affected SHA 可能受到 base image／package registry／runner 漂移影響；不同 failure 不算 QA-001 reproduced。
- 本案例只驗證 PostgreSQL migration compatibility，不外推到其他資料庫，也不推論 production 使用狀況。
