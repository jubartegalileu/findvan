from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services.leads_service import (
    delete_lead,
    get_lead_by_id,
    get_lead_score_breakdown,
    list_leads,
    recalculate_all_scores,
    update_lead,
)
from ..services.funnel_service import (
    LOSS_REASONS,
    change_status,
    get_lead_interactions,
    get_valid_transitions,
)


router = APIRouter()


class LeadsResponse(BaseModel):
    leads: list[dict]


@router.get("/")
def get_leads(limit: int = 50):
    return {"leads": list_leads(limit)}


@router.get("/{lead_id}")
def get_lead(lead_id: int):
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"lead": lead}


@router.get("/{lead_id}/score")
def get_score(lead_id: int):
    score_data = get_lead_score_breakdown(lead_id)
    if not score_data:
        raise HTTPException(status_code=404, detail="Lead not found")
    return score_data


class LeadUpdateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    company_name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str = Field(..., min_length=2)
    state: str | None = Field(default=None, min_length=2, max_length=2)
    cnpj: str | None = None
    url: str | None = None
    funnel_status: str | None = None
    loss_reason: str | None = None
    prospect_status: str = Field(default="nao_contatado")
    prospect_notes: str | None = None
    campaign_status: str | None = None
    is_valid: bool = True
    is_duplicate: bool = False


@router.put("/{lead_id}")
def put_lead(lead_id: int, payload: LeadUpdateRequest):
    updated = update_lead(lead_id, payload.model_dump())
    if not updated:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"lead": updated}


class FunnelStatusRequest(BaseModel):
    new_status: str
    loss_reason: str | None = None
    loss_reason_other: str | None = None
    author: str | None = None


@router.patch("/{lead_id}/funnel-status")
def patch_funnel_status(lead_id: int, payload: FunnelStatusRequest):
    try:
        updated = change_status(
            lead_id=lead_id,
            new_status=payload.new_status,
            loss_reason=payload.loss_reason,
            loss_reason_other=payload.loss_reason_other,
            author=payload.author,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Lead not found")
        return {"status": "ok", "lead": updated}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{lead_id}/interactions")
def get_interactions(lead_id: int, limit: int = 30):
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"interactions": get_lead_interactions(lead_id, limit)}


@router.get("/funnel/meta")
def get_funnel_meta():
    return {
        "statuses": ["novo", "contactado", "respondeu", "interessado", "convertido", "perdido"],
        "loss_reasons": sorted(LOSS_REASONS),
        "transitions": {status: get_valid_transitions(status) for status in ["novo", "contactado", "respondeu", "interessado", "convertido", "perdido"]},
    }


@router.delete("/{lead_id}")
def remove_lead(lead_id: int):
    deleted = delete_lead(lead_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"status": "ok"}


@router.post("/recalculate-scores")
def post_recalculate_scores():
    result = recalculate_all_scores()
    return {"status": "ok", **result}
