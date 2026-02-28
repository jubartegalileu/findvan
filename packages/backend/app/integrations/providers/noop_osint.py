from __future__ import annotations

from ..contracts import OsintLeadCandidate, OsintSearchRequest


class NoopOsintProvider:
    """Provider placeholder para novas fontes OSINT sem acoplamento prematuro."""

    source_name = "manual"

    def search(self, request: OsintSearchRequest) -> list[OsintLeadCandidate]:
        return []
