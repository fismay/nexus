from uuid import UUID
from pydantic import BaseModel, Field


class PhaseBase(BaseModel):
    name: str = Field(..., max_length=200)
    progress_percent: float = 0.0
    sort_order: int = 0


class PhaseCreate(PhaseBase):
    project_id: UUID


class PhaseUpdate(BaseModel):
    name: str | None = None
    progress_percent: float | None = None
    sort_order: int | None = None
