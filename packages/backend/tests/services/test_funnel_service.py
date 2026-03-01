from app.services.funnel_service import (
    FUNNEL_TRANSITIONS,
    LOSS_REASONS,
    get_valid_transitions,
    validate_transition,
)


def test_funnel_has_all_expected_statuses():
    assert set(FUNNEL_TRANSITIONS.keys()) == {
        "novo",
        "contactado",
        "respondeu",
        "interessado",
        "convertido",
        "perdido",
    }


def test_get_valid_transitions_for_novo():
    assert get_valid_transitions("novo") == ["contactado", "perdido"]


def test_validate_transition_allows_same_status():
    assert validate_transition("novo", "novo") is True
    assert validate_transition("perdido", "perdido") is True


def test_validate_transition_rejects_invalid_jump():
    assert validate_transition("novo", "convertido") is False
    assert validate_transition("contactado", "convertido") is False
    assert validate_transition("interessado", "respondeu") is False


def test_loss_reasons_contains_expected_options():
    assert LOSS_REASONS == {
        "sem_interesse",
        "ja_tem_fornecedor",
        "preco_alto",
        "sem_resposta_3_tentativas",
        "numero_invalido_ou_bloqueado",
        "outro",
    }
