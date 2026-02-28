#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_SCRIPT="$ROOT_DIR/scripts/runtime-profile.sh"

BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
DASHBOARD_HOST="${DASHBOARD_HOST:-127.0.0.1}"
DASHBOARD_PORT="${DASHBOARD_PORT:-5173}"

BACKEND_BASE="http://${BACKEND_HOST}:${BACKEND_PORT}"
DASHBOARD_BASE="http://${DASHBOARD_HOST}:${DASHBOARD_PORT}"

EVIDENCE_ROOT="${EVIDENCE_ROOT:-/tmp/findvan-qa-e2e-smoke}"
MANAGE_RUNTIME="${MANAGE_RUNTIME:-1}"
ENABLE_VISUAL_SMOKE="${ENABLE_VISUAL_SMOKE:-1}"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$EVIDENCE_ROOT/$RUN_ID"
mkdir -p "$RUN_DIR/bodies"

CHECKS_FILE="$RUN_DIR/checks.tsv"
SUMMARY_JSON="$RUN_DIR/summary.json"
SUMMARY_MD="$RUN_DIR/summary.md"

echo -e "name\ttype\turl\thttp_code\tresult\tnote" > "$CHECKS_FILE"

pass_count=0
fail_count=0

log() {
  printf '[qa-smoke] %s\n' "$*"
}

cleanup() {
  if [[ "$MANAGE_RUNTIME" == "1" ]]; then
    "$RUNTIME_SCRIPT" down >/dev/null 2>&1 || true
  fi
}

wait_for_health() {
  local attempts=15
  local sleep_secs=1
  local i

  for i in $(seq 1 "$attempts"); do
    if "$RUNTIME_SCRIPT" health >/dev/null 2>&1; then
      return 0
    fi
    sleep "$sleep_secs"
  done

  return 1
}

run_check() {
  local name="$1"
  local type="$2"
  local url="$3"
  local body_file="$RUN_DIR/bodies/${name}.txt"
  local http_code result note

  http_code="$(curl -sS -L -m 15 -o "$body_file" -w '%{http_code}' "$url" || true)"

  if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
    result="PASS"
    note="ok"

    if [[ "$type" == "ui" ]]; then
      if ! grep -Eiq '<!doctype html|<html' "$body_file"; then
        result="FAIL"
        note="ui body sem html"
      fi
    fi
  else
    result="FAIL"
    note="http status $http_code"
  fi

  if [[ "$result" == "PASS" ]]; then
    pass_count=$((pass_count + 1))
  else
    fail_count=$((fail_count + 1))
  fi

  echo -e "${name}\t${type}\t${url}\t${http_code}\t${result}\t${note}" >> "$CHECKS_FILE"
}

trap cleanup EXIT

if [[ "$MANAGE_RUNTIME" == "1" ]]; then
  log "subindo runtime canônico"
  "$RUNTIME_SCRIPT" up

  log "validando health"
  if ! wait_for_health; then
    log "health check não estabilizou após múltiplas tentativas"
    exit 1
  fi
else
  log "MANAGE_RUNTIME=0: usando serviços já em execução"
fi

run_check "health" "api" "$BACKEND_BASE/health"
run_check "dashboard-kpis" "api" "$BACKEND_BASE/api/dashboard/kpis"
run_check "dashboard-funnel-summary" "api" "$BACKEND_BASE/api/dashboard/funnel-summary"
run_check "dashboard-urgent-actions" "api" "$BACKEND_BASE/api/dashboard/urgent-actions"
run_check "dashboard-weekly-performance" "api" "$BACKEND_BASE/api/dashboard/weekly-performance"
run_check "activity-timeline" "api" "$BACKEND_BASE/api/activity?limit=5"
run_check "scraper-stats" "api" "$BACKEND_BASE/api/scraper/stats"
run_check "scraper-runs" "api" "$BACKEND_BASE/api/scraper/runs?limit=3"
run_check "scraper-schedules" "api" "$BACKEND_BASE/api/scraper/schedules"
run_check "leads-list" "api" "$BACKEND_BASE/api/leads/?limit=5"
run_check "leads-funnel-meta" "api" "$BACKEND_BASE/api/leads/funnel/meta"

run_check "ui-dashboard" "ui" "$DASHBOARD_BASE/dashboard"
run_check "ui-scraper" "ui" "$DASHBOARD_BASE/scraper"
run_check "ui-leads" "ui" "$DASHBOARD_BASE/leads"

if [[ "$ENABLE_VISUAL_SMOKE" == "1" ]]; then
  if (
    cd "$ROOT_DIR/packages/scraper" &&
    node scripts/qa-visual-smoke.js "$DASHBOARD_BASE" "$RUN_DIR"
  ); then
    pass_count=$((pass_count + 1))
    echo -e "visual-smoke\tui\t$DASHBOARD_BASE\t200\tPASS\tscreenshots generated" >> "$CHECKS_FILE"
  else
    fail_count=$((fail_count + 1))
    echo -e "visual-smoke\tui\t$DASHBOARD_BASE\t000\tFAIL\tvisual smoke failed (see visual-summary.json)" >> "$CHECKS_FILE"
  fi
fi

node - <<'NODE' "$CHECKS_FILE" "$SUMMARY_JSON" "$RUN_ID" "$BACKEND_BASE" "$DASHBOARD_BASE"
const fs = require('fs');
const [checksPath, summaryPath, runId, backendBase, dashboardBase] = process.argv.slice(2);
const lines = fs.readFileSync(checksPath, 'utf8').trim().split('\n').slice(1);
const checks = lines.filter(Boolean).map((line) => {
  const [name, type, url, httpCode, result, note] = line.split('\t');
  return { name, type, url, httpCode: Number(httpCode), result, note };
});
const pass = checks.filter((c) => c.result === 'PASS').length;
const fail = checks.filter((c) => c.result === 'FAIL').length;
const payload = {
  run_id: runId,
  generated_at: new Date().toISOString(),
  profile: {
    backend: backendBase,
    dashboard: dashboardBase,
  },
  totals: {
    checks: checks.length,
    pass,
    fail,
  },
  checks,
};
fs.writeFileSync(summaryPath, JSON.stringify(payload, null, 2));
NODE

cat > "$SUMMARY_MD" <<MARKDOWN
# QA E2E Smoke Summary

- run_id: $RUN_ID
- backend: $BACKEND_BASE
- dashboard: $DASHBOARD_BASE
- checks: $((pass_count + fail_count))
- pass: $pass_count
- fail: $fail_count
- checks_file: $CHECKS_FILE
- summary_json: $SUMMARY_JSON
- visual_summary: $RUN_DIR/visual-summary.json
- screenshots_dir: $RUN_DIR/screenshots
MARKDOWN

ln -sfn "$RUN_DIR" "$EVIDENCE_ROOT/latest"

log "evidências em $RUN_DIR"

if [[ "$fail_count" -gt 0 ]]; then
  log "resultado final: FAIL ($fail_count checks falharam)"
  exit 1
fi

log "resultado final: PASS"
