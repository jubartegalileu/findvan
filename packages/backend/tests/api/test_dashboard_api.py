from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import dashboard as dashboard_api


def build_client() -> TestClient:
    app = FastAPI()
    app.include_router(dashboard_api.router, prefix="/api/dashboard")
    return TestClient(app)


def test_dashboard_kpis_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_dashboard_kpis",
        lambda: {
            "valid_leads": 10,
            "jobs_today": 3,
            "leads_24h": 40,
            "contacted_leads": 7,
            "reply_rate": 28.5,
            "monthly_conversions": 2,
        },
    )
    client = build_client()
    response = client.get("/api/dashboard/kpis")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["kpis"]["valid_leads"] == 10


def test_dashboard_funnel_summary_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_funnel_summary",
        lambda: {
            "total": 12,
            "conversion_rate": 8.3,
            "stages": [{"status": "novo", "count": 5, "percentage": 41.7}],
        },
    )
    client = build_client()
    response = client.get("/api/dashboard/funnel-summary")
    assert response.status_code == 200
    assert response.json()["summary"]["total"] == 12


def test_dashboard_urgent_actions_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_urgent_actions",
        lambda: {"alerts": [{"id": "replies_pending", "count": 2}], "all_clear": False},
    )
    client = build_client()
    response = client.get("/api/dashboard/urgent-actions")
    assert response.status_code == 200
    assert response.json()["urgent_actions"]["all_clear"] is False


def test_dashboard_weekly_performance_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "dispatch_slo_alert",
        lambda performance, source, window: {"status": "queued", "delivery": "webhook_async"},
    )
    monkeypatch.setattr(
        dashboard_api,
        "get_weekly_performance",
        lambda: {
            "has_data": True,
            "messages_sent": 42,
            "delivery_rate": 95.2,
            "reply_rate": 18.0,
            "block_rate": 1.2,
            "labels": ["22/02", "23/02"],
            "series": [20, 22],
        },
    )
    client = build_client()
    response = client.get("/api/dashboard/weekly-performance")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["performance"]["messages_sent"] == 42
    assert payload["alert_dispatch"]["status"] == "queued"


def test_dashboard_alert_status_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_alerting_status",
        lambda: {"configured": False, "contract_version": "1.0.0"},
    )
    client = build_client()
    response = client.get("/api/dashboard/alerts/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["alerting"]["contract_version"] == "1.0.0"


def test_dashboard_alert_dispatch_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_weekly_performance",
        lambda: {"has_data": True, "messages_sent": 15, "delivery_rate": 62, "reply_rate": 2, "block_rate": 8},
    )
    monkeypatch.setattr(
        dashboard_api,
        "dispatch_slo_alert",
        lambda metrics, source, window: {"status": "fallback", "delivery": "local_fallback"},
    )
    client = build_client()
    response = client.post("/api/dashboard/alerts/dispatch")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["dispatch"]["delivery"] == "local_fallback"


def test_dashboard_metrics_governance_get_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_active_thresholds",
        lambda: {"delivery_rate_critical_lt": 70, "block_rate_critical_gt": 5},
    )
    client = build_client()
    response = client.get("/api/dashboard/metrics-governance")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["thresholds"]["delivery_rate_critical_lt"] == 70


def test_dashboard_metrics_governance_history_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_threshold_history",
        lambda limit=20: [{"id": "a-1", "author": "qa", "diffs": [{"key": "x", "from": 1, "to": 2}]}],
    )
    client = build_client()
    response = client.get("/api/dashboard/metrics-governance/history?limit=10")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["history"][0]["author"] == "qa"


def test_dashboard_metrics_governance_patch_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "update_thresholds",
        lambda thresholds, author="system": {"updated": True, "thresholds": thresholds, "audit": {"author": author}},
    )
    client = build_client()
    response = client.patch(
        "/api/dashboard/metrics-governance",
        json={"author": "pm", "thresholds": {"delivery_rate_critical_lt": 68}},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["result"]["updated"] is True
    assert payload["result"]["audit"]["author"] == "pm"
