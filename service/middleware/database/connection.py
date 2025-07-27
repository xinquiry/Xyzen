from databases import Database

from internal import configs

DATABASE_URL = ""
if configs.Database.Engine == "postgres":
    DATABASE_URL = (
        f"postgresql+asyncpg://{configs.Database.Postgres.User}:{configs.Database.Postgres.Password}@"
        f"{configs.Database.Postgres.Host}:{configs.Database.Postgres.Port}/{configs.Database.Postgres.DBName}"
    )
elif configs.Database.Engine == "sqlite":
    DATABASE_URL = f"sqlite+aiosqlite:///{configs.Database.SQLite.Path}"


database = Database(
    DATABASE_URL,
    min_size=configs.Database.Postgres.MinConnections,
    max_size=configs.Database.Postgres.MaxConnections,
)

__all__ = ["database"]
