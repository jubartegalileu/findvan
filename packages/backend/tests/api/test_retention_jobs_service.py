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


def test_start_retention_job_keeps_api_without_local_worker(monkeypatch):
    monkeypatch.setenv("RETENTION_JOB_ENABLED", "1")
    status = service.start_retention_job()
    assert status["enabled"] is True
    assert status["running"] is False
    assert status["thread_alive"] is False


def test_worker_run_once_executes_cycle_when_lock_acquired(monkeypatch):
    monkeypatch.setenv("RETENTION_JOB_ENABLED", "1")

    calls = {"cycles": 0}

    monkeypatch.setattr(service, "acquire_lock", lambda *args, **kwargs: {"acquired": True, "lock": {"owner_id": "w1"}})
    monkeypatch.setattr(service, "renew_lock", lambda *args, **kwargs: {"renewed": True})
    monkeypatch.setattr(service, "release_lock", lambda *args, **kwargs: True)

    def _fake_cycle(*args, **kwargs):
        calls["cycles"] += 1
        return {"status": "ok", "deleted": {"receipts": 0, "activity": 0, "total": 0}, "duration_ms": 1}

    monkeypatch.setattr(service, "run_retention_cycle", _fake_cycle)

    status = service.run_retention_worker(run_once=True)
    assert calls["cycles"] == 1
    assert status["running"] is False


def test_worker_run_once_skips_cycle_when_lock_not_acquired(monkeypatch):
    monkeypatch.setenv("RETENTION_JOB_ENABLED", "1")

    calls = {"cycles": 0}
    monkeypatch.setattr(service, "acquire_lock", lambda *args, **kwargs: {"acquired": False, "lock": {"owner_id": "other"}})
    monkeypatch.setattr(service, "release_lock", lambda *args, **kwargs: False)
    monkeypatch.setattr(service, "renew_lock", lambda *args, **kwargs: {"renewed": False})

    def _fake_cycle(*args, **kwargs):
        calls["cycles"] += 1
        return {"status": "ok"}

    monkeypatch.setattr(service, "run_retention_cycle", _fake_cycle)

    status = service.run_retention_worker(run_once=True)
    assert calls["cycles"] == 0
    assert status["running"] is False
