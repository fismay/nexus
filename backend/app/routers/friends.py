from uuid import UUID
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.friendship import Friendship
from app.models.event import Event
from app.schemas.friendship import FriendshipRead, FriendRequest, SharedSlot
from app.schemas.auth import UserSearch
from app.services.auth import require_user

router = APIRouter(prefix="/friends", tags=["friends"])


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


@router.get("/shared-schedule")
async def shared_schedule(
    friend_id: UUID = Query(...),
    date: str = Query(..., description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    """
    Returns both users' events for a given day + mutual free slots.
    The overlap-detection algorithm:
    1. Merge all events into a timeline sorted by start.
    2. Walk through and mark occupied intervals.
    3. Gaps between 08:00-22:00 that are free for BOTH users become mutual free slots.
    """
    day_start = datetime.fromisoformat(f"{date}T00:00:00+00:00")
    day_end = day_start + timedelta(days=1)

    async def get_events(owner_id: UUID):
        result = await db.execute(
            select(Event).where(
                Event.owner_id == owner_id,
                Event.start_time < day_end,
                Event.end_time > day_start,
            ).order_by(Event.start_time)
        )
        return result.scalars().all()

    my_events = await get_events(user.id)
    friend_events = await get_events(friend_id)

    window_start = day_start.replace(hour=8, minute=0, second=0)
    window_end = day_start.replace(hour=22, minute=0, second=0)

    def get_busy(events):
        intervals = []
        for e in events:
            s = max(e.start_time, window_start)
            t = min(e.end_time, window_end)
            if s < t:
                intervals.append((s, t))
        return intervals

    my_busy = get_busy(my_events)
    friend_busy = get_busy(friend_events)

    # Merge all busy intervals into a single sorted list
    all_busy = sorted(my_busy + friend_busy, key=lambda x: x[0])

    # Find free gaps
    free_slots: list[SharedSlot] = []
    cursor = window_start
    for start, end in all_busy:
        if start > cursor:
            free_slots.append(SharedSlot(start=cursor, end=start))
        cursor = max(cursor, end)
    if cursor < window_end:
        free_slots.append(SharedSlot(start=cursor, end=window_end))

    # Detect overlaps between the two users
    overlaps = []
    for ms, me in my_busy:
        for fs, fe in friend_busy:
            os = max(ms, fs)
            oe = min(me, fe)
            if os < oe:
                overlaps.append(SharedSlot(start=os, end=oe))

    from app.schemas.event import EventRead
    return {
        "my_events": [EventRead.model_validate(e) for e in my_events],
        "friend_events": [EventRead.model_validate(e) for e in friend_events],
        "mutual_free_slots": free_slots,
        "conflicts": overlaps,
    }
