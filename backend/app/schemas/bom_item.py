from uuid import UUID
from pydantic import BaseModel, Field


class BOMItemBase(BaseModel):
    item_name: str = Field(..., max_length=300)
    quantity: int = 1
    status: str = "pending"
    price: float | None = None
    link: str | None = None


class BOMItemCreate(BOMItemBase):
    project_id: UUID


class BOMItemUpdate(BaseModel):
    item_name: str | None = None
    quantity: int | None = None
    status: str | None = None
    price: float | None = None
    link: str | None = None
