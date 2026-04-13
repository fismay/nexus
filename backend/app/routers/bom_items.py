from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.bom_item import BOMItem
from app.models.project import Project
from app.models.user import User
from app.schemas.bom_item import BOMItemCreate, BOMItemUpdate
from app.schemas.project import BOMItemRead
from app.services.hardware_blockers import propagate_bom_status_change
from app.services.auth import require_user

router = APIRouter(prefix="/bom-items", tags=["bom"])


async def _verify_project_owner(db: AsyncSession, project_id: UUID, user: User):
    project = await db.get(Project, project_id)
    if not project or project.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/by-project/{project_id}", response_model=list[BOMItemRead])
async def list_bom_items(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    await _verify_project_owner(db, project_id, user)
    result = await db.execute(
        select(BOMItem).where(BOMItem.project_id == project_id)
    )
    return result.scalars().all()


@router.post("/", response_model=BOMItemRead, status_code=status.HTTP_201_CREATED)
async def create_bom_item(
    data: BOMItemCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    await _verify_project_owner(db, data.project_id, user)
    item = BOMItem(**data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=BOMItemRead)
async def update_bom_item(
    item_id: UUID,
    data: BOMItemUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    item = await db.get(BOMItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="BOM item not found")
    await _verify_project_owner(db, item.project_id, user)

    old_status = item.status
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    if "status" in data.model_dump(exclude_unset=True) and item.status != old_status:
        await propagate_bom_status_change(db, item_id, item.status)

    await db.flush()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bom_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    item = await db.get(BOMItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="BOM item not found")
    await _verify_project_owner(db, item.project_id, user)
    await db.delete(item)
