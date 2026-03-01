from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..services.sdr_service import add_note, get_queue, get_stats, register_action


router = APIRouter()


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


@router.get("/queue")
def sdr_queue(
    city: str | None = None,
    prospect_status: str | None = None,
    cadence: str | None = Query(default=None, description="overdue|today|planned"),
    score_min: int | None = Query(default=None, ge=0, le=100),
    score_max: int | None = Query(default=None, ge=0, le=100),
):
    try:
        queue = get_queue(
            city=city,
            prospect_status=prospect_status,
            cadence=cadence,
            score_min=score_min,
            score_max=score_max,
        )
        return {"queue": queue, "count": len(queue)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


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
            raise HTTPException(status_code=404, detail="Lead not found in SDR queue")
        return {"status": "ok", "sdr": updated}
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/{lead_id}/notes")
def sdr_notes(lead_id: int, payload: SDRNotePayload):
    try:
        updated = add_note(lead_id=lead_id, note=payload.note.strip(), author=payload.author)
        if not updated:
            raise HTTPException(status_code=404, detail="Lead not found in SDR queue")
        return {"status": "ok", **updated}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/stats")
def sdr_stats():
    try:
        return get_stats()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
