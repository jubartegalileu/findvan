from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import integrations as integrations_api


def build_client() -> TestClient:
    app = FastAPI()
    app.include_router(integrations_api.router, prefix="/api/integrations")
    return TestClient(app)


def test_messaging_send_dry_run_ok(monkeypatch):
    class StubProvider:
        provider_name = "noop"

    monkeypatch.setattr(integrations_api, "get_messaging_provider", lambda provider=None: StubProvider())

    client = build_client()
    response = client.post(
        "/api/integrations/messaging/send",
        json={
            "lead_id": "123",
            "to": "+5511999999999",
            "content": "Olá",
            "dry_run": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["mode"] == "dry_run"
    assert payload["provider"] == "noop"


def test_messaging_send_live_maps_provider_runtime_error_to_502(monkeypatch):
    class StubProvider:
        provider_name = "twilio"

        def send(self, message):
            raise RuntimeError("Twilio error (401): unauthorized")

    monkeypatch.setattr(integrations_api, "get_messaging_provider", lambda provider=None: StubProvider())

    client = build_client()
    response = client.post(
        "/api/integrations/messaging/send",
        json={
            "lead_id": "123",
            "to": "+5511999999999",
            "content": "Olá",
            "dry_run": False,
            "provider": "twilio",
        },
    )

    assert response.status_code == 502
    assert "Twilio error" in response.json()["detail"]
