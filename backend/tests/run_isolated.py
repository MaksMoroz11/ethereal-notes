"""Run migrations and pytest in a disposable PostgreSQL database."""
import asyncio
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from uuid import uuid4

import asyncpg
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.config import settings  # noqa: E402


async def main() -> int:
    admin_url = make_url(settings.database_url).set(drivername="postgresql")
    name = "ethereal_test_" + uuid4().hex
    connection = await asyncpg.connect(admin_url.render_as_string(hide_password=False))
    try:
        await connection.execute(f'CREATE DATABASE "{name}"')
        try:
            with tempfile.TemporaryDirectory(prefix="ethereal-test-key-") as directory:
                env = dict(os.environ)
                env["DATABASE_URL"] = make_url(settings.database_url).set(database=name).render_as_string(hide_password=False)
                env["TEST_DATABASE_URL"] = env["DATABASE_URL"]
                env["AUTH_PRIVATE_KEY_FILE"] = str(Path(directory).resolve() / "private.pem")
                migrated = await asyncio.to_thread(subprocess.run, [sys.executable, "-m", "alembic", "upgrade", "head"], cwd=ROOT, env=env)
                if migrated.returncode:
                    return migrated.returncode
                tested = await asyncio.to_thread(subprocess.run, [sys.executable, "-m", "pytest", "-q", *sys.argv[1:]], cwd=ROOT, env=env)
                return tested.returncode
        finally:
            await connection.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1", name)
            await connection.execute(f'DROP DATABASE "{name}"')
    finally:
        await connection.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
