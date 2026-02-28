from typing import Iterable
from psycopg import sql
from ..db import get_connection


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
               cnpj, url, prospect_status, prospect_notes, campaign_status, captured_at, is_valid, is_duplicate, created_at, updated_at
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
               cnpj, url, prospect_status, prospect_notes, campaign_status, captured_at, is_valid, is_duplicate, created_at, updated_at
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
          prospect_status = %s,
          prospect_notes = %s,
          campaign_status = %s,
          is_valid = %s,
          is_duplicate = %s,
          updated_at = NOW()
        WHERE id = %s
        RETURNING id, source, name, phone, email, address, city, state, company_name,
                  cnpj, url, prospect_status, prospect_notes, campaign_status, captured_at, is_valid, is_duplicate, created_at, updated_at;
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
