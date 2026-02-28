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
    assert payload["idempotent"] is False
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


def test_messaging_receipt_duplicate_event_is_idempotent():
    client = build_client()
    first = client.post(
        "/api/integrations/messaging/receipts",
        json={
            "version": "1.1",
            "event_type": "delivered",
            "external_id": "SM-777",
            "provider": "twilio",
            "lead_id": "42",
        },
    )
    assert first.status_code == 200
    first_payload = first.json()
    assert first_payload["idempotent"] is False

    duplicate = client.post(
        "/api/integrations/messaging/receipts",
        json={
            "version": "1.1",
            "event_type": "delivered",
            "external_id": "SM-777",
            "provider": "twilio",
            "lead_id": "42",
        },
    )
    assert duplicate.status_code == 200
    duplicate_payload = duplicate.json()
    assert duplicate_payload["idempotent"] is True
    assert duplicate_payload["event"]["received_at"] == first_payload["event"]["received_at"]

    listed = client.get("/api/integrations/messaging/receipts?limit=5")
    assert listed.status_code == 200
    assert len(listed.json()["events"]) == 1


def test_messaging_receipt_allows_same_external_id_for_different_event_type():
    client = build_client()
    delivered = client.post(
        "/api/integrations/messaging/receipts",
        json={
            "version": "1.1",
            "event_type": "delivered",
            "external_id": "SM-888",
            "provider": "twilio",
        },
    )
    failed = client.post(
        "/api/integrations/messaging/receipts",
        json={
            "version": "1.1",
            "event_type": "failed",
            "external_id": "SM-888",
            "provider": "twilio",
        },
    )

    assert delivered.status_code == 200
    assert failed.status_code == 200
    assert delivered.json()["idempotent"] is False
    assert failed.json()["idempotent"] is False

    listed = client.get("/api/integrations/messaging/receipts?limit=5")
    assert listed.status_code == 200
    payload = listed.json()
    assert len(payload["events"]) == 2
    assert {payload["events"][0]["event_type"], payload["events"][1]["event_type"]} == {"delivered", "failed"}
