import json
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.database import get_db
from app.config import settings
from app.models.task import Task
from app.models.event import Event
from app.schemas.ai_schedule import AiScheduleResponse, ScheduledSlot

router = APIRouter(tags=["ai-schedule"])

ENERGY_LIMIT = 10


def _parse_iso(s: str) -> datetime:
    dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _find_free_slots(
    fixed_blocks: list[tuple[datetime, datetime]],
    day_start: datetime,
    day_end: datetime,
    min_gap_minutes: int = 30,
) -> list[tuple[datetime, datetime]]:
    sorted_blocks = sorted(fixed_blocks, key=lambda b: b[0])
    merged: list[tuple[datetime, datetime]] = []
    for start, end in sorted_blocks:
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))

    gaps: list[tuple[datetime, datetime]] = []
    cursor = day_start
    for start, end in merged:
        if start > cursor:
            gap = start - cursor
            if gap >= timedelta(minutes=min_gap_minutes):
                gaps.append((cursor, start))
        cursor = max(cursor, end)
    if day_end > cursor and (day_end - cursor) >= timedelta(minutes=min_gap_minutes):
        gaps.append((cursor, day_end))
    return gaps


async def _schedule_with_ollama(
    free_slots: list[tuple[datetime, datetime]],
    fluid_tasks: list[dict],
    energy_remaining: int,
) -> list[dict]:
    slots_text = "\n".join(
        f"  - {s.strftime('%H:%M')} to {e.strftime('%H:%M')} ({int((e-s).total_seconds()//60)} min)"
        for s, e in free_slots
    )
    tasks_text = "\n".join(
        f"  - id: {t['id']}, title: \"{t['title']}\", duration: {t['duration_min']} min, energy: {t['energy_cost']}"
        for t in fluid_tasks
    )

    prompt = f"""You are a scheduling assistant. Schedule the given tasks into available time slots.

Rules:
- Total energy of scheduled tasks must not exceed {energy_remaining}.
- Each task has a duration in minutes. Place it fully within a free slot.
- Prioritize higher-energy tasks earlier in the day when focus is high.
- Return ONLY a JSON array. Each element: {{"task_id": "...", "start_time": "HH:MM", "end_time": "HH:MM"}}
- If a task does not fit, omit it.

Free slots (today):
{slots_text}

Tasks to schedule:
{tasks_text}

Respond with ONLY the JSON array, no explanation."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                },
            )
            if resp.status_code != 200:
                return []
            body = resp.json()
            raw = body.get("response", "")
            parsed = json.loads(raw)
            if isinstance(parsed, dict) and "schedule" in parsed:
                parsed = parsed["schedule"]
            return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def _fallback_schedule(
    free_slots: list[tuple[datetime, datetime]],
    fluid_tasks: list[dict],
    energy_remaining: int,
) -> list[dict]:
    """Greedy first-fit when Ollama is unavailable."""
    result = []
    remaining_energy = energy_remaining
    slot_cursors = [(s, e) for s, e in free_slots]

    sorted_tasks = sorted(fluid_tasks, key=lambda t: -t["energy_cost"])

    for task in sorted_tasks:
        if task["energy_cost"] > remaining_energy:
            continue
        dur = timedelta(minutes=task["duration_min"])
        for i, (slot_s, slot_e) in enumerate(slot_cursors):
            if slot_e - slot_s >= dur:
                task_end = slot_s + dur
                result.append({
                    "task_id": task["id"],
                    "start_time": slot_s.strftime("%H:%M"),
                    "end_time": task_end.strftime("%H:%M"),
                })
                slot_cursors[i] = (task_end, slot_e)
                remaining_energy -= task["energy_cost"]
                break

    return result


@router.post("/api/ai-schedule", response_model=AiScheduleResponse)
async def ai_schedule(
    date: str = Query(default=""),
    session: AsyncSession = Depends(get_db),
):
    if not date:
        target = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        target = _parse_iso(date).replace(hour=0, minute=0, second=0, microsecond=0)

    day_start = target.replace(hour=7)
    day_end = target.replace(hour=23)

    events_q = select(Event).where(
        and_(Event.start_time >= day_start, Event.end_time <= day_end)
    )
    result = await session.execute(events_q)
    day_events = result.scalars().all()

    fixed_tasks_q = select(Task).where(
        and_(
            Task.start_time >= day_start,
            Task.end_time <= day_end,
            Task.scheduling_type == "fixed",
        )
    )
    result = await session.execute(fixed_tasks_q)
    fixed_tasks = result.scalars().all()

    fixed_blocks = [
        (_parse_iso(str(e.start_time)), _parse_iso(str(e.end_time)))
        for e in day_events
    ] + [
        (_parse_iso(str(t.start_time)), _parse_iso(str(t.end_time)))
        for t in fixed_tasks
    ]

    free_slots = _find_free_slots(fixed_blocks, day_start, day_end)

    fluid_q = select(Task).where(
        and_(
            Task.scheduling_type == "fluid",
            Task.is_completed == False,  # noqa: E712
            Task.start_time == None,  # noqa: E711
        )
    )
    result = await session.execute(fluid_q)
    fluid_tasks = result.scalars().all()

    if not fluid_tasks:
        return AiScheduleResponse(scheduled=[], message="Нет задач для распределения", unscheduled_count=0)

    scheduled_energy = sum(t.energy_cost for t in fixed_tasks)
    energy_remaining = max(0, ENERGY_LIMIT - scheduled_energy)

    task_dicts = [
        {
            "id": str(t.id),
            "title": t.title,
            "duration_min": 60,
            "energy_cost": t.energy_cost,
        }
        for t in fluid_tasks
    ]

    ai_result = await _schedule_with_ollama(free_slots, task_dicts, energy_remaining)
    if not ai_result:
        ai_result = _fallback_schedule(free_slots, task_dicts, energy_remaining)

    task_map = {str(t.id): t for t in fluid_tasks}
    scheduled_items: list[ScheduledSlot] = []

    for item in ai_result:
        tid = item.get("task_id", "")
        st_str = item.get("start_time", "")
        et_str = item.get("end_time", "")
        if tid not in task_map or not st_str or not et_str:
            continue

        try:
            sh, sm = map(int, st_str.split(":"))
            eh, em = map(int, et_str.split(":"))
        except ValueError:
            continue

        task_start = target.replace(hour=sh, minute=sm, second=0, microsecond=0)
        task_end = target.replace(hour=eh, minute=em, second=0, microsecond=0)

        task_obj = task_map[tid]
        task_obj.start_time = task_start
        task_obj.end_time = task_end
        session.add(task_obj)

        scheduled_items.append(ScheduledSlot(
            task_id=tid,
            task_title=task_obj.title,
            start_time=task_start.isoformat(),
            end_time=task_end.isoformat(),
            energy_cost=task_obj.energy_cost,
        ))

    await session.commit()

    return AiScheduleResponse(
        scheduled=scheduled_items,
        message=f"Распределено {len(scheduled_items)} задач(и)",
        unscheduled_count=len(fluid_tasks) - len(scheduled_items),
    )
