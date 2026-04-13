from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class TaskBase(BaseModel):
    title: str = Field(..., max_length=300)
    description: str | None = None
    priority: str = "medium"
    status: str = "todo"
    deadline: datetime | None = None
    project_id: UUID | None = None
    blocker_bom_item_id: UUID | None = None
    context_tags: list[str] = Field(default_factory=list)
    energy_cost: int = Field(default=2, ge=1, le=3)
    scheduling_type: str = "fluid"


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    is_completed: bool | None = None
    deadline: datetime | None = None
    project_id: UUID | None = None
    blocker_bom_item_id: UUID | None = None
    context_tags: list[str] | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    energy_cost: int | None = Field(default=None, ge=1, le=3)
    scheduling_type: str | None = None


class TimeboxAssign(BaseModel):
    start_time: datetime
    end_time: datetime


class TaskRead(BaseModel):
    id: UUID
    title: str
    description: str | None
    priority: str
    status: str
    is_completed: bool
    deadline: datetime | None
    project_id: UUID | None
    blocker_bom_item_id: UUID | None
    context_tags: list[str]
    start_time: datetime | None
    end_time: datetime | None
    energy_cost: int
    scheduling_type: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskReadWithConflict(TaskRead):
    conflict: "ConflictWarning | None" = None


from app.schemas.event import ConflictWarning  # noqa: E402
TaskReadWithConflict.model_rebuild()
