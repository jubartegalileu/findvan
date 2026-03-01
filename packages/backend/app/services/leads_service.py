from typing import Iterable
from psycopg import sql
from ..db import get_connection
from .funnel_service import FUNNEL_TRANSITIONS
from .score_service import calculate_lead_score


LEAD_COLUMNS = (
    "source",
    "name",
    "phone",
    "email",
    "address",
    "city",
    "state",
    "company_name",
    "cnpj",
    "url",
    "score",
    "funnel_status",
    "loss_reason",
    "prospect_status",
    "prospect_notes",
    "campaign_status",
    "captured_at",
    "next_action_date",
    "next_action_description",
    "is_valid",
    "is_duplicate",
)

VALID_FUNNEL_STATUS = set(FUNNEL_TRANSITIONS.keys())


def normalize_funnel_status(value: str | None) -> str:
    normalized = str(value or "").strip().lower()
    return normalized if normalized in VALID_FUNNEL_STATUS else "novo"


def insert_leads(leads: Iterable[dict]) -> dict:
    if not leads:
        return {"inserted": 0, "duplicates": 0}

    values = [
        (
            lead.get("source"),
            lead.get("name"),
            lead.get("phone"),
            lead.get("email"),
            lead.get("address"),
            lead.get("city"),
            lead.get("state"),
            lead.get("company_name"),
            lead.get("cnpj"),
            lead.get("url"),
            calculate_lead_score(lead).get("total", 0),
            normalize_funnel_status(lead.get("funnel_status")),
            lead.get("loss_reason"),
            lead.get("prospect_status", "nao_contatado"),
            lead.get("prospect_notes"),
            lead.get("campaign_status"),
            lead.get("captured_at"),
            lead.get("next_action_date"),
            lead.get("next_action_description"),
            lead.get("is_valid", True),
            lead.get("is_duplicate", False),
        )
        for lead in leads
    ]

    insert_stmt = sql.SQL(
        """
        INSERT INTO leads ({columns})
        VALUES ({placeholders})
        ON CONFLICT (phone, source)
        DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          company_name = EXCLUDED.company_name,
          cnpj = EXCLUDED.cnpj,
          url = EXCLUDED.url,
          score = EXCLUDED.score,
          funnel_status = COALESCE(leads.funnel_status, EXCLUDED.funnel_status),
          loss_reason = COALESCE(leads.loss_reason, EXCLUDED.loss_reason),
          prospect_status = COALESCE(leads.prospect_status, EXCLUDED.prospect_status),
          prospect_notes = COALESCE(leads.prospect_notes, EXCLUDED.prospect_notes),
          campaign_status = COALESCE(leads.campaign_status, EXCLUDED.campaign_status),
          captured_at = EXCLUDED.captured_at,
          next_action_date = EXCLUDED.next_action_date,
          next_action_description = EXCLUDED.next_action_description,
          is_valid = EXCLUDED.is_valid,
          is_duplicate = TRUE,
          updated_at = NOW()
        RETURNING (xmax = 0) AS inserted;
        """
    ).format(
        columns=sql.SQL(", ").join(map(sql.Identifier, LEAD_COLUMNS)),
        placeholders=sql.SQL(", ").join(sql.Placeholder() * len(LEAD_COLUMNS)),
    )

    inserted = 0
    duplicates = 0
    with get_connection() as conn:
        with conn.cursor() as cur:
            for row_values in values:
                cur.execute(insert_stmt, row_values)
                row = cur.fetchone()
                if not row:
                    continue
                if row[0]:
                    inserted += 1
                else:
                    duplicates += 1
        conn.commit()

    return {"inserted": inserted, "duplicates": duplicates}


