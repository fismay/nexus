"""Анализ пересечений задач по времени (матрица: дни × 24 часа; критический конфликт при ≥3 одновременных)."""

CRITICAL_CONFLICT_MIN_TASKS = 3

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from typing import Protocol
from uuid import UUID


class _HasInterval(Protocol):
    id: UUID
    start_time: datetime
    end_time: datetime


@dataclass(frozen=True)
class TimedInterval:
    id: UUID
    start: datetime
    end: datetime


def _ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


def utc_days_spanned(start: datetime, end: datetime) -> list[date]:
    """Календарные дни (UTC), которые пересекает полуинтервал [start, end)."""
    s = _ensure_aware(start).astimezone(UTC)
    e = _ensure_aware(end).astimezone(UTC)
    if e <= s:
        return []
    last_instant = e - timedelta(microseconds=1)
    d0 = s.date()
    d1 = last_instant.date()
    out: list[date] = []
    cur = d0
    while cur <= d1:
        out.append(cur)
        cur += timedelta(days=1)
    return out


def max_concurrent_in_window(items: list[TimedInterval], win_start: datetime, win_end: datetime) -> int:
    """Максимальное число задач, пересекающихся с [win_start, win_end) в любой момент (полуинтервалы)."""
    win_start = _ensure_aware(win_start)
    win_end = _ensure_aware(win_end)
    if win_start >= win_end:
        return 0

    events: list[tuple[datetime, int]] = []
    for it in items:
        s = max(_ensure_aware(it.start), win_start)
        e = min(_ensure_aware(it.end), win_end)
        if s < e:
            events.append((s, 1))
            events.append((e, -1))

    events.sort(key=lambda x: (x[0], x[1]))
    cur = 0
    best = 0
    for _, d in events:
        cur += d
        best = max(best, cur)
    return best


def intervals_from_tasks(tasks: list[_HasInterval]) -> list[TimedInterval]:
    return [
        TimedInterval(id=t.id, start=_ensure_aware(t.start_time), end=_ensure_aware(t.end_time))
        for t in tasks
    ]


def day_bounds_utc(d: date) -> tuple[datetime, datetime]:
    start = datetime.combine(d, time.min, tzinfo=UTC)
    return start, start + timedelta(days=1)


def tasks_overlapping_day(tasks: list[_HasInterval], d: date) -> list[TimedInterval]:
    day_start, day_end = day_bounds_utc(d)
    out: list[TimedInterval] = []
    for it in intervals_from_tasks(tasks):
        if it.start < day_end and it.end > day_start:
            out.append(it)
    return out


def has_critical_conflict_in_window(
    tasks: list[_HasInterval],
    window_start: datetime,
    window_end: datetime,
    *,
    min_concurrent: int = CRITICAL_CONFLICT_MIN_TASKS,
) -> bool:
    """
    Возвращает True, если в произвольном полуинтервале [window_start, window_end)
    хотя бы в один момент времени активны **min_concurrent** задач и больше
    (типичный порог перегрузки — 3).
    """
    items = intervals_from_tasks(tasks)
    return max_concurrent_in_window(items, window_start, window_end) >= min_concurrent


def hourly_critical_flags_for_day(tasks: list[_HasInterval], d: date) -> list[bool]:
    """
    24 флагов — по одному на каждый час [0..23] календарного дня UTC.
    has_critical_conflict True, если внутри этого часа одновременно ≥ CRITICAL_CONFLICT_MIN_TASKS задач.
    """
    day_items = tasks_overlapping_day(tasks, d)
    day_start, day_end = day_bounds_utc(d)
    flags: list[bool] = []
    for h in range(24):
        hs = day_start + timedelta(hours=h)
        he = hs + timedelta(hours=1)
        he = min(he, day_end)
        n = max_concurrent_in_window(day_items, hs, he)
        flags.append(n >= CRITICAL_CONFLICT_MIN_TASKS)
    return flags


def build_hour_slots_for_day(
    tasks: list[_HasInterval],
    d: date,
    *,
    critical_threshold: int = CRITICAL_CONFLICT_MIN_TASKS,
) -> list[dict]:
    """Матрица строки: час + id задач, пересекающих час, + флаг критического конфликта."""
    day_items = tasks_overlapping_day(tasks, d)
    day_start, day_end = day_bounds_utc(d)
    rows: list[dict] = []
    for h in range(24):
        hs = day_start + timedelta(hours=h)
        he = min(hs + timedelta(hours=1), day_end)
        overlapping = [it for it in day_items if it.start < he and it.end > hs]
        task_ids = [str(it.id) for it in overlapping]
        n = max_concurrent_in_window(day_items, hs, he)
        rows.append(
            {
                "hour": h,
                "task_ids": task_ids,
                "has_critical_conflict": n >= critical_threshold,
            }
        )
    return rows
