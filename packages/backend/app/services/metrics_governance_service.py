from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import threading


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

_lock = threading.Lock()
_active_thresholds = deepcopy(DEFAULT_THRESHOLDS)
_history: list[dict] = []


def _utcnow_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def get_active_thresholds() -> dict:
    with _lock:
        return deepcopy(_active_thresholds)


def get_threshold_history(limit: int = 20) -> list[dict]:
    capped = max(1, min(limit, 100))
    with _lock:
        return deepcopy(_history[:capped])


def update_thresholds(changes: dict, author: str = "system") -> dict:
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
            "diffs": diffs,
        }
        _history.insert(0, audit)
        _history[:] = _history[:200]
    return {"updated": True, "thresholds": after, "audit": audit}
