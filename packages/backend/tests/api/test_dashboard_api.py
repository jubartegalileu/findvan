from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import dashboard as dashboard_api


def build_client() -> TestClient:
    app = FastAPI()
    app.include_router(dashboard_api.router, prefix="/api/dashboard")
    return TestClient(app)


def test_dashboard_kpis_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_dashboard_kpis",
        lambda: {
            "valid_leads": 10,
            "jobs_today": 3,
            "leads_24h": 40,
            "contacted_leads": 7,
            "reply_rate": 28.5,
            "monthly_conversions": 2,
        },
    )
    client = build_client()
    response = client.get("/api/dashboard/kpis")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["kpis"]["valid_leads"] == 10


def test_dashboard_funnel_summary_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_funnel_summary",
        lambda: {
            "total": 12,
            "conversion_rate": 8.3,
            "stages": [{"status": "novo", "count": 5, "percentage": 41.7}],
        },
    )
    client = build_client()
    response = client.get("/api/dashboard/funnel-summary")
    assert response.status_code == 200
    assert response.json()["summary"]["total"] == 12


def test_dashboard_urgent_actions_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_urgent_actions",
        lambda: {"alerts": [{"id": "replies_pending", "count": 2}], "all_clear": False},
    )
    client = build_client()
    response = client.get("/api/dashboard/urgent-actions")
    assert response.status_code == 200
    assert response.json()["urgent_actions"]["all_clear"] is False


def test_dashboard_weekly_performance_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "dispatch_slo_alert",
        lambda performance, source, window: {"status": "queued", "delivery": "webhook_async"},
    )
    monkeypatch.setattr(
        dashboard_api,
        "get_weekly_performance",
        lambda: {
            "has_data": True,
            "messages_sent": 42,
            "delivery_rate": 95.2,
            "reply_rate": 18.0,
            "block_rate": 1.2,
            "labels": ["22/02", "23/02"],
            "series": [20, 22],
        },
    )
    client = build_client()
    response = client.get("/api/dashboard/weekly-performance")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["performance"]["messages_sent"] == 42
    assert payload["alert_dispatch"]["status"] == "queued"


def test_dashboard_alert_status_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_alerting_status",
        lambda: {"configured": False, "contract_version": "1.0.0"},
    )
    client = build_client()
    response = client.get("/api/dashboard/alerts/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["alerting"]["contract_version"] == "1.0.0"


def test_dashboard_recovery_policies_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_alerting_status",
        lambda: {"self_healing": {"enabled": True, "max_attempts": 3}},
    )
    monkeypatch.setattr(
        dashboard_api,
        "get_retention_job_status",
        lambda: {"self_healing": {"enabled": True, "max_attempts": 2}},
    )
    client = build_client()
    response = client.get("/api/dashboard/recovery-policies")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["policies"]["alerting"]["enabled"] is True
    assert payload["policies"]["retention"]["max_attempts"] == 2


def test_dashboard_operational_telemetry_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_alerting_status",
        lambda: {
            "fallback_count": 2,
            "suppressed_count": 3,
            "sent_count": 5,
            "queued_count": 1,
            "self_healing": {"enabled": True, "attempts_in_window": 1},
        },
    )
    monkeypatch.setattr(
        dashboard_api,
        "get_retention_job_status",
        lambda: {
            "run_count": 10,
            "fail_count": 1,
            "last_error": None,
            "owner": "worker-1",
            "self_healing": {"enabled": True, "attempts_in_window": 2},
        },
    )
    monkeypatch.setattr(
        dashboard_api,
        "list_incidents",
        lambda limit=10, offset=0: [{"id": 1, "source": "alerting", "severity": "medium", "title": "Fallback"}],
    )
    client = build_client()
    response = client.get("/api/dashboard/operational-telemetry?limit=5")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["metrics"]["alerting"]["fallback_count"] == 2
    assert payload["metrics"]["retention"]["run_count"] == 10
    assert payload["metrics"]["alerting"]["self_healing"]["enabled"] is True
    assert payload["metrics"]["retention"]["self_healing"]["enabled"] is True
    assert payload["applied_offset"] == 0
    assert len(payload["incidents"]) == 1


