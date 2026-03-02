import csv
import json
import re
import unicodedata
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from ..services.leads_service import (
    add_lead_tag,
    add_lead_note,
    batch_add_tag,
    batch_soft_delete,
    batch_update_campaign,
    create_lead,
    delete_lead,
    list_lead_notes,
    remove_lead_tag,
    get_leads_by_ids,
    get_lead_by_id,
    get_lead_score_breakdown,
    recalculate_lead_score,
    list_leads,
    normalize_funnel_status,
    normalize_leads_consistency,
    recalculate_all_scores,
    insert_leads,
    update_lead,
)
from ..services.funnel_service import (
    FUNNEL_STATUSES,
    FUNNEL_STATUS_LABELS,
    LOSS_REASON_LABELS,
    LOSS_REASON_OPTIONS,
    change_status,
    get_lead_interactions,
    get_valid_transitions,
)


router = APIRouter()
ALLOWED_FUNNEL_STATUSES = set(FUNNEL_STATUSES)
FIELD_ALIASES = {
    "source": ("source", "fonte", "origem"),
    "name": ("name", "nome", "contato", "lead"),
    "company_name": ("company_name", "empresa", "razao_social", "razaosocial", "business_name"),
    "phone": ("phone", "telefone", "whatsapp", "celular", "mobile"),
    "email": ("email", "e-mail", "mail"),
    "address": ("address", "endereco", "logradouro", "rua"),
    "city": ("city", "cidade", "municipio"),
    "state": ("state", "uf", "estado"),
    "cnpj": ("cnpj", "documento"),
    "url": ("url", "site", "website", "link"),
    "funnel_status": ("funnel_status", "status", "status_funil"),
    "loss_reason": ("loss_reason", "motivo_perda", "reason"),
    "prospect_status": ("prospect_status", "status_prospeccao"),
    "prospect_notes": ("prospect_notes", "observacoes", "obs", "notas"),
    "campaign_status": ("campaign_status", "status_campanha"),
    "captured_at": ("captured_at", "capturado_em", "data_captura"),
    "next_action_date": ("next_action_date", "proxima_acao_data"),
    "next_action_description": ("next_action_description", "proxima_acao_descricao"),
    "is_valid": ("is_valid", "valid", "valido"),
    "is_duplicate": ("is_duplicate", "duplicate", "duplicado"),
}
_HEADER_TO_FIELD = {
    re.sub(r"[^a-z0-9_]", "", alias): field
    for field, aliases in FIELD_ALIASES.items()
    for alias in aliases
}


