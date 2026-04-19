import re
import uuid

from pydantic import BaseModel, EmailStr, Field, field_validator

TAG_PATTERN = re.compile(r"^[a-zA-Z0-9_]{3,32}$")


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    tag: str = Field(
        ...,
        description="Уникальный тег без @ или с @ (например morgansim или @morgansim)",
        min_length=3,
        max_length=33,
    )
    display_name: str = Field(min_length=1, max_length=255)

    @field_validator("tag")
    @classmethod
    def normalize_tag(cls, v: str) -> str:
        t = v.strip()
        if t.startswith("@"):
            t = t[1:]
        if not TAG_PATTERN.match(t):
            msg = "tag: 3–32 символа: латиница, цифры, подчёркивание"
            raise ValueError(msg)
        return f"@{t}"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: uuid.UUID
    email: str
    tag: str
    display_name: str
    internal_id: str

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    user: UserRead
    access_token: str
    token_type: str = "bearer"
