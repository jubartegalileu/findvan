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


def test_get_queue_internal_error_is_sanitized(monkeypatch):
    def _raise(**kwargs):
        raise RuntimeError("db failed")

    monkeypatch.setattr(sdr_api, "get_queue", _raise)
    client = build_client()
    response = client.get("/api/sdr/queue")
    assert response.status_code == 500
    assert response.json()["detail"] == "Erro interno ao processar a solicitação."
