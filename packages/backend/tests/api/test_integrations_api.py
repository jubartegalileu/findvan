from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import integrations as integrations_api


def build_client() -> TestClient:
    app = FastAPI()
    app.include_router(integrations_api.router, prefix="/api/integrations")
    return TestClient(app)


def test_integration_contracts_endpoint_ok():
    client = build_client()
    response = client.get("/api/integrations/contracts")
    assert response.status_code == 200

    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["contract"]["version"] == "1.0.0"
    assert payload["version"] == "1.0.0"
    assert payload["latest_version"] == "1.1.0"
    assert "whatsapp" in payload["contract"]["messaging"]["channels"]
    assert "google_maps" in payload["contract"]["osint"]["sources"]
    assert payload["readiness"]["compatibility_mode"] == "backward-compatible"
    assert payload["compatibility"]["backward_compatible"] is True


def test_integration_contracts_endpoint_accepts_v1_1():
    client = build_client()
    response = client.get("/api/integrations/contracts?version=1.1")
    assert response.status_code == 200

    payload = response.json()
    assert payload["version"] == "1.1.0"
    assert payload["contract"]["version"] == "1.1.0"
    assert "idempotency_key" in payload["contract"]["messaging"]["optional_fields"]
    assert "replied" in payload["contract"]["messaging"]["receipt_events"]
    assert "confidence_score" in payload["contract"]["osint"]["recommended_fields"]


def test_integration_contracts_endpoint_rejects_unsupported_version():
    client = build_client()
    response = client.get("/api/integrations/contracts?version=2.0")
    assert response.status_code == 400
    assert response.json()["detail"] == "Unsupported contract version."
