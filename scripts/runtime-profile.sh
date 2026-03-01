#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.runtime"
LOG_DIR="$STATE_DIR/logs"

BACKEND_PID_FILE="$STATE_DIR/backend.pid"
DASHBOARD_PID_FILE="$STATE_DIR/dashboard.pid"

BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
DASHBOARD_HOST="${DASHBOARD_HOST:-127.0.0.1}"
DASHBOARD_PORT="${DASHBOARD_PORT:-5173}"
API_URL="${API_URL:-http://$BACKEND_HOST:$BACKEND_PORT}"

mkdir -p "$STATE_DIR" "$LOG_DIR"

log() {
  printf '[runtime] %s\n' "$*"
}

is_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

read_pid() {
  local file="$1"
  if [[ -f "$file" ]]; then
    tr -d '[:space:]' < "$file"
  fi
}

stop_by_pid_file() {
  local name="$1"
  local file="$2"
  local pid

  pid="$(read_pid "$file")"
  if [[ -z "${pid:-}" ]]; then
    log "$name: não está em execução (sem PID file)."
    return
  fi

  if is_running "$pid"; then
    log "$name: encerrando PID $pid..."
    kill "$pid" >/dev/null 2>&1 || true
    sleep 1
    if is_running "$pid"; then
      log "$name: forçando encerramento PID $pid..."
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
  else
    log "$name: PID $pid não está ativo."
  fi

  rm -f "$file"
}

start_backend() {
  local pid
  pid="$(read_pid "$BACKEND_PID_FILE")"

  if [[ -n "${pid:-}" ]] && is_running "$pid"; then
    log "backend já está em execução (PID $pid)."
    return
  fi

  rm -f "$BACKEND_PID_FILE"

  (
    cd "$ROOT_DIR/packages/backend"
    source venv/bin/activate
    PYTHONUNBUFFERED=1 python -m uvicorn app.main:app \
      --host "$BACKEND_HOST" \
      --port "$BACKEND_PORT"
  ) >"$LOG_DIR/backend.log" 2>&1 &

  echo $! > "$BACKEND_PID_FILE"
  log "backend iniciado em http://$BACKEND_HOST:$BACKEND_PORT (PID $(cat "$BACKEND_PID_FILE"))"
}

start_dashboard() {
  local pid
  pid="$(read_pid "$DASHBOARD_PID_FILE")"

  if [[ -n "${pid:-}" ]] && is_running "$pid"; then
    log "dashboard já está em execução (PID $pid)."
    return
  fi

  rm -f "$DASHBOARD_PID_FILE"

  (
    cd "$ROOT_DIR/packages/dashboard"
    VITE_API_URL="$API_URL" npm run dev -- --host "$DASHBOARD_HOST" --port "$DASHBOARD_PORT"
  ) >"$LOG_DIR/dashboard.log" 2>&1 &

  echo $! > "$DASHBOARD_PID_FILE"
  log "dashboard iniciado em http://$DASHBOARD_HOST:$DASHBOARD_PORT (PID $(cat "$DASHBOARD_PID_FILE"), API=$API_URL)"
}

show_status_line() {
  local name="$1"
  local file="$2"
  local pid

  pid="$(read_pid "$file")"
  if [[ -n "${pid:-}" ]] && is_running "$pid"; then
    printf '%-10s RUNNING pid=%s\n' "$name" "$pid"
  elif [[ -n "${pid:-}" ]]; then
    printf '%-10s STOPPED stale_pid=%s\n' "$name" "$pid"
  else
    printf '%-10s STOPPED\n' "$name"
  fi
}

health() {
  local backend_status dashboard_status

  backend_status="DOWN"
  dashboard_status="DOWN"

  if curl -sSf "http://$BACKEND_HOST:$BACKEND_PORT/health" >/dev/null 2>&1; then
    backend_status="UP"
  fi

  if curl -sSf "http://$DASHBOARD_HOST:$DASHBOARD_PORT" >/dev/null 2>&1; then
    dashboard_status="UP"
  fi

  printf 'backend=%s (%s)\n' "$backend_status" "http://$BACKEND_HOST:$BACKEND_PORT/health"
  printf 'dashboard=%s (%s)\n' "$dashboard_status" "http://$DASHBOARD_HOST:$DASHBOARD_PORT"

  if [[ "$backend_status" != "UP" || "$dashboard_status" != "UP" ]]; then
    return 1
  fi
}

usage() {
  cat <<USAGE
Usage: scripts/runtime-profile.sh <command>

Commands:
  up       Start canonical local runtime (backend:8000 + dashboard:5173)
  down     Stop managed runtime processes
  status   Show status from PID files
  health   Check HTTP health of backend and dashboard
USAGE
}

cmd="${1:-}"

case "$cmd" in
  up)
    start_backend
    start_dashboard
    ;;
  down)
    stop_by_pid_file "dashboard" "$DASHBOARD_PID_FILE"
    stop_by_pid_file "backend" "$BACKEND_PID_FILE"
    ;;
  status)
    show_status_line "backend" "$BACKEND_PID_FILE"
    show_status_line "dashboard" "$DASHBOARD_PID_FILE"
    ;;
  health)
    health
    ;;
  *)
    usage
    exit 1
    ;;
esac
