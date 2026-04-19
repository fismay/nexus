import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class FriendUserBrief(BaseModel):
    id: uuid.UUID
    tag: str
    display_name: str


class FriendInviteBody(BaseModel):
    username: str = Field(
        ...,
        min_length=1,
        max_length=33,
        description="Ник (@user или user), как при регистрации",
    )


class PendingInvitationOut(BaseModel):
    id: uuid.UUID
    other: FriendUserBrief
    incoming: bool


class FreeSlot(BaseModel):
    start: datetime = Field(description="Начало свободного окна (UTC)")
    end: datetime = Field(description="Конец свободного окна (UTC)")


class MatchScheduleResponse(BaseModel):
    date: date
    friend_id: uuid.UUID
    min_slot_minutes: int = 30
    free_slots: list[FreeSlot]
