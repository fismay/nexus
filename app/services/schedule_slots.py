"""Поиск общих свободных интервалов в расписании двух пользователей (UTC-дата)."""

from datetime import UTC, date, datetime, time, timedelta

from app.models.task import Task

MIN_FREE_SLOT = timedelta(minutes=30)


def day_bounds_utc(d: date) -> tuple[datetime, datetime]:
    start = datetime.combine(d, time.min, tzinfo=UTC)
    return start, start + timedelta(days=1)


def _ensure_aware_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def _clip_interval(
    start: datetime,
    end: datetime,
    win_lo: datetime,
    win_hi: datetime,
) -> tuple[datetime, datetime] | None:
    s = max(_ensure_aware_utc(start), win_lo)
    e = min(_ensure_aware_utc(end), win_hi)
    if e <= s:
        return None
    return s, e


def _merge_intervals(intervals: list[tuple[datetime, datetime]]) -> list[tuple[datetime, datetime]]:
    if not intervals:
        return []
    ints = sorted(intervals, key=lambda x: x[0])
    merged: list[tuple[datetime, datetime]] = [ints[0]]
    for s, e in ints[1:]:
        ls, le = merged[-1]
        if s <= le:
            merged[-1] = (ls, max(le, e))
        else:
            merged.append((s, e))
    return merged


def _busy_union_from_tasks(tasks: list[Task], day_lo: datetime, day_hi: datetime) -> list[tuple[datetime, datetime]]:
    raw: list[tuple[datetime, datetime]] = []
    for t in tasks:
        c = _clip_interval(t.start_time, t.end_time, day_lo, day_hi)
        if c:
            raw.append(c)
    return _merge_intervals(raw)


def free_slots_both_users(
    tasks_a: list[Task],
    tasks_b: list[Task],
    day: date,
) -> list[tuple[datetime, datetime]]:
    """
    Интервалы [start, end), где ни у одного из двух пользователей нет задач,
    длительность каждого >= 30 минут. Границы суток — UTC.
    """
    day_lo, day_hi = day_bounds_utc(day)
    busy_a = _busy_union_from_tasks(tasks_a, day_lo, day_hi)
    busy_b = _busy_union_from_tasks(tasks_b, day_lo, day_hi)
    combined = _merge_intervals(busy_a + busy_b)

    free: list[tuple[datetime, datetime]] = []
    cursor = day_lo
    for s, e in combined:
        if cursor < s:
            gap = (cursor, s)
            if gap[1] - gap[0] >= MIN_FREE_SLOT:
                free.append(gap)
        cursor = max(cursor, e)
    if cursor < day_hi:
        gap = (cursor, day_hi)
        if gap[1] - gap[0] >= MIN_FREE_SLOT:
            free.append(gap)
    return free
