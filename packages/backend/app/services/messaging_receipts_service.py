from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone


_RECEIPT_EVENTS: list[dict] = []
_MAX_EVENTS = 500


def register_receipt_event(event: dict) -> dict:
    normalized = deepcopy(event)
    normalized["received_at"] = datetime.now(tz=timezone.utc).isoformat()
    _RECEIPT_EVENTS.append(normalized)
    if len(_RECEIPT_EVENTS) > _MAX_EVENTS:
        del _RECEIPT_EVENTS[:-_MAX_EVENTS]
    return deepcopy(normalized)


def list_receipt_events(limit: int = 20) -> list[dict]:
    capped = max(1, min(limit, 100))
    return [deepcopy(item) for item in _RECEIPT_EVENTS[-capped:]][::-1]


def clear_receipt_events() -> None:
    _RECEIPT_EVENTS.clear()
