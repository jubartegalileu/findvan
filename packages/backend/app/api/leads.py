from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services.leads_service import (
    add_lead_note,
    batch_soft_delete,
    batch_update_campaign,
    delete_lead,
    list_lead_notes,
    get_leads_by_ids,
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
    next_action_date: str | None = None
    next_action_description: str | None = None
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


class BatchIdsRequest(BaseModel):
    ids: list[int]


class BatchCampaignRequest(BaseModel):
    ids: list[int]
    campaign_status: str


class BatchStatusRequest(BaseModel):
    ids: list[int]
    new_status: str
    loss_reason: str | None = None
    loss_reason_other: str | None = None
    author: str | None = None


class LeadNoteRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
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


@router.patch("/{lead_id}/status")
def patch_status_alias(lead_id: int, payload: FunnelStatusRequest):
    # API alias to preserve compatibility with PRD naming.
    return patch_funnel_status(lead_id, payload)


@router.get("/{lead_id}/transitions")
def get_transitions(lead_id: int):
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    current = lead.get("funnel_status") or "novo"
    return {"status": "ok", "current": current, "transitions": get_valid_transitions(current)}


@router.get("/{lead_id}/interactions")
def get_interactions(lead_id: int, limit: int = 30):
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"interactions": get_lead_interactions(lead_id, limit)}


@router.get("/{lead_id}/notes")
def get_notes(lead_id: int, limit: int = 50):
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"notes": list_lead_notes(lead_id, limit)}


@router.post("/{lead_id}/notes")
def post_note(lead_id: int, payload: LeadNoteRequest):
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    note = add_lead_note(lead_id, payload.content.strip(), payload.author)
    return {"status": "ok", "note": note}


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


@router.post("/batch/campaign")
def post_batch_campaign(payload: BatchCampaignRequest):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Nenhum lead selecionado.")
    result = batch_update_campaign(payload.ids, payload.campaign_status)
    return {"status": "ok", **result}


@router.post("/batch/delete")
def post_batch_delete(payload: BatchIdsRequest):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Nenhum lead selecionado.")
    result = batch_soft_delete(payload.ids)
    return {"status": "ok", **result}


@router.post("/batch/export")
def post_batch_export(payload: BatchIdsRequest):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Nenhum lead selecionado.")
    leads = get_leads_by_ids(payload.ids)
    return {"status": "ok", "leads": leads}


@router.post("/batch/status")
def post_batch_status(payload: BatchStatusRequest):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Nenhum lead selecionado.")
    updated = 0
    errors: list[dict] = []
    for lead_id in payload.ids:
        try:
            result = change_status(
                lead_id=lead_id,
                new_status=payload.new_status,
                loss_reason=payload.loss_reason,
                loss_reason_other=payload.loss_reason_other,
                author=payload.author or "batch",
            )
            if result:
                updated += 1
            else:
                errors.append({"id": lead_id, "error": "Lead not found"})
        except ValueError as exc:
            errors.append({"id": lead_id, "error": str(exc)})
    return {"status": "ok", "updated": updated, "errors": errors}
