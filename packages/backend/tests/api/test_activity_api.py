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
