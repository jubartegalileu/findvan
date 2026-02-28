import os
from dotenv import load_dotenv


load_dotenv()


def get_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


DB_HOST = get_env("DB_HOST", "localhost")
DB_PORT = get_env("DB_PORT", "5432")
DB_NAME = get_env("DB_NAME", "findvan")
DB_USER = get_env("DB_USER", "findvan")
DB_PASSWORD = get_env("DB_PASSWORD", "findvan123")

DATABASE_URL = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

SCRAPER_NODE_PATH = get_env("SCRAPER_NODE_PATH", "node")
