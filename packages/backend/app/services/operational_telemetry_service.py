from __future__ import annotations

from datetime import datetime
import json

from ..db import get_connection


def _iso(value) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value or "")


def log_incident(
    source: str,
    event_type: str,
    title: str,
    severity: str = "medium",
    details: dict | None = None,
) -> None:
    query = """
        INSERT INTO operational_incidents (source, event_type, severity, title, details)
        VALUES (%s, %s, %s, %s, %s::jsonb);
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    query,
                    (
                        str(source or "unknown"),
                        str(event_type or "unknown"),
                        str(severity or "medium"),
                        str(title or "Incident"),
                        json.dumps(details or {}),
                    ),
                )
            conn.commit()
    except Exception:
        return


def list_incidents(limit: int = 15, offset: int = 0) -> list[dict]:
    capped_limit = max(1, min(limit, 100))
    safe_offset = max(0, int(offset or 0))
    query = """
        SELECT id, source, event_type, severity, title, details, created_at
        FROM operational_incidents
        ORDER BY created_at DESC, id DESC
        LIMIT %s OFFSET %s;
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (capped_limit, safe_offset))
                rows = cur.fetchall()
        incidents = []
        for row in rows:
            incidents.append(
                {
                    "id": row[0],
                    "source": row[1],
                    "event_type": row[2],
                    "severity": row[3],
                    "title": row[4],
                    "details": row[5] if isinstance(row[5], dict) else {},
                    "created_at": _iso(row[6]),
                }
            )
        return incidents
    except Exception:
        return []
