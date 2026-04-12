"""
Async SQLAlchemy engine, session factory, Base, get_db dependency,
and async Redis connection pool.
"""

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  SQLAlchemy (async)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PostgreSQL (Neon/production) requires SSL; SQLite does not
_connect_args = {}
if settings.DATABASE_URL.startswith("postgresql"):
    import ssl as _ssl
    _ssl_ctx = _ssl.create_default_context()
    _connect_args = {"ssl": _ssl_ctx}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args=_connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
)

async_session = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[misc]
    """FastAPI dependency that yields an async DB session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Redis (async)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_redis: Redis | None = None


async def get_redis() -> Redis:
    """
    Return a shared async Redis instance.
    Lazily created on first call.
    """
    global _redis
    if _redis is None:
        _redis = Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )
    return _redis
