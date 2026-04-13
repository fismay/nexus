import math
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.event import Event
from app.models.user import User
from app.services.auth import require_user

router = APIRouter(prefix="/geo", tags=["geo"])


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.get("/suggest-slot")
async def suggest_slot(
    date: str = Query(..., description="YYYY-MM-DD"),
    lat: float = Query(...),
    lon: float = Query(...),
    duration_min: int = Query(60),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    """
    Given a location and desired duration, find the best time slot
    that minimizes travel between adjacent events.
    Looks at the day's events, finds gaps, and scores each gap
    by proximity to the requested location.
    """
    day_start = datetime.fromisoformat(f"{date}T07:00:00+00:00")
    day_end = datetime.fromisoformat(f"{date}T22:00:00+00:00")

    result = await db.execute(
        select(Event).where(
            Event.owner_id == user.id,
            Event.start_time >= day_start,
            Event.end_time <= day_end,
        ).order_by(Event.start_time)
    )
    events = result.scalars().all()

    occupied = [(e.start_time, e.end_time, e.latitude, e.longitude, e.location or "") for e in events]

    gaps: list[dict] = []
    cursor = day_start

    for start, end, elat, elon, ename in occupied:
        gap_minutes = (start - cursor).total_seconds() / 60
        if gap_minutes >= duration_min:
            distance = None
            if elat and elon:
                distance = round(haversine_km(lat, lon, elat, elon), 1)
            gaps.append({
                "start": cursor.isoformat(),
                "end": start.isoformat(),
                "gap_minutes": int(gap_minutes),
                "distance_to_next_km": distance,
                "next_event": ename,
            })
        cursor = max(cursor, end)

    gap_minutes = (day_end - cursor).total_seconds() / 60
    if gap_minutes >= duration_min:
        gaps.append({
            "start": cursor.isoformat(),
            "end": day_end.isoformat(),
            "gap_minutes": int(gap_minutes),
            "distance_to_next_km": None,
            "next_event": None,
        })

    # Score: prefer gaps near the task location (smallest distance)
    gaps.sort(key=lambda g: g["distance_to_next_km"] if g["distance_to_next_km"] is not None else 999)

    return {
        "suggestions": gaps[:5],
        "total_gaps": len(gaps),
    }
