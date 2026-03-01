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
    monkeypatch.setattr(leads_api, "get_leads_by_ids", lambda ids: [{"id": lead_id} for lead_id in ids])
    client = build_client()
    response = client.post("/api/leads/batch/campaign", json={"ids": [1, 2], "campaign_status": "Wave 1"})
    assert response.status_code == 200
    assert response.json()["processed"] == 2
    assert response.json()["updated"] == 2
    assert response.json()["failed"] == 0
    assert response.json()["errors"] == []


def test_batch_campaign_partial_failure_reports_errors(monkeypatch):
    monkeypatch.setattr(leads_api, "batch_update_campaign", lambda ids, campaign_status: {"updated": 1})
    monkeypatch.setattr(leads_api, "get_leads_by_ids", lambda ids: [{"id": 1}, {"id": 3}])
    client = build_client()
    response = client.post("/api/leads/batch/campaign", json={"ids": [1, 2, 3], "campaign_status": "Wave 1"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["processed"] == 3
    assert payload["updated"] == 1
    assert payload["failed"] == 2
    assert payload["errors"] == [{"id": 2, "error": "Lead not found"}]


def test_batch_delete_ok(monkeypatch):
    monkeypatch.setattr(leads_api, "batch_soft_delete", lambda ids: {"deleted": len(ids)})
    monkeypatch.setattr(leads_api, "get_leads_by_ids", lambda ids: [{"id": lead_id} for lead_id in ids])
    client = build_client()
    response = client.post("/api/leads/batch/delete", json={"ids": [10, 11, 12]})
    assert response.status_code == 200
    assert response.json()["deleted"] == 3
    assert response.json()["failed"] == 0


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


def test_lead_notes_endpoints(monkeypatch):
    monkeypatch.setattr(
        leads_api,
        "get_lead_by_id",
        lambda lead_id: {"id": lead_id, "funnel_status": "novo"} if lead_id == 7 else None,
    )
    monkeypatch.setattr(
        leads_api,
        "list_lead_notes",
        lambda lead_id, limit=50: [
            {"id": 1, "lead_id": lead_id, "content": "Primeira nota", "author": "qa", "created_at": "2026-02-28T10:00:00"}
        ],
    )
    monkeypatch.setattr(
        leads_api,
        "add_lead_note",
        lambda lead_id, content, author=None: {
            "id": 2,
            "lead_id": lead_id,
            "content": content,
            "author": author or "dashboard",
            "created_at": "2026-02-28T11:00:00",
        },
    )

    client = build_client()

    get_response = client.get("/api/leads/7/notes")
    assert get_response.status_code == 200
    assert get_response.json()["notes"][0]["content"] == "Primeira nota"

    post_response = client.post("/api/leads/7/notes", json={"content": "Nova nota", "author": "dev"})
    assert post_response.status_code == 200
    assert post_response.json()["note"]["content"] == "Nova nota"


def test_lead_tags_endpoints(monkeypatch):
    monkeypatch.setattr(
        leads_api,
        "get_lead_by_id",
        lambda lead_id: {"id": lead_id, "funnel_status": "novo"} if lead_id == 9 else None,
    )
    monkeypatch.setattr(leads_api, "add_lead_tag", lambda lead_id, tag: ["prioridade alta", tag])
    monkeypatch.setattr(leads_api, "remove_lead_tag", lambda lead_id, tag: ["prioridade alta"])
    monkeypatch.setattr(leads_api, "batch_add_tag", lambda ids, tag: {"updated": len(ids), "tag": tag})
    monkeypatch.setattr(leads_api, "get_leads_by_ids", lambda ids: [{"id": lead_id} for lead_id in ids])

    client = build_client()

    add_response = client.post("/api/leads/9/tags", json={"tag": "grande frota"})
    assert add_response.status_code == 200
    assert "grande frota" in add_response.json()["tags"]

    remove_response = client.delete("/api/leads/9/tags/grande%20frota")
    assert remove_response.status_code == 200
    assert remove_response.json()["tags"] == ["prioridade alta"]

    batch_response = client.post("/api/leads/batch/tag", json={"ids": [9, 10], "tag": "indicacao"})
    assert batch_response.status_code == 200
    assert batch_response.json()["updated"] == 2
    assert batch_response.json()["failed"] == 0


def test_normalize_consistency_endpoint(monkeypatch):
    monkeypatch.setattr(
        leads_api,
        "normalize_leads_consistency",
        lambda: {
            "status": "ok",
            "scanned": 10,
            "updated": 4,
            "score_updated": 3,
            "status_normalized": 2,
            "loss_reason_cleared": 1,
        },
    )
    client = build_client()
    response = client.post("/api/leads/normalize-consistency")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["scanned"] == 10
    assert payload["updated"] == 4


def test_batch_export_reports_processed_and_failures(monkeypatch):
    monkeypatch.setattr(leads_api, "get_leads_by_ids", lambda ids: [{"id": 1}, {"id": 3}])
    client = build_client()
    response = client.post("/api/leads/batch/export", json={"ids": [1, 2, 3]})
    assert response.status_code == 200
    payload = response.json()
    assert payload["processed"] == 3
    assert payload["exported"] == 2
    assert payload["failed"] == 1
    assert payload["errors"] == [{"id": 2, "error": "Lead not found"}]


def test_batch_status_reports_processed_and_failures(monkeypatch):
    def _change_status(**kwargs):
        if kwargs["lead_id"] == 2:
            return None
        return {"id": kwargs["lead_id"], "funnel_status": kwargs["new_status"]}

    monkeypatch.setattr(leads_api, "change_status", _change_status)
    client = build_client()
    response = client.post(
        "/api/leads/batch/status",
        json={"ids": [1, 2, 3], "new_status": "contactado", "author": "qa"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["processed"] == 3
    assert payload["updated"] == 2
    assert payload["failed"] == 1
    assert payload["errors"] == [{"id": 2, "error": "Lead not found"}]
