from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate, EventRead, ConflictWarning
from app.services.ical_parser import expand_recurring_events
from app.services.conflict_manager import find_conflict

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/", response_model=list[EventRead])
async def list_events(
    start: datetime | None = Query(None),
    end: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает события для диапазона. Recurring-события разворачиваются
    на лету через dateutil — в БД хранится только master-запись.
    """
    query = select(Event).order_by(Event.start_time)
    result = await db.execute(query)
    all_events = result.scalars().all()

    if start and end:
        expanded = expand_recurring_events(all_events, start, end)
        return expanded

    return all_events


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
async def create_event(data: EventCreate, db: AsyncSession = Depends(get_db)):
    event = Event(**data.model_dump())
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


@router.post("/check-conflict", response_model=ConflictWarning)
async def check_conflict(
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Conflict Manager: проверяет пересечение с событиями календаря."""
    return await find_conflict(db, start_time, end_time)


@router.patch("/{event_id}", response_model=EventRead)
async def update_event(
    event_id: UUID, data: EventUpdate, db: AsyncSession = Depends(get_db)
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    await db.flush()
    await db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(event_id: UUID, db: AsyncSession = Depends(get_db)):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.delete(event)
