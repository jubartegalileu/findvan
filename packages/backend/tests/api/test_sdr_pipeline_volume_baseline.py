from time import perf_counter

from app.services import pipeline_service, sdr_service


class _BenchmarkCursor:
    def __init__(self, rows=None):
        self.last_query = ""
        self.last_params = ()
        self._rows = list(rows or [])

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query, params=None):
        self.last_query = str(query)
        self.last_params = tuple(params or ())

    def fetchall(self):
        return self._rows


class _FakeConn:
    def __init__(self, cursor):
        self._cursor = cursor

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def cursor(self):
        return self._cursor


def _build_sdr_row(idx: int):
    return (
        idx,
        f"Lead {idx}",
        f"Company {idx}",
        f"55119999{idx:04d}",
        "Santos",
        80,
        None,
        "nao_contatado",
        None,
        None,
        0,
        None,
        0,
        [],
        "novo",
        "planned",
    )


def _build_pipeline_row(idx: int):
    return (
        "novo",
        idx,
        f"Lead {idx}",
        f"Company {idx}",
        f"55119999{idx:04d}",
        "Santos",
        80,
        None,
        None,
        None,
        2,
    )


def test_sdr_queue_volume_baseline_5k(monkeypatch):
    rows = [_build_sdr_row(idx) for idx in range(1, 5001)]
    cursor = _BenchmarkCursor(rows=rows)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: _FakeConn(cursor))

    t0 = perf_counter()
    result = sdr_service.get_queue(limit=5000)
    elapsed_ms = (perf_counter() - t0) * 1000

    assert len(result) == 5000
    assert cursor.last_params[-1] == 5000
    # Baseline sintético para serialização/mapeamento local (sem latência de DB)
    assert elapsed_ms < 1500


def test_pipeline_grouped_volume_baseline_5k(monkeypatch):
    rows = [_build_pipeline_row(idx) for idx in range(1, 5001)]
    cursor = _BenchmarkCursor(rows=rows)
    monkeypatch.setattr(pipeline_service, "get_connection", lambda: _FakeConn(cursor))

    t0 = perf_counter()
    result = pipeline_service.get_grouped(limit=5000)
    elapsed_ms = (perf_counter() - t0) * 1000

    assert result["total"] == 5000
    assert len(result["stages"]["novo"]) == 5000
    assert cursor.last_params[-1] == 5000
    # Baseline sintético para agrupamento local (sem latência de DB)
    assert elapsed_ms < 1500
