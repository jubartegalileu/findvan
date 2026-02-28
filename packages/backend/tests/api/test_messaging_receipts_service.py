from __future__ import annotations

import json
from datetime import datetime, timezone

from app.services import messaging_receipts_service as service


class _FakeCursor:
    def __init__(self, db):
        self.db = db
        self._one = None
        self._all = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query, params=None):
        params = params or ()
        normalized = " ".join(str(query).split()).lower()
        self._one = None
        self._all = []

        if normalized.startswith("insert into messaging_receipts"):
            (
                version,
                event_type,
                external_id,
                provider,
                lead_id,
                campaign_id,
                destination,
                occurred_at,
                status_detail,
                metadata_json,
            ) = params
            duplicate = next(
                (
                    row
                    for row in self.db["rows"]
                    if row[3] == external_id and row[4] == provider and row[2] == event_type
                ),
                None,
            )
            if duplicate:
                self._one = None
                return

            row = (
                self.db["next_id"],
                version,
                event_type,
                external_id,
                provider,
                lead_id,
                campaign_id,
                destination,
                occurred_at,
                status_detail,
                json.loads(metadata_json),
                datetime.now(tz=timezone.utc),
            )
            self.db["next_id"] += 1
            self.db["rows"].append(row)
            self._one = row
            return

        if "from messaging_receipts" in normalized and "where external_id" in normalized:
            external_id, provider, event_type = params
            self._one = next(
                (
                    row
                    for row in self.db["rows"]
                    if row[3] == external_id and row[4] == provider and row[2] == event_type
                ),
                None,
            )
            return

        if "from messaging_receipts" in normalized and "order by id desc" in normalized:
            limit = int(params[0])
            self._all = sorted(self.db["rows"], key=lambda row: row[0], reverse=True)[:limit]
            return

        if normalized.startswith("delete from messaging_receipts"):
            self.db["rows"].clear()
            return

        raise AssertionError(f"Unsupported query in fake cursor: {query}")

    def fetchone(self):
        return self._one

    def fetchall(self):
        return self._all


class _FakeConnection:
    def __init__(self, db):
        self.db = db

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def cursor(self):
        return _FakeCursor(self.db)

    def commit(self):
        return None


def test_register_and_list_receipts_with_persistent_store(monkeypatch):
    fake_db = {"rows": [], "next_id": 1}
    monkeypatch.setattr(service, "get_connection", lambda: _FakeConnection(fake_db))
    service.clear_receipt_events()

    event, dedup = service.register_receipt_event(
        {
            "version": "1.1.0",
            "event_type": "delivered",
            "external_id": "SM-PERSIST-1",
            "provider": "twilio",
            "lead_id": "10",
            "campaign_id": "camp-1",
            "to": "+5511999999999",
            "occurred_at": datetime.now(tz=timezone.utc).isoformat(),
            "status_detail": "ok",
            "metadata": {"attempt": 1},
        }
    )

    assert dedup is False
    assert event["external_id"] == "SM-PERSIST-1"
    assert event["id"] == 1

    listed = service.list_receipt_events(limit=10)
    assert len(listed) == 1
    assert listed[0]["external_id"] == "SM-PERSIST-1"
    assert listed[0]["metadata"]["attempt"] == 1


def test_register_receipt_idempotent_duplicate(monkeypatch):
    fake_db = {"rows": [], "next_id": 1}
    monkeypatch.setattr(service, "get_connection", lambda: _FakeConnection(fake_db))
    service.clear_receipt_events()

    first, first_dedup = service.register_receipt_event(
        {
            "version": "1.1.0",
            "event_type": "delivered",
            "external_id": "SM-DUP-1",
            "provider": "twilio",
            "occurred_at": datetime.now(tz=timezone.utc).isoformat(),
            "metadata": {},
        }
    )
    duplicate, duplicate_dedup = service.register_receipt_event(
        {
            "version": "1.1.0",
            "event_type": "delivered",
            "external_id": "SM-DUP-1",
            "provider": "twilio",
            "occurred_at": datetime.now(tz=timezone.utc).isoformat(),
            "metadata": {},
        }
    )

    assert first_dedup is False
    assert duplicate_dedup is True
    assert first["id"] == duplicate["id"]
    assert len(service.list_receipt_events(limit=10)) == 1
