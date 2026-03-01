from app.integrations.registry import get_messaging_provider, get_osint_provider


def test_registry_defaults_to_noop_providers(monkeypatch):
    monkeypatch.delenv("FINDVAN_MESSAGING_PROVIDER", raising=False)
    monkeypatch.delenv("FINDVAN_OSINT_PROVIDER", raising=False)

    messaging = get_messaging_provider()
    osint = get_osint_provider()

    assert messaging.provider_name == "noop"
    assert osint.source_name == "manual"


def test_registry_falls_back_to_noop_when_twilio_missing_credentials(monkeypatch):
    monkeypatch.setenv("FINDVAN_MESSAGING_PROVIDER", "twilio")
    monkeypatch.delenv("TWILIO_ACCOUNT_SID", raising=False)
    monkeypatch.delenv("TWILIO_AUTH_TOKEN", raising=False)
    monkeypatch.delenv("TWILIO_WHATSAPP_FROM", raising=False)

    messaging = get_messaging_provider()
    assert messaging.provider_name == "noop"


def test_registry_returns_twilio_when_credentials_present(monkeypatch):
    monkeypatch.setenv("FINDVAN_MESSAGING_PROVIDER", "twilio")
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "AC123")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "token")
    monkeypatch.setenv("TWILIO_WHATSAPP_FROM", "+5511888888888")

    messaging = get_messaging_provider()
    assert messaging.provider_name == "twilio"
