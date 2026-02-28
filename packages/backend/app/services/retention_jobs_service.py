from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import os
import socket
import threading
import time

from ..db import get_connection
from .dashboard_service import DEFAULT_ACTIVITY_RETENTION_DAYS, prune_old_activity_events
from .distributed_lock_service import acquire_lock, get_lock, release_lock, renew_lock
from .messaging_receipts_service import DEFAULT_RECEIPTS_RETENTION_DAYS, prune_old_receipt_events
from .operational_telemetry_service import log_incident


JOB_NAME = "retention"
LOCK_NAME = os.getenv("RETENTION_LOCK_NAME", "retention-job")

_state_lock = threading.Lock()
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
    "owner": None,
    "thread_alive": False,
}
_recovery_lock = threading.Lock()
_recovery_state = {
    "enabled": True,
    "window_seconds": 900,
    "max_attempts": 3,
    "cooldown_seconds": 120,
    "backoff_seconds": 2,
    "circuit_breaker_threshold": 5,
    "circuit_breaker_seconds": 600,
    "attempts_in_window": 0,
    "consecutive_failures": 0,
    "window_started_at": None,
    "last_attempt_at": None,
    "last_success_at": None,
    "last_failure_at": None,
    "last_error": None,
    "circuit_open_until": None,
}


def _utcnow_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _to_bool(value: str | None, default: bool = True) -> bool:
    if value is None:
        return default
    normalized = str(value).strip().lower()
    return normalized in {"1", "true", "yes", "y", "on"}


def _to_int(value: str | None, default: int, minimum: int) -> int:
    try:
        return max(minimum, int(str(value or default)))
    except Exception:
        return max(minimum, int(default))


def _configured_interval_seconds() -> int:
    return _to_int(os.getenv("RETENTION_JOB_INTERVAL_SECONDS", "300"), default=300, minimum=30)


def _configured_retention_days() -> dict:
    return {
        "receipts": _to_int(
            os.getenv("RECEIPTS_RETENTION_DAYS", str(DEFAULT_RECEIPTS_RETENTION_DAYS)),
            default=DEFAULT_RECEIPTS_RETENTION_DAYS,
            minimum=1,
        ),
        "activity": _to_int(
            os.getenv("ACTIVITY_RETENTION_DAYS", str(DEFAULT_ACTIVITY_RETENTION_DAYS)),
            default=DEFAULT_ACTIVITY_RETENTION_DAYS,
            minimum=1,
        ),
    }


def _configured_lock_ttl_seconds(interval_seconds: int) -> int:
    default_ttl = max(60, interval_seconds * 2)
    return _to_int(os.getenv("RETENTION_LOCK_TTL_SECONDS", str(default_ttl)), default=default_ttl, minimum=30)