def list_leads(limit: int = 50, statuses: list[str] | None = None) -> list[dict]:
    query = """
        SELECT id, source, name, phone, email, address, city, state, company_name,
               cnpj, url, score, funnel_status, loss_reason, prospect_status, prospect_notes, campaign_status, captured_at, next_action_date, next_action_description, is_valid, is_duplicate, created_at, updated_at
        FROM leads
        WHERE deleted_at IS NULL
    """
    params: list[object] = []
    normalized_statuses = sorted(
        {normalize_funnel_status(status) for status in (statuses or []) if str(status).strip()}
    )
    if normalized_statuses:
        query += " AND COALESCE(funnel_status, 'novo') = ANY(%s)"
        params.append(normalized_statuses)
    query += """
        ORDER BY created_at DESC
        LIMIT %s;
    """
    params.append(limit)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            rows = cur.fetchall()

    keys = [
        "id",
        "source",
        "name",
        "phone",
        "email",
        "address",
        "city",
        "state",
        "company_name",
        "cnpj",
        "url",
        "score",
        "funnel_status",
        "loss_reason",
        "prospect_status",
        "prospect_notes",
        "campaign_status",
        "captured_at",
        "next_action_date",
        "next_action_description",
        "is_valid",
        "is_duplicate",
        "created_at",
        "updated_at",
    ]
    leads = [dict(zip(keys, row)) for row in rows]
    return _attach_tags_to_leads(leads)


