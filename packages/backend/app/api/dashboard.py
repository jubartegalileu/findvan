from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from ..services.dashboard_service import (
    get_dashboard_kpis,
    get_funnel_summary,
    get_urgent_actions,
    get_weekly_performance,
)
from ..services.alerts_service import dispatch_slo_alert, get_alerting_status
from ..services.metrics_governance_service import get_active_thresholds, get_threshold_history, update_thresholds


router = APIRouter()


class ThresholdsUpdatePayload(BaseModel):
    author: str = Field(default="system", min_length=1, max_length=80)
    thresholds: dict = Field(default_factory=dict)


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


@router.get("/weekly-performance")
def dashboard_weekly_performance():
    try:
        performance = get_weekly_performance()
        alert_dispatch = {"status": "ignored", "delivery": "none"}
        if performance.get("has_data"):
            alert_dispatch = dispatch_slo_alert(
                performance,
                source="dashboard.weekly-performance",
                window="7d",
            )
        return {"status": "ok", "performance": performance, "alert_dispatch": alert_dispatch}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/alerts/dispatch")
def dashboard_dispatch_alert():
    try:
        performance = get_weekly_performance()
        result = dispatch_slo_alert(
            performance,
            source="dashboard.manual-dispatch",
            window="7d",
        )
        return {"status": "ok", "dispatch": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/alerts/status")
def dashboard_alert_status():
    try:
        return {"status": "ok", "alerting": get_alerting_status()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/metrics-governance")
def dashboard_metrics_governance():
    try:
        return {"status": "ok", "thresholds": get_active_thresholds()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/metrics-governance/history")
def dashboard_metrics_governance_history(limit: int = Query(default=20, ge=1, le=100)):
    try:
        return {"status": "ok", "history": get_threshold_history(limit=limit)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/metrics-governance")
def dashboard_metrics_governance_update(payload: ThresholdsUpdatePayload):
    try:
        result = update_thresholds(payload.thresholds, author=payload.author)
        return {"status": "ok", "result": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
