import uuid

from pydantic import BaseModel, Field

from app.models.enums import ProjectAssetKind


class ProjectAssetCreate(BaseModel):
    kind: ProjectAssetKind
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=8000)


class ProjectAssetUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    body: str | None = Field(default=None, min_length=1, max_length=8000)


class ProjectAssetRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    kind: ProjectAssetKind
    title: str
    body: str

    model_config = {"from_attributes": True}
