from uuid import UUID
from datetime import date as Date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.friendship import Friendship
from app.models.event import Event
from app.models.task import Task
from app.schemas.friendship import FriendshipRead, FriendRequest, SharedSlot
from app.schemas.auth import UserSearch
from app.schemas.event import EventRead
from app.services.auth import require_user
from app.services.ical_parser import expand_recurring_events

router = APIRouter(prefix="/friends", tags=["friends"])

# Границы «дня» для совместного расписания — локальный календарный день (пары из вуза в MSK).
CALENDAR_TZ = ZoneInfo("Europe/Moscow")


def _overlaps_local_calendar_day(
    st: datetime,
    et: datetime,
    day_start: datetime,
    day_end: datetime,
) -> bool:
    """Пересечение интервала события с локальным календарным днём (CALENDAR_TZ)."""
    if st.tzinfo is None:
        st = st.replace(tzinfo=timezone.utc)
    if et.tzinfo is None:
        et = et.replace(tzinfo=timezone.utc)
    st_l = st.astimezone(CALENDAR_TZ)
    et_l = et.astimezone(CALENDAR_TZ)
    return st_l < day_end and et_l > day_start


async def _require_accepted_friendship(
    db: AsyncSession, user_id: UUID, friend_id: UUID
) -> None:
    if user_id == friend_id:
        raise HTTPException(status_code=400, detail="Укажите другого пользователя")
    row = await db.execute(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(
                and_(Friendship.requester_id == user_id, Friendship.addressee_id == friend_id),
                and_(Friendship.requester_id == friend_id, Friendship.addressee_id == user_id),
            ),
        ).limit(1)
    )
    if row.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Доступно только для принятых друзей")


def _merge_intervals(
    intervals: list[tuple[datetime, datetime]],
) -> list[tuple[datetime, datetime]]:
    if not intervals:
        return []
    sorted_i = sorted(intervals, key=lambda x: x[0])
    merged: list[tuple[datetime, datetime]] = [sorted_i[0]]
    for s, e in sorted_i[1:]:
        ls, le = merged[-1]
        if s <= le:
            merged[-1] = (ls, max(le, e))
        else:
            merged.append((s, e))
    return merged


def _event_obj_to_read(ev) -> EventRead:
    """ORM Event или виртуальное occurrence из expand_recurring_events."""
    try:
        return EventRead.model_validate(ev)
    except Exception:
        return EventRead(
            id=getattr(ev, "id"),
            title=getattr(ev, "title"),
            description=getattr(ev, "description", None),
            event_type=getattr(ev, "event_type", "class"),
            start_time=getattr(ev, "start_time"),
            end_time=getattr(ev, "end_time"),
            is_recurring=getattr(ev, "is_recurring", False),
            recurrence_rule=getattr(ev, "recurrence_rule", None),
            color=getattr(ev, "color", None),
            project_id=getattr(ev, "project_id", None),
            location=getattr(ev, "location", None),
            smart_tag=getattr(ev, "smart_tag", None),
            week_parity=getattr(ev, "week_parity", None),
            recurrence_interval=getattr(ev, "recurrence_interval", None),
            ical_uid=getattr(ev, "ical_uid", None),
            scheduling_type=getattr(ev, "scheduling_type", "fixed"),
            created_at=getattr(ev, "created_at"),
        )


@router.get("/", response_model=list[FriendshipRead])
async def list_friends(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    result = await db.execute(
        select(Friendship).where(
            or_(Friendship.requester_id == user.id, Friendship.addressee_id == user.id),
            Friendship.status.in_(["pending", "accepted"]),
        )
    )
    return [FriendshipRead.model_validate(f) for f in result.scalars().all()]


@router.post("/request", response_model=FriendshipRead, status_code=201)
async def send_request(
    data: FriendRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    addressee = (
        await db.execute(select(User).where(User.username == data.addressee_username).limit(1))
    ).scalar_one_or_none()
    if not addressee:
        raise HTTPException(status_code=404, detail="User not found")
    if addressee.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot befriend yourself")

    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.requester_id == user.id, Friendship.addressee_id == addressee.id),
                and_(Friendship.requester_id == addressee.id, Friendship.addressee_id == user.id),
            )
        ).limit(1)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Friendship already exists")

    f = Friendship(requester_id=user.id, addressee_id=addressee.id)
    db.add(f)
    await db.flush()
    await db.refresh(f)
    return FriendshipRead.model_validate(f)


