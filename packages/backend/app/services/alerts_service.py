from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import json
import os
import threading
import time
from urllib.error import URLError
from urllib.request import Request, urlopen

from ..db import get_connection
from .operational_telemetry_service import log_incident


ALERT_CONTRACT_VERSION = "1.0.0"
MAX_LOCAL_ALERTS = 50
STATE_KEY = "global"

_state_lock = threading.Lock()
_dispatch_lock = threading.Lock()

_state = {
    "suppressed_count": 0,
    "queued_count": 0,
    "sent_count": 0,
    "fallback_count": 0,
    "last_error": None,
    "last_sent_at": None,
    "last_fallback_at": None,
    "last_suppressed_at": None,
    "recent": [],
    "cooldown_until_by_key": {},
}


def _utcnow_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _to_int(name: str, default: int) -> int:
    raw = os.getenv(name, str(default))
    try:
        return int(raw)
    except Exception:
        return default


def _get_alert_webhook_url() -> str:
    return str(os.getenv("ALERT_WEBHOOK_URL", "")).strip()


def _get_timeout_seconds() -> int:
    return max(1, _to_int("ALERT_TIMEOUT_SECONDS", 2))


def _get_retry_count() -> int:
    return max(0, _to_int("ALERT_RETRY_COUNT", 1))


def _get_cooldown_seconds() -> int:
    return max(30, _to_int("ALERT_COOLDOWN_SECONDS", 300))


def _iso(value) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return None
    return str(value)


def _read_persisted_state() -> dict | None:
    query = """
        SELECT suppressed_count, queued_count, sent_count, fallback_count, last_error,
               last_sent_at, last_fallback_at, last_suppressed_at, cooldown_until_by_key
        FROM alerting_state
        WHERE state_key = %s
        LIMIT 1;
    """
    recent_query = """
        SELECT created_at, delivery, reason, event_payload
        FROM alerting_recent_events
        WHERE state_key = %s
        ORDER BY created_at DESC, id DESC
        LIMIT %s;
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (STATE_KEY,))
                row = cur.fetchone()
                cur.execute(recent_query, (STATE_KEY, MAX_LOCAL_ALERTS))
                recent_rows = cur.fetchall()
        if not row:
            return None
        cooldown = row[8] if isinstance(row[8], dict) else {}
        recent = []
        for recent_row in recent_rows:
            payload = recent_row[3] if isinstance(recent_row[3], dict) else {}
            recent.append(
                {
                    "timestamp": _iso(recent_row[0]),
                    "delivery": str(recent_row[1] or ""),
                    "reason": str(recent_row[2] or ""),
                    "event": payload,
                }
            )
        return {
            "suppressed_count": int(row[0] or 0),
            "queued_count": int(row[1] or 0),
            "sent_count": int(row[2] or 0),
            "fallback_count": int(row[3] or 0),
            "last_error": row[4],
            "last_sent_at": _iso(row[5]),
            "last_fallback_at": _iso(row[6]),
            "last_suppressed_at": _iso(row[7]),
            "cooldown_until_by_key": cooldown,
            "recent": recent,
        }
    except Exception:
        return None


def _write_persisted_state(state: dict) -> None:
    query = """
        INSERT INTO alerting_state (
          state_key, suppressed_count, queued_count, sent_count, fallback_count,
          last_error, last_sent_at, last_fallback_at, last_suppressed_at, cooldown_until_by_key, updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, NOW())
        ON CONFLICT (state_key) DO UPDATE
        SET suppressed_count = EXCLUDED.suppressed_count,
            queued_count = EXCLUDED.queued_count,
            sent_count = EXCLUDED.sent_count,
            fallback_count = EXCLUDED.fallback_count,
            last_error = EXCLUDED.last_error,
            last_sent_at = EXCLUDED.last_sent_at,
            last_fallback_at = EXCLUDED.last_fallback_at,
            last_suppressed_at = EXCLUDED.last_suppressed_at,
            cooldown_until_by_key = EXCLUDED.cooldown_until_by_key,
            updated_at = NOW();
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (
                    STATE_KEY,
                    int(state.get("suppressed_count") or 0),
                    int(state.get("queued_count") or 0),
                    int(state.get("sent_count") or 0),
                    int(state.get("fallback_count") or 0),
                    state.get("last_error"),
                    state.get("last_sent_at"),
                    state.get("last_fallback_at"),
                    state.get("last_suppressed_at"),
                    json.dumps(state.get("cooldown_until_by_key") or {}),
                ),
            )
        conn.commit()


