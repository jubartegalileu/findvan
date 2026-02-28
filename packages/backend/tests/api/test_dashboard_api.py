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
