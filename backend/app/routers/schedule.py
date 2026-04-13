import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.event import Event
from app.schemas.event import (
    ICalImportRequest,
    ICalImportResponse,
    ICalConfirmRequest,
    ICalPreviewEvent,
    EventRead,
)
from app.services.ical_parser import parse_ical, smart_color

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.post("/preview", response_model=ICalImportResponse)
async def preview_import(data: ICalImportRequest):
    """
    Шаг 1: принимает URL или raw iCal текст, возвращает предпросмотр
    списка пар БЕЗ сохранения в БД.
    """
    raw_text = data.raw_text

    if data.url and not raw_text:
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(data.url)
                resp.raise_for_status()
                raw_text = resp.text
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Не удалось загрузить iCal: {str(e)[:200]}"
            )

    if not raw_text:
        raise HTTPException(status_code=400, detail="Укажите url или raw_text")

    events = parse_ical(raw_text, data.semester_start)

    num_count = sum(1 for e in events if e.week_parity == "numerator")
    den_count = sum(1 for e in events if e.week_parity == "denominator")
    weekly_count = sum(1 for e in events if e.week_parity is None and e.recurrence_rule)

    return ICalImportResponse(
        events=events,
        total=len(events),
        numerator_count=num_count,
        denominator_count=den_count,
        weekly_count=weekly_count,
    )


@router.post("/import", response_model=list[EventRead], status_code=status.HTTP_201_CREATED)
async def confirm_import(
    data: ICalConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Шаг 2: пользователь подтвердил — сохраняем выбранные события в БД.
    Дедупликация по ical_uid: если уже есть — пропускаем.
    """
    created = []

    for ev_data in data.events:
        if ev_data.ical_uid:
            existing = await db.execute(
                select(Event).where(Event.ical_uid == ev_data.ical_uid).limit(1)
            )
            if existing.scalar_one_or_none():
                continue

        interval = None
        if ev_data.recurrence_rule and "INTERVAL=" in ev_data.recurrence_rule:
            for part in ev_data.recurrence_rule.split(";"):
                if part.startswith("INTERVAL="):
                    try:
                        interval = int(part.split("=")[1])
                    except ValueError:
                        pass

        event = Event(
            title=ev_data.title,
            event_type=ev_data.event_type,
            start_time=ev_data.start_time,
            end_time=ev_data.end_time,
            is_recurring=bool(ev_data.recurrence_rule),
            recurrence_rule=ev_data.recurrence_rule,
            location=ev_data.location,
            smart_tag=ev_data.smart_tag,
            week_parity=ev_data.week_parity,
            ical_uid=ev_data.ical_uid,
            color=smart_color(ev_data.smart_tag),
            recurrence_interval=interval,
        )
        db.add(event)
        await db.flush()
        await db.refresh(event)
        created.append(event)

    return created