def _configured_heartbeat_seconds(interval_seconds: int, ttl_seconds: int) -> int:
    default_heartbeat = max(10, min(interval_seconds, max(10, ttl_seconds // 3)))
    return _to_int(
        os.getenv("RETENTION_HEARTBEAT_SECONDS", str(default_heartbeat)),
        default=default_heartbeat,
        minimum=5,
    )


def _configured_worker_id() -> str:
    explicit = str(os.getenv("RETENTION_WORKER_ID", "")).strip()
    if explicit:
        return explicit
    return f"{socket.gethostname()}:{os.getpid()}"


def _configured_self_healing_enabled() -> bool:
    return _to_bool(os.getenv("RETENTION_SELF_HEALING_ENABLED", "1"), default=True)


def _configured_recovery_window_seconds() -> int:
    return _to_int(os.getenv("RETENTION_RECOVERY_WINDOW_SECONDS", "900"), default=900, minimum=60)


def _configured_recovery_max_attempts() -> int:
    return _to_int(os.getenv("RETENTION_RECOVERY_MAX_ATTEMPTS", "3"), default=3, minimum=1)


def _configured_recovery_cooldown_seconds() -> int:
    return _to_int(os.getenv("RETENTION_RECOVERY_COOLDOWN_SECONDS", "120"), default=120, minimum=5)


def _configured_recovery_backoff_seconds() -> int:
    return _to_int(os.getenv("RETENTION_RECOVERY_BACKOFF_SECONDS", "2"), default=2, minimum=1)


def _configured_recovery_circuit_breaker_threshold() -> int:
    return _to_int(os.getenv("RETENTION_RECOVERY_CIRCUIT_BREAKER_THRESHOLD", "5"), default=5, minimum=1)


def _configured_recovery_circuit_breaker_seconds() -> int:
    return _to_int(os.getenv("RETENTION_RECOVERY_CIRCUIT_BREAKER_SECONDS", "600"), default=600, minimum=30)


def _iso(value) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return None
    return str(value)


def _parse_iso_to_epoch(value) -> float:
    if not value:
        return 0.0
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def _self_healing_snapshot() -> dict:
    with _recovery_lock:
        snapshot = deepcopy(_recovery_state)
    snapshot["enabled"] = _configured_self_healing_enabled()
    snapshot["window_seconds"] = _configured_recovery_window_seconds()
    snapshot["max_attempts"] = _configured_recovery_max_attempts()
    snapshot["cooldown_seconds"] = _configured_recovery_cooldown_seconds()
    snapshot["backoff_seconds"] = _configured_recovery_backoff_seconds()
    snapshot["circuit_breaker_threshold"] = _configured_recovery_circuit_breaker_threshold()
    snapshot["circuit_breaker_seconds"] = _configured_recovery_circuit_breaker_seconds()
    return snapshot


def _register_retention_failure(error: str) -> None:
    now_iso = _utcnow_iso()
    with _recovery_lock:
        _recovery_state["last_failure_at"] = now_iso
        _recovery_state["last_error"] = str(error)
        _recovery_state["consecutive_failures"] = int(_recovery_state.get("consecutive_failures") or 0) + 1


def _register_retention_recovery_success() -> None:
    now_iso = _utcnow_iso()
    with _recovery_lock:
        _recovery_state["last_success_at"] = now_iso
        _recovery_state["last_error"] = None
        _recovery_state["consecutive_failures"] = 0


def _attempt_retention_recovery(
    owner_id: str | None,
    receipts_retention_days: int,
    activity_retention_days: int,
    cause: str,
) -> dict | None:
    now = time.time()
    enabled = _configured_self_healing_enabled()
    window_seconds = _configured_recovery_window_seconds()
    max_attempts = _configured_recovery_max_attempts()
    cooldown_seconds = _configured_recovery_cooldown_seconds()
    backoff_seconds = _configured_recovery_backoff_seconds()
    circuit_breaker_threshold = _configured_recovery_circuit_breaker_threshold()
    circuit_breaker_seconds = _configured_recovery_circuit_breaker_seconds()

    if not enabled:
        return None

    with _recovery_lock:
        _recovery_state["enabled"] = enabled
        _recovery_state["window_seconds"] = window_seconds
        _recovery_state["max_attempts"] = max_attempts
        _recovery_state["cooldown_seconds"] = cooldown_seconds
        _recovery_state["backoff_seconds"] = backoff_seconds
        _recovery_state["circuit_breaker_threshold"] = circuit_breaker_threshold
        _recovery_state["circuit_breaker_seconds"] = circuit_breaker_seconds

        circuit_open_until = _parse_iso_to_epoch(_recovery_state.get("circuit_open_until"))
        if circuit_open_until and now < circuit_open_until:
            log_incident(
                source="retention",
                event_type="retention_recovery_skipped",
                severity="medium",
                title="Recuperação automática bloqueada por circuit-breaker",
                details={"reason": "circuit_open", "until": _recovery_state.get("circuit_open_until")},
            )
            return None

        window_started = _parse_iso_to_epoch(_recovery_state.get("window_started_at"))
        if not window_started or now - window_started > window_seconds:
            _recovery_state["window_started_at"] = _utcnow_iso()
            _recovery_state["attempts_in_window"] = 0

        last_attempt = _parse_iso_to_epoch(_recovery_state.get("last_attempt_at"))
        if last_attempt and now - last_attempt < cooldown_seconds:
            log_incident(
                source="retention",
                event_type="retention_recovery_skipped",
                severity="low",
                title="Recuperação automática em cooldown",
                details={"reason": "cooldown", "cooldown_seconds": cooldown_seconds},
            )
            return None

        attempts_in_window = int(_recovery_state.get("attempts_in_window") or 0)
        if attempts_in_window >= max_attempts:
            log_incident(
                source="retention",
                event_type="retention_recovery_skipped",
                severity="medium",
                title="Recuperação automática bloqueada por budget",
                details={"reason": "budget_exceeded", "max_attempts": max_attempts, "window_seconds": window_seconds},
            )
            return None

        _recovery_state["attempts_in_window"] = attempts_in_window + 1
        _recovery_state["last_attempt_at"] = _utcnow_iso()
        consecutive_failures = int(_recovery_state.get("consecutive_failures") or 0)
        if consecutive_failures >= circuit_breaker_threshold:
            open_until = datetime.fromtimestamp(now + circuit_breaker_seconds, tz=timezone.utc).isoformat()
            _recovery_state["circuit_open_until"] = open_until
            log_incident(
                source="retention",
                event_type="retention_recovery_skipped",
                severity="high",
                title="Circuit-breaker aberto para recuperação de retenção",
                details={
                    "reason": "circuit_opened",
                    "threshold": circuit_breaker_threshold,
                    "open_seconds": circuit_breaker_seconds,
                    "open_until": open_until,
                },
            )
            return None

    log_incident(
        source="retention",
        event_type="retention_recovery_attempt",
        severity="medium",
        title="Tentativa de recuperação automática da retenção",
        details={"cause": cause, "owner": owner_id, "backoff_seconds": backoff_seconds},
    )
    time.sleep(backoff_seconds)
    recovered = run_retention_cycle(
        receipts_retention_days=receipts_retention_days,
        activity_retention_days=activity_retention_days,
        owner_id=owner_id,
        enable_recovery=False,
    )
    if recovered.get("status") == "ok":
        _register_retention_recovery_success()
        log_incident(
            source="retention",
            event_type="retention_recovery_success",
            severity="low",
            title="Recuperação automática da retenção concluída",
            details={"cause": cause, "owner": owner_id},
        )
        recovered["recovered"] = True
        return recovered

    log_incident(
        source="retention",
        event_type="retention_recovery_failed",
        severity="high",
        title="Recuperação automática da retenção falhou",
        details={"cause": cause, "owner": owner_id, "error": recovered.get("error")},
    )
    return recovered


def _status_from_row(row) -> dict:
    return {
        "enabled": bool(row[0]),
        "running": bool(row[1]),
        "interval_seconds": int(row[2] or 300),
        "retention_days": {
            "receipts": int(row[3] or DEFAULT_RECEIPTS_RETENTION_DAYS),
            "activity": int(row[4] or DEFAULT_ACTIVITY_RETENTION_DAYS),
        },
        "owner": row[5],
        "last_run_at": _iso(row[6]),
        "last_success_at": _iso(row[7]),
        "last_duration_ms": int(row[8] or 0),
        "last_deleted": {
            "receipts": int(row[9] or 0),
            "activity": int(row[10] or 0),
            "total": int(row[11] or 0),
        },
        "last_error": row[12],
        "run_count": int(row[13] or 0),
        "fail_count": int(row[14] or 0),
    }


def _read_status_db() -> dict | None:
    query = """
        SELECT enabled, running, interval_seconds, retention_receipts_days, retention_activity_days, owner_id,
               last_run_at, last_success_at, last_duration_ms, last_deleted_receipts, last_deleted_activity,
               last_deleted_total, last_error, run_count, fail_count
        FROM retention_job_status
        WHERE job_name = %s
        LIMIT 1;
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (JOB_NAME,))
                row = cur.fetchone()
        if row:
            return _status_from_row(row)
    except Exception:
        return None
    return None


def _write_status_db(status: dict) -> None:
    query = """
        INSERT INTO retention_job_status (
          job_name, enabled, running, interval_seconds, retention_receipts_days, retention_activity_days,
          owner_id, last_run_at, last_success_at, last_duration_ms, last_deleted_receipts,
          last_deleted_activity, last_deleted_total, last_error, run_count, fail_count, updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (job_name) DO UPDATE
        SET enabled = EXCLUDED.enabled,
            running = EXCLUDED.running,
            interval_seconds = EXCLUDED.interval_seconds,
            retention_receipts_days = EXCLUDED.retention_receipts_days,
            retention_activity_days = EXCLUDED.retention_activity_days,
            owner_id = EXCLUDED.owner_id,
            last_run_at = EXCLUDED.last_run_at,
            last_success_at = EXCLUDED.last_success_at,
            last_duration_ms = EXCLUDED.last_duration_ms,
            last_deleted_receipts = EXCLUDED.last_deleted_receipts,
            last_deleted_activity = EXCLUDED.last_deleted_activity,
            last_deleted_total = EXCLUDED.last_deleted_total,
            last_error = EXCLUDED.last_error,
            run_count = EXCLUDED.run_count,
            fail_count = EXCLUDED.fail_count,
            updated_at = NOW();
    """
    payload = (
        JOB_NAME,
        bool(status.get("enabled", True)),
        bool(status.get("running", False)),
        int(status.get("interval_seconds") or 300),
        int(status.get("retention_days", {}).get("receipts") or DEFAULT_RECEIPTS_RETENTION_DAYS),
        int(status.get("retention_days", {}).get("activity") or DEFAULT_ACTIVITY_RETENTION_DAYS),
        status.get("owner"),
        status.get("last_run_at"),
        status.get("last_success_at"),
        int(status.get("last_duration_ms") or 0),
        int(status.get("last_deleted", {}).get("receipts") or 0),
        int(status.get("last_deleted", {}).get("activity") or 0),
        int(status.get("last_deleted", {}).get("total") or 0),
        status.get("last_error"),
        int(status.get("run_count") or 0),
        int(status.get("fail_count") or 0),
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, payload)
        conn.commit()


def _merge_state_update(update: dict) -> dict:
    with _state_lock:
        next_state = deepcopy(_state)
        for key, value in update.items():
            next_state[key] = value
        _state.update(next_state)
    try:
        _write_status_db(next_state)
    except Exception:
        pass
    return deepcopy(next_state)


def _read_state() -> dict:
    db_status = _read_status_db()
    if db_status:
        with _state_lock:
            _state.update(db_status)
            snapshot = deepcopy(_state)
        return snapshot
    with _state_lock:
        return deepcopy(_state)


def get_retention_job_status() -> dict:
    snapshot = _read_state()
    lock_info = get_lock(LOCK_NAME)
    if lock_info and lock_info.get("owner_id"):
        snapshot["owner"] = lock_info.get("owner_id")
    snapshot["enabled"] = _to_bool(os.getenv("RETENTION_JOB_ENABLED", "1"), default=True)
    snapshot["thread_alive"] = False
    snapshot["self_healing"] = _self_healing_snapshot()
    return snapshot


def run_retention_cycle(
    receipts_retention_days: int | None = None,
    activity_retention_days: int | None = None,
    owner_id: str | None = None,
    enable_recovery: bool = True,
) -> dict:
    started = time.time()
    base = _read_state()
    receipts_days = max(1, int(receipts_retention_days or _configured_retention_days()["receipts"]))
    activity_days = max(1, int(activity_retention_days or _configured_retention_days()["activity"]))

    running_state = {
        **base,
        "running": True,
        "owner": owner_id or base.get("owner"),
        "retention_days": {"receipts": receipts_days, "activity": activity_days},
        "last_run_at": _utcnow_iso(),
        "run_count": int(base.get("run_count") or 0) + 1,
        "last_error": None,
    }
    _merge_state_update(running_state)

    try:
        deleted_receipts = prune_old_receipt_events(retention_days=receipts_days)
        deleted_activity = prune_old_activity_events(retention_days=activity_days)
        deleted_total = deleted_receipts + deleted_activity
        duration_ms = int((time.time() - started) * 1000)
        done_state = {
            **_read_state(),
            "running": True,
            "owner": owner_id or base.get("owner"),
            "last_success_at": _utcnow_iso(),
            "last_duration_ms": duration_ms,
            "last_deleted": {"receipts": deleted_receipts, "activity": deleted_activity, "total": deleted_total},
            "last_error": None,
        }
        _merge_state_update(done_state)
        return {
            "status": "ok",
            "deleted": {"receipts": deleted_receipts, "activity": deleted_activity, "total": deleted_total},
            "duration_ms": duration_ms,
        }
    except Exception as exc:
        duration_ms = int((time.time() - started) * 1000)
        _register_retention_failure(str(exc))
        log_incident(
            source="retention",
            event_type="retention_cycle_error",
            severity="high",
            title="Falha no ciclo de retenção",
            details={"error": str(exc), "duration_ms": duration_ms, "owner": owner_id},
        )
        failed_state = {
            **_read_state(),
            "running": True,
            "owner": owner_id or base.get("owner"),
            "last_duration_ms": duration_ms,
            "last_error": str(exc),
            "fail_count": int(base.get("fail_count") or 0) + 1,
        }
        _merge_state_update(failed_state)
        if enable_recovery:
            recovered = _attempt_retention_recovery(
                owner_id=owner_id,
                receipts_retention_days=receipts_days,
                activity_retention_days=activity_days,
                cause=str(exc),
            )
            if isinstance(recovered, dict) and recovered.get("status") == "ok":
                return recovered
        return {"status": "error", "error": str(exc), "duration_ms": duration_ms}


def start_retention_job() -> dict:
    enabled = _to_bool(os.getenv("RETENTION_JOB_ENABLED", "1"), default=True)
    status = _merge_state_update(
        {
            **_read_state(),
            "enabled": enabled,
            "running": False,
            "owner": None,
            "interval_seconds": _configured_interval_seconds(),
            "retention_days": _configured_retention_days(),
            "thread_alive": False,
        }
    )
    return status


def stop_retention_job() -> dict:
    with _recovery_lock:
        _recovery_state["attempts_in_window"] = 0
        _recovery_state["consecutive_failures"] = 0
        _recovery_state["window_started_at"] = None
        _recovery_state["last_attempt_at"] = None
        _recovery_state["last_success_at"] = None
        _recovery_state["last_failure_at"] = None
        _recovery_state["last_error"] = None
        _recovery_state["circuit_open_until"] = None
    status = _merge_state_update({**_read_state(), "running": False, "thread_alive": False})
    return status


def run_retention_worker(run_once: bool = False, stop_event: threading.Event | None = None) -> dict:
    enabled = _to_bool(os.getenv("RETENTION_JOB_ENABLED", "1"), default=True)
    interval_seconds = _configured_interval_seconds()
    retention_days = _configured_retention_days()
    worker_id = _configured_worker_id()
    ttl_seconds = _configured_lock_ttl_seconds(interval_seconds)
    heartbeat_seconds = _configured_heartbeat_seconds(interval_seconds, ttl_seconds)

    if not enabled:
        return _merge_state_update(
            {
                **_read_state(),
                "enabled": False,
                "running": False,
                "owner": None,
                "interval_seconds": interval_seconds,
                "retention_days": retention_days,
            }
        )

    _merge_state_update(
        {
            **_read_state(),
            "enabled": True,
            "running": True,
            "owner": worker_id,
            "interval_seconds": interval_seconds,
            "retention_days": retention_days,
        }
    )

    loops = 0
    while True:
        lock = acquire_lock(LOCK_NAME, worker_id, ttl_seconds)
        if lock.get("acquired"):
            run_retention_cycle(
                receipts_retention_days=retention_days["receipts"],
                activity_retention_days=retention_days["activity"],
                owner_id=worker_id,
            )
            renew_lock(LOCK_NAME, worker_id, ttl_seconds)
        else:
            current_lock = lock.get("lock") or {}
            log_incident(
                source="retention",
                event_type="retention_lock_not_acquired",
                severity="low",
                title="Worker em standby por lock ativo",
                details={"owner": current_lock.get("owner_id"), "worker": worker_id},
            )
            _merge_state_update(
                {
                    **_read_state(),
                    "enabled": True,
                    "running": True,
                    "owner": current_lock.get("owner_id"),
                    "interval_seconds": interval_seconds,
                    "retention_days": retention_days,
                }
            )

        loops += 1
        if run_once:
            break

        total_waited = 0
        while total_waited < interval_seconds:
            if stop_event and stop_event.wait(timeout=1.0):
                release_lock(LOCK_NAME, worker_id)
                return _merge_state_update({**_read_state(), "running": False, "owner": None})
            total_waited += 1
            if total_waited % heartbeat_seconds == 0:
                renew_lock(LOCK_NAME, worker_id, ttl_seconds)

    release_lock(LOCK_NAME, worker_id)
    return _merge_state_update({**_read_state(), "running": False, "owner": None})
