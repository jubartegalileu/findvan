from ..db import get_connection


FUNNEL_STATUSES = ["novo", "contactado", "respondeu", "interessado", "convertido", "perdido"]


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
