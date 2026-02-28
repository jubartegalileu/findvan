from ..db import get_connection


FUNNEL_STATUSES = ["novo", "contactado", "respondeu", "interessado", "convertido", "perdido"]
ACTIVITY_TYPES = {"scraper", "msg_sent", "msg_received", "status_change", "campaign"}


def get_dashboard_kpis() -> dict:
    query = """
        WITH lead_counts AS (
            SELECT
                COUNT(*) FILTER (WHERE is_valid = true) AS valid_leads,
                COUNT(*) FILTER (WHERE COALESCE(funnel_status, 'novo') != 'novo') AS contacted_leads,
                COUNT(*) FILTER (WHERE COALESCE(funnel_status, 'novo') = 'respondeu') AS replied_leads,
                COUNT(*) FILTER (
                    WHERE COALESCE(funnel_status, 'novo') = 'convertido'
                      AND date_trunc('month', COALESCE(updated_at, created_at)) = date_trunc('month', NOW())
                ) AS monthly_conversions
            FROM leads
        ),
        scraper_counts AS (
            SELECT
                COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS jobs_today,
                COALESCE(SUM(total_count) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) AS leads_24h
            FROM scraper_runs
        )
        SELECT
            lead_counts.valid_leads,
            scraper_counts.jobs_today,
            scraper_counts.leads_24h,
            lead_counts.contacted_leads,
            lead_counts.replied_leads,
            lead_counts.monthly_conversions
        FROM lead_counts, scraper_counts;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            row = cur.fetchone()

    valid_leads = row[0] or 0
    jobs_today = row[1] or 0
    leads_24h = row[2] or 0
    contacted_leads = row[3] or 0
    replied_leads = row[4] or 0
    monthly_conversions = row[5] or 0

    reply_rate = 0
    if contacted_leads > 0:
        reply_rate = round((replied_leads / contacted_leads) * 100, 1)

    return {
        "valid_leads": valid_leads,
        "jobs_today": jobs_today,
        "leads_24h": leads_24h,
        "contacted_leads": contacted_leads,
        "reply_rate": reply_rate,
        "monthly_conversions": monthly_conversions,
    }


def get_funnel_summary() -> dict:
    query = """
        SELECT COALESCE(funnel_status, 'novo') AS status, COUNT(*)::int
        FROM leads
        GROUP BY COALESCE(funnel_status, 'novo');
    """
    counts = {status: 0 for status in FUNNEL_STATUSES}
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            for status, total in cur.fetchall():
                if status in counts:
                    counts[status] = total or 0

    total_leads = sum(counts.values())
    conversion_rate = round((counts["convertido"] / total_leads) * 100, 1) if total_leads else 0
    stages = []
    for status in FUNNEL_STATUSES:
        value = counts[status]
        percentage = round((value / total_leads) * 100, 1) if total_leads else 0
        stages.append(
            {
                "status": status,
                "count": value,
                "percentage": percentage,
            }
        )

    return {
        "total": total_leads,
        "conversion_rate": conversion_rate,
        "stages": stages,
    }


def get_urgent_actions() -> dict:
    query = """
        SELECT
            COUNT(*) FILTER (
                WHERE COALESCE(funnel_status, 'novo') = 'respondeu'
                  AND COALESCE(updated_at, created_at) <= NOW() - INTERVAL '2 hours'
            ) AS replies_pending,
            COUNT(*) FILTER (
                WHERE next_action_date IS NOT NULL
                  AND next_action_date < NOW()
                  AND COALESCE(funnel_status, 'novo') NOT IN ('convertido', 'perdido')
            ) AS followups_overdue,
            COUNT(*) FILTER (WHERE COALESCE(funnel_status, 'novo') = 'novo') AS new_to_contact
        FROM leads;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            row = cur.fetchone()

    replies_pending = row[0] or 0
    followups_overdue = row[1] or 0
    new_to_contact = row[2] or 0

    alerts = [
        {
            "id": "replies_pending",
            "label": "Respostas pendentes",
            "color": "red",
            "priority": 1,
            "count": replies_pending,
            "funnel": "respondeu",
        },
        {
            "id": "followups_overdue",
            "label": "Follow-ups vencidos",
            "color": "yellow",
            "priority": 2,
            "count": followups_overdue,
            "funnel": "contactado",
        },
        {
            "id": "new_to_contact",
            "label": "Novos leads para contactar",
            "color": "green",
            "priority": 3,
            "count": new_to_contact,
            "funnel": "novo",
        },
    ]
    active = [item for item in alerts if item["count"] > 0]
    active.sort(key=lambda item: item["priority"])

    return {"alerts": active, "all_clear": len(active) == 0}


