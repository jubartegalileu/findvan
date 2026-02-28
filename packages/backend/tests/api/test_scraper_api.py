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