def _normalize_header(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.strip().lower().replace(" ", "_").replace("-", "_")
    return re.sub(r"[^a-z0-9_]", "", normalized)


def _coerce_text(value: object) -> str | None:
    text = str(value or "").strip()
    return text or None


def _coerce_bool(value: object, *, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    text = str(value or "").strip().lower()
    if not text:
        return default
    return text in {"1", "true", "sim", "yes", "y", "s"}


def _normalize_row(raw_row: dict) -> dict:
    normalized: dict[str, object] = {}
    for raw_key, raw_value in raw_row.items():
        key = _HEADER_TO_FIELD.get(_normalize_header(raw_key))
        if not key:
            continue
        if key in {"is_valid", "is_duplicate"}:
            normalized[key] = raw_value
            continue
        normalized[key] = _coerce_text(raw_value)

    source = str(normalized.get("source") or "import").strip().lower() or "import"
    source = re.sub(r"\s+", "_", source)[:50]
    phone = re.sub(r"\D+", "", str(normalized.get("phone") or ""))[:15] or None
    email = str(normalized.get("email") or "").strip().lower() or None
    state = str(normalized.get("state") or "").strip().upper()[:2] or None
    url = str(normalized.get("url") or "").strip() or None
    company_name = str(normalized.get("company_name") or "").strip() or None
    name = str(normalized.get("name") or "").strip() or company_name or None
    city = str(normalized.get("city") or "").strip() or None

    return {
        "source": source,
        "name": name,
        "company_name": company_name or name,
        "phone": phone,
        "email": email,
        "address": normalized.get("address"),
        "city": city,
        "state": state,
        "cnpj": normalized.get("cnpj"),
        "url": url,
        "funnel_status": normalized.get("funnel_status"),
        "loss_reason": normalized.get("loss_reason"),
        "prospect_status": normalized.get("prospect_status"),
        "prospect_notes": normalized.get("prospect_notes"),
        "campaign_status": normalized.get("campaign_status"),
        "captured_at": normalized.get("captured_at"),
        "next_action_date": normalized.get("next_action_date"),
        "next_action_description": normalized.get("next_action_description"),
        "is_valid": _coerce_bool(normalized.get("is_valid"), default=True),
        "is_duplicate": _coerce_bool(normalized.get("is_duplicate"), default=False),
    }


def _lead_fingerprint(lead: dict) -> tuple:
    source = str(lead.get("source") or "import")
    if lead.get("phone"):
        return ("phone", source, str(lead["phone"]))
    if lead.get("email"):
        return ("email", source, str(lead["email"]).lower())
    if lead.get("url"):
        return ("url", source, str(lead["url"]).strip().lower().rstrip("/"))
    return (
        "name_city",
        source,
        str(lead.get("name") or "").strip().lower(),
        str(lead.get("city") or "").strip().lower(),
    )


def _rows_from_upload(file: UploadFile, raw: bytes) -> list[dict]:
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    is_json = filename.endswith(".json") or "json" in content_type
    is_csv = filename.endswith(".csv") or "csv" in content_type or content_type in {"text/plain", ""}
    if is_json:
        payload = json.loads(raw.decode("utf-8"))
        if isinstance(payload, dict):
            for key in ("leads", "data", "items"):
                if isinstance(payload.get(key), list):
                    payload = payload[key]
                    break
        if not isinstance(payload, list):
            raise HTTPException(status_code=400, detail="JSON de importacao deve ser uma lista de leads.")
        return [item for item in payload if isinstance(item, dict)]
    if is_csv:
        text = raw.decode("utf-8-sig")
        reader = csv.DictReader(text.splitlines())
        return [dict(row) for row in reader if row]
    raise HTTPException(status_code=400, detail="Formato nao suportado. Use CSV ou JSON.")


@router.post("/import")
async def post_import_leads(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo de importacao nao informado.")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    try:
        raw_rows = _rows_from_upload(file, raw)
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="Arquivo com codificacao invalida.") from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="JSON invalido para importacao.") from exc

    accepted: list[dict] = []
    seen: set[tuple] = set()
    skipped_invalid = 0
    deduplicated_in_file = 0

    for row in raw_rows:
        normalized = _normalize_row(row)
        if not normalized.get("name") or not normalized.get("city"):
            skipped_invalid += 1
            continue
        fingerprint = _lead_fingerprint(normalized)
        if fingerprint in seen:
            deduplicated_in_file += 1
            continue
        seen.add(fingerprint)
        accepted.append(normalized)

    if not accepted:
        raise HTTPException(status_code=400, detail="Nenhum lead valido encontrado no arquivo.")

    db_result = insert_leads(accepted)
    return {
        "status": "ok",
        "received": len(raw_rows),
        "normalized": len(accepted),
        "skipped_invalid": skipped_invalid,
        "deduplicated_in_file": deduplicated_in_file,
        "inserted": int(db_result.get("inserted", 0)),
        "duplicates": int(db_result.get("duplicates", 0)),
    }


class LeadsResponse(BaseModel):
    leads: list[dict]


@router.get("/")
def get_leads(
    limit: int = 50,
    offset: int = 0,
    status: list[str] | None = Query(default=None),
    funnel: list[str] | None = Query(default=None),
):
    statuses = None
    raw_filters = []
    if status:
        raw_filters.extend(status)
    if funnel:
        raw_filters.extend(funnel)
    if raw_filters:
        parsed: list[str] = []
        for chunk in raw_filters:
            parsed.extend([item.strip().lower() for item in str(chunk).split(",") if item.strip()])
        invalid = sorted({item for item in parsed if item not in ALLOWED_FUNNEL_STATUSES})
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Status inválido: {', '.join(invalid)}. Use: {', '.join(sorted(ALLOWED_FUNNEL_STATUSES))}",
            )
        statuses = sorted(set(parsed))
    scoped_limit = max(limit + max(offset, 0), limit)
    leads = list_leads(limit=scoped_limit, statuses=statuses)
    if offset > 0:
        leads = leads[offset: offset + limit]
    else:
        leads = leads[:limit]
    return {"leads": leads}


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


