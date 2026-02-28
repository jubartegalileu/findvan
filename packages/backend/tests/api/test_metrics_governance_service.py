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
