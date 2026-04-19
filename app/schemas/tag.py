import re
import uuid

from pydantic import BaseModel, Field, field_validator

HEX_COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    color: str = Field(description="HEX, например #AABBCC")
    priority_level: int = Field(ge=1, le=4)
    description: str | None = None

    @field_validator("color")
    @classmethod
    def color_hex(cls, v: str) -> str:
        if not HEX_COLOR.match(v):
            msg = "color must be #RRGGBB"
            raise ValueError(msg)
        return v


class TagUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    color: str | None = None
    priority_level: int | None = Field(default=None, ge=1, le=4)
    description: str | None = None

    @field_validator("color")
    @classmethod
    def color_hex(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not HEX_COLOR.match(v):
            msg = "color must be #RRGGBB"
            raise ValueError(msg)
        return v


class TagRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    name: str
    color: str
    priority_level: int
    description: str | None

    model_config = {"from_attributes": True}