@router.patch("/{lead_id}/score")
def patch_score(lead_id: int):
    score_data = recalculate_lead_score(lead_id)
    if not score_data:
        raise HTTPException(status_code=404, detail="Lead not found")
    return score_data


class LeadUpdateRequest(BaseModel):
    source: str | None = None
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
    status: str | None = None
    new_status: str | None = None
    reason: str | None = None
    loss_reason: str | None = None
    reason_other: str | None = None
    loss_reason_other: str | None = None
    author: str | None = None


class BatchIdsRequest(BaseModel):
    ids: list[int]


class BatchCampaignRequest(BaseModel):
    ids: list[int]
    campaign_status: str


class BatchStatusRequest(BaseModel):
    ids: list[int]
    status: str | None = None
    new_status: str | None = None
    reason: str | None = None
    loss_reason: str | None = None
    reason_other: str | None = None
    loss_reason_other: str | None = None
    author: str | None = None


class LeadNoteRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    author: str | None = None


class LeadTagRequest(BaseModel):
    tag: str = Field(..., min_length=1, max_length=50)


class BatchTagRequest(BaseModel):
    ids: list[int]
    tag: str = Field(..., min_length=1, max_length=50)


class LeadCreateRequest(BaseModel):
    source: str = Field(default="manual", min_length=2)
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


class LeadPatchRequest(BaseModel):
    source: str | None = None
    name: str | None = Field(default=None, min_length=2)
    company_name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = Field(default=None, min_length=2)
    state: str | None = Field(default=None, min_length=2, max_length=2)
    cnpj: str | None = None
    url: str | None = None
    funnel_status: str | None = None
    loss_reason: str | None = None
    prospect_status: str | None = None
    prospect_notes: str | None = None
    campaign_status: str | None = None
    next_action_date: str | None = None
    next_action_description: str | None = None
    is_valid: bool | None = None
    is_duplicate: bool | None = None


@router.post("/")
def post_lead(payload: LeadCreateRequest):
    try:
        lead = create_lead(payload.model_dump())
        return {"lead": lead}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/{lead_id}/funnel-status")
def patch_funnel_status(lead_id: int, payload: FunnelStatusRequest):
    target_status = (payload.new_status or payload.status or "").strip().lower()
    target_loss_reason = payload.loss_reason or payload.reason
    target_loss_reason_other = payload.loss_reason_other or payload.reason_other
    if not target_status:
        raise HTTPException(status_code=400, detail="Campo 'status' é obrigatório.")
    try:
        updated = change_status(
            lead_id=lead_id,
            new_status=target_status,
            loss_reason=target_loss_reason,
            loss_reason_other=target_loss_reason_other,
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


@router.patch("/{lead_id}")
def patch_lead(lead_id: int, payload: LeadPatchRequest):
    current = get_lead_by_id(lead_id)
    if not current:
        raise HTTPException(status_code=404, detail="Lead not found")
    updates = payload.model_dump(exclude_unset=True)
    merged = {**current, **updates}
    updated = update_lead(lead_id, merged)
    if not updated:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"lead": updated}


@router.get("/{lead_id}/transitions")
def get_transitions(lead_id: int):
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    current = normalize_funnel_status(lead.get("funnel_status"))
    transitions = get_valid_transitions(current)
    return {
        "status": "ok",
        "current": current,
        "current_label": FUNNEL_STATUS_LABELS.get(current, current),
        "transitions": transitions,
        "transition_labels": {item: FUNNEL_STATUS_LABELS.get(item, item) for item in transitions},
    }


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


@router.post("/{lead_id}/tags")
def post_tag(lead_id: int, payload: LeadTagRequest):
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    tags = add_lead_tag(lead_id, payload.tag)
    return {"status": "ok", "tags": tags}


@router.delete("/{lead_id}/tags/{tag}")
def delete_tag(lead_id: int, tag: str):
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    tags = remove_lead_tag(lead_id, tag)
    return {"status": "ok", "tags": tags}


