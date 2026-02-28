from datetime import datetime, timezone

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


router = APIRouter()


class SendMessagePayload(BaseModel):
    lead_id: str = Field(..., min_length=1)
    to: str = Field(..., min_length=3)
    content: str = Field(..., min_length=1, max_length=4000)
    template_id: str | None = None
    metadata: dict = Field(default_factory=dict)
    dry_run: bool = True
    provider: str | None = None


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
