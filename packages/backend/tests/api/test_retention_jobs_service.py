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


def test_run_retention_cycle_triggers_recovery_and_succeeds(monkeypatch):
    monkeypatch.setenv("RETENTION_SELF_HEALING_ENABLED", "1")
    monkeypatch.setenv("RETENTION_RECOVERY_BACKOFF_SECONDS", "1")
    monkeypatch.setattr(service.time, "sleep", lambda *_args, **_kwargs: None)

    calls = {"receipts": 0}

    def _prune_receipts(*_args, **_kwargs):
        calls["receipts"] += 1
        if calls["receipts"] == 1:
            raise RuntimeError("simulated retention failure")
        return 2

    monkeypatch.setattr(service, "prune_old_receipt_events", _prune_receipts)
    monkeypatch.setattr(service, "prune_old_activity_events", lambda *_args, **_kwargs: 1)

    result = service.run_retention_cycle(receipts_retention_days=10, activity_retention_days=20, owner_id="worker-a")
    assert result["status"] == "ok"
    assert result.get("recovered") is True

    status = service.get_retention_job_status()
    assert status["self_healing"]["enabled"] is True
    assert status["self_healing"]["last_success_at"] is not None


def test_run_retention_cycle_without_self_healing_returns_error(monkeypatch):
    monkeypatch.setenv("RETENTION_SELF_HEALING_ENABLED", "0")
    monkeypatch.setattr(service, "prune_old_receipt_events", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("boom")))
    monkeypatch.setattr(service, "prune_old_activity_events", lambda *_args, **_kwargs: 0)

    result = service.run_retention_cycle(receipts_retention_days=10, activity_retention_days=20, owner_id="worker-a")
    assert result["status"] == "error"
