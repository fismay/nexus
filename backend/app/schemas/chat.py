from pydantic import BaseModel
from datetime import datetime


class ChatMessageCreate(BaseModel):
    content: str
    project_id: str | None = None
    task_id: str | None = None


class ChatMessageRead(BaseModel):
    id: str
    sender_id: str
    sender_username: str | None = None
    project_id: str | None = None
    task_id: str | None = None
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectMemberCreate(BaseModel):
    user_id: str
    role: str = "viewer"


class ProjectMemberRead(BaseModel):
    id: str
    project_id: str
    user_id: str
    username: str | None = None
    role: str
    created_at: datetime

    class Config:
        from_attributes = True
