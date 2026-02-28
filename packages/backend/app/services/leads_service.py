from typing import Iterable
from psycopg import sql
from ..db import get_connection
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
    "is_valid",
    "is_duplicate",
)


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
            lead.get("funnel_status", "novo"),
            lead.get("loss_reason"),
            lead.get("prospect_status", "nao_contatado"),
            lead.get("prospect_notes"),
            lead.get("campaign_status"),
            lead.get("captured_at"),
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


def list_leads(limit: int = 50) -> list[dict]:
    query = """
        SELECT id, source, name, phone, email, address, city, state, company_name,
               cnpj, url, score, funnel_status, loss_reason, prospect_status, prospect_notes, campaign_status, captured_at, is_valid, is_duplicate, created_at, updated_at
        FROM leads
        ORDER BY created_at DESC
        LIMIT %s;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (limit,))
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
        "is_valid",
        "is_duplicate",
        "created_at",
        "updated_at",
    ]
    return [dict(zip(keys, row)) for row in rows]


def get_lead_by_id(lead_id: int) -> dict | None:
    query = """
        SELECT id, source, name, phone, email, address, city, state, company_name,
               cnpj, url, score, funnel_status, loss_reason, prospect_status, prospect_notes, campaign_status, captured_at, is_valid, is_duplicate, created_at, updated_at
        FROM leads
        WHERE id = %s;
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
        "is_valid",
        "is_duplicate",
        "created_at",
        "updated_at",
    ]
    return dict(zip(keys, row))


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
          is_valid = %s,
          is_duplicate = %s,
          updated_at = NOW()
        WHERE id = %s
        RETURNING id, source, name, phone, email, address, city, state, company_name,
                  cnpj, url, score, funnel_status, loss_reason, prospect_status, prospect_notes, campaign_status, captured_at, is_valid, is_duplicate, created_at, updated_at;
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
        data.get("funnel_status", current.get("funnel_status", "novo")),
        data.get("loss_reason"),
        data.get("prospect_status", "nao_contatado"),
        data.get("prospect_notes"),
        data.get("campaign_status"),
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
        "is_valid",
        "is_duplicate",
        "created_at",
        "updated_at",
    ]
    return dict(zip(keys, row))


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


def recalculate_all_scores() -> dict:
    select_query = """
        SELECT id, source, name, phone, email, address, city, state, company_name, cnpj, url
        FROM leads;
    """
    update_query = "UPDATE leads SET score = %s, updated_at = NOW() WHERE id = %s;"

    updated = 0
    score_sum = 0
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
        conn.commit()

    avg_score = round(score_sum / updated, 2) if updated else 0
    return {"updated": updated, "avg_score": avg_score}