def test_dashboard_guardrails_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_alerting_status",
        lambda: {"fallback_count": 4, "suppressed_count": 2},
    )
    monkeypatch.setattr(
        dashboard_api,
        "get_retention_job_status",
        lambda: {"fail_count": 2},
    )
    monkeypatch.setattr(
        dashboard_api,
        "list_incidents",
        lambda limit=10, offset=0: [{"id": 10, "source": "retention", "event_type": "retention_cycle_error", "severity": "high", "title": "Falha"}],
    )
    monkeypatch.setattr(
        dashboard_api,
        "build_guardrails",
        lambda incidents, alerting_metrics, retention_metrics, limit=5: [
            {
                "type": "incident_guardrail",
                "severity": "high",
                "component": "retention",
                "title": "Falha de retenção",
                "impact": "expurgo degradado",
                "recommendation": "validar owner",
                "metadata": {},
            }
        ],
    )
    client = build_client()
    response = client.get("/api/dashboard/guardrails?limit=5&offset=0")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["applied_limit"] == 5
    assert payload["applied_offset"] == 0
    assert payload["guardrails"][0]["severity"] == "high"


def test_dashboard_playbooks_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "list_playbooks",
        lambda limit=10, offset=0, component=None: [
            {"key": "retention-lock-recovery", "title": "Recovery retenção", "component": "retention"}
        ],
    )
    client = build_client()
    response = client.get("/api/dashboard/playbooks?limit=5&offset=0&component=retention")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["applied_limit"] == 5
    assert payload["applied_offset"] == 0
    assert payload["playbooks"][0]["component"] == "retention"


def test_dashboard_playbook_executions_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "list_playbook_executions",
        lambda limit=10, offset=0, playbook_key=None: [
            {"id": 1, "playbook_key": "retention-lock-recovery", "author": "qa", "result": "success"}
        ],
    )
    client = build_client()
    response = client.get("/api/dashboard/playbooks/executions?limit=5&offset=0")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["executions"][0]["result"] == "success"


def test_dashboard_playbook_execution_create_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "register_playbook_execution",
        lambda playbook_key, author="system", incident_id=None, result="started", note=None, evidence=None: {
            "id": 9,
            "playbook_key": playbook_key,
            "author": author,
            "result": result,
            "note": note,
            "evidence": evidence or {},
        },
    )
    client = build_client()
    response = client.post(
        "/api/dashboard/playbooks/executions",
        json={
            "playbook_key": "alerting-webhook-recovery",
            "author": "qa",
            "result": "completed",
            "note": "executado com sucesso",
            "evidence": {"step_count": 3},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["execution"]["playbook_key"] == "alerting-webhook-recovery"
    assert payload["execution"]["result"] == "completed"


def test_dashboard_postmortem_readiness_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "build_postmortem_readiness",
        lambda limit=10, offset=0: {
            "template": {"version": "1.0.0", "required_fields": ["incident_summary", "root_cause"]},
            "critical_incidents": [{"incident_id": 1, "title": "Circuit open", "severity": "critical"}],
            "applied_limit": limit,
            "applied_offset": offset,
        },
    )
    client = build_client()
    response = client.get("/api/dashboard/postmortem-readiness?limit=5&offset=0")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["template"]["version"] == "1.0.0"
    assert payload["critical_incidents"][0]["severity"] == "critical"


def test_dashboard_alert_dispatch_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_weekly_performance",
        lambda: {"has_data": True, "messages_sent": 15, "delivery_rate": 62, "reply_rate": 2, "block_rate": 8},
    )
    monkeypatch.setattr(
        dashboard_api,
        "dispatch_slo_alert",
        lambda metrics, source, window: {"status": "fallback", "delivery": "local_fallback"},
    )
    client = build_client()
    response = client.post("/api/dashboard/alerts/dispatch")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["dispatch"]["delivery"] == "local_fallback"


def test_dashboard_metrics_governance_get_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_active_thresholds",
        lambda: {"delivery_rate_critical_lt": 70, "block_rate_critical_gt": 5},
    )
    client = build_client()
    response = client.get("/api/dashboard/metrics-governance")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["thresholds"]["delivery_rate_critical_lt"] == 70


def test_dashboard_metrics_governance_history_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "get_threshold_history",
        lambda limit=20: [{"id": "a-1", "author": "qa", "diffs": [{"key": "x", "from": 1, "to": 2}]}],
    )
    client = build_client()
    response = client.get("/api/dashboard/metrics-governance/history?limit=10")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["history"][0]["author"] == "qa"


def test_dashboard_metrics_governance_patch_ok(monkeypatch):
    monkeypatch.setattr(
        dashboard_api,
        "update_thresholds",
        lambda thresholds, author="system": {"updated": True, "thresholds": thresholds, "audit": {"author": author}},
    )
    client = build_client()
    response = client.patch(
        "/api/dashboard/metrics-governance",
        json={"author": "pm", "thresholds": {"delivery_rate_critical_lt": 68}},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["result"]["updated"] is True
    assert payload["result"]["audit"]["author"] == "pm"
