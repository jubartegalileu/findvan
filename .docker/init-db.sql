-- ============================================================
-- FindVan Database Initialization
-- ============================================================

-- Create initial database structure (placeholder)
-- Actual schema creation will be done via Alembic migrations

-- Set up extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tables will be created via migrations in packages/backend/migrations/

GRANT ALL PRIVILEGES ON DATABASE findvan_db TO findvan;
