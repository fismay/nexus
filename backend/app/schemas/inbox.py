from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class InboxItemCreate(BaseModel):
    raw_text: str
    parsed_type: str = "task"
    parsed_data: dict = {}
    source: str = "telegram"
    telegram_chat_id: str | None = None


class InboxItemRead(BaseModel):
    id: UUID
    raw_text: str
    parsed_type: str
    parsed_data: dict
    is_processed: bool
    source: str
    telegram_chat_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class InboxProcessAction(BaseModel):
    """Действие при обработке входящего: создать задачу / событие"""
    action: str = "create_task"  # create_task | create_event | dismiss
