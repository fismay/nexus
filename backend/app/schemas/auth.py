from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)
    display_name: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserRead"


class UserRead(BaseModel):
    id: UUID
    username: str
    email: str
    display_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserSearch(BaseModel):
    id: UUID
    username: str
    display_name: str | None

    model_config = {"from_attributes": True}
