from app.services import distributed_lock_service as service


def teardown_function():
    service._MEMORY_LOCKS.clear()


def test_memory_lock_acquire_and_release(monkeypatch):
    monkeypatch.setattr(service, "get_connection", lambda: (_ for _ in ()).throw(RuntimeError("db offline")))

    acquired = service.acquire_lock("retention-job", "worker-a", 60)
    assert acquired["acquired"] is True
    assert acquired["lock"]["owner_id"] == "worker-a"

    other = service.acquire_lock("retention-job", "worker-b", 60)
    assert other["acquired"] is False
    assert other["lock"]["owner_id"] == "worker-a"

    released = service.release_lock("retention-job", "worker-a")
    assert released is True


def test_memory_lock_renew_requires_owner(monkeypatch):
    monkeypatch.setattr(service, "get_connection", lambda: (_ for _ in ()).throw(RuntimeError("db offline")))
    service.acquire_lock("retention-job", "worker-a", 60)

    renewed = service.renew_lock("retention-job", "worker-a", 60)
    assert renewed["renewed"] is True

    rejected = service.renew_lock("retention-job", "worker-b", 60)
    assert rejected["renewed"] is False