def get_lead_by_id(lead_id: int) -> dict | None:
    query = """
        SELECT id, source, name, phone, email, address, city, state, company_name,
               cnpj, url, score, funnel_status, loss_reason, prospect_status, prospect_notes, campaign_status, captured_at, next_action_date, next_action_description, is_valid, is_duplicate, created_at, updated_at
        FROM leads
        WHERE id = %s AND deleted_at IS NULL;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (lead_id,))
            row = cur.fetchone()
    if not row:
        return None
    keys = [
        "id",
        "source",
        "name",
        "phone",
        "email",
        "address",
        "city",
        "state",
        "company_name",
        "cnpj",
        "url",
        "score",
        "funnel_status",
        "loss_reason",
        "prospect_status",
        "prospect_notes",
        "campaign_status",
        "captured_at",
        "next_action_date",
        "next_action_description",
        "is_valid",
        "is_duplicate",
        "created_at",
        "updated_at",
    ]
    lead = dict(zip(keys, row))
    return _attach_tags_to_leads([lead])[0]


def create_lead(data: dict) -> dict:
    score = calculate_lead_score(data).get("total", 0)
    query = """
        INSERT INTO leads (
          source, name, phone, email, address, city, state, company_name, cnpj, url,
          score, funnel_status, loss_reason, prospect_status, prospect_notes, campaign_status,
          captured_at, next_action_date, next_action_description, is_valid, is_duplicate
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
    """
    values = (
        data.get("source", "manual"),
        data.get("name"),
        data.get("phone"),
        data.get("email"),
        data.get("address"),
        data.get("city"),
        data.get("state"),
        data.get("company_name"),
        data.get("cnpj"),
        data.get("url"),
        score,
        normalize_funnel_status(data.get("funnel_status")),
        data.get("loss_reason"),
        data.get("prospect_status", "nao_contatado"),
        data.get("prospect_notes"),
        data.get("campaign_status"),
        data.get("captured_at"),
        data.get("next_action_date"),
        data.get("next_action_description"),
        data.get("is_valid", True),
        data.get("is_duplicate", False),
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()

    created = get_lead_by_id(int(row[0]))
    if created is None:
        raise RuntimeError("Lead criado mas não encontrado na leitura subsequente")
    return created


def update_lead(lead_id: int, data: dict) -> dict | None:
    current = get_lead_by_id(lead_id)
    if not current:
        return None
    score_payload = {**current, **data}
    score = calculate_lead_score(score_payload).get("total", 0)
    query = """
        UPDATE leads
        SET
          name = %s,
          company_name = %s,
          phone = %s,
          email = %s,
          address = %s,
          city = %s,
          state = %s,
          cnpj = %s,
          url = %s,
          score = %s,
          funnel_status = %s,
          loss_reason = %s,
          prospect_status = %s,
          prospect_notes = %s,
          campaign_status = %s,
          next_action_date = %s,
          next_action_description = %s,
          is_valid = %s,
          is_duplicate = %s,
          updated_at = NOW()
        WHERE id = %s
        RETURNING id, source, name, phone, email, address, city, state, company_name,
                  cnpj, url, score, funnel_status, loss_reason, prospect_status, prospect_notes, campaign_status, captured_at, next_action_date, next_action_description, is_valid, is_duplicate, created_at, updated_at;
    """
    values = (
        data.get("name"),
        data.get("company_name"),
        data.get("phone"),
        data.get("email"),
        data.get("address"),
        data.get("city"),
        data.get("state"),
        data.get("cnpj"),
        data.get("url"),
        score,
        normalize_funnel_status(data.get("funnel_status", current.get("funnel_status", "novo"))),
        data.get("loss_reason"),
        data.get("prospect_status", "nao_contatado"),
        data.get("prospect_notes"),
        data.get("campaign_status"),
        data.get("next_action_date"),
        data.get("next_action_description"),
        data.get("is_valid", True),
        data.get("is_duplicate", False),
        lead_id,
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()
    if not row:
        return None
    keys = [
        "id",
        "source",
        "name",
        "phone",
        "email",
        "address",
        "city",
        "state",
        "company_name",
        "cnpj",
        "url",
        "score",
        "funnel_status",
        "loss_reason",
        "prospect_status",
        "prospect_notes",
        "campaign_status",
        "captured_at",
        "next_action_date",
        "next_action_description",
        "is_valid",
        "is_duplicate",
        "created_at",
        "updated_at",
    ]
    updated = dict(zip(keys, row))
    return _attach_tags_to_leads([updated])[0]


def delete_lead(lead_id: int) -> bool:
    query = "DELETE FROM leads WHERE id = %s;"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (lead_id,))
            deleted = cur.rowcount > 0
        conn.commit()
    return deleted


def get_lead_score_breakdown(lead_id: int) -> dict | None:
    lead = get_lead_by_id(lead_id)
    if not lead:
        return None
    score_data = calculate_lead_score(lead)
    return {
        "lead_id": lead_id,
        "score": score_data["total"],
        "breakdown": score_data["breakdown"],
    }


def recalculate_lead_score(lead_id: int) -> dict | None:
    lead = get_lead_by_id(lead_id)
    if not lead:
        return None

    score_data = calculate_lead_score(lead)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE leads SET score = %s, updated_at = NOW() WHERE id = %s;",
                (score_data["total"], lead_id),
            )
        conn.commit()

    return {
        "lead_id": lead_id,
        "score": score_data["total"],
        "breakdown": score_data["breakdown"],
    }


def recalculate_all_scores() -> dict:
    select_query = """
        SELECT id, source, name, phone, email, address, city, state, company_name, cnpj, url
        FROM leads;
    """
    update_query = "UPDATE leads SET score = %s, updated_at = NOW() WHERE id = %s;"

    updated = 0
    score_sum = 0
    score_distribution = {
        "90-100": 0,
        "70-89": 0,
        "50-69": 0,
        "<50": 0,
    }
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(select_query)
            rows = cur.fetchall()
            for row in rows:
                lead = {
                    "id": row[0],
                    "source": row[1],
                    "name": row[2],
                    "phone": row[3],
                    "email": row[4],
                    "address": row[5],
                    "city": row[6],
                    "state": row[7],
                    "company_name": row[8],
                    "cnpj": row[9],
                    "url": row[10],
                }
                score = calculate_lead_score(lead).get("total", 0)
                cur.execute(update_query, (score, lead["id"]))
                updated += 1
                score_sum += score
                if score >= 90:
                    score_distribution["90-100"] += 1
                elif score >= 70:
                    score_distribution["70-89"] += 1
                elif score >= 50:
                    score_distribution["50-69"] += 1
                else:
                    score_distribution["<50"] += 1
        conn.commit()

    avg_score = round(score_sum / updated, 2) if updated else 0
    return {
        "updated": updated,
        "avg_score": avg_score,
        "score_distribution": score_distribution,
    }


def normalize_leads_consistency() -> dict:
    select_query = """
        SELECT id, source, name, phone, email, address, city, state, company_name, cnpj, url, score, funnel_status, loss_reason
        FROM leads
        WHERE deleted_at IS NULL;
    """
    update_query = """
        UPDATE leads
        SET score = %s,
            funnel_status = %s,
            loss_reason = %s,
            updated_at = NOW()
        WHERE id = %s;
    """

    scanned = 0
    total_updated = 0
    score_updated = 0
    status_normalized = 0
    loss_reason_cleared = 0

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(select_query)
            rows = cur.fetchall()
            for row in rows:
                scanned += 1
                current = {
                    "id": row[0],
                    "source": row[1],
                    "name": row[2],
                    "phone": row[3],
                    "email": row[4],
                    "address": row[5],
                    "city": row[6],
                    "state": row[7],
                    "company_name": row[8],
                    "cnpj": row[9],
                    "url": row[10],
                    "score": row[11],
                    "funnel_status": row[12],
                    "loss_reason": row[13],
                }
                next_score = calculate_lead_score(current).get("total", 0)
                next_status = normalize_funnel_status(current.get("funnel_status"))
                next_loss_reason = current.get("loss_reason") if next_status == "perdido" else None

                changed = False
                if int(current.get("score") or 0) != int(next_score):
                    score_updated += 1
                    changed = True
                if str(current.get("funnel_status") or "").strip().lower() != next_status:
                    status_normalized += 1
                    changed = True
                if (current.get("loss_reason") or None) != next_loss_reason:
                    if current.get("loss_reason") is not None and next_loss_reason is None:
                        loss_reason_cleared += 1
                    changed = True
                if not changed:
                    continue

                cur.execute(update_query, (next_score, next_status, next_loss_reason, current["id"]))
                total_updated += 1
        conn.commit()

    return {
        "status": "ok",
        "scanned": scanned,
        "updated": total_updated,
        "score_updated": score_updated,
        "status_normalized": status_normalized,
        "loss_reason_cleared": loss_reason_cleared,
    }


def batch_update_campaign(lead_ids: list[int], campaign_status: str) -> dict:
    if not lead_ids:
        return {"updated": 0}
    query = """
        UPDATE leads
        SET campaign_status = %s, updated_at = NOW()
        WHERE id = ANY(%s::bigint[]) AND deleted_at IS NULL;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (campaign_status, lead_ids))
            updated = cur.rowcount or 0
        conn.commit()
    return {"updated": updated}


