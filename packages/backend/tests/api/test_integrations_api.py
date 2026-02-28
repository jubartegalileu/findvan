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
    assert "whatsapp" in payload["contract"]["messaging"]["channels"]
    assert "google_maps" in payload["contract"]["osint"]["sources"]
    assert payload["readiness"]["compatibility_mode"] == "backward-compatible"
