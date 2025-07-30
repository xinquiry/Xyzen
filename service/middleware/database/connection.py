from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from internal import configs

DATABASE_URL = ""
if configs.Database.Engine == "postgres":
    DATABASE_URL = (
        f"postgresql+asyncpg://{configs.Database.Postgres.User}:{configs.Database.Postgres.Password}@"
        f"{configs.Database.Postgres.Host}:{configs.Database.Postgres.Port}/{configs.Database.Postgres.DBName}"
    )
elif configs.Database.Engine == "sqlite":
    # For SQLite, the path should be relative to the project root or an absolute path.
    # Example: f"sqlite+aiosqlite:///./sql_app.db"
    DATABASE_URL = f"sqlite+aiosqlite:///{configs.Database.SQLite.Path}"
else:
    raise ValueError(f"Unsupported database engine: {configs.Database.Engine}")


# The engine is the gateway to the database.
engine = create_async_engine(DATABASE_URL, echo=configs.Debug, future=True)


async def create_db_and_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session for each request.
    """
    async with AsyncSession(engine) as session:
        yield session
