from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import sdr as sdr_api


def build_client() -> TestClient:
    app = FastAPI()
    app.include_router(sdr_api.router, prefix="/api/sdr")
    return TestClient(app)


def test_get_queue_ok(monkeypatch):
    monkeypatch.setattr(
        sdr_api,
        "get_queue",
        lambda **kwargs: [
            {
                "lead_id": 1,
                "name": "Alpha",
                "score": 80,
                "cadence_bucket": "overdue",
            }
        ],
    )
    client = build_client()
    response = client.get("/api/sdr/queue?cadence=overdue")
    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 1
    assert payload["queue"][0]["lead_id"] == 1


def test_get_queue_invalid_filter(monkeypatch):
    def _raise(**kwargs):
        raise ValueError("cadence inválido")

    monkeypatch.setattr(sdr_api, "get_queue", _raise)
    client = build_client()
    response = client.get("/api/sdr/queue?cadence=foo")
    assert response.status_code == 400


def test_patch_action_ok(monkeypatch):
    monkeypatch.setattr(
        sdr_api,
        "register_action",
        lambda **kwargs: {"lead_id": kwargs["lead_id"], "contact_count": 2},
    )
    client = build_client()
    response = client.patch("/api/sdr/10/action", json={"action_type": "done"})
    assert response.status_code == 200
    assert response.json()["sdr"]["contact_count"] == 2


def test_patch_notes_ok(monkeypatch):
    monkeypatch.setattr(
        sdr_api,
        "add_note",
        lambda **kwargs: {"lead_id": kwargs["lead_id"], "notes": [{"note": kwargs["note"]}]},
    )
    client = build_client()
    response = client.patch("/api/sdr/10/notes", json={"note": "ligar amanhã"})
    assert response.status_code == 200
    assert response.json()["lead_id"] == 10


