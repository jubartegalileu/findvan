from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone


_RECEIPT_EVENTS: list[dict] = []
_RECEIPT_INDEX: dict[str, dict] = {}
_MAX_EVENTS = 500


def _idempotency_key(event: dict) -> str:
    external_id = str(event.get("external_id") or "").strip().lower()
    provider = str(event.get("provider") or "").strip().lower()
    event_type = str(event.get("event_type") or "").strip().lower()
    return f"{external_id}|{provider}|{event_type}"


def register_receipt_event(event: dict) -> tuple[dict, bool]:
    normalized = deepcopy(event)
    key = _idempotency_key(normalized)
    existing = _RECEIPT_INDEX.get(key)
    if existing:
        return deepcopy(existing), True

    normalized["received_at"] = datetime.now(tz=timezone.utc).isoformat()
    normalized["idempotency_key"] = key
    _RECEIPT_EVENTS.append(normalized)
    _RECEIPT_INDEX[key] = normalized
    if len(_RECEIPT_EVENTS) > _MAX_EVENTS:
        removed = _RECEIPT_EVENTS[:-_MAX_EVENTS]
        del _RECEIPT_EVENTS[:-_MAX_EVENTS]
        for item in removed:
            _RECEIPT_INDEX.pop(item.get("idempotency_key"), None)
    return deepcopy(normalized), False


def list_receipt_events(limit: int = 20) -> list[dict]:
    capped = max(1, min(limit, 100))
    return [deepcopy(item) for item in _RECEIPT_EVENTS[-capped:]][::-1]


def clear_receipt_events() -> None:
    _RECEIPT_EVENTS.clear()
    _RECEIPT_INDEX.clear()
