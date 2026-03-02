from app.services import pipeline_service


class _FakeCursor:
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
        self._rows = []

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


def test_get_grouped_applies_limit_clause(monkeypatch):
    cursor = _FakeCursor()
    monkeypatch.setattr(pipeline_service, "get_connection", lambda: _FakeConn(cursor))

    pipeline_service.get_grouped(limit=777)

    assert "LIMIT %s" in cursor.last_query
    assert cursor.last_params[-1] == 777


def test_get_grouped_caps_limit(monkeypatch):
    cursor = _FakeCursor()
    monkeypatch.setattr(pipeline_service, "get_connection", lambda: _FakeConn(cursor))

    pipeline_service.get_grouped(limit=999999)

    assert cursor.last_params[-1] == 10000


def test_get_grouped_volume_uses_capped_limit_param(monkeypatch):
    row = (
        "novo",
        1,
        "Lead",
        "Company",
        "1111",
        "Santos",
        80,
        None,
        None,
        None,
        2,
    )
    cursor = _FakeCursor(rows=[row] * 6000)
    monkeypatch.setattr(pipeline_service, "get_connection", lambda: _FakeConn(cursor))

    _ = pipeline_service.get_grouped(limit=999999)

    assert cursor.last_params[-1] == 10000
