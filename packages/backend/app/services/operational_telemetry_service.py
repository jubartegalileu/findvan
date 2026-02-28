from __future__ import annotations

from datetime import datetime
import json

from ..db import get_connection


INCIDENT_CLASSIFIER_VERSION = "1.0.0"
_SEVERITY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1}


def _normalize_severity(value: str | None) -> str:
    normalized = str(value or "").strip().lower()
    return normalized if normalized in _SEVERITY_RANK else "medium"


def _incident_classification(source: str, event_type: str, severity: str) -> dict:
    source_key = str(source or "").strip().lower()
    event_key = str(event_type or "").strip().lower()
    severity_key = _normalize_severity(severity)

    component = "messaging"
    impact = "degradação moderada"
    recommendation = "Monitorar tendência e confirmar estabilização."

    if "retention" in source_key or event_key.startswith("retention_"):
        component = "retention"
        impact = "risco de backlog e expurgo atrasado"
        recommendation = "Validar worker owner, lock distribuído e último ciclo de retenção."
    elif "alert" in source_key or event_key.startswith("alert_"):
        component = "alerting"
        impact = "perda parcial de observabilidade externa"
        recommendation = "Validar webhook/configuração e políticas de recovery de alertas."

    if "circuit" in event_key:
        severity_key = "critical"
        impact = "auto-recuperação indisponível por proteção de circuito"
        recommendation = "Reduzir causa raiz, revisar thresholds e rearmar circuito com segurança."
    elif event_key.endswith("_failed"):
        severity_key = "high" if severity_key == "medium" else severity_key
        recommendation = "Executar remediação guiada e validar dependências externas."
    elif event_key.endswith("_success"):
        severity_key = "low"
        impact = "incidente mitigado automaticamente"
        recommendation = "Registrar evidência e manter monitoramento."
    elif event_key.endswith("_skipped"):
        severity_key = "medium" if severity_key == "low" else severity_key
        recommendation = "Revisar budget/cooldown para evitar degradação prolongada."

    return {
        "version": INCIDENT_CLASSIFIER_VERSION,
        "component": component,
        "impact": impact,
        "recommendation": recommendation,
        "severity_rank": _SEVERITY_RANK.get(severity_key, 2),
        "severity": severity_key,
    }


def _iso(value) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value or "")


def log_incident(
    source: str,
    event_type: str,
    title: str,
    severity: str = "medium",
    details: dict | None = None,
) -> None:
    query = """
        INSERT INTO operational_incidents (source, event_type, severity, title, details)
        VALUES (%s, %s, %s, %s, %s::jsonb);
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    query,
                    (
                        str(source or "unknown"),
                        str(event_type or "unknown"),
                        str(severity or "medium"),
                        str(title or "Incident"),
                        json.dumps(details or {}),
                    ),
                )
            conn.commit()
    except Exception:
        return


def list_incidents(limit: int = 15, offset: int = 0) -> list[dict]:
    capped_limit = max(1, min(limit, 100))
    safe_offset = max(0, int(offset or 0))
    query = """
        SELECT id, source, event_type, severity, title, details, created_at
        FROM operational_incidents
        ORDER BY created_at DESC, id DESC
        LIMIT %s OFFSET %s;
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (capped_limit, safe_offset))
                rows = cur.fetchall()
        incidents = []
        for row in rows:
            incidents.append(
                {
                    "id": row[0],
                    "source": row[1],
                    "event_type": row[2],
                    "severity": _normalize_severity(row[3]),
                    "title": row[4],
                    "details": row[5] if isinstance(row[5], dict) else {},
                    "created_at": _iso(row[6]),
                }
            )
        for incident in incidents:
            incident["classification"] = _incident_classification(
                incident.get("source"),
                incident.get("event_type"),
                incident.get("severity"),
            )
            incident["severity"] = incident["classification"]["severity"]
        return incidents
    except Exception:
        return []


def build_guardrails(
    incidents: list[dict],
    alerting_metrics: dict,
    retention_metrics: dict,
    limit: int = 5,
) -> list[dict]:
    items: list[dict] = []

    fallback_count = int(alerting_metrics.get("fallback_count") or 0)
    suppressed_count = int(alerting_metrics.get("suppressed_count") or 0)
    retention_fail_count = int(retention_metrics.get("fail_count") or 0)

    if fallback_count >= 10:
        items.append(
            {
                "type": "threshold_guardrail",
                "severity": "critical",
                "component": "alerting",
                "title": "Fallback de alertas acima do limite",
                "impact": "observabilidade externa comprometida",
                "recommendation": "Validar webhook e reduzir volume de erro antes de retomar.",
                "metadata": {"fallback_count": fallback_count},
            }
        )
    elif fallback_count >= 3:
        items.append(
            {
                "type": "threshold_guardrail",
                "severity": "high",
                "component": "alerting",
                "title": "Fallback de alertas em elevação",
                "impact": "sinais críticos podem não chegar ao destino",
                "recommendation": "Checar endpoint de alerta e latência de rede.",
                "metadata": {"fallback_count": fallback_count},
            }
        )

    if retention_fail_count >= 5:
        items.append(
            {
                "type": "threshold_guardrail",
                "severity": "critical",
                "component": "retention",
                "title": "Falhas de retenção recorrentes",
                "impact": "risco de backlog e acúmulo de dados expirados",
                "recommendation": "Validar lock, owner ativo e dependências de banco.",
                "metadata": {"fail_count": retention_fail_count},
            }
        )
    elif retention_fail_count >= 2:
        items.append(
            {
                "type": "threshold_guardrail",
                "severity": "high",
                "component": "retention",
                "title": "Falhas de retenção acima do esperado",
                "impact": "degradação progressiva da rotina de expurgo",
                "recommendation": "Analisar incidentes recentes e executar playbook de retenção.",
                "metadata": {"fail_count": retention_fail_count},
            }
        )

    if suppressed_count >= 20:
        items.append(
            {
                "type": "threshold_guardrail",
                "severity": "medium",
                "component": "alerting",
                "title": "Alta supressão de alertas",
                "impact": "possível ocultação de recorrência de incidentes",
                "recommendation": "Revisar cooldown e janela de deduplicação.",
                "metadata": {"suppressed_count": suppressed_count},
            }
        )

    for incident in incidents:
        classification = incident.get("classification") or _incident_classification(
            incident.get("source"),
            incident.get("event_type"),
            incident.get("severity"),
        )
        items.append(
            {
                "type": "incident_guardrail",
                "severity": classification.get("severity") or "medium",
                "component": classification.get("component") or "messaging",
                "title": incident.get("title") or incident.get("event_type") or "Incidente operacional",
                "impact": classification.get("impact") or "impacto operacional",
                "recommendation": classification.get("recommendation") or "Investigar incidente",
                "metadata": {
                    "incident_id": incident.get("id"),
                    "event_type": incident.get("event_type"),
                    "created_at": incident.get("created_at"),
                },
            }
        )

    items.sort(key=lambda item: _SEVERITY_RANK.get(_normalize_severity(item.get("severity")), 2), reverse=True)
    capped_limit = max(1, min(int(limit or 5), 50))
    for item in items:
        item["severity"] = _normalize_severity(item.get("severity"))
    return items[:capped_limit]
