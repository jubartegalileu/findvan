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
        lambda: {
            "updated": 12,
            "avg_score": 72.4,
            "score_distribution": {"90-100": 2, "70-89": 4, "50-69": 3, "<50": 3},
        },
    )
    client = build_client()
    response = client.post("/api/leads/recalculate-scores")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["updated"] == 12
    assert payload["score_distribution"]["70-89"] == 4


def test_get_score_endpoint_ok(monkeypatch):
    monkeypatch.setattr(
        leads_api,
        "get_lead_score_breakdown",
        lambda lead_id: {"lead_id": lead_id, "score": 85, "breakdown": {"phone": True}},
    )
    client = build_client()
    response = client.get("/api/leads/7/score")
    assert response.status_code == 200
    payload = response.json()
    assert payload["lead_id"] == 7
    assert payload["score"] == 85


def test_get_score_endpoint_not_found(monkeypatch):
    monkeypatch.setattr(leads_api, "get_lead_score_breakdown", lambda lead_id: None)
    client = build_client()
    response = client.get("/api/leads/999/score")
    assert response.status_code == 404


def test_patch_score_endpoint_ok(monkeypatch):
    monkeypatch.setattr(
        leads_api,
        "recalculate_lead_score",
        lambda lead_id: {"lead_id": lead_id, "score": 90, "breakdown": {"email": True}},
    )
    client = build_client()
    response = client.patch("/api/leads/9/score")
    assert response.status_code == 200
    payload = response.json()
    assert payload["lead_id"] == 9
    assert payload["score"] == 90


def test_patch_score_endpoint_not_found(monkeypatch):
    monkeypatch.setattr(leads_api, "recalculate_lead_score", lambda lead_id: None)
    client = build_client()
    response = client.patch("/api/leads/404/score")
    assert response.status_code == 404


def test_get_leads_accepts_status_query(monkeypatch):
    captured = {}

    def _list_leads(limit=50, statuses=None):
        captured["limit"] = limit
        captured["statuses"] = statuses
        return []

    monkeypatch.setattr(leads_api, "list_leads", _list_leads)
    client = build_client()
    response = client.get("/api/leads/?limit=20&status=novo,contactado")
    assert response.status_code == 200
    assert response.json() == {"leads": []}
    assert captured["limit"] == 20
    assert set(captured["statuses"]) == {"novo", "contactado"}


def test_get_leads_accepts_repeated_status_query(monkeypatch):
    captured = {}

    def _list_leads(limit=50, statuses=None):
        captured["limit"] = limit
        captured["statuses"] = statuses
        return []

    monkeypatch.setattr(leads_api, "list_leads", _list_leads)
    client = build_client()
    response = client.get("/api/leads/?limit=10&status=novo&status=contactado")
    assert response.status_code == 200
    assert response.json() == {"leads": []}
    assert captured["limit"] == 10
    assert set(captured["statuses"]) == {"novo", "contactado"}


def test_get_leads_rejects_invalid_status_query():
    client = build_client()
    response = client.get("/api/leads/?limit=10&status=foo")
    assert response.status_code == 400
    assert "status inválido" in response.json()["detail"].lower()


def test_get_leads_accepts_funnel_alias_query(monkeypatch):
    captured = {}

    def _list_leads(limit=50, statuses=None):
        captured["limit"] = limit
        captured["statuses"] = statuses
        return []

    monkeypatch.setattr(leads_api, "list_leads", _list_leads)
    client = build_client()
    response = client.get("/api/leads/?limit=10&funnel=novo,contactado")
    assert response.status_code == 200
    assert response.json() == {"leads": []}
    assert captured["limit"] == 10
    assert set(captured["statuses"]) == {"novo", "contactado"}


def test_get_leads_merges_status_and_funnel_queries(monkeypatch):
    captured = {}

    def _list_leads(limit=50, statuses=None):
        captured["limit"] = limit
        captured["statuses"] = statuses
        return []

    monkeypatch.setattr(leads_api, "list_leads", _list_leads)
    client = build_client()
    response = client.get("/api/leads/?limit=10&status=novo&funnel=contactado")
    assert response.status_code == 200
    assert response.json() == {"leads": []}
    assert captured["limit"] == 10
    assert set(captured["statuses"]) == {"novo", "contactado"}


def test_get_leads_normalizes_case_for_status_and_funnel(monkeypatch):
    captured = {}

    def _list_leads(limit=50, statuses=None):
        captured["limit"] = limit
        captured["statuses"] = statuses
        return []

    monkeypatch.setattr(leads_api, "list_leads", _list_leads)
    client = build_client()
    response = client.get("/api/leads/?limit=10&status=NOVO&funnel=Contactado")
    assert response.status_code == 200
    assert response.json() == {"leads": []}
    assert captured["limit"] == 10
    assert set(captured["statuses"]) == {"novo", "contactado"}


def test_get_leads_rejects_invalid_funnel_query():
    client = build_client()
    response = client.get("/api/leads/?limit=10&funnel=foo")
    assert response.status_code == 400
    assert "status inválido" in response.json()["detail"].lower()


def test_get_leads_rejects_mixed_invalid_status_and_funnel():
    client = build_client()
    response = client.get("/api/leads/?limit=10&status=novo&funnel=foo")
    assert response.status_code == 400
    assert "foo" in response.json()["detail"].lower()
