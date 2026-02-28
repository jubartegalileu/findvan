from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import json
import threading

from ..db import get_connection


DEFAULT_THRESHOLDS = {
    "delivery_rate_critical_lt": 70,
    "delivery_rate_high_lt": 80,
    "delivery_rate_medium_lt": 90,
    "failure_rate_critical_gte": 20,
    "failure_rate_high_gte": 10,
    "failure_rate_medium_gte": 5,
    "reply_rate_medium_lt": 5,
    "latency_critical_gt_min": 120,
    "latency_high_gt_min": 60,
    "block_rate_critical_gt": 5,
    "block_rate_high_gt": 3,
}

STATE_KEY = "global"

_lock = threading.Lock()
_active_thresholds = deepcopy(DEFAULT_THRESHOLDS)
_history: list[dict] = []


def _utcnow_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _sync_from_db() -> None:
    state_query = """
        SELECT thresholds
        FROM metrics_governance_state
        WHERE state_key = %s
        LIMIT 1;
    """
    history_query = """
        SELECT audit_id, author, created_at, diffs, source
        FROM metrics_governance_audit
        WHERE state_key = %s
        ORDER BY created_at DESC, id DESC
        LIMIT 200;
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(state_query, (STATE_KEY,))
                state_row = cur.fetchone()
                cur.execute(history_query, (STATE_KEY,))
                history_rows = cur.fetchall()
    except Exception:
        return

    with _lock:
        if state_row and isinstance(state_row[0], dict):
            _active_thresholds.update({**DEFAULT_THRESHOLDS, **state_row[0]})
        if history_rows:
            normalized = []
            for row in history_rows:
                diffs = row[3] if isinstance(row[3], list) else []
                normalized.append(
                    {
                        "id": row[0],
                        "timestamp": row[2].isoformat() if hasattr(row[2], "isoformat") else _utcnow_iso(),
                        "author": row[1],
                        "source": row[4] or "dashboard",
                        "diffs": diffs,
                    }
                )
            _history[:] = normalized


def _persist_state(thresholds: dict, audit: dict | None = None) -> None:
    upsert_state_query = """
        INSERT INTO metrics_governance_state (state_key, thresholds, updated_at)
        VALUES (%s, %s::jsonb, NOW())
        ON CONFLICT (state_key) DO UPDATE
        SET thresholds = EXCLUDED.thresholds,
            updated_at = NOW();
    """
    insert_audit_query = """
        INSERT INTO metrics_governance_audit (state_key, audit_id, author, source, created_at, diffs)
        VALUES (%s, %s, %s, %s, %s, %s::jsonb);
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(upsert_state_query, (STATE_KEY, json.dumps(thresholds)))
            if audit:
                cur.execute(
                    insert_audit_query,
                    (
                        STATE_KEY,
                        audit.get("id"),
                        audit.get("author") or "system",
                        audit.get("source") or "dashboard",
                        audit.get("timestamp"),
                        json.dumps(audit.get("diffs") or []),
                    ),
                )
        conn.commit()


def get_active_thresholds() -> dict:
    _sync_from_db()
    with _lock:
        return deepcopy(_active_thresholds)


def get_threshold_history(limit: int = 20) -> list[dict]:
    _sync_from_db()
    capped = max(1, min(limit, 100))
    with _lock:
        return deepcopy(_history[:capped])


def update_thresholds(changes: dict, author: str = "system", source: str = "dashboard") -> dict:
    normalized_changes = {}
    for key, value in (changes or {}).items():
        if key not in DEFAULT_THRESHOLDS:
            continue
        try:
            normalized_changes[key] = float(value)
        except Exception:
            continue

    if not normalized_changes:
        return {"updated": False, "thresholds": get_active_thresholds(), "audit": None}

    with _lock:
        before = deepcopy(_active_thresholds)
        for key, value in normalized_changes.items():
            _active_thresholds[key] = value
        after = deepcopy(_active_thresholds)

        diffs = []
        for key, new_value in normalized_changes.items():
            old_value = before.get(key)
            if old_value != new_value:
                diffs.append({"key": key, "from": old_value, "to": new_value})

        audit = {
            "id": f"threshold-audit-{int(datetime.now(tz=timezone.utc).timestamp() * 1000)}",
            "timestamp": _utcnow_iso(),
            "author": author,
            "source": source,
            "diffs": diffs,
        }
        _history.insert(0, audit)
        _history[:] = _history[:200]

    try:
        _persist_state(after, audit=audit)
    except Exception:
        pass
    return {"updated": True, "thresholds": after, "audit": audit}


def clear_metrics_governance_state() -> None:
    with _lock:
        _active_thresholds.clear()
        _active_thresholds.update(deepcopy(DEFAULT_THRESHOLDS))
        _history.clear()
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM metrics_governance_audit WHERE state_key = %s;", (STATE_KEY,))
                cur.execute("DELETE FROM metrics_governance_state WHERE state_key = %s;", (STATE_KEY,))
            conn.commit()
    except Exception:
        pass
