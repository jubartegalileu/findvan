from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import activity as activity_api


def build_client() -> TestClient:
    app = FastAPI()
    app.include_router(activity_api.router, prefix="/api/activity")
    return TestClient(app)


def test_activity_list_ok(monkeypatch):
    monkeypatch.setattr(
        activity_api,
        "list_activity_events",
        lambda limit: [
            {
                "id": "scraper-1",
                "type": "scraper",
                "title": "Scraper Campinas/SP",
                "description": "8 leads inseridos",
                "created_at": "2026-02-28T12:00:00",
            }
        ],
    )
    client = build_client()
    response = client.get("/api/activity?limit=10")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert len(payload["events"]) == 1
    assert payload["events"][0]["type"] == "scraper"


def test_activity_limit_validation():
    client = build_client()
    response = client.get("/api/activity?limit=0")
    assert response.status_code == 422


def test_activity_limit_is_capped_in_response(monkeypatch):
    monkeypatch.setattr(activity_api, "list_activity_events", lambda limit: [])
    client = build_client()
    response = client.get("/api/activity?limit=999")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["applied_limit"] == 50
    assert payload["retention_pruned"] == 0


def test_activity_retention_job_status_endpoint(monkeypatch):
    monkeypatch.setattr(
        activity_api,
        "get_retention_job_status",
        lambda: {"enabled": True, "running": True, "last_success_at": "2026-02-28T18:00:00+00:00"},
    )
    client = build_client()
    response = client.get("/api/activity/retention-job")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["job"]["enabled"] is True
    assert payload["job"]["running"] is True
