from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import json

from ..db import get_connection


_RECEIPT_EVENTS: list[dict] = []
_RECEIPT_INDEX: dict[str, dict] = {}
_MAX_EVENTS = 500


def _idempotency_key(event: dict) -> str:
    external_id = str(event.get("external_id") or "").strip().lower()
    provider = str(event.get("provider") or "").strip().lower()
    event_type = str(event.get("event_type") or "").strip().lower()
    return f"{external_id}|{provider}|{event_type}"


def register_receipt_event(event: dict) -> tuple[dict, bool]:
    try:
        return _register_receipt_event_db(event)
    except Exception:
        return _register_receipt_event_memory(event)


def _register_receipt_event_db(event: dict) -> tuple[dict, bool]:
    normalized = deepcopy(event)
    key = _idempotency_key(normalized)
    metadata = normalized.get("metadata") if isinstance(normalized.get("metadata"), dict) else {}
    occurred_at = normalized.get("occurred_at")
    if isinstance(occurred_at, str):
        occurred_at = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))
    if not isinstance(occurred_at, datetime):
        occurred_at = datetime.now(tz=timezone.utc)

    insert_query = """
        INSERT INTO messaging_receipts (
          version, event_type, external_id, provider, lead_id, campaign_id, destination, occurred_at, status_detail, metadata
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
        ON CONFLICT (external_id, provider, event_type) DO NOTHING
        RETURNING id, version, event_type, external_id, provider, lead_id, campaign_id, destination, occurred_at, status_detail, metadata, received_at;
    """
    select_existing_query = """
        SELECT id, version, event_type, external_id, provider, lead_id, campaign_id, destination, occurred_at, status_detail, metadata, received_at
        FROM messaging_receipts
        WHERE external_id = %s AND provider = %s AND event_type = %s
        LIMIT 1;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                insert_query,
                (
                    normalized.get("version") or "1.1.0",
                    normalized.get("event_type"),
                    normalized.get("external_id"),
                    normalized.get("provider"),
                    normalized.get("lead_id"),
                    normalized.get("campaign_id"),
                    normalized.get("to"),
                    occurred_at,
                    normalized.get("status_detail"),
                    json.dumps(metadata),
                ),
            )
            row = cur.fetchone()
            deduplicated = row is None
            if deduplicated:
                cur.execute(
                    select_existing_query,
                    (
                        normalized.get("external_id"),
                        normalized.get("provider"),
                        normalized.get("event_type"),
                    ),
                )
                row = cur.fetchone()
            conn.commit()

    if not row:
        raise RuntimeError("Failed to persist receipt event.")
    return _row_to_event(row, key), deduplicated


def _register_receipt_event_memory(event: dict) -> tuple[dict, bool]:
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
    try:
        return _list_receipt_events_db(limit)
    except Exception:
        return _list_receipt_events_memory(limit)


def _list_receipt_events_db(limit: int = 20) -> list[dict]:
    capped = max(1, min(limit, 100))
    query = """
        SELECT id, version, event_type, external_id, provider, lead_id, campaign_id, destination, occurred_at, status_detail, metadata, received_at
        FROM messaging_receipts
        ORDER BY id DESC
        LIMIT %s;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (capped,))
            rows = cur.fetchall()
    return [_row_to_event(row) for row in rows]


def _list_receipt_events_memory(limit: int = 20) -> list[dict]:
    capped = max(1, min(limit, 100))
    return [deepcopy(item) for item in _RECEIPT_EVENTS[-capped:]][::-1]


def clear_receipt_events() -> None:
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM messaging_receipts;")
            conn.commit()
    except Exception:
        pass

    _RECEIPT_EVENTS.clear()
    _RECEIPT_INDEX.clear()


def _iso(value) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value or "")


def _row_to_event(row, fallback_key: str | None = None) -> dict:
    metadata = row[10]
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except Exception:
            metadata = {}
    if not isinstance(metadata, dict):
        metadata = {}

    key = fallback_key or f"{str(row[3]).strip().lower()}|{str(row[4]).strip().lower()}|{str(row[2]).strip().lower()}"
    return {
        "id": row[0],
        "version": row[1],
        "event_type": row[2],
        "external_id": row[3],
        "provider": row[4],
        "lead_id": row[5],
        "campaign_id": row[6],
        "to": row[7],
        "occurred_at": _iso(row[8]),
        "status_detail": row[9],
        "metadata": metadata,
        "received_at": _iso(row[11]),
        "idempotency_key": key,
    }
