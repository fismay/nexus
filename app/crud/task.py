import uuid
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import TaskKind, TaskStatus
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


def _range_bounds_utc(start_date: date, end_date: date) -> tuple[datetime, datetime]:
    start = datetime.combine(start_date, time.min, tzinfo=UTC)
    end_excl = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=UTC)
    return start, end_excl


async def list_tasks_for_user_list(
    session: AsyncSession,
    user_id: uuid.UUID,
    start_date: date,
    end_date: date,
    *,
    tag_id: uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
    sort: str = "time_asc",
    exclude_tag_id: uuid.UUID | None = None,
) -> list[Task]:
    """Список задач для UI: опционально исключает импорт учёбы (системный тег)."""
    range_start, range_end = _range_bounds_utc(start_date, end_date)
    q = select(Task).where(
        Task.user_id == user_id,
        Task.start_time < range_end,
        Task.end_time > range_start,
    )
    if tag_id is not None:
        q = q.where(Task.tag_id == tag_id)
    if project_id is not None:
        q = q.where(Task.project_id == project_id)
    if exclude_tag_id is not None:
        q = q.where(or_(Task.tag_id.is_(None), Task.tag_id != exclude_tag_id))
    q = q.options(selectinload(Task.tag))
    if sort == "time_desc":
        q = q.order_by(Task.start_time.desc())
    elif sort == "title":
        q = q.order_by(Task.title.asc())
    else:
        q = q.order_by(Task.start_time.asc())
    result = await session.execute(q)
    return list(result.scalars().all())


async def update_task(session: AsyncSession, task: Task, data: TaskUpdate) -> Task:
    payload = data.model_dump(exclude_unset=True)
    old_status = task.status
    for k, v in payload.items():
        setattr(task, k, v)
    new_status = task.status
    if new_status == TaskStatus.completed and old_status != TaskStatus.completed:
        task.completed_at = datetime.now(UTC)
    elif new_status == TaskStatus.planned:
        task.completed_at = None
    await session.flush()
    await session.refresh(task)
    return task


async def list_tasks_in_date_range(
    session: AsyncSession,
    user_id: uuid.UUID,
    start_date: date,
    end_date: date,
) -> list[Task]:
    range_start, range_end = _range_bounds_utc(start_date, end_date)
    q = (
        select(Task)
        .where(
            Task.user_id == user_id,
            Task.start_time < range_end,
            Task.end_time > range_start,
        )
        .options(selectinload(Task.tag))
        .order_by(Task.start_time)
    )
    result = await session.execute(q)
    return list(result.scalars().all())


async def create_task(session: AsyncSession, user_id: uuid.UUID, data: TaskCreate) -> Task:
    now = datetime.now(UTC)
    start_time = data.start_time
    if data.kind == TaskKind.task:
        start_time = data.end_time - timedelta(minutes=1)
    elif start_time is None:
        start_time = data.end_time - timedelta(minutes=1)
    task = Task(
        user_id=user_id,
        title=data.title.strip(),
        start_time=start_time,
        end_time=data.end_time,
        tag_id=data.tag_id,
        project_id=data.project_id,
        status=data.status,
        kind=data.kind,
        created_at=now,
        completed_at=now if data.status == TaskStatus.completed else None,
    )
    session.add(task)
    await session.flush()
    await session.refresh(task)
    return task


async def get_task_for_user(session: AsyncSession, task_id: uuid.UUID, user_id: uuid.UUID) -> Task | None:
    q = (
        select(Task)
        .where(Task.id == task_id, Task.user_id == user_id)
        .options(selectinload(Task.tag))
    )
    result = await session.execute(q)
    return result.scalar_one_or_none()


async def delete_task(session: AsyncSession, task: Task) -> None:
    await session.delete(task)
    await session.flush()


async def identical_task_exists(
    session: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    start_time: datetime,
    end_time: datetime,
) -> bool:
    """Повторный импорт iCal не создаёт дубликаты с тем же окном и названием."""
    q = (
        select(Task.id)
        .where(
            and_(
                Task.user_id == user_id,
                Task.title == title,
                Task.start_time == start_time,
                Task.end_time == end_time,
            ),
        )
        .limit(1)
    )
    result = await session.execute(q)
    return result.scalar_one_or_none() is not None


async def count_created_since(
    session: AsyncSession,
    user_id: uuid.UUID,
    since: datetime,
    exclude_tag_id: uuid.UUID | None,
) -> int:
    q = select(func.count()).select_from(Task).where(Task.user_id == user_id, Task.created_at >= since)
    if exclude_tag_id is not None:
        q = q.where(or_(Task.tag_id.is_(None), Task.tag_id != exclude_tag_id))
    r = await session.execute(q)
    return int(r.scalar_one())


async def count_completed_since(
    session: AsyncSession,
    user_id: uuid.UUID,
    since: datetime,
    exclude_tag_id: uuid.UUID | None,
) -> int:
    q = select(func.count()).select_from(Task).where(
        Task.user_id == user_id,
        Task.status == TaskStatus.completed,
        Task.completed_at.is_not(None),
        Task.completed_at >= since,
    )
    if exclude_tag_id is not None:
        q = q.where(or_(Task.tag_id.is_(None), Task.tag_id != exclude_tag_id))
    r = await session.execute(q)
    return int(r.scalar_one())


async def create_task_raw(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    title: str,
    start_time: datetime,
    end_time: datetime,
    tag_id: uuid.UUID | None,
    status: TaskStatus = TaskStatus.planned,
    kind: TaskKind = TaskKind.event,
) -> Task:
    now = datetime.now(UTC)
    task = Task(
        user_id=user_id,
        title=title,
        start_time=start_time,
        end_time=end_time,
        tag_id=tag_id,
        project_id=None,
        status=status,
        kind=kind,
        created_at=now,
        completed_at=None,
    )
    session.add(task)
    await session.flush()
    await session.refresh(task)
    return task
