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


def test_list_bulk_templates_normalizes_team_owner(monkeypatch):
    class _TemplateListCursor(_FakeCursor):
        def execute(self, query, params=None):
            super().execute(query, params)
            self._rows = []

    cursor = _TemplateListCursor()
    monkeypatch.setattr(sdr_service, "get_connection", lambda: _FakeConn(cursor))

    _ = sdr_service.list_bulk_templates(owner=" Team:Ops Squad ")

    assert cursor.last_params == ("team:ops-squad",)


def test_list_bulk_templates_rejects_empty_team_owner(monkeypatch):
    monkeypatch.setattr(sdr_service, "get_connection", lambda: _FakeConn(_FakeCursor()))

    try:
        sdr_service.list_bulk_templates(owner="team:   ")
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "owner de equipe inválido" in str(exc)


def test_list_bulk_template_audit_filters_owner_template_and_limit(monkeypatch):
    class _AuditListCursor(_FakeCursor):
        def execute(self, query, params=None):
            super().execute(query, params)
            self._rows = [(11, 3, "alice", "save", "system", {"name": "Template A"}, "2026-03-02T10:00:00")]

    cursor = _AuditListCursor()
    monkeypatch.setattr(sdr_service, "get_connection", lambda: _FakeConn(cursor))

    events = sdr_service.list_bulk_template_audit(owner="alice", template_id=3, action="save", limit=20)

    assert len(events) == 1
    assert events[0]["template_id"] == 3
    assert "FROM sdr_bulk_template_audit" in cursor.last_query
    assert cursor.last_params == ("alice", 3, "save", 20)


def test_log_bulk_template_permission_denied_inserts_audit_row(monkeypatch):
    cursor = _FakeCursor()
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    sdr_service.log_bulk_template_permission_denied(
        owner="alice",
        actor="bob",
        operation="save",
        reason="forbidden",
        template_id=9,
    )

    assert conn.did_commit is True
    assert any("INSERT INTO sdr_bulk_template_audit" in query for query, _ in cursor.executed)


def test_initiate_template_access_request_inserts_audit_row_and_returns_request_id(monkeypatch):
    cursor = _FakeCursor(one_row=(321, "2026-03-02T12:00:00"))
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    request = sdr_service.initiate_template_access_request(
        owner="alice",
        actor="bob",
        reason="Acesso negado para mutação de templates",
        template_id=9,
    )

    assert conn.did_commit is True
    assert request["request_id"] == "sdr-access-321"
    assert request["action"] == "access_request_initiated"
    assert request["owner"] == "alice"
    assert request["actor"] == "bob"
    assert request["template_id"] == 9
    assert any("INSERT INTO sdr_bulk_template_audit" in query for query, _ in cursor.executed)


def test_initiate_template_access_request_defaults_actor_unknown_and_template_none(monkeypatch):
    cursor = _FakeCursor(one_row=(11, "2026-03-02T12:00:00"))
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    request = sdr_service.initiate_template_access_request(
        owner="all",
        actor=None,
        reason="Acesso negado",
        template_id=None,
    )

    assert request["actor"] == "unknown"
    assert request["template_id"] is None
    assert request["owner"] == "all"


