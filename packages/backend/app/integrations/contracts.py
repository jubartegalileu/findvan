from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Literal, Protocol

MessageChannel = Literal["whatsapp"]
MessageDirection = Literal["outbound", "inbound"]
MessageStatus = Literal["queued", "sent", "delivered", "failed"]

OsintSource = Literal["google_maps", "facebook", "linkedin", "manual"]


@dataclass(slots=True)
class OutboundMessage:
    lead_id: str
    channel: MessageChannel
    to: str
    content: str
    template_id: str | None = None
    metadata: dict = field(default_factory=dict)


@dataclass(slots=True)
class MessageReceipt:
    external_id: str
    status: MessageStatus
    provider: str
    occurred_at: datetime
    metadata: dict = field(default_factory=dict)


@dataclass(slots=True)
class OsintSearchRequest:
    source: OsintSource
    state: str
    city: str
    keywords: list[str]
    max_results: int = 50


@dataclass(slots=True)
class OsintLeadCandidate:
    source: OsintSource
    name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    url: str | None = None
    metadata: dict = field(default_factory=dict)


class MessagingProvider(Protocol):
    """Contrato mínimo para providers de mensageria (ex.: WhatsApp)."""

    provider_name: str

    def send(self, payload: OutboundMessage) -> MessageReceipt: ...


class OsintProvider(Protocol):
    """Contrato mínimo para fontes OSINT adicionais."""

    source_name: OsintSource

    def search(self, request: OsintSearchRequest) -> list[OsintLeadCandidate]: ...


CONTRACT_VERSION = "1.0.0"


def contract_descriptor() -> dict:
    return {
        "version": CONTRACT_VERSION,
        "messaging": {
            "channels": ["whatsapp"],
            "required_fields": ["lead_id", "to", "content"],
            "status_flow": ["queued", "sent", "delivered", "failed"],
        },
        "osint": {
            "sources": ["google_maps", "facebook", "linkedin", "manual"],
            "required_fields": ["source", "name"],
            "recommended_fields": ["phone", "address", "city", "state", "url"],
        },
    }


def to_dict(dataclass_instance) -> dict:
    return asdict(dataclass_instance)
