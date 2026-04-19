import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import tag as tag_crud
from app.database import get_db
from app.dependencies import get_current_user
from app.models.tag import Tag
from app.models.user import User
from app.schemas.tag import TagCreate, TagRead, TagUpdate

router = APIRouter()


def _can_view(tag: Tag, user: User) -> bool:
    return tag.user_id is None or tag.user_id == user.id


def _can_modify(tag: Tag, user: User) -> bool:
    return tag.user_id is not None and tag.user_id == user.id


@router.post("", response_model=TagRead, status_code=status.HTTP_201_CREATED)
async def create_tag(
    data: TagCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Tag:
    tag = await tag_crud.create_tag(db, current.id, data)
    return tag


@router.get("", response_model=list[TagRead])
async def list_tags(
    include_system: bool = Query(True, description="Включать системные теги (user_id IS NULL)"),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Tag]:
    return await tag_crud.list_tags(db, current.id, include_system=include_system)


@router.get("/{tag_id}", response_model=TagRead)
async def get_tag(
    tag_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Tag:
    tag = await tag_crud.get_tag(db, tag_id)
    if tag is None or not _can_view(tag, current):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тег не найден")
    return tag


@router.patch("/{tag_id}", response_model=TagRead)
async def update_tag(
    tag_id: uuid.UUID,
    data: TagUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Tag:
    tag = await tag_crud.get_tag(db, tag_id)
    if tag is None or not _can_view(tag, current):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тег не найден")
    if not _can_modify(tag, current):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нельзя изменять системный или чужой тег")
    return await tag_crud.update_tag(db, tag, data)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    tag = await tag_crud.get_tag(db, tag_id)
    if tag is None or not _can_view(tag, current):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тег не найден")
    if not _can_modify(tag, current):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нельзя удалять системный или чужой тег")
    await tag_crud.delete_tag(db, tag)
