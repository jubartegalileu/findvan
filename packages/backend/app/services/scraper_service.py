import json
import os
import subprocess
from pathlib import Path
from .leads_service import insert_leads
from ..db import get_connection
from ..config import SCRAPER_NODE_PATH


REPO_ROOT = Path(__file__).resolve().parents[4]
SCRAPER_SCRIPT = REPO_ROOT / "packages" / "scraper" / "scripts" / "run-google-maps.js"
SCRAPER_DATA_DIR = REPO_ROOT / "packages" / "scraper" / "data" / "raw-leads"


def _resolve_chrome_binary() -> str:
    candidates = [
        Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        Path.home()
        / ".cache"
        / "puppeteer"
        / "chrome"
        / "mac_arm-121.0.6167.85"
        / "chrome-mac-arm64"
        / "Google Chrome for Testing.app"
        / "Contents"
        / "MacOS"
        / "Google Chrome for Testing",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return ""


def _latest_leads_file() -> Path:
    if not SCRAPER_DATA_DIR.exists():
        raise FileNotFoundError("Scraper output directory not found.")
    files = list(SCRAPER_DATA_DIR.glob("*.json"))
    if not files:
        raise FileNotFoundError("No scraper output files found.")
    return max(files, key=lambda path: path.stat().st_mtime)


def _record_scraper_run(
    *,
    city: str,
    state: str | None,
    target_count: int,
    total_count: int,
    unique_count: int,
    duplicate_count: int,
    inserted_count: int,
    db_duplicate_count: int,
    status: str,
    error_message: str | None = None,
) -> None:
    query = """
        INSERT INTO scraper_runs (
            source, city, state, target_count, total_count, unique_count, duplicate_count,
            inserted_count, db_duplicate_count, status, error_message
        ) VALUES (
            'google_maps', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        );
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (
                    city,
                    state,
                    target_count,
                    total_count,
                    unique_count,
                    duplicate_count,
                    inserted_count,
                    db_duplicate_count,
                    status,
                    error_message,
                ),
            )
        conn.commit()


def run_google_maps_scraper(city: str, max_results: int, state: str | None = None) -> dict:
    cmd = [
        SCRAPER_NODE_PATH,
        str(SCRAPER_SCRIPT),
        city,
        str(max_results),
    ]

    env = os.environ.copy()
    env.setdefault("PUPPETEER_CACHE_DIR", str(Path.home() / ".cache" / "puppeteer"))
    env.setdefault("SCRAPER_USER_DATA_DIR", str(Path.home() / ".cache" / "puppeteer-profile"))
    env.setdefault("PUPPETEER_HEADLESS", "true")
    chrome_binary = _resolve_chrome_binary()
    if chrome_binary:
        env.setdefault("PUPPETEER_EXECUTABLE_PATH", chrome_binary)
    process = subprocess.run(
        cmd,
        cwd=SCRAPER_SCRIPT.parent,
        capture_output=True,
        text=True,
        env=env,
    )

    # Fallback for environments where headful Chromium handshake fails.
    if process.returncode != 0 and "socket hang up" in (process.stderr or "").lower():
        retry_env = env.copy()
        retry_env["PUPPETEER_HEADLESS"] = "true"
        process = subprocess.run(
            cmd,
            cwd=SCRAPER_SCRIPT.parent,
            capture_output=True,
            text=True,
            env=retry_env,
        )

    if process.returncode != 0:
        error_message = process.stderr.strip() or process.stdout.strip() or "Scraper failed."
        _record_scraper_run(
            city=city,
            state=state,
            target_count=max_results,
            total_count=0,
            unique_count=0,
            duplicate_count=0,
            inserted_count=0,
            db_duplicate_count=0,
            status="failed",
            error_message=error_message[:1000],
        )
        raise RuntimeError(error_message)

    latest_file = _latest_leads_file()
    with latest_file.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    leads = data.get("leads", [])
    for lead in leads:
        if state:
            lead["state"] = state

    insert_result = insert_leads(leads)

    _record_scraper_run(
        city=city,
        state=state,
        target_count=max_results,
        total_count=data.get("metadata", {}).get("total_leads", len(leads)),
        unique_count=data.get("metadata", {}).get("unique_leads", len(leads)),
        duplicate_count=data.get("metadata", {}).get("duplicate_leads", 0),
        inserted_count=insert_result["inserted"],
        db_duplicate_count=insert_result["duplicates"],
        status="completed",
        error_message=None,
    )

    return {
        "file": str(latest_file),
        "total": data.get("metadata", {}).get("total_leads", len(leads)),
        "unique": data.get("metadata", {}).get("unique_leads", len(leads)),
        "duplicates": data.get("metadata", {}).get("duplicate_leads", 0),
        "inserted": insert_result["inserted"],
        "db_duplicates": insert_result["duplicates"],
    }


def list_scraper_runs(limit: int = 20) -> list[dict]:
    query = """
        SELECT id, source, city, state, target_count, total_count, unique_count, duplicate_count,
               inserted_count, db_duplicate_count, status, error_message, created_at
        FROM scraper_runs
        ORDER BY created_at DESC
        LIMIT %s;
    """
    keys = [
        "id",
        "source",
        "city",
        "state",
        "target_count",
        "total_count",
        "unique_count",
        "duplicate_count",
        "inserted_count",
        "db_duplicate_count",
        "status",
        "error_message",
        "created_at",
    ]
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (limit,))
            rows = cur.fetchall()
    return [dict(zip(keys, row)) for row in rows]


def get_scraper_stats() -> dict:
    query = """
        SELECT
            COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS jobs_today,
            COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE AND status = 'completed') AS completed_today,
            COALESCE(SUM(total_count) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) AS leads_24h
        FROM scraper_runs;
    """
    latest_query = """
        SELECT total_count, unique_count
        FROM scraper_runs
        WHERE status = 'completed'
        ORDER BY created_at DESC
        LIMIT 1;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            jobs_today, completed_today, leads_24h = cur.fetchone()
            cur.execute(latest_query)
            latest = cur.fetchone()

    validation_rate = None
    latest_total = None
    latest_unique = None
    if latest:
        latest_total = latest[0]
        latest_unique = latest[1]
        if latest_total and latest_total > 0:
            validation_rate = round((latest_unique / latest_total) * 100)

    return {
        "jobs_today": jobs_today or 0,
        "completed_today": completed_today or 0,
        "leads_24h": leads_24h or 0,
        "validation_rate": validation_rate,
        "latest_total": latest_total,
        "latest_unique": latest_unique,
    }
