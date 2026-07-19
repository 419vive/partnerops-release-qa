# Release Gate Contract

## Primary command

```bash
npm run qa:release
```

The command owns SUT checkout, disposable environment setup, migration, fixture loading, readiness, final-release browser/API execution, SQL assertions, and result retention. It MUST stop before tests when a prerequisite or immutable revision is unavailable.

## Configuration

| Variable | Default | Contract |
|---|---|---|
| `SUT_REPO` | `https://github.com/419vive/partnerops.git` | Readable Git repository; no embedded credentials |
| `SUT_REF` | `5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65` | Commit-ish resolved and logged as a full SHA |
| `SUT_DIR` | `.sut/partnerops` | Path inside an ignored parent; never published |
| `BASE_URL` | `http://127.0.0.1:8080` | HTTP origin used by Playwright |
| `COMPOSE_PROJECT_NAME` | `partnerops_release_qa` | Dedicated synthetic container/volume namespace |
| `KEEP_SUT_RUNNING` | unset | When `1`, preserve containers after the run for investigation |

Changing `BASE_URL` to a pre-running environment MAY skip lifecycle ownership only through a separately documented test command; `qa:release` always owns a disposable local SUT.

## Supporting commands

| Command | Behavior |
|---|---|
| `npm run qa:up` | Checkout, start, rebuild database, migrate, seed, and wait for readiness |
| `npm run qa:test` | Run final Web/mobile-web/API projects against an already ready SUT |
| `npm run qa:sql` | Execute read-only PostgreSQL assertions against the owned SUT |
| `npm run qa:down` | Stop only the named QA Compose project and remove its synthetic volume |
| `npm run qa:check` | Type-check, list tests, validate shell syntax, and scan tracked public files |

## Result contract

- Exit `0`: every required final-release case and SQL assertion passed.
- Non-zero: prerequisite, setup, test, SQL, or evidence gate failed. A non-zero run MUST NOT publish a Go decision.
- `playwright-report/`: human-readable live report.
- `results/junit.xml`: machine-readable test results.
- `test-results/`: traces/screenshots retained on failure.
- `results/sql.txt`: SQL assertion output.

Passed, failed, skipped, and not-run states remain distinct. Cleanup failure is reported but MUST NOT replace the original test failure.

## Historical defect contract

Historical reproduction is separate from `qa:release` and is manually dispatched. Each defect job MUST:

1. Checkout its affected revision and observe the documented failure signature.
2. Treat a pass or different failure signature as reproduction failure.
3. Checkout its fixed revision and run the same behavioral gate successfully.
4. Upload sanitized logs and link the public upstream evidence.

## Safety contract

- Reset and volume deletion may target only `COMPOSE_PROJECT_NAME=partnerops_release_qa` (or an explicitly supplied non-empty replacement) and the resolved `SUT_DIR` under the repository.
- No command accepts or logs production credentials.
- Demo credentials and tokens are the publicly documented PartnerOps fixtures and are labeled synthetic.
- `.env*`, cookies, storage state, local SUT checkout, dependency folders, and generated artifacts are ignored.
