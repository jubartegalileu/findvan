from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services.scraper_service import (
    get_scraper_stats,
    get_keywords_profile,
    list_scraper_runs,
    run_google_maps_scraper,
    set_keywords_profile,
)


router = APIRouter()


class ScraperRequest(BaseModel):
    city: str | None = Field(default=None, min_length=2)
    state: str = Field(..., min_length=2, max_length=2)
    max_results: int = Field(default=50, ge=1, le=999)
    keywords: list[str] | None = None


class KeywordsPayload(BaseModel):
    state: str = Field(..., min_length=2, max_length=2)
    city: str = Field(..., min_length=2)
    keywords: list[str]


@router.post("/google-maps")
def run_google_maps(payload: ScraperRequest):
    try:
        city = payload.city.strip() if payload.city else None
        if not payload.state:
            raise HTTPException(status_code=400, detail="Estado é obrigatório.")
        clean_keywords = [item.strip() for item in (payload.keywords or []) if item and item.strip()]
        result = run_google_maps_scraper(
            city=city,
            max_results=payload.max_results,
            state=payload.state,
            keywords=clean_keywords,
        )
        return {"status": "ok", "result": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/stats")
def scraper_stats():
    try:
        return {"status": "ok", "stats": get_scraper_stats()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/runs")
def scraper_runs(limit: int = 20):
    try:
        return {"status": "ok", "runs": list_scraper_runs(limit)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/keywords")
def scraper_keywords(state: str, city: str):
    try:
        return {"status": "ok", "profile": get_keywords_profile(state, city)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put("/keywords")
def put_scraper_keywords(payload: KeywordsPayload):
    try:
        if not payload.keywords:
            raise HTTPException(status_code=400, detail="Informe ao menos uma keyword.")
        profile = set_keywords_profile(payload.state, payload.city, payload.keywords)
        return {"status": "ok", "profile": profile}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
