from fastapi import APIRouter, HTTPException

from ..integrations import (
    CONTRACT_VERSION,
    LATEST_CONTRACT_VERSION,
    contract_compatibility,
    contract_descriptor,
    normalize_contract_version,
    supported_contract_versions,
    integration_readiness_snapshot,
)


router = APIRouter()


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
