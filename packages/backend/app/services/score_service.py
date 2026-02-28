import re


PHONE_RE = re.compile(r"^\d{11}$")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _normalize_digits(value: str | None) -> str:
    if not value:
        return ""
    return "".join(char for char in value if char.isdigit())


def calculate_lead_score(lead: dict) -> dict:
    phone = _normalize_digits(lead.get("phone"))
    email = (lead.get("email") or "").strip()
    address = (lead.get("address") or "").strip()
    cnpj = _normalize_digits(lead.get("cnpj"))
    name = (lead.get("name") or lead.get("company_name") or "").strip()
    url = (lead.get("url") or "").strip()
    city = (lead.get("city") or "").strip()
    state = (lead.get("state") or "").strip()
    source = (lead.get("source") or "").strip().lower()

    breakdown = {
        "phone": bool(PHONE_RE.match(phone)),
        "email": bool(email and EMAIL_RE.match(email)),
        "address": len(address) > 10,
        "cnpj": len(cnpj) == 14,
        "name": len(name) > 3,
        "url": bool(url),
        "city": bool(city),
        "state": bool(state),
        "source": source in {"google_maps", "cnpj_lookup"},
    }

    weights = {
        "phone": 25,
        "email": 15,
        "address": 15,
        "cnpj": 15,
        "name": 10,
        "url": 5,
        "city": 5,
        "state": 5,
        "source": 5,
    }

    total = sum(weights[key] for key, ok in breakdown.items() if ok)
    return {"total": min(total, 100), "breakdown": breakdown}
