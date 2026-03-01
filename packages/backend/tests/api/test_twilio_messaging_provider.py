from app.integrations.contracts import OutboundMessage
from app.integrations.providers.twilio_messaging import TwilioMessagingProvider


def test_twilio_provider_not_configured_raises():
    provider = TwilioMessagingProvider(account_sid=None, auth_token=None, from_whatsapp_number=None)
    payload = OutboundMessage(lead_id="1", channel="whatsapp", to="+5511999999999", content="teste")

    try:
        provider.send(payload)
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "não configurado" in str(exc)


def test_twilio_provider_send_success(monkeypatch):
    provider = TwilioMessagingProvider(
        account_sid="AC123",
        auth_token="token",
        from_whatsapp_number="+5511888888888",
    )

    class StubResponse:
        status_code = 201

        @staticmethod
        def json():
            return {"sid": "SM123", "status": "sent"}

    def fake_post(url, data, auth, timeout):
        assert "Accounts/AC123/Messages.json" in url
        assert data["To"] == "whatsapp:+5511999999999"
        assert auth == ("AC123", "token")
        assert timeout == 15
        return StubResponse()

    monkeypatch.setattr("app.integrations.providers.twilio_messaging.requests.post", fake_post)

    payload = OutboundMessage(lead_id="1", channel="whatsapp", to="+5511999999999", content="teste")
    receipt = provider.send(payload)

    assert receipt.provider == "twilio"
    assert receipt.external_id == "SM123"
    assert receipt.status == "sent"
