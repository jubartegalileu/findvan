from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import scraper as scraper_api


def build_client() -> TestClient:
    app = FastAPI()
    app.include_router(scraper_api.router, prefix="/api/scraper")
    return TestClient(app)


def test_scraper_google_maps_accepts_keywords(monkeypatch):
    monkeypatch.setattr(
        scraper_api,
        "run_google_maps_scraper",
        lambda city, max_results, state, keywords: {
            "total": 10,
            "inserted": 2,
            "keywords": keywords,
            "pipeline": {"found": 10, "valid": 9, "duplicates": 3, "new": 2},
            "feedback": {"show": False},
        },
    )
    client = build_client()
    response = client.post(
        "/api/scraper/google-maps",
        json={"city": "Campinas", "state": "SP", "max_results": 20, "keywords": ["van escolar"]},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["result"]["keywords"] == ["van escolar"]


def test_scraper_keywords_endpoints(monkeypatch):
    monkeypatch.setattr(
        scraper_api,
        "get_keywords_profile",
        lambda state, city: {"state": state, "city": city, "keywords": ["transporte escolar"], "source": "saved"},
    )
    monkeypatch.setattr(
        scraper_api,
        "set_keywords_profile",
        lambda state, city, keywords: {"state": state, "city": city, "keywords": keywords},
    )
    client = build_client()
    get_response = client.get("/api/scraper/keywords?state=SP&city=Sao%20Paulo")
    assert get_response.status_code == 200
    assert get_response.json()["profile"]["state"] == "SP"

    put_response = client.put(
        "/api/scraper/keywords",
        json={"state": "SP", "city": "Sao Paulo", "keywords": ["van escolar", "fretamento escolar"]},
    )
    assert put_response.status_code == 200
    assert len(put_response.json()["profile"]["keywords"]) == 2


def test_scraper_schedules_crud_endpoints(monkeypatch):
    monkeypatch.setattr(
        scraper_api,
        "list_scraper_schedules",
        lambda: [{"id": 1, "state": "SP", "city": "Campinas", "is_active": True}],
    )
    monkeypatch.setattr(
        scraper_api,
        "create_scraper_schedule",
        lambda payload: {"id": 2, "state": payload["state"], "city": payload["city"], "is_active": True},
    )
    monkeypatch.setattr(
        scraper_api,
        "update_scraper_schedule",
        lambda schedule_id, payload: {"id": schedule_id, "state": "SP", "city": "Campinas", "is_active": payload.get("is_active", True)},
    )
    monkeypatch.setattr(scraper_api, "delete_scraper_schedule", lambda schedule_id: True)

    client = build_client()

    list_response = client.get("/api/scraper/schedules")
    assert list_response.status_code == 200
    assert list_response.json()["schedules"][0]["id"] == 1

    create_response = client.post(
        "/api/scraper/schedules",
        json={
            "state": "SP",
            "city": "Campinas",
            "keywords": ["transporte escolar"],
            "quantity": 50,
            "frequency": "daily",
            "execution_time": "09:00",
            "is_active": True,
        },
    )
    assert create_response.status_code == 200
    assert create_response.json()["schedule"]["id"] == 2

    patch_response = client.patch("/api/scraper/schedules/2", json={"is_active": False})
    assert patch_response.status_code == 200
    assert patch_response.json()["schedule"]["is_active"] is False

    delete_response = client.delete("/api/scraper/schedules/2")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "ok"


def test_scraper_schedule_create_accepts_state_only(monkeypatch):
    monkeypatch.setattr(
        scraper_api,
        "create_scraper_schedule",
        lambda payload: {
            "id": 9,
            "state": payload["state"],
            "city": payload.get("city") or payload["state"],
            "is_active": True,
        },
    )
    client = build_client()
    response = client.post(
        "/api/scraper/schedules",
        json={
            "state": "SP",
            "keywords": ["transporte escolar"],
            "quantity": 50,
            "frequency": "daily",
            "execution_time": "09:00",
            "is_active": True,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["schedule"]["state"] == "SP"


def test_scraper_coverage_endpoint(monkeypatch):
    monkeypatch.setattr(
        scraper_api,
        "get_scraper_coverage",
        lambda: {
            "states": [{"state": "SP", "cities_collected": 3, "total_leads": 120}],
            "active_cities_total": 3,
            "avg_leads_per_city": 40.0,
            "next_city_suggestion": {"state": "RJ", "city": "Rio de Janeiro"},
        },
    )
    client = build_client()
    response = client.get("/api/scraper/coverage")
    assert response.status_code == 200
    payload = response.json()
    assert payload["coverage"]["states"][0]["state"] == "SP"
    assert payload["coverage"]["next_city_suggestion"]["state"] == "RJ"
