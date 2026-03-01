"""add score field and index to leads

Revision ID: 20260301_0001
Revises:
Create Date: 2026-03-01 11:20:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260301_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;")
    op.execute("CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_leads_score;")
    op.execute("ALTER TABLE leads DROP COLUMN IF EXISTS score;")
