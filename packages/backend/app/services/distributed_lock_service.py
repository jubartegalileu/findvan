from __future__ import annotations

from datetime import datetime
import threading

from ..db import get_connection


_MEMORY_LOCK = threading.Lock()
_MEMORY_LOCKS: dict[str, dict] = {}


def _iso(value) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return None
    return str(value)


def _lock_from_row(row) -> dict:
    return {
        "lock_name": row[0],
        "owner_id": row[1],
        "acquired_at": _iso(row[2]),
        "heartbeat_at": _iso(row[3]),
        "expires_at": _iso(row[4]),
    }


def _memory_now_iso() -> str:
    return datetime.now().astimezone().isoformat()


def acquire_lock(lock_name: str, owner_id: str, ttl_seconds: int) -> dict:
    lock_name = str(lock_name or "retention-job")
    owner_id = str(owner_id or "unknown-owner")
    ttl_seconds = max(15, int(ttl_seconds or 60))

    query = """
        INSERT INTO distributed_job_locks (lock_name, owner_id, acquired_at, heartbeat_at, expires_at)
        VALUES (%s, %s, NOW(), NOW(), NOW() + (%s::text || ' seconds')::interval)
        ON CONFLICT (lock_name) DO UPDATE
        SET
          owner_id = EXCLUDED.owner_id,
          acquired_at = CASE
            WHEN distributed_job_locks.owner_id = EXCLUDED.owner_id THEN distributed_job_locks.acquired_at
            ELSE NOW()
          END,
          heartbeat_at = NOW(),
          expires_at = NOW() + (%s::text || ' seconds')::interval
        WHERE distributed_job_locks.owner_id = EXCLUDED.owner_id
           OR distributed_job_locks.expires_at <= NOW()
        RETURNING lock_name, owner_id, acquired_at, heartbeat_at, expires_at;
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (lock_name, owner_id, str(ttl_seconds), str(ttl_seconds)))
                row = cur.fetchone()
            conn.commit()
        if row:
            return {"acquired": True, "lock": _lock_from_row(row)}
        current = get_lock(lock_name)
        return {"acquired": False, "lock": current}
    except Exception:
        with _MEMORY_LOCK:
            existing = _MEMORY_LOCKS.get(lock_name)
            if existing and existing.get("owner_id") != owner_id:
                return {"acquired": False, "lock": dict(existing)}
            now_iso = _memory_now_iso()
            lock_payload = {
                "lock_name": lock_name,
                "owner_id": owner_id,
                "acquired_at": existing.get("acquired_at") if existing and existing.get("owner_id") == owner_id else now_iso,
                "heartbeat_at": now_iso,
                "expires_at": now_iso,
            }
            _MEMORY_LOCKS[lock_name] = lock_payload
            return {"acquired": True, "lock": dict(lock_payload)}


def renew_lock(lock_name: str, owner_id: str, ttl_seconds: int) -> dict:
    lock_name = str(lock_name or "retention-job")
    owner_id = str(owner_id or "unknown-owner")
    ttl_seconds = max(15, int(ttl_seconds or 60))

    query = """
        UPDATE distributed_job_locks
        SET heartbeat_at = NOW(),
            expires_at = NOW() + (%s::text || ' seconds')::interval
        WHERE lock_name = %s AND owner_id = %s
        RETURNING lock_name, owner_id, acquired_at, heartbeat_at, expires_at;
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (str(ttl_seconds), lock_name, owner_id))
                row = cur.fetchone()
            conn.commit()
        if row:
            return {"renewed": True, "lock": _lock_from_row(row)}
        return {"renewed": False, "lock": get_lock(lock_name)}
    except Exception:
        with _MEMORY_LOCK:
            existing = _MEMORY_LOCKS.get(lock_name)
            if not existing or existing.get("owner_id") != owner_id:
                return {"renewed": False, "lock": dict(existing) if existing else None}
            existing["heartbeat_at"] = _memory_now_iso()
            existing["expires_at"] = existing["heartbeat_at"]
            _MEMORY_LOCKS[lock_name] = existing
            return {"renewed": True, "lock": dict(existing)}


def release_lock(lock_name: str, owner_id: str) -> bool:
    lock_name = str(lock_name or "retention-job")
    owner_id = str(owner_id or "unknown-owner")
    query = "DELETE FROM distributed_job_locks WHERE lock_name = %s AND owner_id = %s;"
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (lock_name, owner_id))
                deleted = cur.rowcount or 0
            conn.commit()
        return deleted > 0
    except Exception:
        with _MEMORY_LOCK:
            existing = _MEMORY_LOCKS.get(lock_name)
            if existing and existing.get("owner_id") == owner_id:
                _MEMORY_LOCKS.pop(lock_name, None)
                return True
        return False


def get_lock(lock_name: str) -> dict | None:
    lock_name = str(lock_name or "retention-job")
    query = """
        SELECT lock_name, owner_id, acquired_at, heartbeat_at, expires_at
        FROM distributed_job_locks
        WHERE lock_name = %s
        LIMIT 1;
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (lock_name,))
                row = cur.fetchone()
        if row:
            return _lock_from_row(row)
        return None
    except Exception:
        with _MEMORY_LOCK:
            existing = _MEMORY_LOCKS.get(lock_name)
            return dict(existing) if existing else None
