from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import json
import os
import threading
import time
from urllib.error import URLError
from urllib.request import Request, urlopen


ALERT_CONTRACT_VERSION = "1.0.0"
MAX_LOCAL_ALERTS = 50

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
    cooldown_seconds = _get_cooldown_seconds()
    key = f"{alert_event.get('event_type')}|{alert_event.get('severity')}|{alert_event.get('source')}"
    now = time.time()
    with _state_lock:
        cooldown_until = _state["cooldown_until_by_key"].get(key)
        if cooldown_until and now < cooldown_until:
            _state["suppressed_count"] += 1
            _state["last_suppressed_at"] = _utcnow_iso()
            return True
        _state["cooldown_until_by_key"][key] = now + cooldown_seconds
    return False


def _append_recent(item: dict) -> None:
    with _state_lock:
        _state["recent"] = [item, *_state["recent"]][:MAX_LOCAL_ALERTS]


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
