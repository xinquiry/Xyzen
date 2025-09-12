from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

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
        service_dir = Path(__file__).parent.parent.parent
        alembic_ini = service_dir / "alembic.ini"

        if not alembic_ini.exists():
            raise RuntimeError(
                f"Alembic configuration not found at {alembic_ini}. "
                "Please initialize Alembic first: alembic init migrations"
            )

        logger.info("Checking database migration status...")

        # Check current migration status
        result = await asyncio.to_thread(
            subprocess.run,
            [sys.executable, "-m", "alembic", "current"],
            cwd=service_dir,
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0:
            logger.warning(f"Could not check migration status: {result.stderr}")
            logger.info("This might be the first run, proceeding with migration...")
        else:
            current_revision = result.stdout.strip()
            logger.info(f"Current database revision: {current_revision or 'None (empty database)'}")

        # Check for pending migrations
        logger.info("Checking for pending migrations...")
        heads_result = await asyncio.to_thread(
            subprocess.run,
            [sys.executable, "-m", "alembic", "heads"],
            cwd=service_dir,
            capture_output=True,
            text=True,
            timeout=30,
        )

        if heads_result.returncode != 0:
            raise RuntimeError(f"Failed to check migration heads: {heads_result.stderr}")

        target_revision = heads_result.stdout.strip()
        if not target_revision:
            logger.info("No migrations found. Database is up to date.")
            return
        logger.info(f"Target revision: {target_revision}")

        # Apply migrations
        logger.info("Applying database migrations...")
        upgrade_result = await asyncio.to_thread(
            subprocess.run,
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=service_dir,
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

        # Final verification
        verify_result = await asyncio.to_thread(
            subprocess.run,
            [sys.executable, "-m", "alembic", "current"],
            cwd=service_dir,
            capture_output=True,
            text=True,
            timeout=30,
        )

        if verify_result.returncode == 0:
            final_revision = verify_result.stdout.strip()
            logger.info(f"✅ Database is now at revision: {final_revision}")

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
