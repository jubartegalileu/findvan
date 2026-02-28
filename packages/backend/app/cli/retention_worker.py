import json
import click

from ..db import ensure_schema
from ..services.retention_jobs_service import run_retention_worker


@click.command()
@click.option("--once", is_flag=True, default=False, help="Executa um ciclo e encerra.")
def main(once: bool):
    """Run retention worker with distributed lock."""
    ensure_schema()
    result = run_retention_worker(run_once=once)
    click.echo(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
