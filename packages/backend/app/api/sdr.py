import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .error_utils import raise_bad_request, raise_internal_error, raise_not_found
from ..services.sdr_service import (
    add_note,
    assign_owner,
    assign_owner_batch,
    get_queue,
    get_stats_by_assignee,
    register_action,
    register_action_batch,
)


router = APIRouter()
logger = logging.getLogger(__name__)


class SDRActionPayload(BaseModel):
    action_type: str = Field(default="done", min_length=2, max_length=40)
    notes: str | None = Field(default=None, max_length=2000)
    author: str | None = Field(default=None, max_length=100)
    next_action_date: str | None = None
    next_action_description: str | None = Field(default=None, max_length=500)
    cadence_days: int = Field(default=1, ge=1, le=30)


class SDRNotePayload(BaseModel):
    note: str = Field(..., min_length=1, max_length=2000)
    author: str | None = Field(default=None, max_length=100)


class SDRAssignPayload(BaseModel):
    assigned_to: str = Field(..., min_length=1, max_length=100)
    author: str | None = Field(default=None, max_length=100)


class SDRAssignBatchPayload(BaseModel):
    lead_ids: list[int] = Field(..., min_length=1, max_length=500)
    assigned_to: str = Field(..., min_length=1, max_length=100)
    author: str | None = Field(default=None, max_length=100)


class SDRActionBatchPayload(BaseModel):
    lead_ids: list[int] = Field(..., min_length=1, max_length=500)
    action_type: str = Field(default="done", min_length=2, max_length=40)
    author: str | None = Field(default=None, max_length=100)
    next_action_date: str | None = None
    next_action_description: str | None = Field(default=None, max_length=500)
    cadence_days: int = Field(default=1, ge=1, le=30)


@router.get("/queue")
def sdr_queue(
    city: str | None = None,
    assigned_to: str | None = Query(default=None, max_length=100),
    prospect_status: str | None = None,
    cadence: str | None = Query(default=None, description="overdue|today|planned"),
    score_min: int | None = Query(default=None, ge=0, le=100),
    score_max: int | None = Query(default=None, ge=0, le=100),
    limit: int = Query(default=500, ge=1, le=5000),
):
    try:
        queue = get_queue(
            city=city,
            assigned_to=assigned_to,
            prospect_status=prospect_status,
            cadence=cadence,
            score_min=score_min,
            score_max=score_max,
            limit=limit,
        )
        return {"queue": queue, "count": len(queue)}
    except ValueError as exc:
        logger.warning("sdr_queue validation failed: %s", exc)
        raise_bad_request(str(exc), code="sdr_queue_validation")
    except Exception as exc:
        raise_internal_error(context="sdr_queue", exc=exc, code="sdr_queue_error")


@router.patch("/{lead_id}/action")
def sdr_action(lead_id: int, payload: SDRActionPayload):
    try:
        updated = register_action(
            lead_id=lead_id,
            action_type=payload.action_type,
            notes=payload.notes,
            author=payload.author,
            next_action_date=payload.next_action_date,
            next_action_description=payload.next_action_description,
            cadence_days=payload.cadence_days,
        )
        if not updated:
            raise_not_found("Lead not found in SDR queue", code="sdr_lead_not_found")
        return {"status": "ok", "sdr": updated}
    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning("sdr_action validation failed lead_id=%s: %s", lead_id, exc)
        raise_bad_request(str(exc), code="sdr_action_validation")
    except Exception as exc:
        raise_internal_error(context=f"sdr_action lead_id={lead_id}", exc=exc, code="sdr_action_error")


@router.patch("/{lead_id}/notes")
def sdr_notes(lead_id: int, payload: SDRNotePayload):
    try:
        updated = add_note(lead_id=lead_id, note=payload.note.strip(), author=payload.author)
        if not updated:
            raise_not_found("Lead not found in SDR queue", code="sdr_lead_not_found")
        return {"status": "ok", **updated}
    except HTTPException:
        raise
    except Exception as exc:
        raise_internal_error(context=f"sdr_notes lead_id={lead_id}", exc=exc, code="sdr_notes_error")


@router.get("/stats")
def sdr_stats(assigned_to: str | None = Query(default=None, max_length=100)):
    try:
        return get_stats_by_assignee(assigned_to=assigned_to)
    except Exception as exc:
        raise_internal_error(context="sdr_stats", exc=exc, code="sdr_stats_error")


@router.patch("/{lead_id}/assign")
def sdr_assign(lead_id: int, payload: SDRAssignPayload):
    try:
        updated = assign_owner(lead_id=lead_id, assigned_to=payload.assigned_to, author=payload.author)
        if not updated:
            raise_not_found("Lead not found in SDR queue", code="sdr_lead_not_found")
        return {"status": "ok", **updated}
    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning("sdr_assign validation failed lead_id=%s: %s", lead_id, exc)
        raise_bad_request(str(exc), code="sdr_assign_validation")
    except Exception as exc:
        raise_internal_error(context=f"sdr_assign lead_id={lead_id}", exc=exc, code="sdr_assign_error")


@router.patch("/assign/batch")
def sdr_assign_batch(payload: SDRAssignBatchPayload):
    try:
        updated = assign_owner_batch(
            lead_ids=payload.lead_ids,
            assigned_to=payload.assigned_to,
            author=payload.author,
        )
        if updated["updated_count"] == 0:
            raise_not_found("Nenhum lead encontrado para atribuição", code="sdr_lead_not_found")
        return {"status": "ok", **updated}
    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning("sdr_assign_batch validation failed: %s", exc)
        raise_bad_request(str(exc), code="sdr_assign_batch_validation")
    except Exception as exc:
        raise_internal_error(context="sdr_assign_batch", exc=exc, code="sdr_assign_batch_error")


@router.patch("/action/batch")
def sdr_action_batch(payload: SDRActionBatchPayload):
    try:
        updated = register_action_batch(
            lead_ids=payload.lead_ids,
            action_type=payload.action_type,
            author=payload.author,
            next_action_date=payload.next_action_date,
            next_action_description=payload.next_action_description,
            cadence_days=payload.cadence_days,
        )
        if updated["updated_count"] == 0:
            raise_not_found("Nenhum lead encontrado para ação em lote", code="sdr_lead_not_found")
        return {"status": "ok", **updated}
    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning("sdr_action_batch validation failed: %s", exc)
        raise_bad_request(str(exc), code="sdr_action_batch_validation")
    except Exception as exc:
        raise_internal_error(context="sdr_action_batch", exc=exc, code="sdr_action_batch_error")
