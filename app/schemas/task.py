import uuid
from datetime import UTC, datetime, timedelta

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.enums import TaskKind, TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=512)
    start_time: datetime | None = None
    end_time: datetime
    tag_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    status: TaskStatus = TaskStatus.planned
    kind: TaskKind = TaskKind.meeting

    @field_validator("start_time", "end_time")
    @classmethod
    def timezone_required(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return v
        if v.tzinfo is None:
            msg = "укажите часовой пояс (timezone-aware datetime)"
            raise ValueError(msg)
        return v

    @field_validator("start_time", "end_time")
    @classmethod
    def minute_precision(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return v
        if v.second != 0 or v.microsecond != 0:
            msg = "время должно быть с точностью до минут (секунды и доли — 0)"
            raise ValueError(msg)
        return v

    @model_validator(mode="after")
    def validate_window(self) -> "TaskCreate":
        if self.kind == TaskKind.task:
            return self
        if self.start_time is None:
            msg = "start_time обязателен для встреч и мероприятий"
            raise ValueError(msg)
        if self.end_time <= self.start_time:
            msg = "end_time должно быть позже start_time"
            raise ValueError(msg)
        return self


class TaskUpdate(BaseModel):
    status: TaskStatus | None = None
    title: str | None = Field(default=None, min_length=1, max_length=512)
    start_time: datetime | None = None
    end_time: datetime | None = None
    tag_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    kind: TaskKind | None = None

    @field_validator("start_time", "end_time")
    @classmethod
    def time_fields_opt(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return v
        if v.tzinfo is None:
            msg = "укажите часовой пояс (timezone-aware datetime)"
            raise ValueError(msg)
        if v.second != 0 or v.microsecond != 0:
            msg = "время должно быть с точностью до минут (секунды и доли — 0)"
            raise ValueError(msg)
        return v


class TaskRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    start_time: datetime
    end_time: datetime
    tag_id: uuid.UUID | None
    project_id: uuid.UUID | None
    status: TaskStatus
    kind: TaskKind
    tag_name: str | None = None

    model_config = {"from_attributes": True}


def task_read_from_orm(task: object) -> TaskRead:
    tag = getattr(task, "tag", None)
    tag_name = tag.name if tag is not None else None
    return TaskRead(
        id=getattr(task, "id"),
        user_id=getattr(task, "user_id"),
        title=getattr(task, "title"),
        start_time=getattr(task, "start_time"),
        end_time=getattr(task, "end_time"),
        tag_id=getattr(task, "tag_id"),
        project_id=getattr(task, "project_id"),
        status=getattr(task, "status"),
        kind=getattr(task, "kind"),
        tag_name=tag_name,
    )
