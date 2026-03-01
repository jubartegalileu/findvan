import json
from datetime import datetime, timezone

from ..db import get_connection


FUNNEL_STATUSES = ["novo", "contactado", "respondeu", "interessado", "convertido", "perdido"]
FUNNEL_TRANSITIONS = {
    "novo": {"contactado", "perdido"},
    "contactado": {"respondeu", "perdido"},
    "respondeu": {"interessado", "perdido"},
    "interessado": {"convertido", "perdido"},
    "convertido": {"perdido"},
    "perdido": {"novo"},
}


def _normalize_status(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    return normalized if normalized in FUNNEL_TRANSITIONS else "novo"


def _period_clause(period_days: int | None) -> tuple[str, tuple[object, ...]]:
    if not period_days:
        return "", ()
    return " AND p.entered_stage_at >= NOW() - (%s || ' days')::interval", (period_days,)


def get_grouped(*, period_days: int | None = None) -> dict:
    where_period, period_params = _period_clause(period_days)
    query = f"""
        SELECT
          p.funnel_status,
          l.id,
          l.name,
          l.company_name,
          l.phone,
          l.city,
          l.score,
          p.entered_stage_at,
          p.loss_reason,
          p.loss_reason_detail,
          GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - p.entered_stage_at)) / 86400))::int AS days_in_stage
        FROM pipeline p
        JOIN leads l ON l.id = p.lead_id
        WHERE l.deleted_at IS NULL
        {where_period}
        ORDER BY COALESCE(l.score, 0) DESC, p.entered_stage_at ASC;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, period_params)
            rows = cur.fetchall()

    stages: dict[str, list[dict]] = {status: [] for status in FUNNEL_STATUSES}
    for row in rows:
        status = _normalize_status(row[0])
        stages[status].append(
            {
                "lead_id": row[1],
                "name": row[2],
                "company_name": row[3],
                "phone": row[4],
                "city": row[5],
                "score": row[6],
                "entered_stage_at": row[7],
                "loss_reason": row[8],
                "loss_reason_detail": row[9],
                "days_in_stage": row[10],
            }
        )

    total = sum(len(stages[status]) for status in FUNNEL_STATUSES)
    return {"stages": stages, "total": total}


def get_summary(*, period_days: int | None = None) -> dict:
    where_period, period_params = _period_clause(period_days)
    query = f"""
        SELECT
          p.funnel_status,
          COUNT(*)::int AS count,
          COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - p.entered_stage_at)) / 86400), 0)::float AS avg_days
        FROM pipeline p
        JOIN leads l ON l.id = p.lead_id
        WHERE l.deleted_at IS NULL
        {where_period}
        GROUP BY p.funnel_status;
    """

    counts = {status: 0 for status in FUNNEL_STATUSES}
    avg_days_map = {status: 0.0 for status in FUNNEL_STATUSES}
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, period_params)
            for status, count, avg_days in cur.fetchall():
                normalized = _normalize_status(status)
                counts[normalized] = int(count or 0)
                avg_days_map[normalized] = float(avg_days or 0)

    total = sum(counts.values())
    stages = []
    for idx, status in enumerate(FUNNEL_STATUSES):
        count = counts[status]
        pct = round((count / total) * 100, 2) if total else 0.0
        next_status = FUNNEL_STATUSES[idx + 1] if idx < len(FUNNEL_STATUSES) - 1 else None
        conversion_rate = round((counts.get(next_status, 0) / count) * 100, 2) if next_status and count else 0.0
        stages.append(
            {
                "status": status,
                "count": count,
                "pct": pct,
                "conversion_rate": conversion_rate,
                "avg_days": round(avg_days_map[status], 2),
            }
        )

    overall_conversion = round((counts["convertido"] / counts["novo"]) * 100, 2) if counts["novo"] else 0.0
    avg_total_days = round(sum(avg_days_map.values()), 2)

    return {
        "total": total,
        "overall_conversion": overall_conversion,
        "avg_total_days": avg_total_days,
        "stages": stages,
    }


def move_stage(
    *,
    lead_id: int,
    to_status: str,
    moved_by: str | None = None,
    loss_reason: str | None = None,
    loss_reason_detail: str | None = None,
) -> dict | None:
    normalized_to = _normalize_status(to_status)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT p.funnel_status, p.stage_history
                FROM pipeline p
                JOIN leads l ON l.id = p.lead_id
                WHERE p.lead_id = %s AND l.deleted_at IS NULL;
                """,
                (lead_id,),
            )
            row = cur.fetchone()
            if not row:
                return None

            current_status = _normalize_status(row[0])
            if normalized_to not in FUNNEL_TRANSITIONS.get(current_status, set()):
                raise ValueError(f"Transição inválida: {current_status} -> {normalized_to}")

            if normalized_to == "perdido" and not (loss_reason or "").strip():
                raise ValueError("loss_reason é obrigatório para mover para perdido")

            if normalized_to != "perdido":
                loss_reason = None
                loss_reason_detail = None

            history_item = {
                "from": current_status,
                "to": normalized_to,
                "moved_by": moved_by or "system",
                "moved_at": datetime.now(timezone.utc).isoformat(),
            }

            cur.execute(
                """
                UPDATE pipeline
                SET
                  funnel_status = %s,
                  entered_stage_at = NOW(),
                  loss_reason = %s,
                  loss_reason_detail = %s,
                  stage_history = COALESCE(stage_history, '[]'::jsonb) || jsonb_build_array(
                    jsonb_build_object(
                      'from', %s,
                      'to', %s,
                      'moved_by', %s,
                      'moved_at', NOW()
                    )
                  )
                WHERE lead_id = %s
                RETURNING lead_id, funnel_status, entered_stage_at, loss_reason, loss_reason_detail, stage_history;
                """,
                (
                    normalized_to,
                    loss_reason,
                    loss_reason_detail,
                    current_status,
                    normalized_to,
                    moved_by or "system",
                    lead_id,
                ),
            )
            updated = cur.fetchone()

            cur.execute(
                """
                UPDATE leads
                SET funnel_status = %s, loss_reason = %s, updated_at = NOW()
                WHERE id = %s;
                """,
                (
                    normalized_to,
                    f"outro:{loss_reason_detail}" if normalized_to == "perdido" and loss_reason == "outro" and loss_reason_detail else loss_reason,
                    lead_id,
                ),
            )

            cur.execute(
                """
                INSERT INTO lead_interactions (lead_id, type, content, metadata, author)
                VALUES (%s, 'status_change', %s, %s::jsonb, %s);
                """,
                (
                    lead_id,
                    f"{current_status} -> {normalized_to}",
                    json.dumps(history_item),
                    moved_by or "pipeline",
                ),
            )
        conn.commit()

    return {
        "lead_id": updated[0],
        "funnel_status": updated[1],
        "entered_stage_at": updated[2],
        "loss_reason": updated[3],
        "loss_reason_detail": updated[4],
        "stage_history": updated[5],
    }


def get_history(limit: int = 50) -> list[dict]:
    capped = max(1, min(limit, 200))
    query = """
        SELECT
          p.lead_id,
          h.entry->>'from' AS from_status,
          h.entry->>'to' AS to_status,
          h.entry->>'moved_by' AS moved_by,
          h.entry->>'moved_at' AS moved_at
        FROM pipeline p
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.stage_history, '[]'::jsonb)) AS h(entry)
        ORDER BY COALESCE((h.entry->>'moved_at')::timestamptz, NOW()) DESC
        LIMIT %s;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (capped,))
            rows = cur.fetchall()

    return [
        {
            "lead_id": row[0],
            "from": row[1],
            "to": row[2],
            "moved_by": row[3],
            "moved_at": row[4],
        }
        for row in rows
    ]
