from app.services import metrics_governance_service as service


def setup_function():
    service.clear_metrics_governance_state()


def test_get_active_thresholds_has_defaults():
    thresholds = service.get_active_thresholds()
    assert "delivery_rate_critical_lt" in thresholds
    assert "block_rate_critical_gt" in thresholds


def test_update_thresholds_creates_audit_entry():
    result = service.update_thresholds({"delivery_rate_critical_lt": 67}, author="pm")
    assert result["updated"] is True
    assert result["thresholds"]["delivery_rate_critical_lt"] == 67
    assert result["audit"]["author"] == "pm"
    assert len(result["audit"]["diffs"]) >= 1


def test_update_thresholds_ignores_unknown_keys():
    before = service.get_active_thresholds()
    result = service.update_thresholds({"unknown_key": 123}, author="pm")
    assert result["updated"] is False
    assert result["thresholds"] == before


def test_build_threshold_suggestions_and_register_accept_decision():
    suggestions = service.build_threshold_suggestions(
        alerting_metrics={"fallback_count": 4, "suppressed_count": 2},
        retention_metrics={"fail_count": 2},
        incidents=[
            {"source": "retention", "event_type": "retention_cycle_error"},
            {"source": "messaging", "event_type": "message_block_spike"},
            {"source": "messaging", "event_type": "message_block_spike"},
        ],
        limit=5,
    )
    assert len(suggestions) >= 1
    pending = next((item for item in suggestions if item["status"] == "pending"), None)
    assert pending is not None
    decision = service.register_threshold_decision(
        suggestion_id=pending["id"],
        decision="accepted",
        author="qa",
        reason="Ajuste validado",
    )
    assert decision["updated"] is True
    assert decision["decision"]["author"] == "qa"
    assert decision["suggestion"]["status"] == "accepted"
    assert decision["threshold_result"] is not None


def test_register_threshold_decision_invalid_value():
    result = service.register_threshold_decision("missing-id", "wrong", author="qa")
    assert result["updated"] is False
    assert result["error"] == "invalid_decision"
