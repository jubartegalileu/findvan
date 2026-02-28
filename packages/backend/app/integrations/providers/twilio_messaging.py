from __future__ import annotations

from datetime import datetime, timezone

import requests

from ..contracts import MessageReceipt, OutboundMessage


class TwilioMessagingProvider:
    provider_name = "twilio"

    def __init__(self, account_sid: str | None, auth_token: str | None, from_whatsapp_number: str | None):
        self.account_sid = (account_sid or "").strip()
        self.auth_token = (auth_token or "").strip()
        self.from_whatsapp_number = (from_whatsapp_number or "").strip()

    @property
    def is_configured(self) -> bool:
        return bool(self.account_sid and self.auth_token and self.from_whatsapp_number)

    @staticmethod
    def _format_whatsapp(number: str) -> str:
        value = (number or "").strip()
        if not value:
            raise ValueError("Número de destino obrigatório.")
        if value.startswith("whatsapp:"):
            return value
        return f"whatsapp:{value}"

    def send(self, payload: OutboundMessage) -> MessageReceipt:
        if not self.is_configured:
            raise ValueError("Twilio provider não configurado. Defina credenciais no ambiente.")

        to_value = self._format_whatsapp(payload.to)
        from_value = self._format_whatsapp(self.from_whatsapp_number)

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        response = requests.post(
            url,
            data={
                "To": to_value,
                "From": from_value,
                "Body": payload.content,
            },
            auth=(self.account_sid, self.auth_token),
            timeout=15,
        )

        if response.status_code >= 400:
            message = response.text[:500] if response.text else "Twilio request failed"
            raise RuntimeError(f"Twilio error ({response.status_code}): {message}")

        body = response.json()
        external_id = body.get("sid") or f"twilio-{int(datetime.now(tz=timezone.utc).timestamp())}"
        provider_status = (body.get("status") or "queued").lower()
        mapped_status = provider_status if provider_status in {"queued", "sent", "delivered", "failed"} else "queued"

        return MessageReceipt(
            external_id=external_id,
            status=mapped_status,
            provider=self.provider_name,
            occurred_at=datetime.now(tz=timezone.utc),
            metadata={
                "twilio_status": provider_status,
                "to": to_value,
                "from": from_value,
            },
        )
