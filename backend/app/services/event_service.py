"""
Создание и нормализация событий — один понятный путь в БД.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.schemas.event import EventCreate


_OPTIONAL_STR = (
    "description",
    "recurrence_rule",
    "color",
    "location",
    "ical_uid",
    "smart_tag",
    "week_parity",
)


def normalize_event_dict(d: dict) -> dict:
    """Пустые строки в optional полях → None (UNIQUE owner_id+ical_uid, импорт iCal)."""
    for key in _OPTIONAL_STR:
        if key in d and d[key] == "":
            d[key] = None
    return d


async def create_event_for_user(
    db: AsyncSession,
    owner_id: UUID,
    data: EventCreate,
) -> Event:
    """
    Создаёт событие владельца. Явный flush + понятные ошибки при конфликте UNIQUE.
    """
    payload = normalize_event_dict(data.model_dump())

    if payload.get("end_time") <= payload.get("start_time"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_time must be after start_time",
        )

    event = Event(**payload, owner_id=owner_id)
    db.add(event)

    try:
        await db.flush()
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Не удалось сохранить событие: конфликт в БД "
                "(например, дубликат iCal UID для этого пользователя)."
            ),
        ) from e

    await db.refresh(event)
    return event
