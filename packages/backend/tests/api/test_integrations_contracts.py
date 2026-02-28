from app.integrations.contracts import (
    CONTRACT_VERSION,
    LATEST_CONTRACT_VERSION,
    contract_descriptor,
    normalize_contract_version,
)


def test_normalize_contract_version_aliases():
    assert normalize_contract_version(None) == CONTRACT_VERSION
    assert normalize_contract_version("v1") == "1.0.0"
    assert normalize_contract_version("latest") == LATEST_CONTRACT_VERSION


def test_contract_descriptor_latest_contains_additive_fields():
    descriptor = contract_descriptor("1.1.0")
    assert descriptor["version"] == "1.1.0"
    assert "optional_fields" in descriptor["messaging"]
    assert "features" in descriptor["osint"]
