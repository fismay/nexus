from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.inbox_item import InboxItem
from app.models.task import Task
from app.models.event import Event
from app.schemas.inbox import InboxItemCreate, InboxItemRead, InboxProcessAction

router = APIRouter(prefix="/inbox", tags=["inbox"])


@router.get("/", response_model=list[InboxItemRead])
async def list_inbox(
    processed: bool = False,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(InboxItem)
        .where(InboxItem.is_processed == processed)
        .order_by(InboxItem.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=InboxItemRead, status_code=status.HTTP_201_CREATED)
async def create_inbox_item(data: InboxItemCreate, db: AsyncSession = Depends(get_db)):
    item = InboxItem(**data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.post("/{item_id}/process", response_model=dict)
async def process_inbox_item(
    item_id: UUID,
    action: InboxProcessAction,
    db: AsyncSession = Depends(get_db),
):
    """Обработать входящее: превратить в задачу или событие"""
    item = await db.get(InboxItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    if item.is_processed:
        raise HTTPException(status_code=400, detail="Already processed")

    parsed = item.parsed_data
    result_id = None

    if action.action == "create_task":
        task = Task(
            title=parsed.get("title", item.raw_text[:200]),
            deadline=parsed.get("deadline"),
            project_id=None,
            context_tags=parsed.get("context_tags", []),
        )
        db.add(task)
        await db.flush()
        result_id = str(task.id)

    elif action.action == "create_event":
        event = Event(
            title=parsed.get("title", item.raw_text[:200]),
            start_time=parsed.get("start_time"),
            end_time=parsed.get("end_time"),
            event_type=parsed.get("event_type", "other"),
        )
        db.add(event)
        await db.flush()
        result_id = str(event.id)

    item.is_processed = True
    await db.flush()

    return {"status": "processed", "action": action.action, "created_id": result_id}


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inbox_item(item_id: UUID, db: AsyncSession = Depends(get_db)):
    item = await db.get(InboxItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")
    await db.delete(item)
