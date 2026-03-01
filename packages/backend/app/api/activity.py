from fastapi import APIRouter, HTTPException, Query
from ..services.dashboard_service import (
    MAX_ACTIVITY_QUERY_LIMIT,
    list_activity_events,
)
from ..services.retention_jobs_service import get_retention_job_status


router = APIRouter()


@router.get("")
@router.get("/")
def get_activity(limit: int = Query(default=20, ge=1), retention_days: int | None = Query(default=None, ge=1)):
    try:
        applied_limit = max(1, min(limit, MAX_ACTIVITY_QUERY_LIMIT))
        return {
            "status": "ok",
            "events": list_activity_events(applied_limit),
            "applied_limit": applied_limit,
            "retention_pruned": 0,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/retention-job")
def get_activity_retention_job_status():
    try:
        return {"status": "ok", "job": get_retention_job_status()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
