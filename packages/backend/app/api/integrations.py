from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..integrations import (
    CONTRACT_VERSION,
    LATEST_CONTRACT_VERSION,
    contract_compatibility,
    contract_descriptor,
    normalize_contract_version,
    supported_contract_versions,
    integration_readiness_snapshot,
)
from ..integrations.contracts import OutboundMessage, to_dict
from ..integrations.registry import get_messaging_provider
from ..services.messaging_receipts_service import list_receipt_events, register_receipt_event


router = APIRouter()


class SendMessagePayload(BaseModel):
    lead_id: str = Field(..., min_length=1)
    to: str = Field(..., min_length=3)
    content: str = Field(..., min_length=1, max_length=4000)
    template_id: str | None = None
    metadata: dict = Field(default_factory=dict)
    dry_run: bool = True
    provider: str | None = None


class ReceiptPayload(BaseModel):
    version: str | None = "1.1.0"
    event_type: Literal["delivered", "failed", "replied"]
    external_id: str = Field(..., min_length=1)
    provider: str = Field(..., min_length=1)
    lead_id: str | None = None
    campaign_id: str | None = None
    to: str | None = None
    occurred_at: datetime | None = None
    status_detail: str | None = Field(default=None, max_length=500)
    metadata: dict = Field(default_factory=dict)


@router.get("/contracts")
def get_integration_contracts(version: str | None = None, include_compat: bool = True):
    try:
        selected_version = normalize_contract_version(version)
        payload = {
            "status": "ok",
            "contract": contract_descriptor(selected_version),
            "readiness": integration_readiness_snapshot(),
            "version": selected_version,
            "default_version": CONTRACT_VERSION,
            "latest_version": LATEST_CONTRACT_VERSION,
            "supported_versions": supported_contract_versions(),
        }
        if include_compat:
            payload["compatibility"] = contract_compatibility()
        return payload
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/messaging/receipts")
def post_messaging_receipt(payload: ReceiptPayload):
    try:
        selected_version = normalize_contract_version(payload.version)
        occurred_at = payload.occurred_at or datetime.now(tz=timezone.utc)
        event, deduplicated = register_receipt_event(
            {
                "version": selected_version,
                "event_type": payload.event_type,
                "external_id": payload.external_id,
                "provider": payload.provider,
                "lead_id": payload.lead_id,
                "campaign_id": payload.campaign_id,
                "to": payload.to,
                "occurred_at": occurred_at.isoformat(),
                "status_detail": payload.status_detail,
                "metadata": payload.metadata or {},
            }
        )
        return {"status": "ok", "event": event, "idempotent": deduplicated}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/messaging/receipts")
def get_messaging_receipts(limit: int = 20):
    try:
        return {"status": "ok", "events": list_receipt_events(limit)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/messaging/send")
def post_messaging_send(payload: SendMessagePayload):
    try:
        message = OutboundMessage(
            lead_id=payload.lead_id,
            channel="whatsapp",
            to=payload.to,
            content=payload.content,
            template_id=payload.template_id,
            metadata=payload.metadata or {},
        )

        provider = get_messaging_provider(payload.provider)
        if payload.dry_run:
            occurred_at = datetime.now(tz=timezone.utc)
            return {
                "status": "ok",
                "mode": "dry_run",
                "provider": provider.provider_name,
                "receipt": {
                    "external_id": f"dryrun-{payload.lead_id}-{int(occurred_at.timestamp())}",
                    "status": "queued",
                    "provider": provider.provider_name,
                    "occurred_at": occurred_at.isoformat(),
                    "metadata": {"note": "dry_run"},
                },
                "message": to_dict(message),
            }

        receipt = provider.send(message)
        return {
            "status": "ok",
            "mode": "live",
            "provider": provider.provider_name,
            "receipt": to_dict(receipt),
            "message": to_dict(message),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
