from fastapi import APIRouter, HTTPException, Query
from ..services.dashboard_service import list_activity_events


router = APIRouter()


@router.get("")
@router.get("/")
def get_activity(limit: int = Query(default=20, ge=1, le=50)):
    try:
        return {"status": "ok", "events": list_activity_events(limit)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
