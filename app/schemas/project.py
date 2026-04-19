import uuid

from pydantic import BaseModel, Field

from app.models.enums import ProjectCategory


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    category: ProjectCategory = Field(
        description="Музыка, Бизнес, Учеба, Работа (или Кастомное)",
    )


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    category: ProjectCategory | None = None


class ProjectRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None
    category: ProjectCategory

    model_config = {"from_attributes": True}
