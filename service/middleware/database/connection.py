from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from internal import configs

# Import all models here to ensure they are registered with SQLModel's metadata

SYNC_DATABASE_URL = ""
ASYNC_DATABASE_URL = ""
if configs.Database.Engine == "postgres":
    SYNC_DATABASE_URL = (
        f"postgresql://{configs.Database.Postgres.User}:{configs.Database.Postgres.Password}@"
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
    async with async_engine.begin() as conn:
        # In development, drop all tables first to ensure schema is in sync
        if configs.Debug:
            await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session for each request.
    """
    async with AsyncSession(async_engine) as session:
        yield session
