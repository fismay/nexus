from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventCreate, EventUpdate, EventRead, ConflictWarning
from app.services.event_service import create_event_for_user, normalize_event_dict
from app.services.ical_parser import expand_recurring_events
from app.services.conflict_manager import find_conflict
from app.services.auth import require_user

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/", response_model=list[EventRead])
async def list_events(
    start: datetime | None = Query(None),
    end: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    query = select(Event).where(Event.owner_id == user.id).order_by(Event.start_time)
    result = await db.execute(query)
    all_events = result.scalars().all()

    if start and end:
        return expand_recurring_events(all_events, start, end)

    return list(all_events)


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    return await create_event_for_user(db, user.id, data)


@router.post("/check-conflict", response_model=ConflictWarning)
async def check_conflict(
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    return await find_conflict(db, start_time, end_time, owner_id=user.id)


@router.patch("/{event_id}", response_model=EventRead)
async def update_event(
    event_id: UUID,
    data: EventUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    event = await db.get(Event, event_id)
    if not event or event.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Event not found")
    patch = normalize_event_dict(data.model_dump(exclude_unset=True))
    for field, value in patch.items():
        setattr(event, field, value)
    await db.flush()
    await db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    event = await db.get(Event, event_id)
    if not event or event.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.delete(event)