def batch_soft_delete(lead_ids: list[int]) -> dict:
    if not lead_ids:
        return {"deleted": 0}
    query = """
        UPDATE leads
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ANY(%s::bigint[]) AND deleted_at IS NULL;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (lead_ids,))
            deleted = cur.rowcount or 0
        conn.commit()
    return {"deleted": deleted}


def get_leads_by_ids(lead_ids: list[int]) -> list[dict]:
    if not lead_ids:
        return []
    query = """
        SELECT id, source, name, phone, email, address, city, state, company_name,
               cnpj, url, score, funnel_status, loss_reason, prospect_status, prospect_notes, campaign_status, captured_at, next_action_date, next_action_description, is_valid, is_duplicate, created_at, updated_at
        FROM leads
        WHERE id = ANY(%s::bigint[]) AND deleted_at IS NULL
        ORDER BY created_at DESC;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (lead_ids,))
            rows = cur.fetchall()
    keys = [
        "id",
        "source",
        "name",
        "phone",
        "email",
        "address",
        "city",
        "state",
        "company_name",
        "cnpj",
        "url",
        "score",
        "funnel_status",
        "loss_reason",
        "prospect_status",
        "prospect_notes",
        "campaign_status",
        "captured_at",
        "next_action_date",
        "next_action_description",
        "is_valid",
        "is_duplicate",
        "created_at",
        "updated_at",
    ]
    leads = [dict(zip(keys, row)) for row in rows]
    return _attach_tags_to_leads(leads)


