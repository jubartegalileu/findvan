import json
import re
from datetime import datetime, timezone

from ..db import get_connection


VALID_PROSPECT_STATUSES = {"nao_contatado", "contatado", "cliente", "fora_do_ramo"}
VALID_CADENCE_FILTERS = {"overdue", "today", "planned"}


def _serialize_note(note: str, author: str | None, action_type: str | None = None) -> dict:
    payload = {
        "note": note,
        "author": author or "system",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if action_type:
        payload["action_type"] = action_type
    return payload


def normalize_template_owner(owner: str | None) -> str:
    normalized_owner = (owner or "all").strip()
    if not normalized_owner:
        return "all"

    if normalized_owner.lower() == "all":
        return "all"

    if normalized_owner.lower().startswith("team:"):
        team_name = normalized_owner.split(":", 1)[1].strip().lower()
        team_slug = re.sub(r"[^a-z0-9_-]+", "-", team_name).strip("-_")
        if not team_slug:
            raise ValueError("owner de equipe inválido")
        return f"team:{team_slug}"

    if len(normalized_owner) > 100:
        raise ValueError("owner deve ter no máximo 100 caracteres")
    return normalized_owner


def normalize_template_actor(actor: str | None) -> str:
    normalized_actor = (actor or "").strip()
    if not normalized_actor:
        raise ValueError("actor é obrigatório")
    if len(normalized_actor) > 100:
        raise ValueError("actor deve ter no máximo 100 caracteres")
    return normalized_actor


def ensure_template_mutation_permission(*, owner: str, actor: str | None = None) -> str:
    normalized_owner = normalize_template_owner(owner)
    normalized_actor = normalize_template_actor(actor)
    lower_actor = normalized_actor.lower()
    privileged_actors = {"admin"}
    if lower_actor in privileged_actors:
        return normalized_actor

    if normalized_owner == "all":
        raise PermissionError("Acesso negado para mutação de templates globais")

    if normalized_owner.startswith("team:"):
        if normalize_template_owner(normalized_actor) != normalized_owner:
            raise PermissionError("Acesso negado para mutação de templates de equipe")
        return normalized_actor

    if normalized_actor != normalized_owner:
        raise PermissionError("Acesso negado para mutação de templates de vendedor")
    return normalized_actor


def evaluate_template_mutation_permission(*, owner: str | None = None, actor: str | None = None) -> dict:
    normalized_owner = normalize_template_owner(owner)
    try:
        normalized_actor = ensure_template_mutation_permission(owner=normalized_owner, actor=actor)
        return {
            "allowed": True,
            "owner": normalized_owner,
            "actor": normalized_actor,
            "reason": "ok",
        }
    except (PermissionError, ValueError) as exc:
        return {
            "allowed": False,
            "owner": normalized_owner,
            "actor": (actor or "").strip() or None,
            "reason": str(exc),
        }


def _log_bulk_template_audit(
    cur,
    *,
    template_id: int,
    owner: str,
    action: str,
    actor: str | None = None,
    payload: dict | None = None,
) -> None:
    cur.execute(
        """
        INSERT INTO sdr_bulk_template_audit (template_id, owner, action, actor, payload)
        VALUES (%s, %s, %s, %s, %s::jsonb);
        """,
        (
            int(template_id),
            owner,
            action,
            (actor or "system").strip() or "system",
            json.dumps(payload or {}),
        ),
    )


def get_queue(
    *,
    city: str | None = None,
    assigned_to: str | None = None,
    prospect_status: str | None = None,
    cadence: str | None = None,
    score_min: int | None = None,
    score_max: int | None = None,
    limit: int = 500,
) -> list[dict]:
    normalized_status = (prospect_status or "").strip().lower() or None
    if normalized_status and normalized_status not in VALID_PROSPECT_STATUSES:
        raise ValueError("prospect_status inválido")

    normalized_cadence = (cadence or "").strip().lower() or None
    if normalized_cadence and normalized_cadence not in VALID_CADENCE_FILTERS:
        raise ValueError("cadence inválido")
    capped_limit = max(1, min(int(limit or 500), 5000))

    query = """
        SELECT
          l.id AS lead_id,
          l.name,
          l.company_name,
          l.phone,
          l.city,
          l.score,
          s.assigned_to,
          s.prospect_status,
          s.next_action_date,
          s.next_action_description,
          s.cadence_step,
          s.last_contact_at,
          s.contact_count,
          s.notes,
          COALESCE(p.funnel_status, l.funnel_status, 'novo') AS funnel_status,
          CASE
            WHEN s.next_action_date IS NULL THEN 'planned'
            WHEN s.next_action_date < NOW() THEN 'overdue'
            WHEN DATE(s.next_action_date) = CURRENT_DATE THEN 'today'
            ELSE 'planned'
          END AS cadence_bucket
        FROM leads l
        JOIN sdr_activities s ON s.lead_id = l.id
        LEFT JOIN pipeline p ON p.lead_id = l.id
        WHERE l.deleted_at IS NULL
          AND COALESCE(p.funnel_status, l.funnel_status, 'novo') NOT IN ('convertido', 'perdido')
    """
    params: list[object] = []

    if city:
        query += " AND LOWER(l.city) = LOWER(%s)"
        params.append(city)

    normalized_assigned_to = (assigned_to or "").strip() or None
    if normalized_assigned_to and normalized_assigned_to != "all":
        query += " AND s.assigned_to = %s"
        params.append(normalized_assigned_to)

    if normalized_status:
        query += " AND s.prospect_status = %s"
        params.append(normalized_status)

    if normalized_cadence == "overdue":
        query += " AND s.next_action_date IS NOT NULL AND s.next_action_date < NOW()"
    elif normalized_cadence == "today":
        query += " AND s.next_action_date IS NOT NULL AND DATE(s.next_action_date) = CURRENT_DATE"
    elif normalized_cadence == "planned":
        query += " AND (s.next_action_date IS NULL OR s.next_action_date > NOW())"

    if score_min is not None:
        query += " AND COALESCE(l.score, 0) >= %s"
        params.append(score_min)
    if score_max is not None:
        query += " AND COALESCE(l.score, 0) <= %s"
        params.append(score_max)

    query += """
        ORDER BY
          CASE
            WHEN s.next_action_date IS NOT NULL AND s.next_action_date < NOW() THEN 0
            WHEN s.next_action_date IS NOT NULL AND DATE(s.next_action_date) = CURRENT_DATE THEN 1
            ELSE 2
          END ASC,
          COALESCE(l.score, 0) DESC,
          l.id ASC
        LIMIT %s;
    """
    params.append(capped_limit)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            rows = cur.fetchall()

    keys = [
        "lead_id",
        "name",
        "company_name",
        "phone",
        "city",
        "score",
        "assigned_to",
        "prospect_status",
        "next_action_date",
        "next_action_description",
        "cadence_step",
        "last_contact_at",
        "contact_count",
        "notes",
        "funnel_status",
        "cadence_bucket",
    ]
    return [dict(zip(keys, row)) for row in rows]


def register_action(
    *,
    lead_id: int,
    action_type: str = "done",
    notes: str | None = None,
    author: str | None = None,
    next_action_date: str | None = None,
    next_action_description: str | None = None,
    cadence_days: int = 1,
) -> dict | None:
    payload_note = _serialize_note(notes, author, action_type) if notes else None
    serialized_note = json.dumps(payload_note) if payload_note else None

    update_query = """
        UPDATE sdr_activities
        SET
          contact_count = COALESCE(contact_count, 0) + 1,
          last_contact_at = NOW(),
          cadence_step = COALESCE(cadence_step, 0) + 1,
          next_action_date = COALESCE(%s::timestamp, NOW() + (%s || ' days')::interval),
          next_action_description = COALESCE(%s, next_action_description),
          prospect_status = CASE
            WHEN prospect_status = 'nao_contatado' THEN 'contatado'
            ELSE prospect_status
          END,
          notes = CASE
            WHEN %s::jsonb IS NULL THEN notes
            ELSE COALESCE(notes, '[]'::jsonb) || jsonb_build_array(%s::jsonb)
          END
        WHERE lead_id = %s
        RETURNING lead_id, prospect_status, next_action_date, next_action_description, cadence_step, last_contact_at, contact_count, notes;
    """

    interaction_query = """
        INSERT INTO lead_interactions (lead_id, type, content, metadata, author)
        VALUES (%s, 'sdr_action', %s, %s::jsonb, %s);
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                update_query,
                (
                    next_action_date,
                    max(1, cadence_days),
                    next_action_description,
                    serialized_note,
                    serialized_note,
                    lead_id,
                ),
            )
            row = cur.fetchone()
            if not row:
                conn.rollback()
                return None

            cur.execute(
                interaction_query,
                (
                    lead_id,
                    f"SDR action: {action_type}",
                    json.dumps({"action_type": action_type}),
                    author or "sdr",
                ),
            )
        conn.commit()

    keys = [
        "lead_id",
        "prospect_status",
        "next_action_date",
        "next_action_description",
        "cadence_step",
        "last_contact_at",
        "contact_count",
        "notes",
    ]
    return dict(zip(keys, row))


def register_action_batch(
    *,
    lead_ids: list[int],
    action_type: str = "done",
    author: str | None = None,
    next_action_date: str | None = None,
    next_action_description: str | None = None,
    cadence_days: int = 1,
) -> dict:
    if not lead_ids:
        raise ValueError("lead_ids é obrigatório")

    normalized_ids: list[int] = []
    seen: set[int] = set()
    for lead_id in lead_ids:
        value = int(lead_id)
        if value <= 0:
            raise ValueError("lead_ids deve conter apenas IDs positivos")
        if value in seen:
            continue
        normalized_ids.append(value)
        seen.add(value)

    update_query = """
        UPDATE sdr_activities
        SET
          contact_count = COALESCE(contact_count, 0) + 1,
          last_contact_at = NOW(),
          cadence_step = COALESCE(cadence_step, 0) + 1,
          next_action_date = COALESCE(%s::timestamp, NOW() + (%s || ' days')::interval),
          next_action_description = COALESCE(%s, next_action_description),
          prospect_status = CASE
            WHEN prospect_status = 'nao_contatado' THEN 'contatado'
            ELSE prospect_status
          END,
          updated_at = NOW()
        WHERE lead_id = ANY(%s::int[])
        RETURNING lead_id;
    """
    interaction_query = """
        INSERT INTO lead_interactions (lead_id, type, content, metadata, author)
        VALUES (%s, 'sdr_action', %s, %s::jsonb, %s);
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                update_query,
                (
                    next_action_date,
                    max(1, cadence_days),
                    next_action_description,
                    normalized_ids,
                ),
            )
            rows = cur.fetchall() or []
            updated_ids = [int(row[0]) for row in rows]
            if not updated_ids:
                conn.rollback()
                return {"updated_count": 0, "lead_ids": [], "action_type": action_type}

            for updated_id in updated_ids:
                cur.execute(
                    interaction_query,
                    (
                        updated_id,
                        f"SDR action: {action_type}",
                        json.dumps({"action_type": action_type}),
                        author or "sdr",
                    ),
                )
        conn.commit()

    return {
        "updated_count": len(updated_ids),
        "lead_ids": updated_ids,
        "action_type": action_type,
    }


