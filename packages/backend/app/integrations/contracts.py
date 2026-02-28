from __future__ import annotations

from copy import deepcopy
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
LATEST_CONTRACT_VERSION = "1.1.0"


_CONTRACT_ALIASES = {
    "v1": "1.0.0",
    "1": "1.0.0",
    "1.0": "1.0.0",
    "1.0.0": "1.0.0",
    "v1.1": "1.1.0",
    "1.1": "1.1.0",
    "1.1.0": "1.1.0",
    "latest": LATEST_CONTRACT_VERSION,
}


_CONTRACTS = {
    "1.0.0": {
        "version": "1.0.0",
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
    },
    "1.1.0": {
        "version": "1.1.0",
        "messaging": {
            "channels": ["whatsapp"],
            "required_fields": ["lead_id", "to", "content"],
            "optional_fields": ["template_id", "idempotency_key", "metadata"],
            "status_flow": ["queued", "sent", "delivered", "failed"],
            "features": ["template_send", "provider_receipt", "idempotency"],
        },
        "osint": {
            "sources": ["google_maps", "facebook", "linkedin", "manual"],
            "required_fields": ["source", "name"],
            "recommended_fields": [
                "phone",
                "address",
                "city",
                "state",
                "url",
                "business_category",
                "confidence_score",
            ],
            "features": ["source_attribution", "metadata_passthrough"],
        },
    },
}


def normalize_contract_version(version: str | None) -> str:
    if version is None:
        return CONTRACT_VERSION
    normalized = _CONTRACT_ALIASES.get(str(version).strip().lower())
    if not normalized:
        raise ValueError("Unsupported contract version.")
    return normalized


def supported_contract_versions() -> list[str]:
    return sorted(_CONTRACTS.keys())


def contract_descriptor(version: str | None = None) -> dict:
    selected_version = normalize_contract_version(version)
    if selected_version not in _CONTRACTS:
        raise ValueError("Unsupported contract version.")
    return deepcopy(_CONTRACTS[selected_version])


def contract_compatibility() -> dict:
    return {
        "default_version": CONTRACT_VERSION,
        "latest_version": LATEST_CONTRACT_VERSION,
        "supported_versions": supported_contract_versions(),
        "backward_compatible": True,
        "policy": "minor version additions only; no breaking removals",
    }


def to_dict(dataclass_instance) -> dict:
    return asdict(dataclass_instance)
