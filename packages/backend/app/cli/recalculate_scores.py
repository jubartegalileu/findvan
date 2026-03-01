import json
import click

from ..db import ensure_schema
from ..services.leads_service import recalculate_all_scores


@click.command()
def main():
    """Recalculate score for all leads."""
    ensure_schema()
    result = recalculate_all_scores()
    click.echo(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