def add_note(*, lead_id: int, note: str, author: str | None = None) -> dict | None:
    payload_note = _serialize_note(note, author)
    serialized_note = json.dumps(payload_note)
    query = """
        UPDATE sdr_activities
        SET notes = COALESCE(notes, '[]'::jsonb) || jsonb_build_array(%s::jsonb)
        WHERE lead_id = %s
        RETURNING lead_id, notes;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (serialized_note, lead_id))
            row = cur.fetchone()
            if not row:
                conn.rollback()
                return None
            cur.execute(
                """
                INSERT INTO lead_interactions (lead_id, type, content, metadata, author)
                VALUES (%s, 'note', %s, '{}'::jsonb, %s);
                """,
                (lead_id, note, author or "sdr"),
            )
        conn.commit()

    return {"lead_id": row[0], "notes": row[1]}


def add_note_batch(*, lead_ids: list[int], note: str, author: str | None = None) -> dict:
    normalized_note = (note or "").strip()
    if not normalized_note:
        raise ValueError("note é obrigatório")

    payload_note = _serialize_note(normalized_note, author)
    serialized_note = json.dumps(payload_note)

    if not lead_ids:
        raise ValueError("lead_ids é obrigatório")

    normalized_ids: list[int] = []
    seen: set[int] = set()
    for lead_id in lead_ids:
        value = int(lead_id)
        if value <= 0:
            raise ValueError("lead_ids deve conter apenas IDs positivos")
        if value in seen:
            continue
        normalized_ids.append(value)
        seen.add(value)

    update_query = """
        UPDATE sdr_activities
        SET
          notes = COALESCE(notes, '[]'::jsonb) || jsonb_build_array(%s::jsonb),
          updated_at = NOW()
        WHERE lead_id = ANY(%s::int[])
        RETURNING lead_id;
    """
    interaction_query = """
        INSERT INTO lead_interactions (lead_id, type, content, metadata, author)
        VALUES (%s, 'note', %s, '{}'::jsonb, %s);
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(update_query, (serialized_note, normalized_ids))
            rows = cur.fetchall() or []
            updated_ids = [int(row[0]) for row in rows]
            if not updated_ids:
                conn.rollback()
                return {"updated_count": 0, "lead_ids": []}

            for updated_id in updated_ids:
                cur.execute(
                    interaction_query,
                    (updated_id, normalized_note, author or "sdr"),
                )
        conn.commit()

    return {"updated_count": len(updated_ids), "lead_ids": updated_ids}


