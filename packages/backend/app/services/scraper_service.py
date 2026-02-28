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
DEFAULT_KEYWORD = "transporte escolar"


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


def _run_scraper_process(query_city: str, max_results: int, keyword: str) -> subprocess.CompletedProcess:
    cmd = [
        SCRAPER_NODE_PATH,
        str(SCRAPER_SCRIPT),
        query_city,
        str(max_results),
        keyword,
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

    return process


def _load_scraper_output(state: str | None) -> tuple[Path, dict, list[dict]]:
    latest_file = _latest_leads_file()
    with latest_file.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    leads = data.get("leads", [])
    for lead in leads:
        if state:
            lead["state"] = state
    return latest_file, data, leads


def _count_consecutive_zero_insertions(city: str, state: str | None) -> int:
    query = """
        SELECT inserted_count
        FROM scraper_runs
        WHERE city = %s AND COALESCE(state, '') = COALESCE(%s, '')
        ORDER BY created_at DESC
        LIMIT 12;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (city, state))
            rows = cur.fetchall()

    streak = 0
    for (inserted_count,) in rows:
        if (inserted_count or 0) == 0:
            streak += 1
        else:
            break
    return streak


def _build_intelligent_feedback(
    *,
    city: str,
    state: str | None,
    keywords: list[str],
    inserted: int,
    db_duplicates: int,
) -> dict:
    if inserted > 0:
        return {"show": False}

    streak = _count_consecutive_zero_insertions(city, state)
    keyword_preview = keywords[0] if keywords else DEFAULT_KEYWORD
    state_city = f"{city}/{state}" if state else city
    suggestions = [
        f"van escolar {city}",
        f"transporte escolar zona {state_city}",
    ]
    if db_duplicates > 0:
        message = (
            f"Nenhum novo lead para '{keyword_preview}' em {state_city}. "
            f"{db_duplicates} resultados já existiam no banco."
        )
    else:
        message = f"Nenhum resultado encontrado para '{keyword_preview}' em {state_city}."

    insights = []
    if streak >= 3:
        insights.append("Cidade com baixo rendimento recente — tente keywords diferentes.")
    return {
        "show": True,
        "streak_zero_results": streak,
        "message": message,
        "insights": insights,
        "suggestions": suggestions,
    }


def get_keywords_profile(state: str, city: str) -> dict:
    clean_state = state.strip().upper()
    clean_city = city.strip()
    if not clean_state or not clean_city:
        return {"state": clean_state, "city": clean_city, "keywords": [DEFAULT_KEYWORD], "source": "default"}

    query = """
        SELECT keywords
        FROM scraper_keyword_profiles
        WHERE state = %s AND city = %s
        LIMIT 1;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (clean_state, clean_city))
            row = cur.fetchone()

    if not row:
        return {"state": clean_state, "city": clean_city, "keywords": [DEFAULT_KEYWORD], "source": "default"}
    keywords = [item for item in (row[0] or []) if item]
    return {
        "state": clean_state,
        "city": clean_city,
        "keywords": keywords or [DEFAULT_KEYWORD],
        "source": "saved",
    }


def set_keywords_profile(state: str, city: str, keywords: list[str]) -> dict:
    clean_state = state.strip().upper()
    clean_city = city.strip()
    clean_keywords = [item.strip() for item in keywords if item and item.strip()]
    if not clean_keywords:
        clean_keywords = [DEFAULT_KEYWORD]

    query = """
        INSERT INTO scraper_keyword_profiles (state, city, keywords, updated_at)
        VALUES (%s, %s, %s, NOW())
        ON CONFLICT (state, city)
        DO UPDATE SET keywords = EXCLUDED.keywords, updated_at = NOW()
        RETURNING state, city, keywords;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (clean_state, clean_city, clean_keywords))
            row = cur.fetchone()
        conn.commit()
    return {"state": row[0], "city": row[1], "keywords": row[2]}


def run_google_maps_scraper(
    city: str | None,
    max_results: int,
    state: str | None = None,
    keywords: list[str] | None = None,
) -> dict:
    query_city = (city or "").strip() or (state or "").strip()
    if not query_city:
        raise RuntimeError("Estado é obrigatório para iniciar a coleta.")
    clean_state = (state or "").strip().upper() or None

    selected_keywords = [item.strip() for item in (keywords or []) if item and item.strip()]
    if not selected_keywords and clean_state and query_city:
        selected_keywords = get_keywords_profile(clean_state, query_city).get("keywords", [])
    if not selected_keywords:
        selected_keywords = [DEFAULT_KEYWORD]

    if clean_state and query_city:
        set_keywords_profile(clean_state, query_city, selected_keywords)

    total = 0
    unique = 0
    duplicates = 0
    inserted = 0
    db_duplicates = 0
    last_file = None
    keyword_results = []

    for keyword in selected_keywords:
        process = _run_scraper_process(query_city, max_results, keyword)
        if process.returncode != 0:
            error_message = process.stderr.strip() or process.stdout.strip() or "Scraper failed."
            _record_scraper_run(
                city=query_city,
                state=clean_state,
                target_count=max_results,
                total_count=total,
                unique_count=unique,
                duplicate_count=duplicates,
                inserted_count=inserted,
                db_duplicate_count=db_duplicates,
                status="failed",
                error_message=error_message[:1000],
            )
            raise RuntimeError(error_message)

        latest_file, data, leads = _load_scraper_output(clean_state)
        last_file = latest_file
        insert_result = insert_leads(leads)
        current_total = data.get("metadata", {}).get("total_leads", len(leads))
        current_unique = data.get("metadata", {}).get("unique_leads", len(leads))
        current_duplicates = data.get("metadata", {}).get("duplicate_leads", 0)
        current_inserted = insert_result["inserted"]
        current_db_duplicates = insert_result["duplicates"]

        total += current_total
        unique += current_unique
        duplicates += current_duplicates
        inserted += current_inserted
        db_duplicates += current_db_duplicates
        keyword_results.append(
            {
                "keyword": keyword,
                "found": current_total,
                "valid": current_unique + current_duplicates,
                "duplicates": current_duplicates + current_db_duplicates,
                "new": current_inserted,
            }
        )

    _record_scraper_run(
        city=query_city,
        state=clean_state,
        target_count=max_results,
        total_count=total,
        unique_count=unique,
        duplicate_count=duplicates,
        inserted_count=inserted,
        db_duplicate_count=db_duplicates,
        status="completed",
        error_message=None,
    )

    feedback = _build_intelligent_feedback(
        city=query_city,
        state=clean_state,
        keywords=selected_keywords,
        inserted=inserted,
        db_duplicates=db_duplicates,
    )

    return {
        "file": str(last_file) if last_file else None,
        "total": total,
        "unique": unique,
        "duplicates": duplicates,
        "inserted": inserted,
        "db_duplicates": db_duplicates,
        "keywords": selected_keywords,
        "keyword_results": keyword_results,
        "pipeline": {
            "found": total,
            "valid": unique + duplicates,
            "duplicates": duplicates + db_duplicates,
            "new": inserted,
        },
        "feedback": feedback,
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