def _insert_recent_item(item: dict) -> None:
    insert_query = """
        INSERT INTO alerting_recent_events (state_key, created_at, delivery, reason, event_payload)
        VALUES (%s, %s, %s, %s, %s::jsonb);
    """
    trim_query = """
        DELETE FROM alerting_recent_events
        WHERE state_key = %s
          AND id NOT IN (
            SELECT id
            FROM alerting_recent_events
            WHERE state_key = %s
            ORDER BY created_at DESC, id DESC
            LIMIT %s
          );
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                insert_query,
                (
                    STATE_KEY,
                    item.get("timestamp"),
                    item.get("delivery"),
                    item.get("reason"),
                    json.dumps(item.get("event") if isinstance(item.get("event"), dict) else {}),
                ),
            )
            cur.execute(trim_query, (STATE_KEY, STATE_KEY, MAX_LOCAL_ALERTS))
        conn.commit()


def _sync_state_to_memory() -> None:
    persisted = _read_persisted_state()
    if not persisted:
        return
    with _state_lock:
        _state.update(persisted)


def _persist_state_best_effort() -> None:
    with _state_lock:
        snapshot = deepcopy(_state)
    try:
        _write_persisted_state(snapshot)
    except Exception:
        pass


def _severity_from_metrics(metrics: dict) -> tuple[str, str]:
    block_rate = float(metrics.get("block_rate") or 0)
    delivery_rate = float(metrics.get("delivery_rate") or 0)
    if block_rate > 5 or delivery_rate < 70:
        return "critical", "SLO crítico"
    if block_rate > 3 or delivery_rate < 80:
        return "high", "SLO alto risco"
    if block_rate > 1 or delivery_rate < 90:
        return "medium", "SLO atenção"
    return "low", "SLO estável"


def build_slo_alert_event(metrics: dict, source: str = "dashboard", window: str = "7d") -> dict:
    severity, title = _severity_from_metrics(metrics)
    return {
        "contract_version": ALERT_CONTRACT_VERSION,
        "event_type": "slo_alert",
        "severity": severity,
        "title": title,
        "source": source,
        "window": window,
        "timestamp": _utcnow_iso(),
        "metric": {
            "messages_sent": int(metrics.get("messages_sent") or 0),
            "delivery_rate": float(metrics.get("delivery_rate") or 0),
            "reply_rate": float(metrics.get("reply_rate") or 0),
            "block_rate": float(metrics.get("block_rate") or 0),
        },
        "metadata": {},
    }


def _should_suppress(alert_event: dict) -> bool:
    _sync_state_to_memory()
    cooldown_seconds = _get_cooldown_seconds()
    key = f"{alert_event.get('event_type')}|{alert_event.get('severity')}|{alert_event.get('source')}"
    now = time.time()
    with _state_lock:
        cooldown_until = float(_state["cooldown_until_by_key"].get(key) or 0)
        if cooldown_until and now < cooldown_until:
            _state["suppressed_count"] += 1
            _state["last_suppressed_at"] = _utcnow_iso()
            should_suppress = True
        else:
            _state["cooldown_until_by_key"][key] = now + cooldown_seconds
            should_suppress = False
    _persist_state_best_effort()
    if should_suppress:
        log_incident(
            source="alerting",
            event_type="alert_suppressed",
            severity="low",
            title="Alerta suprimido por cooldown",
            details={"event_type": alert_event.get("event_type"), "severity": alert_event.get("severity")},
        )
    return should_suppress


def _append_recent(item: dict) -> None:
    with _state_lock:
        _state["recent"] = [item, *_state["recent"]][:MAX_LOCAL_ALERTS]
    try:
        _insert_recent_item(item)
    except Exception:
        pass


def _store_fallback(alert_event: dict, reason: str) -> None:
    fallback_item = {
        "timestamp": _utcnow_iso(),
        "delivery": "local_fallback",
        "reason": reason,
        "event": deepcopy(alert_event),
    }
    _append_recent(fallback_item)
    with _state_lock:
        _state["fallback_count"] += 1
        _state["last_fallback_at"] = fallback_item["timestamp"]
        _state["last_error"] = reason
    _persist_state_best_effort()
    log_incident(
        source="alerting",
        event_type="alert_fallback",
        severity="medium",
        title="Alerta entregue em fallback local",
        details={"reason": reason, "event_type": alert_event.get("event_type"), "severity": alert_event.get("severity")},
    )


def _store_sent(alert_event: dict) -> None:
    sent_item = {
        "timestamp": _utcnow_iso(),
        "delivery": "webhook_sent",
        "reason": "",
        "event": deepcopy(alert_event),
    }
    _append_recent(sent_item)
    with _state_lock:
        _state["sent_count"] += 1
        _state["last_sent_at"] = sent_item["timestamp"]
        _state["last_error"] = None
    _persist_state_best_effort()


def _send_webhook(alert_event: dict) -> None:
    webhook_url = _get_alert_webhook_url()
    if not webhook_url:
        _store_fallback(alert_event, "ALERT_WEBHOOK_URL not configured")
        return

    payload = json.dumps(alert_event).encode("utf-8")
    timeout_seconds = _get_timeout_seconds()
    retries = _get_retry_count()
    last_error = None

    for _ in range(retries + 1):
        try:
            req = Request(
                webhook_url,
                data=payload,
                method="POST",
                headers={"Content-Type": "application/json"},
            )
            with urlopen(req, timeout=timeout_seconds) as response:  # nosec B310
                status_code = int(getattr(response, "status", 0) or 0)
                if 200 <= status_code < 300:
                    _store_sent(alert_event)
                    return
                last_error = f"Webhook returned status {status_code}"
        except URLError as exc:
            last_error = str(exc)
        except Exception as exc:
            last_error = str(exc)
        time.sleep(0.1)

    _store_fallback(alert_event, last_error or "Unknown webhook error")


def trigger_operational_alert(alert_event: dict) -> dict:
    if _should_suppress(alert_event):
        return {"status": "suppressed", "delivery": "none"}

    webhook_url = _get_alert_webhook_url()
    if not webhook_url:
        _store_fallback(alert_event, "ALERT_WEBHOOK_URL not configured")
        return {"status": "fallback", "delivery": "local_fallback"}

    with _dispatch_lock:
        with _state_lock:
            _state["queued_count"] += 1
        _persist_state_best_effort()
        thread = threading.Thread(target=_send_webhook, args=(deepcopy(alert_event),), daemon=True, name="alert-dispatch")
        thread.start()
    return {"status": "queued", "delivery": "webhook_async"}


def dispatch_slo_alert(metrics: dict, source: str = "dashboard", window: str = "7d") -> dict:
    alert_event = build_slo_alert_event(metrics, source=source, window=window)
    if alert_event["severity"] not in {"critical", "high"}:
        return {"status": "ignored", "delivery": "none", "reason": "severity below threshold"}
    result = trigger_operational_alert(alert_event)
    return {"status": result["status"], "delivery": result["delivery"], "alert": alert_event}


def get_alerting_status() -> dict:
    _sync_state_to_memory()
    with _state_lock:
        snapshot = deepcopy(_state)
    snapshot["configured"] = bool(_get_alert_webhook_url())
    snapshot["contract_version"] = ALERT_CONTRACT_VERSION
    snapshot["settings"] = {
        "timeout_seconds": _get_timeout_seconds(),
        "retry_count": _get_retry_count(),
        "cooldown_seconds": _get_cooldown_seconds(),
    }
    return snapshot


def clear_alerting_state() -> None:
    with _state_lock:
        _state["suppressed_count"] = 0
        _state["queued_count"] = 0
        _state["sent_count"] = 0
        _state["fallback_count"] = 0
        _state["last_error"] = None
        _state["last_sent_at"] = None
        _state["last_fallback_at"] = None
        _state["last_suppressed_at"] = None
        _state["recent"] = []
        _state["cooldown_until_by_key"] = {}

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM alerting_recent_events WHERE state_key = %s;", (STATE_KEY,))
                cur.execute("DELETE FROM alerting_state WHERE state_key = %s;", (STATE_KEY,))
            conn.commit()
    except Exception:
        pass
