from app.integrations.registry import get_messaging_provider, get_osint_provider


def test_registry_defaults_to_noop_providers(monkeypatch):
    monkeypatch.delenv("FINDVAN_MESSAGING_PROVIDER", raising=False)
    monkeypatch.delenv("FINDVAN_OSINT_PROVIDER", raising=False)

    messaging = get_messaging_provider()
    osint = get_osint_provider()

    assert messaging.provider_name == "noop"
    assert osint.source_name == "manual"
