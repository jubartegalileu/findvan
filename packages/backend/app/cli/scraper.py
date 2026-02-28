import json
import click
from ..db import ensure_schema
from ..services.scraper_service import run_google_maps_scraper


@click.command()
@click.option("--city", required=True, help="Cidade para coleta (ex: São Paulo)")
@click.option("--state", default=None, help="UF (ex: SP)")
@click.option("--max-results", default=100, type=int, show_default=True)
def main(city: str, state: str | None, max_results: int):
    """Run Google Maps scraper and persist leads to PostgreSQL."""
    ensure_schema()
    result = run_google_maps_scraper(city=city, max_results=max_results, state=state)
    click.echo(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