def _attach_tags_to_leads(leads: list[dict]) -> list[dict]:
    if not leads:
        return leads
    lead_ids = [lead["id"] for lead in leads if lead.get("id") is not None]
    if not lead_ids:
        for lead in leads:
            lead["tags"] = []
        return leads
    query = """
        SELECT lead_id, tag
        FROM lead_tags
        WHERE lead_id = ANY(%s::bigint[])
        ORDER BY tag ASC;
    """
    tags_map: dict[int, list[str]] = {int(lead_id): [] for lead_id in lead_ids}
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (lead_ids,))
            rows = cur.fetchall()
    for lead_id, tag in rows:
        tags_map.setdefault(int(lead_id), []).append(str(tag))
    for lead in leads:
        lead["tags"] = tags_map.get(int(lead["id"]), [])
    return leads


def list_lead_notes(lead_id: int, limit: int = 50) -> list[dict]:
    query = """
        SELECT id, lead_id, content, author, created_at
        FROM lead_notes
        WHERE lead_id = %s
        ORDER BY created_at DESC
        LIMIT %s;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (lead_id, limit))
            rows = cur.fetchall()
    keys = ["id", "lead_id", "content", "author", "created_at"]
    return [dict(zip(keys, row)) for row in rows]


def add_lead_note(lead_id: int, content: str, author: str | None = None) -> dict:
    query = """
        INSERT INTO lead_notes (lead_id, content, author)
        VALUES (%s, %s, %s)
        RETURNING id, lead_id, content, author, created_at;
    """
    interaction_query = """
        INSERT INTO lead_interactions (lead_id, type, content, metadata, author)
        VALUES (%s, 'note', %s, '{}'::jsonb, %s);
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (lead_id, content, author or "dashboard"))
            row = cur.fetchone()
            cur.execute(interaction_query, (lead_id, content, author or "dashboard"))
        conn.commit()
    keys = ["id", "lead_id", "content", "author", "created_at"]
    return dict(zip(keys, row))


def add_lead_tag(lead_id: int, tag: str) -> list[str]:
    clean_tag = tag.strip().lower()
    if not clean_tag:
        return list_lead_tags(lead_id)
    query = """
        INSERT INTO lead_tags (lead_id, tag)
        VALUES (%s, %s)
        ON CONFLICT (lead_id, tag) DO NOTHING;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (lead_id, clean_tag))
        conn.commit()
    return list_lead_tags(lead_id)


def remove_lead_tag(lead_id: int, tag: str) -> list[str]:
    clean_tag = tag.strip().lower()
    query = """
        DELETE FROM lead_tags
        WHERE lead_id = %s AND tag = %s;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (lead_id, clean_tag))
        conn.commit()
    return list_lead_tags(lead_id)


def list_lead_tags(lead_id: int) -> list[str]:
    query = """
        SELECT tag
        FROM lead_tags
        WHERE lead_id = %s
        ORDER BY tag ASC;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (lead_id,))
            rows = cur.fetchall()
    return [str(row[0]) for row in rows]


def list_all_tags() -> list[str]:
    query = """
        SELECT DISTINCT tag
        FROM lead_tags
        ORDER BY tag ASC;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()
    return [str(row[0]) for row in rows]


def batch_add_tag(lead_ids: list[int], tag: str) -> dict:
    clean_tag = tag.strip().lower()
    if not lead_ids or not clean_tag:
        return {"updated": 0}
    query = """
        INSERT INTO lead_tags (lead_id, tag)
        SELECT id, %s
        FROM leads
        WHERE id = ANY(%s::bigint[]) AND deleted_at IS NULL
        ON CONFLICT (lead_id, tag) DO NOTHING;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (clean_tag, lead_ids))
            updated = cur.rowcount or 0
        conn.commit()
    return {"updated": updated, "tag": clean_tag}
