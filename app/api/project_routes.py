"""CRUD проектов и материалов (промпты, ссылки)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import project as project_crud
from app.crud import project_asset as asset_crud
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.project_asset import ProjectAssetCreate, ProjectAssetRead, ProjectAssetUpdate

router = APIRouter()


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[ProjectRead]:
    rows = await project_crud.list_owned(db, current.id)
    return [ProjectRead.model_validate(p) for p in rows]


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ProjectRead:
    p = await project_crud.create_project(db, current.id, data)
    return ProjectRead.model_validate(p)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ProjectRead:
    p = await project_crud.get_owned_project(db, project_id, current.id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")
    return ProjectRead.model_validate(p)


@router.patch("/{project_id}", response_model=ProjectRead)
async def patch_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ProjectRead:
    p = await project_crud.get_owned_project(db, project_id, current.id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")
    p = await project_crud.update_project(db, p, data)
    return ProjectRead.model_validate(p)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    p = await project_crud.get_owned_project(db, project_id, current.id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")
    await project_crud.delete_project(db, p)


@router.get("/{project_id}/assets", response_model=list[ProjectAssetRead])
async def list_assets(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[ProjectAssetRead]:
    p = await project_crud.get_owned_project(db, project_id, current.id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")
    rows = await asset_crud.list_for_project(db, project_id)
    return [ProjectAssetRead.model_validate(x) for x in rows]


@router.post("/{project_id}/assets", response_model=ProjectAssetRead, status_code=status.HTTP_201_CREATED)
async def create_asset(
    project_id: uuid.UUID,
    data: ProjectAssetCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ProjectAssetRead:
    p = await project_crud.get_owned_project(db, project_id, current.id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")
    a = await asset_crud.create_asset(db, project_id, data)
    return ProjectAssetRead.model_validate(a)


@router.patch("/{project_id}/assets/{asset_id}", response_model=ProjectAssetRead)
async def patch_asset(
    project_id: uuid.UUID,
    asset_id: uuid.UUID,
    data: ProjectAssetUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ProjectAssetRead:
    p = await project_crud.get_owned_project(db, project_id, current.id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")
    a = await asset_crud.get_asset(db, asset_id, project_id)
    if a is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Материал не найден")
    a = await asset_crud.update_asset(db, a, data)
    return ProjectAssetRead.model_validate(a)


@router.delete("/{project_id}/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_asset(
    project_id: uuid.UUID,
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    p = await project_crud.get_owned_project(db, project_id, current.id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")
    a = await asset_crud.get_asset(db, asset_id, project_id)
    if a is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Материал не найден")
    await asset_crud.delete_asset(db, a)
