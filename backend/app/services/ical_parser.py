"""
iCal Import & Smart Tagging

Стратегия хранения RRULE:
─────────────────────────
Вместо материализации бесконечных повторений в отдельные строки БД,
храним ОДИН master-Event с полями:
  - recurrence_rule  = "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO"
  - is_recurring     = True
  - week_parity      = "numerator" | "denominator" | None
  - recurrence_interval = 2

При запросе GET /events?start=...&end=... сервис разворачивает RRULE
на лету через dateutil.rrule и возвращает «виртуальные» occurrence.
Это экономит место и позволяет привязывать задачи к конкретной дате
через (event_id + occurrence_date).

Числитель / Знаменатель (INTERVAL=2):
──────────────────────────────────────
Определяется по semester_start (начало семестра).
Если DTSTART попадает на ту же неделю, что semester_start — это числитель.
Если на следующую — знаменатель.
"""

from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo
from icalendar import Calendar
from dateutil.rrule import rrulestr

from app.schemas.event import ICalPreviewEvent

UTC = ZoneInfo("UTC")
MSK = ZoneInfo("Europe/Moscow")


def smart_tag_from_summary(summary: str) -> str | None:
    """Smart Tagging: анализ SUMMARY пары → тег"""
    low = summary.lower()
    if "(лекционные)" in low or "(лекция)" in low or "лекц" in low:
        return "@theory"
    if (
        "(лабораторные)" in low
        or "(практические)" in low
        or "лаб." in low
        or "практ" in low
    ):
        return "@practice"
    return None


def smart_color(tag: str | None) -> str | None:
    """Цвет иконки по smart_tag"""
    if tag == "@theory":
        return "#3b82f6"   # blue-500
    if tag == "@practice":
        return "#f59e0b"   # amber-500
    return None


def determine_week_parity(
    event_start: datetime,
    semester_start: date | None,
    interval: int | None,
) -> str | None:
    """
    Если INTERVAL=2 — определяем числитель/знаменатель.
    Числитель: неделя совпадает с semester_start (или чётное смещение).
    Знаменатель: нечётное смещение.
    """
    if not interval or interval < 2 or not semester_start:
        return None

    sem_start_dt = datetime(
        semester_start.year, semester_start.month, semester_start.day, tzinfo=UTC
    )
    delta_days = (event_start.replace(tzinfo=UTC) - sem_start_dt).days
    week_offset = delta_days // 7

    if week_offset % 2 == 0:
        return "numerator"
    return "denominator"


def normalize_dt(dt_val) -> datetime:
    """Приводим icalendar dt к aware datetime."""
    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            return dt_val.replace(tzinfo=MSK)
        return dt_val
    if isinstance(dt_val, date):
        return datetime(dt_val.year, dt_val.month, dt_val.day, tzinfo=MSK)
    return datetime.now(MSK)


def parse_ical(
    raw_text: str,
    semester_start_str: str | None = None,
) -> list[ICalPreviewEvent]:
    """
    Парсит VCALENDAR текст. Для каждого VEVENT возвращает ICalPreviewEvent.
    """
    semester_start: date | None = None
    if semester_start_str:
        try:
            semester_start = date.fromisoformat(semester_start_str)
        except ValueError:
            pass

    cal = Calendar.from_ical(raw_text)
    results: list[ICalPreviewEvent] = []

    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        summary = str(component.get("SUMMARY", "Без названия"))
        location = str(component.get("LOCATION", "")) or None
        uid = str(component.get("UID", "")) or None

        dtstart_prop = component.get("DTSTART")
        dtend_prop = component.get("DTEND")
        if not dtstart_prop:
            continue

        start = normalize_dt(dtstart_prop.dt)
        if dtend_prop:
            end = normalize_dt(dtend_prop.dt)
        else:
            end = start + timedelta(hours=1, minutes=30)

        rrule_prop = component.get("RRULE")
        rrule_str: str | None = None
        interval: int | None = None

        if rrule_prop:
            rrule_str = rrule_prop.to_ical().decode("utf-8")
            interval = rrule_prop.get("INTERVAL", [None])[0]
            if isinstance(interval, int) and interval < 2:
                interval = None

        parity = determine_week_parity(start, semester_start, interval)
        tag = smart_tag_from_summary(summary)

        results.append(
            ICalPreviewEvent(
                title=summary,
                location=location,
                start_time=start,
                end_time=end,
                recurrence_rule=rrule_str,
                week_parity=parity,
                smart_tag=tag,
                event_type="class",
                ical_uid=uid,
            )
        )

    return results


def expand_recurring_events(
    events_db: list,
    range_start: datetime,
    range_end: datetime,
) -> list[dict]:
    """
    Разворачивает recurring events в конкретные occurrence для диапазона дат.
    Возвращает список dict-ов (EventRead-совместимых), включая виртуальные копии.
    Не создаёт строк в БД — только для отображения в календаре.
    """
    expanded = []

    for ev in events_db:
        if not ev.is_recurring or not ev.recurrence_rule:
            if range_start <= ev.start_time <= range_end:
                expanded.append(ev)
            continue

        duration = ev.end_time - ev.start_time

        try:
            dtstart_str = f"DTSTART:{ev.start_time.strftime('%Y%m%dT%H%M%S')}\n"
            rule = rrulestr(
                dtstart_str + "RRULE:" + ev.recurrence_rule,
                ignoretz=True,
            )
        except Exception:
            if range_start <= ev.start_time <= range_end:
                expanded.append(ev)
            continue

        for occ_start_naive in rule.between(
            range_start.replace(tzinfo=None),
            range_end.replace(tzinfo=None),
            inc=True,
        ):
            occ_start = occ_start_naive.replace(tzinfo=ev.start_time.tzinfo)
            occ_end = occ_start + duration

            expanded.append(
                type("VirtualEvent", (), {
                    "id": ev.id,
                    "project_id": ev.project_id,
                    "title": ev.title,
                    "description": ev.description,
                    "event_type": ev.event_type,
                    "start_time": occ_start,
                    "end_time": occ_end,
                    "is_recurring": True,
                    "recurrence_rule": ev.recurrence_rule,
                    "color": ev.color,
                    "created_at": ev.created_at,
                    "location": ev.location,
                    "ical_uid": ev.ical_uid,
                    "smart_tag": ev.smart_tag,
                    "week_parity": ev.week_parity,
                    "recurrence_interval": ev.recurrence_interval,
                })()
            )

    return expanded
