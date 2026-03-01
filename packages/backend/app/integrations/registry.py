from __future__ import annotations

import os

from .contracts import OsintProvider, MessagingProvider
from .providers.noop_messaging import NoopMessagingProvider
from .providers.noop_osint import NoopOsintProvider
from .providers.twilio_messaging import TwilioMessagingProvider


def get_messaging_provider(name: str | None = None) -> MessagingProvider:
    provider_name = (name or os.getenv("FINDVAN_MESSAGING_PROVIDER", "noop")).strip().lower()
    if provider_name == "twilio":
        provider = TwilioMessagingProvider(
            account_sid=os.getenv("TWILIO_ACCOUNT_SID"),
            auth_token=os.getenv("TWILIO_AUTH_TOKEN"),
            from_whatsapp_number=os.getenv("TWILIO_WHATSAPP_FROM"),
        )
        if provider.is_configured:
            return provider
        return NoopMessagingProvider()
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
    requested_provider = (os.getenv("FINDVAN_MESSAGING_PROVIDER", "noop") or "noop").strip().lower()
    fallback_active = requested_provider == "twilio" and messaging.provider_name != "twilio"
    return {
        "messaging_provider": messaging.provider_name,
        "requested_messaging_provider": requested_provider,
        "messaging_fallback_active": fallback_active,
        "available_messaging_providers": ["noop", "twilio"],
        "osint_provider": osint.source_name,
        "compatibility_mode": "backward-compatible",
    }
