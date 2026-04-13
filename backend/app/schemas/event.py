from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class EventBase(BaseModel):
    title: str = Field(..., max_length=300)
    description: str | None = None
    event_type: str = "class"
    start_time: datetime
    end_time: datetime
    is_recurring: bool = False
    recurrence_rule: str | None = None
    color: str | None = None
    project_id: UUID | None = None
    location: str | None = None
    smart_tag: str | None = None
    week_parity: str | None = None
    recurrence_interval: int | None = None
    ical_uid: str | None = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    event_type: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    is_recurring: bool | None = None
    recurrence_rule: str | None = None
    color: str | None = None
    project_id: UUID | None = None
    location: str | None = None
    smart_tag: str | None = None
    week_parity: str | None = None


class EventRead(EventBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# --- iCal Import schemas ---

class ICalImportRequest(BaseModel):
    url: str | None = None
    raw_text: str | None = None
    semester_start: str | None = Field(
        None, description="Дата начала семестра YYYY-MM-DD для вычисления чёт/нечёт"
    )


class ICalPreviewEvent(BaseModel):
    title: str
    location: str | None
    start_time: datetime
    end_time: datetime
    recurrence_rule: str | None
    week_parity: str | None
    smart_tag: str | None
    event_type: str
    ical_uid: str | None


class ICalImportResponse(BaseModel):
    events: list[ICalPreviewEvent]
    total: int
    numerator_count: int
    denominator_count: int
    weekly_count: int


class ICalConfirmRequest(BaseModel):
    """Подтверждение импорта: список индексов выбранных событий"""
    events: list[ICalPreviewEvent]


# --- Conflict Manager schemas ---

class ConflictWarning(BaseModel):
    has_conflict: bool = False
    warning: str | None = None
    conflicting_event_id: UUID | None = None
    conflicting_event_title: str | None = None
    conflicting_event_location: str | None = None
    suggested_start: datetime | None = None
    suggested_end: datetime | None = None
