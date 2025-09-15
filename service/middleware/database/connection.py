import os
from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from common import ALEMBIC_INI_PATH, BASE_DIR
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
    from pathlib import Path

    # Import Alembic Python API
    from alembic import command
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    from sqlalchemy import create_engine

    logger = logging.getLogger(__name__)

    try:

        logger.info("Checking database migration status...")

        # Create Alembic configuration
        alembic_cfg = Config(str(ALEMBIC_INI_PATH))

        # Get script directory
        script = ScriptDirectory.from_config(alembic_cfg)

        def check_migration_needed() -> tuple[bool, str | None, str | None]:
            """Check if migrations are needed using Alembic Python API"""
            # Create a sync engine for migration checks
            sync_engine = create_engine(SYNC_DATABASE_URL)

            with sync_engine.connect() as connection:
                # Get current revision from database
                from alembic.migration import MigrationContext

                migration_context = MigrationContext.configure(connection)
                current_rev = migration_context.get_current_revision()

                # Get head revision from migration files
                head_rev = script.get_current_head()

                return current_rev != head_rev, current_rev, head_rev

        # Run migration check in thread to avoid blocking async event loop
        migration_needed, current_rev, head_rev = await asyncio.to_thread(check_migration_needed)

        logger.info(f"Current database revision: {current_rev or 'None (empty database)'}")
        logger.info(f"Target head revision: {head_rev}")

        if not migration_needed:
            logger.info("✅ Database is already up to date (no pending migrations)")
            return

        logger.info("Pending migrations detected, proceeding with upgrade...")

        # Apply migrations using Alembic Python API
        def apply_migrations() -> None:
            """Apply migrations using Alembic Python API"""
            command.upgrade(alembic_cfg, "head")

        logger.info("Applying database migrations...")
        await asyncio.to_thread(apply_migrations)

        logger.info("✅ Database migrations applied successfully!")

    except Exception as e:
        error_msg = f"Database migration failed: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session for each request.
    """
    async with AsyncSession(async_engine) as session:
        yield session
