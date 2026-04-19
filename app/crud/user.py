import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate
from app.security import hash_password
from app.services.internal_id import allocate_next_internal_id


async def get_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_by_id(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_by_tag(session: AsyncSession, tag: str) -> User | None:
    result = await session.execute(select(User).where(User.tag == tag))
    return result.scalar_one_or_none()


async def create_user(session: AsyncSession, data: UserCreate) -> User:
    internal_id = await allocate_next_internal_id(session)
    user = User(
        email=data.email.lower().strip(),
        password_hash=hash_password(data.password),
        tag=data.tag,
        display_name=data.display_name.strip(),
        internal_id=internal_id,
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user
