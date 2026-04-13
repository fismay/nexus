from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: str | None = None
    tech_stack: list[str] = Field(default_factory=list)
    status: str = "planning"
    project_type: str = "general"
    repository_url: str | None = None
    cad_url: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    tech_stack: list[str] | None = None
    status: str | None = None
    project_type: str | None = None
    repository_url: str | None = None
    cad_url: str | None = None


class PhaseRead(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    progress_percent: float
    sort_order: int

    model_config = {"from_attributes": True}


class BOMItemRead(BaseModel):
    id: UUID
    project_id: UUID
    item_name: str
    quantity: int
    status: str
    price: float | None
    link: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskBrief(BaseModel):
    id: UUID
    title: str
    priority: str
    status: str
    is_completed: bool
    deadline: datetime | None
    blocker_bom_item_id: UUID | None = None
    context_tags: list[str] = []
    start_time: datetime | None = None
    end_time: datetime | None = None
    energy_cost: int = 2

    model_config = {"from_attributes": True}


class ProjectRead(ProjectBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    overall_progress: float
    phases: list[PhaseRead] = []
    bom_items: list[BOMItemRead] = []
    tasks: list[TaskBrief] = []

    model_config = {"from_attributes": True}


class ProjectCard(BaseModel):
    id: UUID
    title: str
    status: str
    project_type: str
    tech_stack: list[str]
    overall_progress: float
    repository_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
