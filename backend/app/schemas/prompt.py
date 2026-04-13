from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class PromptBase(BaseModel):
    title: str = Field(..., max_length=300)
    content: str
    ai_model: str = "Ollama"
    project_id: UUID | None = None


class PromptCreate(PromptBase):
    pass


class PromptUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    ai_model: str | None = None


class PromptRead(PromptBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
