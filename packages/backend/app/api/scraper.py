from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services.scraper_service import (
    get_scraper_stats,
    list_scraper_runs,
    run_google_maps_scraper,
)


router = APIRouter()


class ScraperRequest(BaseModel):
    city: str = Field(..., min_length=2)
    state: str | None = Field(default=None, min_length=2, max_length=2)
    max_results: int = Field(default=100, ge=1, le=999)


@router.post("/google-maps")
def run_google_maps(payload: ScraperRequest):
    try:
        result = run_google_maps_scraper(
            city=payload.city,
            max_results=payload.max_results,
            state=payload.state,
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
