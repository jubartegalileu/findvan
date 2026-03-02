import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .error_utils import raise_bad_request, raise_forbidden, raise_internal_error, raise_not_found
from ..services.sdr_service import (
    add_note,
    add_note_batch,
    assign_owner,
    assign_owner_batch,
    delete_bulk_template,
    evaluate_template_mutation_permission,
    get_queue,
    get_stats_by_assignee,
    initiate_template_access_request,
    list_bulk_template_audit,
    list_bulk_templates,
    log_bulk_template_permission_denied,
    normalize_template_owner,
    register_action,
    register_action_batch,
    save_bulk_template,
    update_bulk_template_preferences,
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


class SDRNoteBatchPayload(BaseModel):
    lead_ids: list[int] = Field(..., min_length=1, max_length=500)
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


class SDRBulkTemplatePayload(BaseModel):
    owner: str = Field(default="all", min_length=1, max_length=100)
    actor: str | None = Field(default=None, max_length=100)
    name: str = Field(..., min_length=1, max_length=120)
    next_action_description: str | None = Field(default=None, max_length=500)
    cadence_days: int = Field(default=1, ge=1, le=30)
    note: str | None = Field(default=None, max_length=2000)


class SDRBulkTemplatePatchPayload(BaseModel):
    owner: str = Field(default="all", min_length=1, max_length=100)
    actor: str | None = Field(default=None, max_length=100)
    is_favorite: bool | None = None
    sort_order: int | None = None


class SDRTemplateAccessRequestPayload(BaseModel):
    owner: str = Field(default="all", min_length=1, max_length=100)
    actor: str | None = Field(default=None, max_length=100)
    reason: str = Field(..., min_length=1, max_length=500)
    template_id: int | None = Field(default=None, ge=1)


def _resolve_template_actor(owner: str | None, actor: str | None) -> str | None:
    if actor is not None and actor.strip():
        return actor.strip()
    normalized_owner = normalize_template_owner(owner)
    if normalized_owner == "all":
        return None
    return normalized_owner


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


@router.patch("/notes/batch")
def sdr_notes_batch(payload: SDRNoteBatchPayload):
    try:
        updated = add_note_batch(
            lead_ids=payload.lead_ids,
            note=payload.note.strip(),
            author=payload.author,
        )
        if updated["updated_count"] == 0:
            raise_not_found("Nenhum lead encontrado para nota em lote", code="sdr_lead_not_found")
        return {"status": "ok", **updated}
    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning("sdr_notes_batch validation failed: %s", exc)
        raise_bad_request(str(exc), code="sdr_notes_batch_validation")
    except Exception as exc:
        raise_internal_error(context="sdr_notes_batch", exc=exc, code="sdr_notes_batch_error")


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


@router.get("/templates")
def sdr_templates(owner: str | None = Query(default="all", max_length=100)):
    try:
        templates = list_bulk_templates(owner=owner)
        return {"templates": templates, "count": len(templates)}
    except ValueError as exc:
        logger.warning("sdr_templates validation failed: %s", exc)
        raise_bad_request(str(exc), code="sdr_templates_validation")
    except Exception as exc:
        raise_internal_error(context="sdr_templates", exc=exc, code="sdr_templates_error")


@router.get("/templates/audit")
def sdr_templates_audit(
    owner: str | None = Query(default="all", max_length=100),
    template_id: int | None = Query(default=None, ge=1),
    action: str | None = Query(default=None, max_length=30),
    limit: int = Query(default=100, ge=1, le=500),
):
    try:
        events = list_bulk_template_audit(owner=owner, template_id=template_id, action=action, limit=limit)
        return {"events": events, "count": len(events)}
    except ValueError as exc:
        logger.warning("sdr_templates_audit validation failed: %s", exc)
        raise_bad_request(str(exc), code="sdr_templates_audit_validation")
    except Exception as exc:
        raise_internal_error(context="sdr_templates_audit", exc=exc, code="sdr_templates_audit_error")


@router.get("/templates/permission")
def sdr_templates_permission(
    owner: str | None = Query(default="all", max_length=100),
    actor: str | None = Query(default=None, max_length=100),
):
    try:
        evaluation = evaluate_template_mutation_permission(owner=owner, actor=actor)
        return evaluation
    except ValueError as exc:
        logger.warning("sdr_templates_permission validation failed: %s", exc)
        raise_bad_request(str(exc), code="sdr_templates_permission_validation")
    except Exception as exc:
        raise_internal_error(context="sdr_templates_permission", exc=exc, code="sdr_templates_permission_error")


@router.post("/templates/permission/access-request")
def sdr_templates_permission_access_request(payload: SDRTemplateAccessRequestPayload):
    try:
        request = initiate_template_access_request(
            owner=payload.owner,
            actor=payload.actor,
            reason=payload.reason.strip(),
            template_id=payload.template_id,
        )
        return {"status": "ok", "request": request}
    except ValueError as exc:
        logger.warning("sdr_templates_permission_access_request validation failed: %s", exc)
        raise_bad_request(str(exc), code="sdr_templates_permission_access_request_validation")
    except Exception as exc:
        raise_internal_error(
            context="sdr_templates_permission_access_request",
            exc=exc,
            code="sdr_templates_permission_access_request_error",
        )


@router.post("/templates")
def sdr_templates_save(payload: SDRBulkTemplatePayload):
    try:
        resolved_actor = _resolve_template_actor(payload.owner, payload.actor)
        saved = save_bulk_template(
            owner=payload.owner,
            actor=resolved_actor,
            name=payload.name,
            next_action_description=payload.next_action_description,
            cadence_days=payload.cadence_days,
            note=payload.note,
        )
        return {"status": "ok", "template": saved}
    except PermissionError as exc:
        log_bulk_template_permission_denied(
            owner=payload.owner,
            actor=_resolve_template_actor(payload.owner, payload.actor),
            operation="save",
            reason=str(exc),
        )
        logger.warning("sdr_templates_save permission denied: %s", exc)
        raise_forbidden(str(exc), code="sdr_templates_save_forbidden")
    except ValueError as exc:
        logger.warning("sdr_templates_save validation failed: %s", exc)
        raise_bad_request(str(exc), code="sdr_templates_save_validation")
    except Exception as exc:
        raise_internal_error(context="sdr_templates_save", exc=exc, code="sdr_templates_save_error")


@router.delete("/templates/{template_id}")
def sdr_templates_delete(
    template_id: int,
    owner: str | None = Query(default="all", max_length=100),
    actor: str | None = Query(default=None, max_length=100),
):
    try:
        resolved_actor = _resolve_template_actor(owner, actor)
        deleted = delete_bulk_template(template_id=template_id, owner=owner, actor=resolved_actor)
        if not deleted:
            raise_not_found("Template não encontrado", code="sdr_template_not_found")
        return {"status": "ok", "template_id": template_id}
    except HTTPException:
        raise
    except PermissionError as exc:
        log_bulk_template_permission_denied(
            owner=owner,
            actor=_resolve_template_actor(owner, actor),
            operation="delete",
            reason=str(exc),
            template_id=template_id,
        )
        logger.warning("sdr_templates_delete permission denied: %s", exc)
        raise_forbidden(str(exc), code="sdr_templates_delete_forbidden")
    except ValueError as exc:
        logger.warning("sdr_templates_delete validation failed: %s", exc)
        raise_bad_request(str(exc), code="sdr_templates_delete_validation")
    except Exception as exc:
        raise_internal_error(context=f"sdr_templates_delete template_id={template_id}", exc=exc, code="sdr_templates_delete_error")


@router.patch("/templates/{template_id}")
def sdr_templates_patch(template_id: int, payload: SDRBulkTemplatePatchPayload):
    try:
        resolved_actor = _resolve_template_actor(payload.owner, payload.actor)
        updated = update_bulk_template_preferences(
            template_id=template_id,
            owner=payload.owner,
            actor=resolved_actor,
            is_favorite=payload.is_favorite,
            sort_order=payload.sort_order,
        )
        if not updated:
            raise_not_found("Template não encontrado", code="sdr_template_not_found")
        return {"status": "ok", "template": updated}
    except HTTPException:
        raise
    except PermissionError as exc:
        log_bulk_template_permission_denied(
            owner=payload.owner,
            actor=_resolve_template_actor(payload.owner, payload.actor),
            operation="patch",
            reason=str(exc),
            template_id=template_id,
        )
        logger.warning("sdr_templates_patch permission denied: %s", exc)
        raise_forbidden(str(exc), code="sdr_templates_patch_forbidden")
    except ValueError as exc:
        logger.warning("sdr_templates_patch validation failed: %s", exc)
        raise_bad_request(str(exc), code="sdr_templates_patch_validation")
    except Exception as exc:
        raise_internal_error(context=f"sdr_templates_patch template_id={template_id}", exc=exc, code="sdr_templates_patch_error")
