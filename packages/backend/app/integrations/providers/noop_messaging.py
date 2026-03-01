from __future__ import annotations

from datetime import datetime, timezone

from ..contracts import MessageReceipt, OutboundMessage


class NoopMessagingProvider:
    """Provider placeholder para manter compatibilidade até integração real."""

    provider_name = "noop"

    def send(self, payload: OutboundMessage) -> MessageReceipt:
        external_id = f"noop-{payload.lead_id}-{int(datetime.now(tz=timezone.utc).timestamp())}"
        return MessageReceipt(
            external_id=external_id,
            status="queued",
            provider=self.provider_name,
            occurred_at=datetime.now(tz=timezone.utc),
            metadata={"note": "noop provider (readiness mode)"},
        )
