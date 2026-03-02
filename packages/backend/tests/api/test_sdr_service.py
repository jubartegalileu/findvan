from app.services import sdr_service


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


def test_get_queue_applies_limit_clause(monkeypatch):
    cursor = _FakeCursor()
    monkeypatch.setattr(sdr_service, "get_connection", lambda: _FakeConn(cursor))

    sdr_service.get_queue(limit=321)

    assert "LIMIT %s" in cursor.last_query
    assert cursor.last_params[-1] == 321


def test_get_queue_caps_limit(monkeypatch):
    cursor = _FakeCursor()
    monkeypatch.setattr(sdr_service, "get_connection", lambda: _FakeConn(cursor))

    sdr_service.get_queue(limit=999999)

    assert cursor.last_params[-1] == 5000


def test_get_queue_volume_uses_capped_limit_param(monkeypatch):
    row = (
        1,
        "Lead",
        "Company",
        "1111",
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
    cursor = _FakeCursor(rows=[row] * 6000)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: _FakeConn(cursor))

    _ = sdr_service.get_queue(limit=999999)
    assert cursor.last_params[-1] == 5000
