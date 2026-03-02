from app.services import sdr_service


class _FakeCursor:
    def __init__(self, rows=None, one_row=None):
        self.last_query = ""
        self.last_params = ()
        self._rows = list(rows or [])
        self._one_row = one_row
        self.executed = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query, params=None):
        self.last_query = str(query)
        self.last_params = tuple(params or ())
        self.executed.append((self.last_query, self.last_params))
        self._rows = []

    def fetchall(self):
        return self._rows

    def fetchone(self):
        return self._one_row


class _FakeConn:
    def __init__(self, cursor):
        self._cursor = cursor
        self.did_commit = False
        self.did_rollback = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def cursor(self):
        return self._cursor

    def commit(self):
        self.did_commit = True

    def rollback(self):
        self.did_rollback = True


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


def test_get_queue_applies_assigned_to_filter(monkeypatch):
    cursor = _FakeCursor()
    monkeypatch.setattr(sdr_service, "get_connection", lambda: _FakeConn(cursor))

    sdr_service.get_queue(assigned_to="alice")

    assert "s.assigned_to = %s" in cursor.last_query
    assert "alice" in cursor.last_params


def test_assign_owner_updates_assignment_and_commits(monkeypatch):
    cursor = _FakeCursor(one_row=(12, "alice"))
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    result = sdr_service.assign_owner(lead_id=12, assigned_to="alice")

    assert result == {"lead_id": 12, "assigned_to": "alice"}
    assert conn.did_commit is True
    assert any("UPDATE sdr_activities" in query for query, _ in cursor.executed)
    assert any("INSERT INTO lead_interactions" in query for query, _ in cursor.executed)


def test_get_stats_by_assignee_applies_filter(monkeypatch):
    cursor = _FakeCursor(one_row=(5, 2, 1))
    monkeypatch.setattr(sdr_service, "get_connection", lambda: _FakeConn(cursor))

    stats = sdr_service.get_stats_by_assignee(assigned_to="alice")

    assert stats["total"] == 5
    assert stats["done_today"] == 2
    assert stats["overdue"] == 1
    assert "s.assigned_to = %s" in cursor.last_query
    assert cursor.last_params == ("alice",)


def test_assign_owner_batch_updates_multiple_and_commits(monkeypatch):
    class _BatchCursor(_FakeCursor):
        def __init__(self):
            super().__init__()
            self._update_called = False

        def execute(self, query, params=None):
            super().execute(query, params)
            if "UPDATE sdr_activities" in str(query):
                self._rows = [(12,), (13,)]
                self._update_called = True
            elif self._update_called:
                self._rows = []

    cursor = _BatchCursor()
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    result = sdr_service.assign_owner_batch(lead_ids=[12, 13, 13], assigned_to="alice")

    assert result["updated_count"] == 2
    assert result["lead_ids"] == [12, 13]
    assert result["assigned_to"] == "alice"
    assert conn.did_commit is True
    assert any("UPDATE sdr_activities" in query for query, _ in cursor.executed)
    assert sum(1 for query, _ in cursor.executed if "INSERT INTO lead_interactions" in query) == 2


def test_register_action_batch_updates_multiple_and_commits(monkeypatch):
    class _BatchActionCursor(_FakeCursor):
        def __init__(self):
            super().__init__()
            self._update_called = False

        def execute(self, query, params=None):
            super().execute(query, params)
            if "UPDATE sdr_activities" in str(query):
                self._rows = [(21,), (22,)]
                self._update_called = True
            elif self._update_called:
                self._rows = []

    cursor = _BatchActionCursor()
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    result = sdr_service.register_action_batch(lead_ids=[21, 22], action_type="done", cadence_days=2)

    assert result["updated_count"] == 2
    assert result["lead_ids"] == [21, 22]
    assert result["action_type"] == "done"
    assert conn.did_commit is True
    assert any("UPDATE sdr_activities" in query for query, _ in cursor.executed)
    assert sum(1 for query, _ in cursor.executed if "INSERT INTO lead_interactions" in query) == 2


def test_add_note_batch_updates_multiple_and_commits(monkeypatch):
    class _BatchNoteCursor(_FakeCursor):
        def __init__(self):
            super().__init__()
            self._update_called = False

        def execute(self, query, params=None):
            super().execute(query, params)
            if "UPDATE sdr_activities" in str(query):
                self._rows = [(31,), (32,)]
                self._update_called = True
            elif self._update_called:
                self._rows = []

    cursor = _BatchNoteCursor()
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    result = sdr_service.add_note_batch(lead_ids=[31, 32], note="Observacao em lote")

    assert result["updated_count"] == 2
    assert result["lead_ids"] == [31, 32]
    assert conn.did_commit is True
    assert any("UPDATE sdr_activities" in query for query, _ in cursor.executed)
    assert sum(1 for query, _ in cursor.executed if "INSERT INTO lead_interactions" in query) == 2


def test_list_bulk_templates_by_owner(monkeypatch):
    class _TemplateListCursor(_FakeCursor):
        def execute(self, query, params=None):
            super().execute(query, params)
            self._rows = [(1, "alice", "Template A", "Enviar proposta", 2, "Nota A", True, 7)]

    cursor = _TemplateListCursor()
    monkeypatch.setattr(sdr_service, "get_connection", lambda: _FakeConn(cursor))

    templates = sdr_service.list_bulk_templates(owner="alice")

    assert len(templates) == 1
    assert templates[0]["owner"] == "alice"
    assert "FROM sdr_bulk_templates" in cursor.last_query
    assert cursor.last_params == ("alice",)


def test_save_bulk_template_upserts_and_commits(monkeypatch):
    row = (3, "alice", "Template B", "Ligar amanhã", 1, "Nota B", False, 4)
    cursor = _FakeCursor(one_row=row)
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    saved = sdr_service.save_bulk_template(
        owner="alice",
        name="Template B",
        next_action_description="Ligar amanhã",
        cadence_days=1,
        note="Nota B",
    )

    assert saved["id"] == 3
    assert saved["owner"] == "alice"
    assert saved["sort_order"] == 4
    assert conn.did_commit is True
    assert any("ON CONFLICT (owner, name)" in query for query, _ in cursor.executed)


def test_delete_bulk_template_returns_true_when_deleted(monkeypatch):
    cursor = _FakeCursor(one_row=(9,))
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    deleted = sdr_service.delete_bulk_template(template_id=9, owner="alice")

    assert deleted is True
    assert conn.did_commit is True
    assert "DELETE FROM sdr_bulk_templates" in cursor.last_query
    assert cursor.last_params == (9, "alice")


def test_update_bulk_template_preferences_updates_and_returns_row(monkeypatch):
    row = (9, "alice", "Template Z", "Acao", 3, "Nota", True, 1)
    cursor = _FakeCursor(one_row=row)
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    updated = sdr_service.update_bulk_template_preferences(
        template_id=9,
        owner="alice",
        is_favorite=True,
        sort_order=1,
    )

    assert updated is not None
    assert updated["is_favorite"] is True
    assert updated["sort_order"] == 1
    assert conn.did_commit is True
    assert "UPDATE sdr_bulk_templates" in cursor.last_query
