from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import leads as leads_api


def build_client() -> TestClient:
    app = FastAPI()
    app.include_router(leads_api.router, prefix="/api/leads")
    return TestClient(app)


def test_batch_campaign_requires_ids():
    client = build_client()
    response = client.post("/api/leads/batch/campaign", json={"ids": [], "campaign_status": "Wave 1"})
    assert response.status_code == 400


def test_batch_campaign_ok(monkeypatch):
    monkeypatch.setattr(leads_api, "batch_update_campaign", lambda ids, campaign_status: {"updated": len(ids)})
    client = build_client()
    response = client.post("/api/leads/batch/campaign", json={"ids": [1, 2], "campaign_status": "Wave 1"})
    assert response.status_code == 200
    assert response.json()["updated"] == 2


def test_batch_delete_ok(monkeypatch):
    monkeypatch.setattr(leads_api, "batch_soft_delete", lambda ids: {"deleted": len(ids)})
    client = build_client()
    response = client.post("/api/leads/batch/delete", json={"ids": [10, 11, 12]})
    assert response.status_code == 200
    assert response.json()["deleted"] == 3


def test_status_alias_and_transitions(monkeypatch):
    monkeypatch.setattr(
        leads_api,
        "change_status",
        lambda **kwargs: {"id": kwargs["lead_id"], "funnel_status": kwargs["new_status"]},
    )
    monkeypatch.setattr(
        leads_api,
        "get_lead_by_id",
        lambda lead_id: {"id": lead_id, "funnel_status": "novo"} if lead_id == 1 else None,
    )
    monkeypatch.setattr(leads_api, "get_valid_transitions", lambda status: ["contactado", "perdido"])

    client = build_client()
    patch_response = client.patch("/api/leads/1/status", json={"new_status": "contactado"})
    assert patch_response.status_code == 200
    assert patch_response.json()["lead"]["funnel_status"] == "contactado"

    transitions = client.get("/api/leads/1/transitions")
    assert transitions.status_code == 200
    assert transitions.json()["transitions"] == ["contactado", "perdido"]
