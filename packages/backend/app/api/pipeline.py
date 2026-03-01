from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..services.pipeline_service import get_grouped, get_history, get_summary, move_stage


router = APIRouter()


class MoveStagePayload(BaseModel):
    to_status: str = Field(..., min_length=2, max_length=30)
    moved_by: str | None = Field(default=None, max_length=100)
    loss_reason: str | None = Field(default=None, max_length=100)
    loss_reason_detail: str | None = Field(default=None, max_length=500)


@router.get("/")
def pipeline_list(period: int | None = Query(default=None, ge=1, le=365)):
    try:
        return get_grouped(period_days=period)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/summary")
def pipeline_summary(period: int | None = Query(default=None, ge=1, le=365)):
    try:
        return get_summary(period_days=period)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/{lead_id}/move")
def pipeline_move(lead_id: int, payload: MoveStagePayload):
    try:
        updated = move_stage(
            lead_id=lead_id,
            to_status=payload.to_status,
            moved_by=payload.moved_by,
            loss_reason=payload.loss_reason,
            loss_reason_detail=payload.loss_reason_detail,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Lead not found in pipeline")
        return {"status": "ok", "pipeline": updated}
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/history")
def pipeline_history(limit: int = Query(default=50, ge=1, le=200)):
    try:
        history = get_history(limit=limit)
        return {"history": history, "count": len(history)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