def get_stats() -> dict:
    return get_stats_by_assignee()


def get_stats_by_assignee(*, assigned_to: str | None = None) -> dict:
    query = """
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE s.last_contact_at IS NOT NULL
              AND DATE(s.last_contact_at) = CURRENT_DATE
          )::int AS done_today,
          COUNT(*) FILTER (
            WHERE s.next_action_date IS NOT NULL
              AND s.next_action_date < NOW()
          )::int AS overdue
        FROM leads l
        JOIN sdr_activities s ON s.lead_id = l.id
        LEFT JOIN pipeline p ON p.lead_id = l.id
        WHERE l.deleted_at IS NULL
          AND COALESCE(p.funnel_status, l.funnel_status, 'novo') NOT IN ('convertido', 'perdido');
    """
    normalized_assigned_to = (assigned_to or "").strip() or None
    params: list[object] = []
    if normalized_assigned_to and normalized_assigned_to != "all":
        query = query.replace(
            "AND COALESCE(p.funnel_status, l.funnel_status, 'novo') NOT IN ('convertido', 'perdido');",
            "AND COALESCE(p.funnel_status, l.funnel_status, 'novo') NOT IN ('convertido', 'perdido') AND s.assigned_to = %s;",
        )
        params.append(normalized_assigned_to)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            row = cur.fetchone()

    total = int(row[0] or 0)
    done_today = int(row[1] or 0)
    overdue = int(row[2] or 0)
    pending = max(total - done_today, 0)
    return {
        "total": total,
        "done_today": done_today,
        "pending": pending,
        "overdue": overdue,
    }


