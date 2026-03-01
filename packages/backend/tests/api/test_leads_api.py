from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import leads as leads_api
from app.services import leads_service


def build_client() -> TestClient:
    app = FastAPI()
    app.include_router(leads_api.router, prefix="/api/leads")
    return TestClient(app)


def test_normalize_funnel_status_defaults_to_novo():
    assert leads_service.normalize_funnel_status(None) == "novo"
    assert leads_service.normalize_funnel_status("") == "novo"
    assert leads_service.normalize_funnel_status("invalido") == "novo"


def test_normalize_funnel_status_accepts_valid_values():
    assert leads_service.normalize_funnel_status("contactado") == "contactado"
    assert leads_service.normalize_funnel_status("  PERDIDO ") == "perdido"


def test_recalculate_scores_endpoint_ok(monkeypatch):
    monkeypatch.setattr(
        leads_api,
        "recalculate_all_scores",
        lambda: {"updated": 12, "avg_score": 72.4},
    )
    client = build_client()
    response = client.post("/api/leads/recalculate-scores")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["updated"] == 12
