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
from ..services.operational_telemetry_service import (
    INCIDENT_CLASSIFIER_VERSION,
    build_guardrails,
    build_postmortem_readiness,
    list_incidents,
    list_playbook_executions,
    list_playbooks,
    register_playbook_execution,
)
from ..services.retention_jobs_service import get_retention_job_status


router = APIRouter()


class ThresholdsUpdatePayload(BaseModel):
    author: str = Field(default="system", min_length=1, max_length=80)
    thresholds: dict = Field(default_factory=dict)


class PlaybookExecutionPayload(BaseModel):
    playbook_key: str = Field(..., min_length=2, max_length=120)
    author: str = Field(default="system", min_length=1, max_length=100)
    incident_id: int | None = None
    result: str = Field(default="started", min_length=3, max_length=30)
    note: str | None = Field(default=None, max_length=2000)
    evidence: dict = Field(default_factory=dict)


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


@router.get("/recovery-policies")
def dashboard_recovery_policies():
    try:
        alerting = get_alerting_status()
        retention = get_retention_job_status()
        return {
            "status": "ok",
            "policies": {
                "alerting": alerting.get("self_healing") or {},
                "retention": retention.get("self_healing") or {},
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/operational-telemetry")
def dashboard_operational_telemetry(limit: int = Query(default=10, ge=1, le=50), offset: int = Query(default=0, ge=0)):
    try:
        alerting = get_alerting_status()
        retention = get_retention_job_status()
        incidents = list_incidents(limit=limit, offset=offset)
        metrics = {
            "alerting": {
                "fallback_count": int(alerting.get("fallback_count") or 0),
                "suppressed_count": int(alerting.get("suppressed_count") or 0),
                "sent_count": int(alerting.get("sent_count") or 0),
                "queued_count": int(alerting.get("queued_count") or 0),
                "self_healing": alerting.get("self_healing") or {},
            },
            "retention": {
                "run_count": int(retention.get("run_count") or 0),
                "fail_count": int(retention.get("fail_count") or 0),
                "last_error": retention.get("last_error"),
                "owner": retention.get("owner"),
                "self_healing": retention.get("self_healing") or {},
            },
        }
        return {
            "status": "ok",
            "metrics": metrics,
            "incidents": incidents,
            "applied_limit": limit,
            "applied_offset": offset,
            "classifier_version": INCIDENT_CLASSIFIER_VERSION,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/guardrails")
def dashboard_guardrails(limit: int = Query(default=10, ge=1, le=50), offset: int = Query(default=0, ge=0)):
    try:
        alerting = get_alerting_status()
        retention = get_retention_job_status()
        incidents = list_incidents(limit=max(limit + offset, limit), offset=0)
        guardrails = build_guardrails(
            incidents=incidents,
            alerting_metrics=alerting,
            retention_metrics=retention,
            limit=max(limit + offset, limit),
        )
        sliced = guardrails[offset : offset + limit]
        return {
            "status": "ok",
            "guardrails": sliced,
            "applied_limit": limit,
            "applied_offset": offset,
            "classifier_version": INCIDENT_CLASSIFIER_VERSION,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/playbooks")
def dashboard_playbooks(
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    component: str | None = Query(default=None),
):
    try:
        playbooks = list_playbooks(limit=limit, offset=offset, component=component)
        return {
            "status": "ok",
            "playbooks": playbooks,
            "applied_limit": limit,
            "applied_offset": offset,
            "component": component,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/playbooks/executions")
def dashboard_playbook_executions(
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    playbook_key: str | None = Query(default=None),
):
    try:
        executions = list_playbook_executions(limit=limit, offset=offset, playbook_key=playbook_key)
        return {
            "status": "ok",
            "executions": executions,
            "applied_limit": limit,
            "applied_offset": offset,
            "playbook_key": playbook_key,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/playbooks/executions")
def dashboard_playbook_execution_create(payload: PlaybookExecutionPayload):
    try:
        execution = register_playbook_execution(
            playbook_key=payload.playbook_key,
            author=payload.author,
            incident_id=payload.incident_id,
            result=payload.result,
            note=payload.note,
            evidence=payload.evidence,
        )
        return {"status": "ok", "execution": execution}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/postmortem-readiness")
def dashboard_postmortem_readiness(limit: int = Query(default=10, ge=1, le=50), offset: int = Query(default=0, ge=0)):
    try:
        readiness = build_postmortem_readiness(limit=limit, offset=offset)
        return {"status": "ok", **readiness}
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
