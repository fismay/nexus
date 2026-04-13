from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.bom_item import BOMItem
from app.schemas.bom_item import BOMItemCreate, BOMItemUpdate
from app.schemas.project import BOMItemRead
from app.services.hardware_blockers import propagate_bom_status_change

router = APIRouter(prefix="/bom-items", tags=["bom"])


@router.get("/by-project/{project_id}", response_model=list[BOMItemRead])
async def list_bom_items(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BOMItem).where(BOMItem.project_id == project_id)
    )
    return result.scalars().all()


@router.post("/", response_model=BOMItemRead, status_code=status.HTTP_201_CREATED)
async def create_bom_item(data: BOMItemCreate, db: AsyncSession = Depends(get_db)):
    item = BOMItem(**data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=BOMItemRead)
async def update_bom_item(
    item_id: UUID, data: BOMItemUpdate, db: AsyncSession = Depends(get_db)
):
    item = await db.get(BOMItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="BOM item not found")

    old_status = item.status
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    # Фича 3: если статус BOM-детали изменился — каскад на заблокированные задачи
    if "status" in data.model_dump(exclude_unset=True) and item.status != old_status:
        affected = await propagate_bom_status_change(db, item_id, item.status)
        # affected — количество задач, чей статус обновлён

    await db.flush()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bom_item(item_id: UUID, db: AsyncSession = Depends(get_db)):
    item = await db.get(BOMItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="BOM item not found")
    await db.delete(item)
