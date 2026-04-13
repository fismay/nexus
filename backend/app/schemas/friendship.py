from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.auth import UserSearch


class FriendshipRead(BaseModel):
    id: UUID
    requester: UserSearch
    addressee: UserSearch
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FriendRequest(BaseModel):
    addressee_username: str


class SharedSlot(BaseModel):
    start: datetime
    end: datetime