@router.get("/funnel/meta")
def get_funnel_meta():
    return {
        "statuses": FUNNEL_STATUSES,
        "status_labels": FUNNEL_STATUS_LABELS,
        "loss_reasons": LOSS_REASON_OPTIONS,
        "loss_reason_labels": LOSS_REASON_LABELS,
        "transitions": {status: get_valid_transitions(status) for status in FUNNEL_STATUSES},
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


@router.post("/normalize-consistency")
def post_normalize_consistency():
    result = normalize_leads_consistency()
    return result


@router.post("/batch/campaign")
def post_batch_campaign(payload: BatchCampaignRequest):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Nenhum lead selecionado.")
    unique_ids = sorted({lead_id for lead_id in payload.ids})
    result = batch_update_campaign(unique_ids, payload.campaign_status)
    updated = int(result.get("updated", 0))
    processed = len(unique_ids)

    existing_ids = {int(lead.get("id")) for lead in get_leads_by_ids(unique_ids)}
    missing_ids = [lead_id for lead_id in unique_ids if lead_id not in existing_ids]

    return {
        "status": "ok",
        "processed": processed,
        "updated": updated,
        "failed": max(processed - updated, 0),
        "errors": [{"id": lead_id, "error": "Lead not found"} for lead_id in missing_ids],
    }


@router.post("/batch/delete")
def post_batch_delete(payload: BatchIdsRequest):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Nenhum lead selecionado.")
    unique_ids = sorted({lead_id for lead_id in payload.ids})
    existing_ids = {int(lead.get("id")) for lead in get_leads_by_ids(unique_ids)}
    missing_ids = [lead_id for lead_id in unique_ids if lead_id not in existing_ids]
    result = batch_soft_delete(unique_ids)
    deleted = int(result.get("deleted", 0))
    processed = len(unique_ids)
    return {
        "status": "ok",
        "processed": processed,
        "deleted": deleted,
        "failed": max(processed - deleted, 0),
        "errors": [{"id": lead_id, "error": "Lead not found"} for lead_id in missing_ids],
    }


@router.post("/batch/export")
def post_batch_export(payload: BatchIdsRequest):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Nenhum lead selecionado.")
    unique_ids = sorted({lead_id for lead_id in payload.ids})
    leads = get_leads_by_ids(unique_ids)
    exported_ids = {int(lead.get("id")) for lead in leads}
    missing_ids = [lead_id for lead_id in unique_ids if lead_id not in exported_ids]
    processed = len(unique_ids)
    exported = len(leads)
    return {
        "status": "ok",
        "processed": processed,
        "exported": exported,
        "failed": max(processed - exported, 0),
        "errors": [{"id": lead_id, "error": "Lead not found"} for lead_id in missing_ids],
        "leads": leads,
    }


@router.post("/batch/status")
def post_batch_status(payload: BatchStatusRequest):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Nenhum lead selecionado.")
    target_status = (payload.new_status or payload.status or "").strip().lower()
    target_loss_reason = payload.loss_reason or payload.reason
    target_loss_reason_other = payload.loss_reason_other or payload.reason_other
    if not target_status:
        raise HTTPException(status_code=400, detail="Campo 'status' é obrigatório.")
    unique_ids = sorted({lead_id for lead_id in payload.ids})
    updated = 0
    errors: list[dict] = []
    for lead_id in unique_ids:
        try:
            result = change_status(
                lead_id=lead_id,
                new_status=target_status,
                loss_reason=target_loss_reason,
                loss_reason_other=target_loss_reason_other,
                author=payload.author or "batch",
            )
            if result:
                updated += 1
            else:
                errors.append({"id": lead_id, "error": "Lead not found"})
        except ValueError as exc:
            errors.append({"id": lead_id, "error": str(exc)})
    processed = len(unique_ids)
    return {
        "status": "ok",
        "processed": processed,
        "updated": updated,
        "failed": max(processed - updated, 0),
        "errors": errors,
    }


@router.post("/batch/tag")
def post_batch_tag(payload: BatchTagRequest):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Nenhum lead selecionado.")
    unique_ids = sorted({lead_id for lead_id in payload.ids})
    existing_ids = {int(lead.get("id")) for lead in get_leads_by_ids(unique_ids)}
    missing_ids = [lead_id for lead_id in unique_ids if lead_id not in existing_ids]
    result = batch_add_tag(unique_ids, payload.tag)
    updated = int(result.get("updated", 0))
    processed = len(unique_ids)
    return {
        "status": "ok",
        "processed": processed,
        "updated": updated,
        "failed": max(processed - updated, 0),
        "tag": result.get("tag"),
        "errors": [{"id": lead_id, "error": "Lead not found"} for lead_id in missing_ids],
    }
