from __future__ import annotations

import os

from .contracts import OsintProvider, MessagingProvider
from .providers.noop_messaging import NoopMessagingProvider
from .providers.noop_osint import NoopOsintProvider


def get_messaging_provider(name: str | None = None) -> MessagingProvider:
    provider_name = (name or os.getenv("FINDVAN_MESSAGING_PROVIDER", "noop")).strip().lower()
    if provider_name == "noop":
        return NoopMessagingProvider()
    return NoopMessagingProvider()


def get_osint_provider(source: str | None = None) -> OsintProvider:
    source_name = (source or os.getenv("FINDVAN_OSINT_PROVIDER", "manual")).strip().lower()
    if source_name == "manual":
        return NoopOsintProvider()
    return NoopOsintProvider()


def integration_readiness_snapshot() -> dict:
    messaging = get_messaging_provider()
    osint = get_osint_provider()
    return {
        "messaging_provider": messaging.provider_name,
        "osint_provider": osint.source_name,
        "compatibility_mode": "backward-compatible",
    }