def assign_owner(*, lead_id: int, assigned_to: str, author: str | None = None) -> dict | None:
    normalized_owner = (assigned_to or "").strip()
    if not normalized_owner:
        raise ValueError("assigned_to é obrigatório")
    if len(normalized_owner) > 100:
        raise ValueError("assigned_to deve ter no máximo 100 caracteres")

    query = """
        UPDATE sdr_activities
        SET assigned_to = %s, updated_at = NOW()
        WHERE lead_id = %s
        RETURNING lead_id, assigned_to;
    """
    interaction_query = """
        INSERT INTO lead_interactions (lead_id, type, content, metadata, author)
        VALUES (%s, 'sdr_assignment', %s, %s::jsonb, %s);
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (normalized_owner, lead_id))
            row = cur.fetchone()
            if not row:
                conn.rollback()
                return None

            cur.execute(
                interaction_query,
                (
                    lead_id,
                    f"SDR assignment: {normalized_owner}",
                    json.dumps({"assigned_to": normalized_owner}),
                    author or "sdr",
                ),
            )
        conn.commit()

    return {"lead_id": row[0], "assigned_to": row[1]}


def assign_owner_batch(*, lead_ids: list[int], assigned_to: str, author: str | None = None) -> dict:
    normalized_owner = (assigned_to or "").strip()
    if not normalized_owner:
        raise ValueError("assigned_to é obrigatório")
    if len(normalized_owner) > 100:
        raise ValueError("assigned_to deve ter no máximo 100 caracteres")
    if not lead_ids:
        raise ValueError("lead_ids é obrigatório")

    normalized_ids: list[int] = []
    seen: set[int] = set()
    for lead_id in lead_ids:
        value = int(lead_id)
        if value <= 0:
            raise ValueError("lead_ids deve conter apenas IDs positivos")
        if value in seen:
            continue
        normalized_ids.append(value)
        seen.add(value)

    update_query = """
        UPDATE sdr_activities
        SET assigned_to = %s, updated_at = NOW()
        WHERE lead_id = ANY(%s::int[])
        RETURNING lead_id;
    """
    interaction_query = """
        INSERT INTO lead_interactions (lead_id, type, content, metadata, author)
        VALUES (%s, 'sdr_assignment', %s, %s::jsonb, %s);
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(update_query, (normalized_owner, normalized_ids))
            rows = cur.fetchall() or []
            updated_ids = [int(row[0]) for row in rows]
            if not updated_ids:
                conn.rollback()
                return {"updated_count": 0, "lead_ids": [], "assigned_to": normalized_owner}

            for updated_id in updated_ids:
                cur.execute(
                    interaction_query,
                    (
                        updated_id,
                        f"SDR assignment: {normalized_owner}",
                        json.dumps({"assigned_to": normalized_owner}),
                        author or "sdr",
                    ),
                )
        conn.commit()

    return {
        "updated_count": len(updated_ids),
        "lead_ids": updated_ids,
        "assigned_to": normalized_owner,
    }