def get_weekly_performance() -> dict:
    query = """
        WITH days AS (
            SELECT generate_series(
                date_trunc('day', NOW()) - INTERVAL '6 days',
                date_trunc('day', NOW()),
                INTERVAL '1 day'
            ) AS day
        ),
        interactions AS (
            SELECT
                date_trunc('day', created_at) AS day,
                COUNT(*) FILTER (WHERE type = 'msg_sent')::int AS sent,
                COUNT(*) FILTER (
                    WHERE type = 'msg_sent'
                      AND COALESCE(metadata->>'delivery_status', '') = 'delivered'
                )::int AS delivered,
                COUNT(*) FILTER (WHERE type = 'msg_received')::int AS replied,
                COUNT(*) FILTER (
                    WHERE type = 'msg_sent'
                      AND COALESCE(metadata->>'delivery_status', '') IN ('blocked', 'failed_blocked')
                )::int AS blocked
            FROM lead_interactions
            WHERE created_at >= date_trunc('day', NOW()) - INTERVAL '6 days'
            GROUP BY 1
        )
        SELECT
            to_char(days.day, 'DD/MM') AS label,
            COALESCE(interactions.sent, 0) AS sent,
            COALESCE(interactions.delivered, 0) AS delivered,
            COALESCE(interactions.replied, 0) AS replied,
            COALESCE(interactions.blocked, 0) AS blocked
        FROM days
        LEFT JOIN interactions ON interactions.day = days.day
        ORDER BY days.day;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()

    labels: list[str] = []
    series: list[int] = []
    total_sent = 0
    total_delivered = 0
    total_replied = 0
    total_blocked = 0

    for label, sent, delivered, replied, blocked in rows:
        labels.append(label)
        series.append(sent or 0)
        total_sent += sent or 0
        total_delivered += delivered or 0
        total_replied += replied or 0
        total_blocked += blocked or 0

    if total_sent <= 0:
        return {
            "has_data": False,
            "messages_sent": 0,
            "delivery_rate": 0,
            "reply_rate": 0,
            "block_rate": 0,
            "labels": labels,
            "series": series,
        }

    delivery_rate = round((total_delivered / total_sent) * 100, 1)
    reply_rate = round((total_replied / total_sent) * 100, 1)
    block_rate = round((total_blocked / total_sent) * 100, 1)

    return {
        "has_data": True,
        "messages_sent": total_sent,
        "delivery_rate": delivery_rate,
        "reply_rate": reply_rate,
        "block_rate": block_rate,
        "labels": labels,
        "series": series,
    }


def list_activity_events(limit: int = 20) -> list[dict]:
    query = """
        WITH scraper_events AS (
            SELECT
                ('scraper-' || id::text) AS id,
                'scraper'::text AS type,
                ('Scraper ' || city || COALESCE('/' || state, '')) AS title,
                (COALESCE(inserted_count, 0)::text || ' leads inseridos') AS description,
                created_at
            FROM scraper_runs
        ),
        interaction_events AS (
            SELECT
                ('interaction-' || id::text) AS id,
                CASE
                    WHEN type = 'msg_sent' THEN 'msg_sent'
                    WHEN type = 'msg_received' THEN 'msg_received'
                    WHEN type = 'status_change' THEN 'status_change'
                    WHEN type = 'campaign' THEN 'campaign'
                    ELSE 'status_change'
                END AS type,
                CASE
                    WHEN type = 'msg_sent' THEN 'Mensagem enviada'
                    WHEN type = 'msg_received' THEN 'Resposta recebida'
                    WHEN type = 'status_change' THEN 'Status alterado'
                    WHEN type = 'campaign' THEN 'Campanha'
                    ELSE 'Atividade'
                END AS title,
                COALESCE(content, '') AS description,
                created_at
            FROM lead_interactions
        ),
        merged AS (
            SELECT * FROM scraper_events
            UNION ALL
            SELECT * FROM interaction_events
        )
        SELECT id, type, title, description, created_at
        FROM merged
        ORDER BY created_at DESC
        LIMIT %s;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (limit,))
            rows = cur.fetchall()

    events = []
    for row in rows:
        event_type = row[1]
        normalized_type = event_type if event_type in ACTIVITY_TYPES else "status_change"
        events.append(
            {
                "id": row[0],
                "type": normalized_type,
                "title": row[2],
                "description": row[3],
                "created_at": row[4].isoformat() if row[4] else None,
            }
        )

    return events
