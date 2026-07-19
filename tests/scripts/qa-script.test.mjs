import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const script = 'scripts/qa.sh';

function run(action, env = {}) {
  return spawnSync('/bin/bash', [script, action], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function pathWithOnly(...commands) {
  const directory = mkdtempSync(join(tmpdir(), 'partnerops-qa-path-'));

  for (const command of commands) {
    const lookup = spawnSync('/bin/sh', ['-c', `command -v ${command}`], { encoding: 'utf8' });
    assert.equal(lookup.status, 0, lookup.stderr);
    symlinkSync(lookup.stdout.trim(), join(directory, command));
  }

  return directory;
}

test('ENV-001 help documents the owned lifecycle without requiring Docker', () => {
  const result = run('help', { PATH: '/usr/bin:/bin' });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /qa\.sh \{check\|up\|test\|sql\|down\|release\|help\}/);
  assert.match(result.stdout, /mobile-web/i);
});

test('ENV-002 up fails before mutation when Docker is unavailable', () => {
  const isolatedPath = pathWithOnly('dirname', 'git');
  let result;
  try {
    result = run('up', { PATH: isolatedPath });
  } finally {
    rmSync(isolatedPath, { recursive: true, force: true });
  }

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /docker is required/i);
});

test('ENV-003 empty Compose project name is rejected', () => {
  const result = run('up', { COMPOSE_PROJECT_NAME: '', QA_DRY_RUN: '1' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /COMPOSE_PROJECT_NAME must not be empty/);
});

test('ENV-004 dry run pins the public SUT and scopes destructive commands', () => {
  const result = run('release', { KEEP_SUT_RUNNING: '0', QA_DRY_RUN: '1' });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65/);
  assert.match(result.stdout, /mkdir -p .*\.sut/);
  assert.match(result.stdout, /docker compose -p partnerops_release_qa/);
  assert.match(result.stdout, /down --volumes --remove-orphans/);
  assert.doesNotMatch(result.stdout, /rm -rf|git clean|git reset --hard/);
});
