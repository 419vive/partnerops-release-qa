import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const script = 'scripts/qa.sh';

function run(action, env = {}) {
  return spawnSync('bash', [script, action], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('ENV-001 help documents the owned lifecycle without requiring Docker', () => {
  const result = run('help', { PATH: '/usr/bin:/bin' });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /qa\.sh \{check\|up\|test\|sql\|down\|release\|help\}/);
  assert.match(result.stdout, /mobile-web/i);
});

test('ENV-002 up fails before mutation when Docker is unavailable', () => {
  const result = run('up', { PATH: '/usr/bin:/bin' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /docker is required/i);
});

test('ENV-003 empty Compose project name is rejected', () => {
  const result = run('up', { COMPOSE_PROJECT_NAME: '', QA_DRY_RUN: '1' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /COMPOSE_PROJECT_NAME must not be empty/);
});

test('ENV-004 dry run pins the public SUT and scopes destructive commands', () => {
  const result = run('release', { QA_DRY_RUN: '1' });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65/);
  assert.match(result.stdout, /mkdir -p .*\.sut/);
  assert.match(result.stdout, /docker compose -p partnerops_release_qa/);
  assert.match(result.stdout, /down --volumes --remove-orphans/);
  assert.doesNotMatch(result.stdout, /rm -rf|git clean|git reset --hard/);
});
