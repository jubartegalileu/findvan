from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import pipeline as pipeline_api


def build_client() -> TestClient:
    app = FastAPI()
    app.include_router(pipeline_api.router, prefix="/api/pipeline")
    return TestClient(app)


def test_get_pipeline_ok(monkeypatch):
    monkeypatch.setattr(
        pipeline_api,
        "get_grouped",
        lambda **kwargs: {"stages": {"novo": [{"lead_id": 1}]}, "total": 1},
    )
    client = build_client()
    response = client.get("/api/pipeline")
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_get_pipeline_forwards_limit(monkeypatch):
    captured = {}

    def _fake_get_grouped(**kwargs):
        captured.update(kwargs)
        return {"stages": {}, "total": 0}

    monkeypatch.setattr(pipeline_api, "get_grouped", _fake_get_grouped)
    client = build_client()
    response = client.get("/api/pipeline?limit=777")
    assert response.status_code == 200
    assert captured["limit"] == 777


def test_get_summary_ok(monkeypatch):
    monkeypatch.setattr(
        pipeline_api,
        "get_summary",
        lambda **kwargs: {"total": 3, "overall_conversion": 20.0, "stages": []},
    )
    client = build_client()
    response = client.get("/api/pipeline/summary?period=30")
    assert response.status_code == 200
    assert response.json()["overall_conversion"] == 20.0


def test_move_pipeline_ok(monkeypatch):
    monkeypatch.setattr(
        pipeline_api,
        "move_stage",
        lambda **kwargs: {"lead_id": kwargs["lead_id"], "funnel_status": kwargs["to_status"]},
    )
    client = build_client()
    response = client.patch("/api/pipeline/7/move", json={"to_status": "contactado"})
    assert response.status_code == 200
    assert response.json()["pipeline"]["funnel_status"] == "contactado"


def test_move_pipeline_validation_error(monkeypatch):
    def _raise(**kwargs):
        raise ValueError("Transição inválida: novo -> convertido")

    monkeypatch.setattr(pipeline_api, "move_stage", _raise)
    client = build_client()
    response = client.patch("/api/pipeline/7/move", json={"to_status": "convertido"})
    assert response.status_code == 400


def test_history_ok(monkeypatch):
    monkeypatch.setattr(
        pipeline_api,
        "get_history",
        lambda **kwargs: [{"lead_id": 1, "from": "novo", "to": "contactado"}],
    )
    client = build_client()
    response = client.get("/api/pipeline/history?limit=5")
    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 1
    assert payload["history"][0]["to"] == "contactado"


def test_pipeline_internal_error_is_sanitized(monkeypatch):
    def _raise(**kwargs):
        raise RuntimeError("db down")

    monkeypatch.setattr(pipeline_api, "get_grouped", _raise)
    client = build_client()
    response = client.get("/api/pipeline")
    assert response.status_code == 500
    assert response.json()["detail"] == "Erro interno ao processar a solicitação."
