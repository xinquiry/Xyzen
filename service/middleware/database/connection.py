import os
from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from common import BASE_DIR
from internal import configs

SYNC_DATABASE_URL = ""
ASYNC_DATABASE_URL = ""
if configs.Database.Engine == "postgres":
    SYNC_DATABASE_URL = (
        f"postgresql+psycopg://{configs.Database.Postgres.User}:{configs.Database.Postgres.Password}@"
        f"{configs.Database.Postgres.Host}:{configs.Database.Postgres.Port}/{configs.Database.Postgres.DBName}"
    )
    ASYNC_DATABASE_URL = (
        f"postgresql+asyncpg://{configs.Database.Postgres.User}:{configs.Database.Postgres.Password}@"
        f"{configs.Database.Postgres.Host}:{configs.Database.Postgres.Port}/{configs.Database.Postgres.DBName}"
    )
elif configs.Database.Engine == "sqlite":
    # For SQLite, the path should be relative to the project root or an absolute path.
    # Example: f"sqlite+aiosqlite:///./sql_app.db"
    SYNC_DATABASE_URL = f"sqlite:///{configs.Database.SQLite.Path}"
    ASYNC_DATABASE_URL = f"sqlite+aiosqlite:///{configs.Database.SQLite.Path}"
else:
    raise ValueError(f"Unsupported database engine: {configs.Database.Engine}")


# The engine is the gateway to the database.
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False, future=True)
engine = create_engine(SYNC_DATABASE_URL, echo=False, future=True)


async def create_db_and_tables() -> None:
    """
    Initialize database by automatically applying Alembic migrations.

    Similar to Django's approach:
    1. Checks for pending migrations
    2. Automatically applies them during app startup
    3. Fails fast if migrations fail

    Note: Migration files must be created manually:
    - Generate migration: alembic revision --autogenerate -m "description"

    This function only APPLIES existing migrations, it does NOT create them.
    """
    import asyncio
    import logging
    import subprocess
    import sys
    from pathlib import Path

    logger = logging.getLogger(__name__)

    try:
        # Get the service directory (where alembic.ini is located)
        alembic_ini = Path(os.path.join(BASE_DIR, "alembic.ini"))

        if not alembic_ini.exists():
            raise RuntimeError(
                f"Alembic configuration not found at {alembic_ini}. "
                "Please initialize Alembic first: alembic init migrations"
            )

        logger.info("Checking database migration status...")

        # Use 'alembic check' to efficiently determine if migrations are needed
        # This command returns exit code 0 if no pending migrations, 1 if migrations are needed
        check_result = await asyncio.to_thread(
            subprocess.run,
            [sys.executable, "-m", "alembic", "check"],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
            timeout=30,
        )

        if check_result.returncode == 0:
            logger.info("✅ Database is already up to date (no pending migrations)")
            return
        elif check_result.returncode == 1:
            logger.info("Pending migrations detected, proceeding with upgrade...")
        else:
            # Fall back to the old method if 'alembic check' fails
            logger.warning(f"'alembic check' failed: {check_result.stderr}")
            logger.info("Falling back to manual migration status check...")

            # Check current migration status as fallback
            current_result = await asyncio.to_thread(
                subprocess.run,
                [sys.executable, "-m", "alembic", "current"],
                cwd=BASE_DIR,
                capture_output=True,
                text=True,
                timeout=30,
            )

            if current_result.returncode == 0:
                current_revision = current_result.stdout.strip()
                logger.info(f"Current database revision: {current_revision or 'None (empty database)'}")

                # If current revision shows "(head)", database is already up to date
                if current_revision and "(head)" in current_revision:
                    logger.info("✅ Database is already up to date (at head revision)")
                    return

        # Apply migrations
        logger.info("Applying database migrations...")
        upgrade_result = await asyncio.to_thread(
            subprocess.run,
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
            timeout=120,  # Allow more time for migrations
        )

        if upgrade_result.returncode != 0:
            error_msg = f"Database migration failed: {upgrade_result.stderr}"
            logger.error(error_msg)
            logger.error(f"Migration stdout: {upgrade_result.stdout}")
            raise RuntimeError(error_msg)

        # Log successful migration
        if upgrade_result.stdout.strip():
            logger.info("Migration output:")
            for line in upgrade_result.stdout.strip().split("\n"):
                logger.info(f"  {line}")

        logger.info("✅ Database migrations applied successfully!")

    except subprocess.TimeoutExpired:
        error_msg = "Database migration timed out. Check your database connection and migration complexity."
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    except FileNotFoundError as e:
        if "alembic" in str(e):
            error_msg = (
                "Alembic is not installed or not accessible. "
                "Please ensure alembic is installed: pip install alembic"
            )
        else:
            error_msg = f"Required file not found: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    except Exception as e:
        error_msg = f"Unexpected error during database migration: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session for each request.
    """
    async with AsyncSession(async_engine) as session:
        yield session
