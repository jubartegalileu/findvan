from fastapi import APIRouter, HTTPException

from ..integrations import CONTRACT_VERSION, contract_descriptor, integration_readiness_snapshot


router = APIRouter()


@router.get("/contracts")
def get_integration_contracts():
    try:
        return {
            "status": "ok",
            "contract": contract_descriptor(),
            "readiness": integration_readiness_snapshot(),
            "version": CONTRACT_VERSION,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