def list_bulk_templates(*, owner: str | None = None) -> list[dict]:
    normalized_owner = normalize_template_owner(owner)
    query = """
        SELECT id, owner, name, next_action_description, cadence_days, note, is_favorite, sort_order
        FROM sdr_bulk_templates
        WHERE owner = %s
        ORDER BY is_favorite DESC, sort_order ASC, updated_at DESC, id DESC;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (normalized_owner,))
            rows = cur.fetchall() or []
    keys = ["id", "owner", "name", "next_action_description", "cadence_days", "note", "is_favorite", "sort_order"]
    return [dict(zip(keys, row)) for row in rows]


def list_bulk_template_audit(
    *,
    owner: str | None = None,
    template_id: int | None = None,
    limit: int = 100,
) -> list[dict]:
    normalized_owner = normalize_template_owner(owner)
    capped_limit = max(1, min(int(limit or 100), 500))
    query = """
        SELECT id, template_id, owner, action, actor, payload, created_at
        FROM sdr_bulk_template_audit
        WHERE owner = %s
    """
    params: list[object] = [normalized_owner]
    if template_id is not None:
        query += " AND template_id = %s"
        params.append(int(template_id))
    query += " ORDER BY created_at DESC, id DESC LIMIT %s"
    params.append(capped_limit)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            rows = cur.fetchall() or []
    keys = ["id", "template_id", "owner", "action", "actor", "payload", "created_at"]
    return [dict(zip(keys, row)) for row in rows]


def save_bulk_template(
    *,
    owner: str,
    name: str,
    next_action_description: str | None = None,
    cadence_days: int = 1,
    note: str | None = None,
    is_favorite: bool | None = None,
    sort_order: int | None = None,
    actor: str | None = None,
) -> dict:
    normalized_owner = normalize_template_owner(owner)
    normalized_actor = ensure_template_mutation_permission(owner=normalized_owner, actor=actor)
    normalized_name = (name or "").strip()
    if not normalized_name:
        raise ValueError("name é obrigatório")
    if len(normalized_name) > 120:
        raise ValueError("name deve ter no máximo 120 caracteres")

    normalized_description = (next_action_description or "").strip() or None
    normalized_note = (note or "").strip() or None
    normalized_cadence_days = max(1, min(int(cadence_days or 1), 30))
    normalized_sort_order = int(sort_order) if sort_order is not None else None

    query = """
        INSERT INTO sdr_bulk_templates (owner, name, next_action_description, cadence_days, note, is_favorite, sort_order, updated_at)
        VALUES (%s, %s, %s, %s, %s, COALESCE(%s, false), COALESCE(%s, 0), NOW())
        ON CONFLICT (owner, name)
        DO UPDATE SET
          next_action_description = EXCLUDED.next_action_description,
          cadence_days = EXCLUDED.cadence_days,
          note = EXCLUDED.note,
          is_favorite = COALESCE(EXCLUDED.is_favorite, sdr_bulk_templates.is_favorite),
          sort_order = COALESCE(EXCLUDED.sort_order, sdr_bulk_templates.sort_order),
          updated_at = NOW()
        RETURNING id, owner, name, next_action_description, cadence_days, note, is_favorite, sort_order;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (
                    normalized_owner,
                    normalized_name,
                    normalized_description,
                    normalized_cadence_days,
                    normalized_note,
                    is_favorite,
                    normalized_sort_order,
                ),
            )
            row = cur.fetchone()
            _log_bulk_template_audit(
                cur,
                template_id=int(row[0]),
                owner=normalized_owner,
                action="save",
                actor=normalized_actor,
                payload={
                    "name": normalized_name,
                    "cadence_days": normalized_cadence_days,
                    "is_favorite": bool(row[6]),
                    "sort_order": int(row[7]),
                },
            )
        conn.commit()

    keys = ["id", "owner", "name", "next_action_description", "cadence_days", "note", "is_favorite", "sort_order"]
    return dict(zip(keys, row))


