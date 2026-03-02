import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .error_utils import raise_bad_request, raise_internal_error, raise_not_found
from ..services.pipeline_service import get_grouped, get_history, get_summary, move_stage


router = APIRouter()
logger = logging.getLogger(__name__)


class MoveStagePayload(BaseModel):
    to_status: str = Field(..., min_length=2, max_length=30)
    moved_by: str | None = Field(default=None, max_length=100)
    loss_reason: str | None = Field(default=None, max_length=100)
    loss_reason_detail: str | None = Field(default=None, max_length=500)


@router.get("/")
def pipeline_list(
    period: int | None = Query(default=None, ge=1, le=365),
    limit: int = Query(default=1000, ge=1, le=10000),
):
    try:
        return get_grouped(period_days=period, limit=limit)
    except Exception as exc:
        raise_internal_error(context="pipeline_list", exc=exc, code="pipeline_list_error")


@router.get("/summary")
def pipeline_summary(period: int | None = Query(default=None, ge=1, le=365)):
    try:
        return get_summary(period_days=period)
    except Exception as exc:
        raise_internal_error(context="pipeline_summary", exc=exc, code="pipeline_summary_error")


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
            raise_not_found("Lead not found in pipeline", code="pipeline_lead_not_found")
        return {"status": "ok", "pipeline": updated}
    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning("pipeline_move validation failed lead_id=%s: %s", lead_id, exc)
        raise_bad_request(str(exc), code="pipeline_move_validation")
    except Exception as exc:
        raise_internal_error(context=f"pipeline_move lead_id={lead_id}", exc=exc, code="pipeline_move_error")


@router.get("/history")
def pipeline_history(limit: int = Query(default=50, ge=1, le=200)):
    try:
        history = get_history(limit=limit)
        return {"history": history, "count": len(history)}
    except Exception as exc:
        raise_internal_error(context="pipeline_history", exc=exc, code="pipeline_history_error")
