import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import FriendshipStatus
from app.models.friendship import Friendship
from app.models.user import User


def _ordered_pair(a: uuid.UUID, b: uuid.UUID) -> tuple[uuid.UUID, uuid.UUID]:
    return (a, b) if a < b else (b, a)


async def get_friendship_by_pair(
    session: AsyncSession,
    user_id: uuid.UUID,
    other_user_id: uuid.UUID,
) -> Friendship | None:
    u1, u2 = _ordered_pair(user_id, other_user_id)
    result = await session.execute(
        select(Friendship).where(
            Friendship.user_id_1 == u1,
            Friendship.user_id_2 == u2,
        ),
    )
    return result.scalar_one_or_none()


async def get_accepted_friendship(
    session: AsyncSession,
    user_id: uuid.UUID,
    other_user_id: uuid.UUID,
) -> Friendship | None:
    u1, u2 = _ordered_pair(user_id, other_user_id)
    result = await session.execute(
        select(Friendship).where(
            Friendship.user_id_1 == u1,
            Friendship.user_id_2 == u2,
            Friendship.status == FriendshipStatus.accepted,
        ),
    )
    return result.scalar_one_or_none()


async def get_friendship_by_id(session: AsyncSession, friendship_id: uuid.UUID) -> Friendship | None:
    result = await session.execute(
        select(Friendship)
        .options(selectinload(Friendship.user_1), selectinload(Friendship.user_2))
        .where(Friendship.id == friendship_id),
    )
    return result.scalar_one_or_none()


async def create_invitation(
    session: AsyncSession,
    inviter_id: uuid.UUID,
    invitee_id: uuid.UUID,
) -> Friendship:
    u1, u2 = _ordered_pair(inviter_id, invitee_id)
    fs = Friendship(
        user_id_1=u1,
        user_id_2=u2,
        status=FriendshipStatus.pending,
        inviter_id=inviter_id,
    )
    session.add(fs)
    await session.flush()
    await session.refresh(fs)
    return fs


async def list_accepted_friends(session: AsyncSession, user_id: uuid.UUID) -> list[Friendship]:
    result = await session.execute(
        select(Friendship)
        .options(selectinload(Friendship.user_1), selectinload(Friendship.user_2))
        .where(
            Friendship.status == FriendshipStatus.accepted,
            or_(Friendship.user_id_1 == user_id, Friendship.user_id_2 == user_id),
        ),
    )
    return list(result.scalars().unique().all())


async def list_pending_invitations(session: AsyncSession, user_id: uuid.UUID) -> list[Friendship]:
    """Все pending, где участвует пользователь (входящие и исходящие)."""
    result = await session.execute(
        select(Friendship)
        .options(selectinload(Friendship.user_1), selectinload(Friendship.user_2))
        .where(
            Friendship.status == FriendshipStatus.pending,
            or_(Friendship.user_id_1 == user_id, Friendship.user_id_2 == user_id),
        ),
    )
    return list(result.scalars().unique().all())


def other_user_id(fs: Friendship, me: uuid.UUID) -> uuid.UUID:
    return fs.user_id_2 if fs.user_id_1 == me else fs.user_id_1


def other_user_obj(fs: Friendship, me: uuid.UUID) -> User:
    return fs.user_2 if fs.user_id_1 == me else fs.user_1