def delete_bulk_template(*, template_id: int, owner: str | None = None, actor: str | None = None) -> bool:
    normalized_owner = normalize_template_owner(owner)
    normalized_actor = ensure_template_mutation_permission(owner=normalized_owner, actor=actor)
    query = """
        DELETE FROM sdr_bulk_templates
        WHERE id = %s AND owner = %s
        RETURNING id;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (int(template_id), normalized_owner))
            row = cur.fetchone()
            if row:
                _log_bulk_template_audit(
                    cur,
                    template_id=int(template_id),
                    owner=normalized_owner,
                    action="delete",
                    actor=normalized_actor,
                    payload={},
                )
        conn.commit()
    return bool(row)


def update_bulk_template_preferences(
    *,
    template_id: int,
    owner: str | None = None,
    is_favorite: bool | None = None,
    sort_order: int | None = None,
    actor: str | None = None,
) -> dict | None:
    normalized_owner = normalize_template_owner(owner)
    normalized_actor = ensure_template_mutation_permission(owner=normalized_owner, actor=actor)
    if is_favorite is None and sort_order is None:
        raise ValueError("is_favorite ou sort_order deve ser informado")

    query = """
        UPDATE sdr_bulk_templates
        SET
          is_favorite = COALESCE(%s, is_favorite),
          sort_order = COALESCE(%s, sort_order),
          updated_at = NOW()
        WHERE id = %s AND owner = %s
        RETURNING id, owner, name, next_action_description, cadence_days, note, is_favorite, sort_order;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (
                    is_favorite,
                    int(sort_order) if sort_order is not None else None,
                    int(template_id),
                    normalized_owner,
                ),
            )
            row = cur.fetchone()
            if row:
                _log_bulk_template_audit(
                    cur,
                    template_id=int(template_id),
                    owner=normalized_owner,
                    action="patch",
                    actor=normalized_actor,
                    payload={
                        "is_favorite": bool(row[6]),
                        "sort_order": int(row[7]),
                    },
                )
        conn.commit()
    if not row:
        return None
    keys = ["id", "owner", "name", "next_action_description", "cadence_days", "note", "is_favorite", "sort_order"]
    return dict(zip(keys, row))
