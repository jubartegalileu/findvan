import json
from ..db import get_connection


FUNNEL_STATUSES = ["novo", "contactado", "respondeu", "interessado", "convertido", "perdido"]
FUNNEL_STATUS_LABELS = {
    "novo": "Novo",
    "contactado": "Contactado",
    "respondeu": "Respondeu",
    "interessado": "Interessado",
    "convertido": "Convertido",
    "perdido": "Perdido",
}

FUNNEL_TRANSITIONS = {
    "novo": {"contactado", "perdido"},
    "contactado": {"respondeu", "perdido"},
    "respondeu": {"interessado", "perdido"},
    "interessado": {"convertido", "perdido"},
    "convertido": {"perdido"},
    "perdido": {"novo"},
}


LOSS_REASON_OPTIONS = [
    "sem_interesse",
    "ja_tem_fornecedor",
    "preco_alto",
    "sem_resposta_3_tentativas",
    "numero_invalido_ou_bloqueado",
    "outro",
]

LOSS_REASON_LABELS = {
    "sem_interesse": "Sem interesse",
    "ja_tem_fornecedor": "Já tem fornecedor",
    "preco_alto": "Preço alto",
    "sem_resposta_3_tentativas": "Sem resposta (3 tentativas)",
    "numero_invalido_ou_bloqueado": "Número inválido/bloqueado",
    "outro": "Outro",
}

LOSS_REASONS = set(LOSS_REASON_OPTIONS)


def get_valid_transitions(current_status: str) -> list[str]:
    return sorted(FUNNEL_TRANSITIONS.get(current_status, set()))


def validate_transition(current_status: str, new_status: str) -> bool:
    if current_status == new_status:
        return True
    return new_status in FUNNEL_TRANSITIONS.get(current_status, set())


def change_status(
    *,
    lead_id: int,
    new_status: str,
    author: str | None = None,
    loss_reason: str | None = None,
    loss_reason_other: str | None = None,
) -> dict | None:
    if new_status not in FUNNEL_TRANSITIONS:
        raise ValueError("Status de funil inválido.")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, funnel_status, loss_reason FROM leads WHERE id = %s;",
                (lead_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            current_status = row[1] or "novo"

            if not validate_transition(current_status, new_status):
                raise ValueError(f"Transição inválida: {current_status} -> {new_status}")

            normalized_loss_reason = None
            if new_status == "perdido":
                if not loss_reason:
                    raise ValueError("Motivo de perda é obrigatório para status perdido.")
                if loss_reason not in LOSS_REASONS:
                    raise ValueError("Motivo de perda inválido.")
                if loss_reason == "outro" and not (loss_reason_other or "").strip():
                    raise ValueError("Detalhe do motivo 'outro' é obrigatório.")
                normalized_loss_reason = loss_reason
                if loss_reason == "outro":
                    normalized_loss_reason = f"outro:{(loss_reason_other or '').strip()}"

            if new_status != "perdido":
                normalized_loss_reason = None

            cur.execute(
                """
                UPDATE leads
                SET funnel_status = %s, loss_reason = %s, updated_at = NOW()
                WHERE id = %s
                RETURNING id, funnel_status, loss_reason, updated_at;
                """,
                (new_status, normalized_loss_reason, lead_id),
            )
            updated = cur.fetchone()

            interaction_meta = {
                "old_status": current_status,
                "new_status": new_status,
                "loss_reason": normalized_loss_reason,
            }
            cur.execute(
                """
                INSERT INTO lead_interactions (lead_id, type, content, metadata, author)
                VALUES (%s, 'status_change', %s, %s::jsonb, %s);
                """,
                (
                    lead_id,
                    f"{current_status} -> {new_status}",
                    json.dumps(interaction_meta),
                    author or "manual",
                ),
            )
        conn.commit()

    return {
        "id": updated[0],
        "funnel_status": updated[1],
        "loss_reason": updated[2],
        "updated_at": updated[3],
        "valid_transitions": get_valid_transitions(updated[1]),
    }


def get_lead_interactions(lead_id: int, limit: int = 30) -> list[dict]:
    query = """
        SELECT id, lead_id, type, content, metadata, author, created_at
        FROM lead_interactions
        WHERE lead_id = %s
        ORDER BY created_at DESC
        LIMIT %s;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (lead_id, limit))
            rows = cur.fetchall()

    keys = ["id", "lead_id", "type", "content", "metadata", "author", "created_at"]
    return [dict(zip(keys, row)) for row in rows]
