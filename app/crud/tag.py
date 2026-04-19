import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tag import Tag
from app.schemas.tag import TagCreate, TagUpdate


async def create_tag(session: AsyncSession, owner_id: uuid.UUID, data: TagCreate) -> Tag:
    tag = Tag(
        user_id=owner_id,
        name=data.name.strip(),
        color=data.color,
        priority_level=data.priority_level,
        description=data.description.strip() if data.description else None,
    )
    session.add(tag)
    await session.flush()
    await session.refresh(tag)
    return tag


async def list_tags(session: AsyncSession, user_id: uuid.UUID, *, include_system: bool = True) -> list[Tag]:
    q = select(Tag)
    if include_system:
        q = q.where(or_(Tag.user_id == user_id, Tag.user_id.is_(None)))
    else:
        q = q.where(Tag.user_id == user_id)
    q = q.order_by(Tag.name)
    result = await session.execute(q)
    return list(result.scalars().all())


async def get_tag(session: AsyncSession, tag_id: uuid.UUID) -> Tag | None:
    result = await session.execute(select(Tag).where(Tag.id == tag_id))
    return result.scalar_one_or_none()


async def get_system_tag_by_name(session: AsyncSession, name: str) -> Tag | None:
    result = await session.execute(select(Tag).where(Tag.user_id.is_(None), Tag.name == name))
    return result.scalar_one_or_none()


async def update_tag(session: AsyncSession, tag: Tag, data: TagUpdate) -> Tag:
    payload = data.model_dump(exclude_unset=True)
    for k, v in payload.items():
        if k == "name" and isinstance(v, str):
            setattr(tag, k, v.strip())
        elif k == "description" and isinstance(v, str):
            setattr(tag, k, v.strip())
        else:
            setattr(tag, k, v)
    await session.flush()
    await session.refresh(tag)
    return tag


async def delete_tag(session: AsyncSession, tag: Tag) -> None:
    await session.delete(tag)
