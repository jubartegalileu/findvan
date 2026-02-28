from fastapi import APIRouter, HTTPException, Query
from ..services.dashboard_service import (
    MAX_ACTIVITY_QUERY_LIMIT,
    list_activity_events,
    prune_old_activity_events,
)


router = APIRouter()


@router.get("")
@router.get("/")
def get_activity(limit: int = Query(default=20, ge=1), retention_days: int | None = Query(default=None, ge=1)):
    try:
        applied_limit = max(1, min(limit, MAX_ACTIVITY_QUERY_LIMIT))
        pruned = prune_old_activity_events(retention_days=retention_days)
        return {
            "status": "ok",
            "events": list_activity_events(applied_limit),
            "applied_limit": applied_limit,
            "retention_pruned": pruned,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
