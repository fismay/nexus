"""
Conflict Manager

Проверяет пересечение задачи по времени с событиями в календаре.
Если найден конфликт — возвращает warning и предлагает ближайшее свободное окно.
"""

from datetime import datetime, timedelta
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.schemas.event import ConflictWarning
from app.services.ical_parser import expand_recurring_events


async def find_conflict(
    db: AsyncSession,
    start_time: datetime,
    end_time: datetime,
    exclude_event_id=None,
    owner_id=None,
) -> ConflictWarning:
    """
    Ищет событие, пересекающееся с заданным временным интервалом.
    Возвращает ConflictWarning с деталями конфликта или пустой (has_conflict=False).
    """
    # Берём все события за ±1 день для проверки recurring
    day_start = start_time.replace(hour=0, minute=0, second=0)
    day_end = day_start + timedelta(days=2)

    query = select(Event).where(
        or_(
            # Прямые одиночные события
            and_(
                Event.is_recurring == False,  # noqa: E712
                Event.start_time < end_time,
                Event.end_time > start_time,
            ),
            # Recurring — берём все, развернём ниже
            Event.is_recurring == True,  # noqa: E712
        )
    )

    if exclude_event_id:
        query = query.where(Event.id != exclude_event_id)
    if owner_id:
        query = query.where(Event.owner_id == owner_id)

    result = await db.execute(query)
    all_events = result.scalars().all()

    expanded = expand_recurring_events(all_events, day_start, day_end)

    for ev in expanded:
        ev_start = ev.start_time
        ev_end = ev.end_time

        if ev_start < end_time and ev_end > start_time:
            location = getattr(ev, "location", None) or ""
            loc_msg = f" в {location}" if location else ""

            suggested = await find_next_free_slot(
                db, start_time.date(), int((end_time - start_time).total_seconds() / 60)
            )

            return ConflictWarning(
                has_conflict=True,
                warning=f"Overlap detected",
                conflicting_event_id=ev.id,
                conflicting_event_title=ev.title,
                conflicting_event_location=location or None,
                suggested_start=suggested[0] if suggested else None,
                suggested_end=suggested[1] if suggested else None,
            )

    return ConflictWarning(has_conflict=False)


async def find_next_free_slot(
    db: AsyncSession,
    target_date,
    duration_minutes: int = 60,
) -> tuple[datetime, datetime] | None:
    """
    Находит ближайшее свободное окно длительностью duration_minutes
    в рабочее время (8:00–22:00) указанного дня.
    """
    from datetime import date as date_type
    if isinstance(target_date, datetime):
        target_date = target_date.date()

    day_start = datetime(
        target_date.year, target_date.month, target_date.day,
        8, 0, tzinfo=None
    )
    day_end = datetime(
        target_date.year, target_date.month, target_date.day,
        22, 0, tzinfo=None
    )

    query = select(Event).where(
        and_(
            Event.start_time >= day_start,
            Event.end_time <= day_end + timedelta(hours=2),
        )
    ).order_by(Event.start_time)

    result = await db.execute(query)
    events_db = result.scalars().all()

    expanded = expand_recurring_events(events_db, day_start, day_end)
    busy = sorted(
        [(ev.start_time.replace(tzinfo=None), ev.end_time.replace(tzinfo=None)) for ev in expanded],
        key=lambda x: x[0],
    )

    candidate = day_start
    duration = timedelta(minutes=duration_minutes)

    for busy_start, busy_end in busy:
        if candidate + duration <= busy_start:
            return (candidate, candidate + duration)
        if busy_end > candidate:
            candidate = busy_end

    if candidate + duration <= day_end:
        return (candidate, candidate + duration)

    return None