def test_patch_notes_batch_ok(monkeypatch):
    def _fake_add_note_batch(**kwargs):
        return {
            "updated_count": len(kwargs["lead_ids"]),
            "lead_ids": kwargs["lead_ids"],
        }

    monkeypatch.setattr(sdr_api, "add_note_batch", _fake_add_note_batch)
    client = build_client()
    response = client.patch(
        "/api/sdr/notes/batch",
        json={"lead_ids": [10, 11], "note": "Nota operacional em lote"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["updated_count"] == 2
    assert payload["lead_ids"] == [10, 11]


def test_templates_list_ok(monkeypatch):
    monkeypatch.setattr(
        sdr_api,
        "list_bulk_templates",
        lambda **kwargs: [{"id": 1, "owner": kwargs["owner"], "name": "Template A"}],
    )
    client = build_client()
    response = client.get("/api/sdr/templates?owner=alice")
    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 1
    assert payload["templates"][0]["owner"] == "alice"


def test_templates_save_ok(monkeypatch):
    monkeypatch.setattr(
        sdr_api,
        "save_bulk_template",
        lambda **kwargs: {"id": 2, "owner": kwargs["owner"], "name": kwargs["name"]},
    )
    client = build_client()
    response = client.post("/api/sdr/templates", json={"owner": "alice", "name": "Template B"})
    assert response.status_code == 200
    assert response.json()["template"]["name"] == "Template B"


def test_templates_delete_ok(monkeypatch):
    monkeypatch.setattr(sdr_api, "delete_bulk_template", lambda **kwargs: True)
    client = build_client()
    response = client.delete("/api/sdr/templates/5?owner=alice")
    assert response.status_code == 200
    assert response.json()["template_id"] == 5


def test_templates_patch_ok(monkeypatch):
    monkeypatch.setattr(
        sdr_api,
        "update_bulk_template_preferences",
        lambda **kwargs: {
            "id": kwargs["template_id"],
            "owner": kwargs["owner"],
            "is_favorite": kwargs["is_favorite"],
            "sort_order": kwargs["sort_order"],
        },
    )
    client = build_client()
    response = client.patch(
        "/api/sdr/templates/9",
        json={"owner": "alice", "is_favorite": True, "sort_order": 1},
    )
    assert response.status_code == 200
    payload = response.json()["template"]
    assert payload["id"] == 9
    assert payload["is_favorite"] is True
    assert payload["sort_order"] == 1


def test_get_stats_ok(monkeypatch):
    monkeypatch.setattr(
        sdr_api,
        "get_stats_by_assignee",
        lambda **kwargs: {"total": 5, "done_today": 2, "pending": 3, "overdue": 1},
    )
    client = build_client()
    response = client.get("/api/sdr/stats")
    assert response.status_code == 200
    assert response.json()["pending"] == 3


def test_get_queue_forwards_limit(monkeypatch):
    captured = {}

    def _fake_get_queue(**kwargs):
        captured.update(kwargs)
        return []

    monkeypatch.setattr(sdr_api, "get_queue", _fake_get_queue)
    client = build_client()
    response = client.get("/api/sdr/queue?limit=321")
    assert response.status_code == 200
    assert captured["limit"] == 321


def test_get_queue_forwards_assigned_to(monkeypatch):
    captured = {}

    def _fake_get_queue(**kwargs):
        captured.update(kwargs)
        return []

    monkeypatch.setattr(sdr_api, "get_queue", _fake_get_queue)
    client = build_client()
    response = client.get("/api/sdr/queue?assigned_to=alice")
    assert response.status_code == 200
    assert captured["assigned_to"] == "alice"


def test_get_stats_forwards_assigned_to(monkeypatch):
    captured = {}

    def _fake_get_stats_by_assignee(**kwargs):
        captured.update(kwargs)
        return {"total": 0, "done_today": 0, "pending": 0, "overdue": 0}

    monkeypatch.setattr(sdr_api, "get_stats_by_assignee", _fake_get_stats_by_assignee)
    client = build_client()
    response = client.get("/api/sdr/stats?assigned_to=alice")
    assert response.status_code == 200
    assert captured["assigned_to"] == "alice"


def test_patch_assign_ok(monkeypatch):
    monkeypatch.setattr(
        sdr_api,
        "assign_owner",
        lambda **kwargs: {"lead_id": kwargs["lead_id"], "assigned_to": kwargs["assigned_to"]},
    )
    client = build_client()
    response = client.patch("/api/sdr/10/assign", json={"assigned_to": "alice"})
    assert response.status_code == 200
    assert response.json()["assigned_to"] == "alice"


def test_patch_assign_batch_ok(monkeypatch):
    def _fake_assign_owner_batch(**kwargs):
        return {
            "updated_count": len(kwargs["lead_ids"]),
            "lead_ids": kwargs["lead_ids"],
            "assigned_to": kwargs["assigned_to"],
        }

    monkeypatch.setattr(sdr_api, "assign_owner_batch", _fake_assign_owner_batch)
    client = build_client()
    response = client.patch(
        "/api/sdr/assign/batch",
        json={"lead_ids": [10, 11], "assigned_to": "alice"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["updated_count"] == 2
    assert payload["lead_ids"] == [10, 11]
    assert payload["assigned_to"] == "alice"


def test_patch_action_batch_ok(monkeypatch):
    captured = {}

    def _fake_register_action_batch(**kwargs):
        captured.update(kwargs)
        return {
            "updated_count": len(kwargs["lead_ids"]),
            "lead_ids": kwargs["lead_ids"],
            "action_type": kwargs["action_type"],
        }

    monkeypatch.setattr(sdr_api, "register_action_batch", _fake_register_action_batch)
    client = build_client()
    response = client.patch(
        "/api/sdr/action/batch",
        json={
            "lead_ids": [10, 11],
            "action_type": "scheduled",
            "next_action_date": "2026-03-03T10:30:00",
            "next_action_description": "Enviar proposta",
            "cadence_days": 3,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["updated_count"] == 2
    assert payload["lead_ids"] == [10, 11]
    assert payload["action_type"] == "scheduled"
    assert captured["next_action_date"] == "2026-03-03T10:30:00"
    assert captured["next_action_description"] == "Enviar proposta"
    assert captured["cadence_days"] == 3


def test_get_queue_internal_error_is_sanitized(monkeypatch):
    def _raise(**kwargs):
        raise RuntimeError("db failed")

    monkeypatch.setattr(sdr_api, "get_queue", _raise)
    client = build_client()
    response = client.get("/api/sdr/queue")
    assert response.status_code == 500
    assert response.json()["detail"] == "Erro interno ao processar a solicitação."
