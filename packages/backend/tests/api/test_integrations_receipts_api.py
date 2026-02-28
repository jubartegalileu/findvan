from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import integrations as integrations_api
from app.services.messaging_receipts_service import clear_receipt_events


def build_client() -> TestClient:
    app = FastAPI()
    app.include_router(integrations_api.router, prefix="/api/integrations")
    return TestClient(app)


def setup_function():
    clear_receipt_events()


def test_messaging_receipt_accepts_v1_1_payload():
    client = build_client()
    response = client.post(
        "/api/integrations/messaging/receipts",
        json={
            "version": "1.1",
            "event_type": "delivered",
            "external_id": "SM-001",
            "provider": "twilio",
            "lead_id": "123",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["event"]["version"] == "1.1.0"
    assert payload["event"]["event_type"] == "delivered"
    assert payload["event"]["external_id"] == "SM-001"


def test_messaging_receipt_rejects_unsupported_version():
    client = build_client()
    response = client.post(
        "/api/integrations/messaging/receipts",
        json={
            "version": "2.0",
            "event_type": "failed",
            "external_id": "SM-002",
            "provider": "twilio",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unsupported contract version."


def test_messaging_receipt_requires_required_fields():
    client = build_client()
    response = client.post(
        "/api/integrations/messaging/receipts",
        json={"version": "1.1", "event_type": "replied", "provider": "twilio"},
    )

    assert response.status_code == 422


def test_messaging_receipt_list_returns_most_recent_first():
    client = build_client()
    client.post(
        "/api/integrations/messaging/receipts",
        json={
            "version": "1.1",
            "event_type": "delivered",
            "external_id": "SM-001",
            "provider": "twilio",
        },
    )
    client.post(
        "/api/integrations/messaging/receipts",
        json={
            "version": "1.1",
            "event_type": "failed",
            "external_id": "SM-002",
            "provider": "twilio",
            "status_detail": "blocked",
        },
    )

    response = client.get("/api/integrations/messaging/receipts?limit=2")
    assert response.status_code == 200

    payload = response.json()
    assert payload["status"] == "ok"
    assert len(payload["events"]) == 2
    assert payload["events"][0]["external_id"] == "SM-002"
    assert payload["events"][1]["external_id"] == "SM-001"
