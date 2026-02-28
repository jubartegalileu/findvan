from app.services import alerts_service as service


def teardown_function():
    service.clear_alerting_state()


def test_build_slo_alert_event_contract():
    payload = service.build_slo_alert_event(
        {"messages_sent": 10, "delivery_rate": 60, "reply_rate": 1, "block_rate": 7},
        source="test.source",
        window="24h",
    )
    assert payload["contract_version"] == "1.0.0"
    assert payload["event_type"] == "slo_alert"
    assert payload["severity"] == "critical"
    assert payload["window"] == "24h"


def test_dispatch_slo_alert_uses_fallback_when_webhook_missing(monkeypatch):
    monkeypatch.delenv("ALERT_WEBHOOK_URL", raising=False)
    service.clear_alerting_state()
    result = service.dispatch_slo_alert(
        {"messages_sent": 10, "delivery_rate": 60, "reply_rate": 1, "block_rate": 7},
        source="test.source",
    )
    assert result["status"] == "fallback"
    status = service.get_alerting_status()
    assert status["fallback_count"] >= 1
    assert status["recent"][0]["delivery"] == "local_fallback"


def test_trigger_operational_alert_is_suppressed_by_cooldown(monkeypatch):
    monkeypatch.delenv("ALERT_WEBHOOK_URL", raising=False)
    monkeypatch.setenv("ALERT_COOLDOWN_SECONDS", "300")
    service.clear_alerting_state()
    event = service.build_slo_alert_event(
        {"messages_sent": 10, "delivery_rate": 60, "reply_rate": 1, "block_rate": 7},
        source="test.source",
        window="7d",
    )
    first = service.trigger_operational_alert(event)
    second = service.trigger_operational_alert(event)
    assert first["status"] == "fallback"
    assert second["status"] == "suppressed"
