"""
Фича 3: Hardware Blockers

Логика: когда BOM-деталь меняет статус, все задачи, заблокированные этой
деталью, автоматически обновляют свой статус:
  - BOM ordered/pending → Task.status = "blocked"
  - BOM received        → Task.status = "todo" (разблокировка)

Реализовано через SQLAlchemy ORM-level event listeners, потому что
async-сессия не позволяет использовать классические after_update events
на mapper-level. Вместо этого — явный вызов из роутера после PATCH BOM.
"""

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task


async def propagate_bom_status_change(
    db: AsyncSession,
    bom_item_id,
    new_bom_status: str,
) -> int:
    """
    Обновляет статус всех задач, привязанных к данной BOM-позиции.
    Возвращает количество затронутых задач.
    """
    if new_bom_status == "received":
        target_task_status = "todo"
    else:
        target_task_status = "blocked"

    result = await db.execute(
        update(Task)
        .where(Task.blocker_bom_item_id == bom_item_id)
        .where(Task.status != "done")
        .values(status=target_task_status)
    )
    return result.rowcount


async def check_and_block_task(
    db: AsyncSession,
    task: Task,
) -> Task:
    """
    При назначении blocker_bom_item_id на задачу — проверяем текущий
    статус детали и сразу выставляем правильный статус задачи.
    """
    if task.blocker_bom_item_id is None:
        if task.status == "blocked":
            task.status = "todo"
        return task

    from app.models.bom_item import BOMItem

    bom = await db.get(BOMItem, task.blocker_bom_item_id)
    if bom and bom.status != "received":
        task.status = "blocked"
    elif bom and bom.status == "received":
        if task.status == "blocked":
            task.status = "todo"

    return task
