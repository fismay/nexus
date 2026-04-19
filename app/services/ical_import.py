"""Загрузка и разбор .ics для импорта в задачи."""

from datetime import UTC, date, datetime, time, timedelta
from typing import TYPE_CHECKING
from urllib.parse import urlparse

import httpx
import icalendar
import recurring_ical_events
from icalendar.attr import get_end_property, get_start_property

if TYPE_CHECKING:
    from icalendar.cal import Component

STUDY_TAG_NAME = "Учеба"


async def fetch_ical_bytes(url: str) -> bytes:
    parsed = urlparse(url.strip())
    origin = ""
    if parsed.scheme and parsed.netloc:
        origin = f"{parsed.scheme}://{parsed.netloc}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Nexus/1.0",
        "Accept": "text/calendar, application/ics, */*",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
    }
    if origin:
        headers["Origin"] = origin
        headers["Referer"] = origin + "/"
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(60.0, connect=20.0),
        headers=headers,
    ) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content


def _to_utc_datetime(d: date | datetime) -> datetime:
    if isinstance(d, datetime):
        if d.tzinfo is None:
            return d.replace(tzinfo=UTC)
        return d.astimezone(UTC)
    return datetime.combine(d, time.min, tzinfo=UTC)


def _snap_to_minute(dt: datetime) -> datetime:
    dt = dt.astimezone(UTC).replace(second=0, microsecond=0)
    return dt


def _summary(ev: "Component") -> str:
    raw = ev.get("SUMMARY")
    if raw is None:
        return "Без названия"
    if hasattr(raw, "to_ical"):
        try:
            return raw.to_ical().decode("utf-8").strip()
        except Exception:
            pass
    return str(raw).strip() or "Без названия"


def parse_ical_to_occurrences(
    raw: bytes,
    span_start: datetime,
    span_end: datetime,
) -> list[tuple[str, datetime, datetime]]:
    """Возвращает (title, start_utc, end_utc) для каждого вхождения VEVENT в окне."""
    cal = icalendar.Calendar.from_ical(raw)
    try:
        components = recurring_ical_events.of(cal, skip_bad_series=True).between(span_start, span_end)
    except Exception:
        components = []

    out: list[tuple[str, datetime, datetime]] = []
    for ev in components:
        if getattr(ev, "name", None) != "VEVENT":
            continue
        try:
            s = get_start_property(ev)
            e = get_end_property(ev, "DTEND")
        except Exception:
            continue
        start = _snap_to_minute(_to_utc_datetime(s))
        end = _snap_to_minute(_to_utc_datetime(e))
        if end <= start:
            end = start + timedelta(minutes=1)
        title = _summary(ev)
        out.append((title, start, end))
    return out
