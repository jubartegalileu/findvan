from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services.scraper_service import (
    create_scraper_schedule,
    delete_scraper_schedule,
    get_scraper_coverage,
    get_scraper_stats,
    get_keywords_profile,
    list_scraper_schedules,
    list_scraper_runs,
    run_google_maps_scraper,
    set_keywords_profile,
    update_scraper_schedule,
)


router = APIRouter()


class ScraperRequest(BaseModel):
    city: str | None = Field(default=None, min_length=2)
    state: str = Field(..., min_length=2, max_length=2)
    max_results: int = Field(default=50, ge=1, le=999)
    keywords: list[str] | None = None
    ignore_existing: bool = True
    validate_phone: bool = True
    auto_cnpj: bool = False
    source: str = "google_maps"


class KeywordsPayload(BaseModel):
    state: str = Field(..., min_length=2, max_length=2)
    city: str = Field(..., min_length=2)
    keywords: list[str]


class ScraperScheduleCreatePayload(BaseModel):
    state: str = Field(..., min_length=2, max_length=2)
    city: str | None = Field(default=None, min_length=2)
    keywords: list[str]
    quantity: int = Field(default=50, ge=1, le=999)
    frequency: str
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    execution_time: str
    is_active: bool = True


class ScraperScheduleUpdatePayload(BaseModel):
    state: str | None = Field(default=None, min_length=2, max_length=2)
    city: str | None = Field(default=None, min_length=2)
    keywords: list[str] | None = None
    quantity: int | None = Field(default=None, ge=1, le=999)
    frequency: str | None = None
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    execution_time: str | None = None
    is_active: bool | None = None


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


@router.get("/coverage")
def scraper_coverage():
    try:
        return {"status": "ok", "coverage": get_scraper_coverage()}
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


@router.get("/schedules")
def get_scraper_schedules():
    try:
        return {"status": "ok", "schedules": list_scraper_schedules()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/schedules")
def post_scraper_schedule(payload: ScraperScheduleCreatePayload):
    try:
        schedule = create_scraper_schedule(payload.model_dump())
        return {"status": "ok", "schedule": schedule}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/schedules/{schedule_id}")
def patch_scraper_schedule(schedule_id: int, payload: ScraperScheduleUpdatePayload):
    try:
        schedule = update_scraper_schedule(schedule_id, payload.model_dump())
        if not schedule:
            raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
        return {"status": "ok", "schedule": schedule}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/schedules/{schedule_id}")
def remove_scraper_schedule(schedule_id: int):
    try:
        deleted = delete_scraper_schedule(schedule_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
