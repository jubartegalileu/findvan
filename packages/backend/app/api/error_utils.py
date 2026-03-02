import logging

from fastapi import HTTPException


logger = logging.getLogger(__name__)


def raise_bad_request(detail: str, *, code: str = "bad_request") -> None:
    raise HTTPException(status_code=400, detail=detail, headers={"X-Error-Code": code})


def raise_not_found(detail: str, *, code: str = "not_found") -> None:
    raise HTTPException(status_code=404, detail=detail, headers={"X-Error-Code": code})


def raise_forbidden(detail: str, *, code: str = "forbidden") -> None:
    raise HTTPException(status_code=403, detail=detail, headers={"X-Error-Code": code})


def raise_internal_error(*, context: str, exc: Exception, code: str = "internal_error") -> None:
    logger.exception("%s failed: %s", context, exc)
    raise HTTPException(
        status_code=500,
        detail="Erro interno ao processar a solicitação.",
        headers={"X-Error-Code": code},
    )
