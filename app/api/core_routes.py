"""Маршруты верхнего уровня /api/* (расписание, задачи, импорт)."""

import uuid
from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import project as project_crud
from app.crud import tag as tag_crud
from app.crud import task as task_crud
from app.database import get_db
from app.dependencies import get_current_user
from app.models.enums import TaskKind
from app.models.user import User
from app.schemas.schedule import (
    DaySchedule,
    HourSlot,
    IcalImportBody,
    IcalImportResponse,
    ScheduleResponse,
)
from app.schemas.stats import DashboardStats
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate, task_read_from_orm
from app.services.ical_import import STUDY_TAG_NAME, fetch_ical_bytes, parse_ical_to_occurrences
from app.services.time_conflicts import build_hour_slots_for_day, utc_days_spanned

router = APIRouter()


@router.get("/stats/dashboard", response_model=DashboardStats)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> DashboardStats:
    now = datetime.now(UTC)
    since = now - timedelta(days=7)
    exclude_id: uuid.UUID | None = None
    study = await tag_crud.get_system_tag_by_name(db, STUDY_TAG_NAME)
    if study is not None:
        exclude_id = study.id
    created = await task_crud.count_created_since(db, current.id, since, exclude_id)
    completed = await task_crud.count_completed_since(db, current.id, since, exclude_id)
    return DashboardStats(
        tasks_created_last_7_days=created,
        tasks_completed_last_7_days=completed,
    )


def _daterange_inclusive(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


@router.get("/schedule", response_model=ScheduleResponse)
async def get_schedule(
    start_date: date = Query(..., description="Начало периода (включительно)"),
    end_date: date = Query(..., description="Конец периода (включительно)"),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ScheduleResponse:
    if start_date > end_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_date не может быть позже end_date")
    max_days = 400
    if (end_date - start_date).days + 1 > max_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"максимум {max_days} календарных дней за один запрос",
        )

    tasks = await task_crud.list_tasks_in_date_range(db, current.id, start_date, end_date)
    days_out: list[DaySchedule] = []
    for d in _daterange_inclusive(start_date, end_date):
        day_tasks = [t for t in tasks if d in utc_days_spanned(t.start_time, t.end_time)]
        hour_rows = [HourSlot(**r) for r in build_hour_slots_for_day(tasks, d)]
        days_out.append(
            DaySchedule(
                date=d,
                tasks=[task_read_from_orm(t) for t in day_tasks],
                hours=hour_rows,
            ),
        )
    return ScheduleResponse(start_date=start_date, end_date=end_date, days=days_out)


async def _validate_tag_for_user(db: AsyncSession, user_id, tag_id) -> None:
    if tag_id is None:
        return
    tag = await tag_crud.get_tag(db, tag_id)
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тег не найден")
    if tag.user_id is not None and tag.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нельзя привязать чужой тег")


async def _validate_project_for_user(db: AsyncSession, user_id, project_id) -> None:
    if project_id is None:
        return
    proj = await project_crud.get_owned_project(db, project_id, user_id)
    if proj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")


@router.get("/tasks", response_model=list[TaskRead])
async def list_tasks_endpoint(
    start_date: date = Query(..., description="Начало периода"),
    end_date: date = Query(..., description="Конец периода"),
    tag_id: uuid.UUID | None = Query(None),
    project_id: uuid.UUID | None = Query(None),
    sort: str = Query("time_asc", pattern="^(time_asc|time_desc|title)$"),
    exclude_study_import: bool = Query(
        True,
        description="Скрыть занятия из импорта iCal (системный тег «Учеба»)",
    ),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[TaskRead]:
    if start_date > end_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="неверный диапазон дат")
    exclude_id: uuid.UUID | None = None
    if exclude_study_import:
        study = await tag_crud.get_system_tag_by_name(db, STUDY_TAG_NAME)
        if study is not None:
            exclude_id = study.id
    rows = await task_crud.list_tasks_for_user_list(
        db,
        current.id,
        start_date,
        end_date,
        tag_id=tag_id,
        project_id=project_id,
        sort=sort,
        exclude_tag_id=exclude_id,
    )
    return [task_read_from_orm(t) for t in rows]


@router.patch("/tasks/{task_id}", response_model=TaskRead)
async def patch_task_endpoint(
    task_id: uuid.UUID,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> TaskRead:
    task = await task_crud.get_task_for_user(db, task_id, current.id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    tag_for_val = data.tag_id if data.tag_id is not None else task.tag_id
    await _validate_tag_for_user(db, current.id, tag_for_val)
    proj_for_val = data.project_id if data.project_id is not None else task.project_id
    await _validate_project_for_user(db, current.id, proj_for_val)
    kind_for_val = data.kind if data.kind is not None else task.kind
    new_start = data.start_time if data.start_time is not None else task.start_time
    new_end = data.end_time if data.end_time is not None else task.end_time
    if kind_for_val == TaskKind.task:
        new_start = new_end - timedelta(minutes=1)
        data.start_time = new_start
    elif new_end <= new_start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_time должно быть позже start_time")
    updated = await task_crud.update_task(db, task, data)
    loaded = await task_crud.get_task_for_user(db, updated.id, current.id)
    if loaded is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="ошибка обновления")
    return task_read_from_orm(loaded)


@router.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task_endpoint(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> TaskRead:
    await _validate_tag_for_user(db, current.id, data.tag_id)
    await _validate_project_for_user(db, current.id, data.project_id)
    task = await task_crud.create_task(db, current.id, data)
    loaded = await task_crud.get_task_for_user(db, task.id, current.id)
    if loaded is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="не удалось создать задачу")
    return task_read_from_orm(loaded)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_endpoint(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    task = await task_crud.get_task_for_user(db, task_id, current.id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    await task_crud.delete_task(db, task)


@router.post("/import/ical", response_model=IcalImportResponse)
async def import_ical(
    body: IcalImportBody,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> IcalImportResponse:
    study = await tag_crud.get_system_tag_by_name(db, STUDY_TAG_NAME)
    if study is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Системный тег «{STUDY_TAG_NAME}» не найден. Перезапустите приложение после миграции БД.',
        )

    if body.ical_text is not None:
        raw = body.ical_text.encode("utf-8")
    else:
        try:
            raw = await fetch_ical_bytes(body.url or "")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"не удалось загрузить URL: {e!s}",
            ) from e

    now = datetime.now(UTC)
    span_start = now - timedelta(days=30)
    span_end = now + timedelta(days=730)
    try:
        rows = parse_ical_to_occurrences(raw, span_start, span_end)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"не удалось разобрать iCal: {e!s}",
        ) from e

    created = 0
    skipped = 0
    for title, start, end in rows:
        t = title[:512]
        if await task_crud.identical_task_exists(db, current.id, t, start, end):
            skipped += 1
            continue
        try:
            await task_crud.create_task_raw(
                db,
                user_id=current.id,
                title=t,
                start_time=start,
                end_time=end,
                tag_id=study.id,
            )
            created += 1
        except Exception:
            skipped += 1
    return IcalImportResponse(created=created, skipped=skipped)
