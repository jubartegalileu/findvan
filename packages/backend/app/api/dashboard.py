from fastapi import APIRouter, HTTPException
from ..services.dashboard_service import (
    get_dashboard_kpis,
    get_funnel_summary,
    get_urgent_actions,
)


router = APIRouter()


@router.get("/kpis")
def dashboard_kpis():
    try:
        return {"status": "ok", "kpis": get_dashboard_kpis()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/funnel-summary")
def dashboard_funnel_summary():
    try:
        return {"status": "ok", "summary": get_funnel_summary()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/urgent-actions")
def dashboard_urgent_actions():
    try:
        return {"status": "ok", "urgent_actions": get_urgent_actions()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
