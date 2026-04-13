from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.task import Task
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskRead, TimeboxAssign, TaskReadWithConflict,
)
from app.services.hardware_blockers import check_and_block_task
from app.services.conflict_manager import find_conflict

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/", response_model=list[TaskRead])
async def list_tasks(
    project_id: UUID | None = None,
    context_tag: str | None = Query(None, description="Фильтр по контекстному тегу"),
    status_filter: str | None = Query(None, alias="status", description="Фильтр по статусу"),
    unscheduled: bool = Query(False, description="Только без привязки ко времени (backlog)"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).order_by(Task.created_at.desc())

    if project_id:
        query = query.where(Task.project_id == project_id)
    if status_filter:
        query = query.where(Task.status == status_filter)
    if context_tag:
        query = query.where(Task.context_tags.contains([context_tag]))
    if unscheduled:
        query = query.where(Task.start_time.is_(None))

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(data: TaskCreate, db: AsyncSession = Depends(get_db)):
    task = Task(**data.model_dump())
    task = await check_and_block_task(db, task)
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(task_id: UUID, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: UUID, data: TaskUpdate, db: AsyncSession = Depends(get_db)
):
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = data.model_dump(exclude_unset=True)

    if "is_completed" in update_data and update_data["is_completed"]:
        update_data["status"] = "done"
    if "is_completed" in update_data and not update_data["is_completed"]:
        if task.status == "done":
            update_data["status"] = "todo"

    for field, value in update_data.items():
        setattr(task, field, value)

    if "blocker_bom_item_id" in update_data:
        task = await check_and_block_task(db, task)

    await db.flush()
    await db.refresh(task)
    return task


@router.post("/{task_id}/timebox", response_model=TaskReadWithConflict)
async def timebox_task(
    task_id: UUID, data: TimeboxAssign, db: AsyncSession = Depends(get_db)
):
    """
    Привязать задачу к слоту + Conflict Manager:
    всегда сохраняет, но если найдено пересечение — возвращает warning
    с предложением свободного окна.
    """
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    conflict = await find_conflict(db, data.start_time, data.end_time)

    task.start_time = data.start_time
    task.end_time = data.end_time

    await db.flush()
    await db.refresh(task)

    result = TaskReadWithConflict.model_validate(task)
    if conflict.has_conflict:
        result.conflict = conflict
    return result


@router.post("/{task_id}/unschedule", response_model=TaskRead)
async def unschedule_task(task_id: UUID, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.start_time = None
    task.end_time = None
    await db.flush()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: UUID, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
