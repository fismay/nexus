from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings
from app.models.base import Base

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def _import_models() -> None:
    from app.models import Friendship, Project, ProjectAsset, Tag, Task, User  # noqa: F401


async def init_db() -> None:
    """Создаёт таблицы и последовательность для internal_id (для dev; в prod — Alembic)."""
    from sqlalchemy import text

    _import_models()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("CREATE SEQUENCE IF NOT EXISTS user_internal_id_seq"))
        await conn.execute(
            text(
                """
                INSERT INTO tags (id, user_id, name, color, priority_level, description)
                SELECT gen_random_uuid(), NULL, 'Учеба', '#2E86AB', 2,
                       'Системный тег: импорт учебного расписания (iCal)'
                WHERE NOT EXISTS (
                    SELECT 1 FROM tags WHERE user_id IS NULL AND name = 'Учеба'
                );
                """,
            ),
        )
        # asyncpg: одна команда на execute (несколько statement в строке — ошибка)
        for stmt in (
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ",
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ",
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS kind VARCHAR(16)",
            "UPDATE tasks SET kind = 'meeting' WHERE kind IS NULL",
            "ALTER TABLE tasks ALTER COLUMN kind SET DEFAULT 'meeting'",
            "ALTER TABLE tasks ALTER COLUMN kind SET NOT NULL",
            "UPDATE tasks SET created_at = start_time WHERE created_at IS NULL",
            "UPDATE tasks SET created_at = NOW() WHERE created_at IS NULL",
            "ALTER TABLE tasks ALTER COLUMN created_at SET DEFAULT NOW()",
            "ALTER TABLE tasks ALTER COLUMN created_at SET NOT NULL",
            "UPDATE tasks SET completed_at = COALESCE(completed_at, end_time) WHERE status = 'completed'",
            "ALTER TABLE friendships ADD COLUMN IF NOT EXISTS inviter_id UUID REFERENCES users(id) ON DELETE SET NULL",
            "CREATE INDEX IF NOT EXISTS ix_friendships_inviter_id ON friendships (inviter_id)",
        ):
            await conn.execute(text(stmt))
