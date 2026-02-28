from app.services import retention_jobs_service as service


def teardown_function():
    service.stop_retention_job()


def test_run_retention_cycle_updates_status(monkeypatch):
    monkeypatch.setattr(service, "prune_old_receipt_events", lambda retention_days=None: 4)
    monkeypatch.setattr(service, "prune_old_activity_events", lambda retention_days=None: 6)

    result = service.run_retention_cycle(receipts_retention_days=10, activity_retention_days=20)
    assert result["status"] == "ok"
    assert result["deleted"]["receipts"] == 4
    assert result["deleted"]["activity"] == 6
    assert result["deleted"]["total"] == 10

    status = service.get_retention_job_status()
    assert status["run_count"] >= 1
    assert status["last_deleted"]["total"] == 10
    assert status["retention_days"]["receipts"] == 10
    assert status["retention_days"]["activity"] == 20


def test_start_retention_job_respects_disabled_flag(monkeypatch):
    monkeypatch.setenv("RETENTION_JOB_ENABLED", "0")
    status = service.start_retention_job()
    assert status["enabled"] is False
    assert status["running"] is False