def test_save_bulk_template_upserts_and_commits(monkeypatch):
    row = (3, "alice", "Template B", "Ligar amanhã", 1, "Nota B", False, 4)
    cursor = _FakeCursor(one_row=row)
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    saved = sdr_service.save_bulk_template(
        owner="alice",
        actor="alice",
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
    assert any("INSERT INTO sdr_bulk_template_audit" in query for query, _ in cursor.executed)


def test_save_bulk_template_normalizes_team_owner(monkeypatch):
    row = (3, "team:ops", "Template B", "Ligar amanhã", 1, "Nota B", False, 4)
    cursor = _FakeCursor(one_row=row)
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    saved = sdr_service.save_bulk_template(
        owner=" Team:OPS ",
        actor="team:ops",
        name="Template B",
        next_action_description="Ligar amanhã",
        cadence_days=1,
        note="Nota B",
    )

    assert saved["owner"] == "team:ops"
    save_calls = [(query, params) for query, params in cursor.executed if "INSERT INTO sdr_bulk_templates" in query]
    assert len(save_calls) == 1
    assert save_calls[0][1][0] == "team:ops"


def test_delete_bulk_template_returns_true_when_deleted(monkeypatch):
    cursor = _FakeCursor(one_row=(9,))
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    deleted = sdr_service.delete_bulk_template(template_id=9, owner="alice", actor="alice")

    assert deleted is True
    assert conn.did_commit is True
    delete_calls = [(query, params) for query, params in cursor.executed if "DELETE FROM sdr_bulk_templates" in query]
    assert len(delete_calls) == 1
    assert delete_calls[0][1] == (9, "alice")
    assert any("INSERT INTO sdr_bulk_template_audit" in query for query, _ in cursor.executed)


def test_delete_bulk_template_normalizes_all_owner(monkeypatch):
    cursor = _FakeCursor(one_row=(9,))
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    deleted = sdr_service.delete_bulk_template(template_id=9, owner=" ALL ", actor="admin")

    assert deleted is True
    delete_calls = [(query, params) for query, params in cursor.executed if "DELETE FROM sdr_bulk_templates" in query]
    assert len(delete_calls) == 1
    assert delete_calls[0][1] == (9, "all")


def test_update_bulk_template_preferences_updates_and_returns_row(monkeypatch):
    row = (9, "alice", "Template Z", "Acao", 3, "Nota", True, 1)
    cursor = _FakeCursor(one_row=row)
    conn = _FakeConn(cursor)
    monkeypatch.setattr(sdr_service, "get_connection", lambda: conn)

    updated = sdr_service.update_bulk_template_preferences(
        template_id=9,
        owner="alice",
        actor="alice",
        is_favorite=True,
        sort_order=1,
    )

    assert updated is not None
    assert updated["is_favorite"] is True
    assert updated["sort_order"] == 1
    assert conn.did_commit is True
    assert any("UPDATE sdr_bulk_templates" in query for query, _ in cursor.executed)
    assert any("INSERT INTO sdr_bulk_template_audit" in query for query, _ in cursor.executed)


def test_normalize_template_owner_defaults_to_all():
    assert sdr_service.normalize_template_owner(None) == "all"
    assert sdr_service.normalize_template_owner(" ") == "all"
    assert sdr_service.normalize_template_owner("ALL") == "all"


def test_normalize_template_owner_team_slug_and_invalid():
    assert sdr_service.normalize_template_owner("Team:Ops Squad") == "team:ops-squad"

    try:
        sdr_service.normalize_template_owner("team:   ")
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "owner de equipe inválido" in str(exc)


def test_ensure_template_mutation_permission_allows_matching_seller():
    actor = sdr_service.ensure_template_mutation_permission(owner="alice", actor="alice")
    assert actor == "alice"


def test_ensure_template_mutation_permission_allows_matching_team():
    actor = sdr_service.ensure_template_mutation_permission(owner="team:ops", actor="team:ops")
    assert actor == "team:ops"


def test_ensure_template_mutation_permission_denies_mismatch():
    try:
        sdr_service.ensure_template_mutation_permission(owner="alice", actor="bob")
        assert False, "expected PermissionError"
    except PermissionError as exc:
        assert "Acesso negado" in str(exc)


def test_ensure_template_mutation_permission_allows_global_only_for_admin():
    actor = sdr_service.ensure_template_mutation_permission(owner="all", actor="admin")
    assert actor == "admin"

    try:
        sdr_service.ensure_template_mutation_permission(owner="all", actor="alice")
        assert False, "expected PermissionError"
    except PermissionError as exc:
        assert "Acesso negado" in str(exc)


def test_evaluate_template_mutation_permission_allowed():
    evaluation = sdr_service.evaluate_template_mutation_permission(owner="alice", actor="alice")
    assert evaluation["allowed"] is True
    assert evaluation["owner"] == "alice"
    assert evaluation["actor"] == "alice"
    assert evaluation["reason"] == "ok"
    assert evaluation["remediation"] is None


def test_evaluate_template_mutation_permission_denied():
    evaluation = sdr_service.evaluate_template_mutation_permission(owner="all", actor="alice")
    assert evaluation["allowed"] is False
    assert evaluation["owner"] == "all"
    assert evaluation["actor"] == "alice"
    assert "Acesso negado" in evaluation["reason"]
    remediation = evaluation["remediation"]
    assert remediation["title"] == "Permissão global requer admin"
    assert remediation["next_action"]


def test_evaluate_template_mutation_permission_actor_required_remediation():
    evaluation = sdr_service.evaluate_template_mutation_permission(owner="alice", actor=None)
    assert evaluation["allowed"] is False
    remediation = evaluation["remediation"]
    assert remediation["title"] == "Ator não informado"
    assert "Preencha o campo de ator" in remediation["next_action"]


def test_resolve_template_permission_denial_remediation_fallback():
    remediation = sdr_service._resolve_template_permission_denial_remediation("erro desconhecido")
    assert remediation["title"] == "Permissão negada"
    assert remediation["next_action"]
