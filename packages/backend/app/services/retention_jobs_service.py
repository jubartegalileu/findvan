from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import os
import threading
import time

from .dashboard_service import DEFAULT_ACTIVITY_RETENTION_DAYS, prune_old_activity_events
from .messaging_receipts_service import DEFAULT_RECEIPTS_RETENTION_DAYS, prune_old_receipt_events


_state_lock = threading.Lock()
_worker_lock = threading.Lock()
_worker_thread: threading.Thread | None = None
_stop_event = threading.Event()

_state = {
    "enabled": True,
    "running": False,
    "interval_seconds": 300,
    "retention_days": {
        "receipts": DEFAULT_RECEIPTS_RETENTION_DAYS,
        "activity": DEFAULT_ACTIVITY_RETENTION_DAYS,
    },
    "last_run_at": None,
    "last_success_at": None,
    "last_duration_ms": 0,
    "last_deleted": {"receipts": 0, "activity": 0, "total": 0},
    "last_error": None,
    "run_count": 0,
    "fail_count": 0,
}


def _utcnow_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _to_bool(value: str | None, default: bool = True) -> bool:
    if value is None:
        return default
    normalized = str(value).strip().lower()
    return normalized in {"1", "true", "yes", "y", "on"}


def _configured_interval_seconds() -> int:
    raw = os.getenv("RETENTION_JOB_INTERVAL_SECONDS", "300")
    try:
        return max(30, int(raw))
    except Exception:
        return 300


def _configured_retention_days() -> dict:
    receipts_raw = os.getenv("RECEIPTS_RETENTION_DAYS", str(DEFAULT_RECEIPTS_RETENTION_DAYS))
    activity_raw = os.getenv("ACTIVITY_RETENTION_DAYS", str(DEFAULT_ACTIVITY_RETENTION_DAYS))
    try:
        receipts_days = max(1, int(receipts_raw))
    except Exception:
        receipts_days = DEFAULT_RECEIPTS_RETENTION_DAYS
    try:
        activity_days = max(1, int(activity_raw))
    except Exception:
        activity_days = DEFAULT_ACTIVITY_RETENTION_DAYS
    return {"receipts": receipts_days, "activity": activity_days}


def get_retention_job_status() -> dict:
    with _state_lock:
        snapshot = deepcopy(_state)
    snapshot["thread_alive"] = bool(_worker_thread and _worker_thread.is_alive())
    return snapshot


def run_retention_cycle(receipts_retention_days: int | None = None, activity_retention_days: int | None = None) -> dict:
    started = time.time()
    receipts_days = max(1, int(receipts_retention_days or _configured_retention_days()["receipts"]))
    activity_days = max(1, int(activity_retention_days or _configured_retention_days()["activity"]))

    with _state_lock:
        _state["retention_days"] = {"receipts": receipts_days, "activity": activity_days}
        _state["last_run_at"] = _utcnow_iso()
        _state["run_count"] += 1
        _state["last_error"] = None

    try:
        deleted_receipts = prune_old_receipt_events(retention_days=receipts_days)
        deleted_activity = prune_old_activity_events(retention_days=activity_days)
        deleted_total = deleted_receipts + deleted_activity
        duration_ms = int((time.time() - started) * 1000)
        with _state_lock:
            _state["last_success_at"] = _utcnow_iso()
            _state["last_duration_ms"] = duration_ms
            _state["last_deleted"] = {
                "receipts": deleted_receipts,
                "activity": deleted_activity,
                "total": deleted_total,
            }
        return {
            "status": "ok",
            "deleted": {"receipts": deleted_receipts, "activity": deleted_activity, "total": deleted_total},
            "duration_ms": duration_ms,
        }
    except Exception as exc:
        duration_ms = int((time.time() - started) * 1000)
        with _state_lock:
            _state["fail_count"] += 1
            _state["last_duration_ms"] = duration_ms
            _state["last_error"] = str(exc)
        return {"status": "error", "error": str(exc), "duration_ms": duration_ms}


def _worker_loop() -> None:
    # Run an immediate cycle after startup to establish baseline status.
    run_retention_cycle()
    while not _stop_event.wait(_configured_interval_seconds()):
        run_retention_cycle()


def start_retention_job() -> dict:
    with _worker_lock:
        enabled = _to_bool(os.getenv("RETENTION_JOB_ENABLED", "1"), default=True)
        interval_seconds = _configured_interval_seconds()
        retention_days = _configured_retention_days()

        with _state_lock:
            _state["enabled"] = enabled
            _state["interval_seconds"] = interval_seconds
            _state["retention_days"] = retention_days

        if not enabled:
            with _state_lock:
                _state["running"] = False
            return get_retention_job_status()

        global _worker_thread
        if _worker_thread and _worker_thread.is_alive():
            with _state_lock:
                _state["running"] = True
            return get_retention_job_status()

        _stop_event.clear()
        _worker_thread = threading.Thread(target=_worker_loop, name="retention-job-worker", daemon=True)
        _worker_thread.start()
        with _state_lock:
            _state["running"] = True
        return get_retention_job_status()


def stop_retention_job() -> dict:
    with _worker_lock:
        _stop_event.set()
        global _worker_thread
        if _worker_thread and _worker_thread.is_alive():
            _worker_thread.join(timeout=2.0)
        _worker_thread = None
        with _state_lock:
            _state["running"] = False
        return get_retention_job_status()