@router.post("/{friendship_id}/accept", response_model=FriendshipRead)
async def accept_request(
    friendship_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    f = await db.get(Friendship, friendship_id)
    if not f or f.addressee_id != user.id:
        raise HTTPException(status_code=404, detail="Request not found")
    f.status = "accepted"
    await db.flush()
    await db.refresh(f)
    return FriendshipRead.model_validate(f)


@router.post("/{friendship_id}/decline")
async def decline_request(
    friendship_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    f = await db.get(Friendship, friendship_id)
    if not f or f.addressee_id != user.id:
        raise HTTPException(status_code=404, detail="Request not found")
    f.status = "declined"
    await db.flush()
    return {"ok": True}


async def _busy_intervals_for_user(
    db: AsyncSession,
    owner_id: UUID,
    day_start: datetime,
    day_end: datetime,
    clip_start: datetime,
    clip_end: datetime,
) -> tuple[list[tuple[datetime, datetime]], list[EventRead], list[dict]]:
    """
    Учитывает ВСЕ события (включая повторяющиеся пары из iCal) и таймбокс-задачи.
    Возвращает: объединённые интервалы занятости, события дня, задачи дня.
    """
    result = await db.execute(
        select(Event).where(Event.owner_id == owner_id).order_by(Event.start_time)
    )
    all_events = result.scalars().all()

    expanded = expand_recurring_events(all_events, day_start, day_end)

    day_events_read: list[EventRead] = []
    busy: list[tuple[datetime, datetime]] = []

    for ev in expanded:
        st = ev.start_time
        et = ev.end_time
        if not _overlaps_local_calendar_day(st, et, day_start, day_end):
            continue
        day_events_read.append(_event_obj_to_read(ev))
        s = max(st, clip_start)
        t = min(et, clip_end)
        if s < t:
            busy.append((s, t))

    t_result = await db.execute(
        select(Task).where(
            Task.owner_id == owner_id,
            Task.start_time.isnot(None),
            Task.end_time.isnot(None),
            Task.start_time < day_end,
            Task.end_time > day_start,
            Task.is_completed == False,  # noqa: E712
        )
    )
    tasks = t_result.scalars().all()
    task_payload: list[dict] = []
    for t in tasks:
        task_payload.append({
            "id": str(t.id),
            "title": t.title,
            "start_time": t.start_time.isoformat() if t.start_time else None,
            "end_time": t.end_time.isoformat() if t.end_time else None,
        })
        if t.start_time and t.end_time:
            s = max(t.start_time, clip_start)
            e = min(t.end_time, clip_end)
            if s < e:
                busy.append((s, e))

    merged_busy = _merge_intervals(busy)
    return merged_busy, day_events_read, task_payload


@router.get("/shared-schedule")
async def shared_schedule(
    friend_id: UUID = Query(...),
    date: str = Query(..., description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    """
    События и таймбокс-задачи обоих пользователей за сутки,
    пересечения занятости и общие свободные окна.

    Повторяющиеся учебные события (iCal / RRULE) разворачиваются так же,
    как в GET /events. Интервалы занятости объединяются (union), затем
    ищутся окна, свободные для обоих в пределах 06:00–23:00 локального дня.
    """
    try:
        d = Date.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date, use YYYY-MM-DD")

    await _require_accepted_friendship(db, user.id, friend_id)

    day_start = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=CALENDAR_TZ)
    day_end = day_start + timedelta(days=1)

    # Полоса, в которой считаем занятость (весь локальный день)
    clip_start = day_start
    clip_end = day_end

    # Окно для «взаимных свободных слотов» (как типичный учебный день)
    window_start = day_start.replace(hour=6, minute=0, second=0, microsecond=0)
    window_end = day_start.replace(hour=23, minute=0, second=0, microsecond=0)

    my_busy, my_events, my_tasks = await _busy_intervals_for_user(
        db, user.id, day_start, day_end, clip_start, clip_end
    )
    friend_busy, friend_events, friend_tasks = await _busy_intervals_for_user(
        db, friend_id, day_start, day_end, clip_start, clip_end
    )

    # Объединение занятости обоих: свободно только там, где никто не занят
    union_busy = _merge_intervals(
        [(s, e) for s, e in my_busy] + [(s, e) for s, e in friend_busy]
    )

    # Взаимные свободные слоты внутри window_start..window_end
    mutual_free: list[SharedSlot] = []
    cursor = window_start
    for s, e in union_busy:
        if e <= window_start:
            continue
        if s >= window_end:
            break
        cs = max(s, window_start)
        ce = min(e, window_end)
        if cursor < cs:
            mutual_free.append(SharedSlot(start=cursor, end=cs))
        cursor = max(cursor, ce)
    if cursor < window_end:
        mutual_free.append(SharedSlot(start=cursor, end=window_end))

    # Пересечения «оба заняты одновременно»
    overlaps: list[SharedSlot] = []
    for ms, me in my_busy:
        for fs, fe in friend_busy:
            os = max(ms, fs)
            oe = min(me, fe)
            if os < oe:
                overlaps.append(SharedSlot(start=os, end=oe))

    return {
        "my_events": my_events,
        "friend_events": friend_events,
        "my_scheduled_tasks": my_tasks,
        "friend_scheduled_tasks": friend_tasks,
        "mutual_free_slots": mutual_free,
        "conflicts": overlaps,
    }
