from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services.leads_service import (
    delete_lead,
    get_lead_by_id,
    list_leads,
    update_lead,
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


@router.delete("/{lead_id}")
def remove_lead(lead_id: int):
    deleted = delete_lead(lead_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"status": "ok"}
