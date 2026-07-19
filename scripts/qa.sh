#!/usr/bin/env bash
set -Eeuo pipefail

readonly repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
readonly sut_repo="${SUT_REPO:-https://github.com/419vive/partnerops.git}"
readonly sut_ref="${SUT_REF:-5c855e8428c48fccfeadac7d4f24b0a3e7ac1c65}"
readonly sut_dir_input="${SUT_DIR:-.sut/partnerops}"
readonly base_url="${BASE_URL:-http://127.0.0.1:8080}"
readonly compose_project="${COMPOSE_PROJECT_NAME-partnerops_release_qa}"
readonly dry_run="${QA_DRY_RUN:-0}"
sut_dir=''
declare -a compose=()

fail() {
  printf 'qa: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: qa.sh {check|up|test|sql|down|release|help}

  check    Type-check, discover tests, validate shell contracts, scan public files
  up       Checkout the pinned SUT and rebuild its disposable synthetic database
  test     Run API, desktop Web, and labeled mobile-web emulation projects
  sql      Run read-only PostgreSQL release assertions
  down     Remove only the dedicated QA Compose project and synthetic volume
  release  Run up, test, and sql; always clean up unless KEEP_SUT_RUNNING=1

Pixel/iPhone projects are mobile-web emulation, not native apps or real devices.
EOF
}

print_command() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'
}

run() {
  print_command "$@"
  [[ "$dry_run" == "1" ]] || "$@"
}

validate_config() {
  [[ -n "$compose_project" ]] || fail 'COMPOSE_PROJECT_NAME must not be empty'
  [[ "$compose_project" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]] || fail 'COMPOSE_PROJECT_NAME contains unsupported characters'
  [[ "$sut_ref" != -* && "$sut_ref" != *..* && "$sut_ref" =~ ^[A-Za-z0-9._/-]+$ ]] || fail 'SUT_REF is unsafe'
  [[ "$base_url" =~ ^http://(127\.0\.0\.1|localhost)(:[0-9]+)?$ ]] || fail 'BASE_URL for the owned release environment must be local HTTP'

  case "$sut_dir_input" in
    .sut/*) sut_dir="$repo_root/$sut_dir_input" ;;
    "$repo_root"/.sut/*) sut_dir="$sut_dir_input" ;;
    *) fail 'SUT_DIR must remain under this repository .sut/' ;;
  esac
  compose=(docker compose -p "$compose_project" -f "$sut_dir/compose.yaml")
}

require_runtime() {
  local command_name
  for command_name in git docker curl npm; do
    command -v "$command_name" >/dev/null 2>&1 || fail "$command_name is required"
  done
  if [[ "$dry_run" != "1" ]] && ! docker info >/dev/null 2>&1; then
    fail 'Docker is installed but the daemon is unavailable; start Docker Desktop/Engine'
  fi
}

checkout_sut() {
  run mkdir -p "$(dirname "$sut_dir")"
  if [[ ! -d "$sut_dir/.git" ]]; then
    run git clone --filter=blob:none --no-checkout "$sut_repo" "$sut_dir"
  fi
  run git -C "$sut_dir" fetch --depth 1 origin "$sut_ref"
  run git -C "$sut_dir" checkout --detach FETCH_HEAD

  if [[ "$dry_run" != "1" ]]; then
    local resolved
    resolved="$(git -C "$sut_dir" rev-parse HEAD)"
    [[ "$resolved" == "$sut_ref" ]] || fail "resolved SUT revision $resolved does not equal $sut_ref"
    [[ -f "$sut_dir/compose.yaml" ]] || fail 'SUT compose.yaml is missing'
    printf 'qa: SUT revision %s\n' "$resolved"
  fi
}

wait_for_readiness() {
  if [[ "$dry_run" == "1" ]]; then
    print_command curl --fail "$base_url/health/ready"
    return
  fi

  local attempt
  for attempt in {1..30}; do
    if curl --fail --silent --show-error "$base_url/health/ready" >/dev/null 2>&1; then
      printf 'qa: ready after %s attempt(s)\n' "$attempt"
      return
    fi
    sleep 1
  done
  "${compose[@]}" ps >&2 || true
  "${compose[@]}" logs app >&2 || true
  fail "SUT readiness timed out at $base_url/health/ready"
}

up_sut() {
  require_runtime
  checkout_sut
  run "${compose[@]}" up --build -d db app
  run "${compose[@]}" exec -T app php bin/console doctrine:database:drop --force --if-exists
  run "${compose[@]}" exec -T app php bin/console doctrine:database:create
  run "${compose[@]}" exec -T app php bin/console doctrine:migrations:migrate --no-interaction
  run "${compose[@]}" exec -T app php bin/console doctrine:fixtures:load --group=AppFixtures --append --no-interaction
  wait_for_readiness
}

run_tests() {
  run npm exec -- playwright test
}

run_sql() {
  if [[ "$dry_run" == "1" ]]; then
    print_command "${compose[@]}" exec -T db psql -X -v ON_ERROR_STOP=1 -U partnerops -d partnerops
    printf '+ input tests/sql/release-assertions.sql; output results/sql.txt\n'
    return
  fi

  mkdir -p "$repo_root/results"
  "${compose[@]}" exec -T db psql -X -v ON_ERROR_STOP=1 -U partnerops -d partnerops \
    < "$repo_root/tests/sql/release-assertions.sql" \
    | tee "$repo_root/results/sql.txt"
}

down_sut() {
  if [[ "$dry_run" == "1" ]]; then
    print_command "${compose[@]}" down --volumes --remove-orphans
    return
  fi
  [[ -f "$sut_dir/compose.yaml" ]] || return 0
  "${compose[@]}" down --volumes --remove-orphans
}

scan_public_files() {
  local pattern='gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY'
  local file
  local found=0

  local ignored_tracked
  ignored_tracked="$(git -C "$repo_root" ls-files --cached --ignored --exclude-standard)"
  if [[ -n "$ignored_tracked" ]]; then
    printf 'qa: ignored generated or sensitive paths are tracked:\n%s\n' "$ignored_tracked" >&2
    found=1
  fi

  while IFS= read -r -d '' file; do
    file="$repo_root/$file"
    [[ -f "$file" ]] || continue
    if grep -Iq . "$file" && grep -En "$pattern" "$file"; then
      printf 'qa: possible secret in %s\n' "$file" >&2
      found=1
    fi
  done < <(git -C "$repo_root" ls-files --cached --others --exclude-standard -z)

  [[ "$found" == "0" ]] || fail 'public-file scan failed'
}

check_repo() {
  run npm run typecheck
  run npm exec -- playwright test --list
  run npm run test:shell
  run bash -n scripts/qa.sh
  [[ "$dry_run" == "1" ]] || scan_public_files
}

release() {
  up_sut
  cleanup() {
    local status=$?
    trap - EXIT
    if [[ "${KEEP_SUT_RUNNING:-0}" != "1" ]]; then
      down_sut || { [[ "$status" != "0" ]] || status=$?; }
    fi
    exit "$status"
  }
  trap cleanup EXIT
  run_tests
  run_sql
}

action="${1:-help}"
case "$action" in
  help|-h|--help) usage ;;
  check) validate_config; check_repo ;;
  up) validate_config; up_sut ;;
  test) validate_config; run_tests ;;
  sql) validate_config; run_sql ;;
  down) validate_config; down_sut ;;
  release) validate_config; release ;;
  *) usage >&2; exit 2 ;;
esac
