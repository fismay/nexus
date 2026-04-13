from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.project_phase import ProjectPhase
from app.schemas.phase import PhaseCreate, PhaseUpdate
from app.schemas.project import PhaseRead

router = APIRouter(prefix="/phases", tags=["phases"])


@router.get("/by-project/{project_id}", response_model=list[PhaseRead])
async def list_phases(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ProjectPhase)
        .where(ProjectPhase.project_id == project_id)
        .order_by(ProjectPhase.sort_order)
    )
    return result.scalars().all()


@router.post("/", response_model=PhaseRead, status_code=status.HTTP_201_CREATED)
async def create_phase(data: PhaseCreate, db: AsyncSession = Depends(get_db)):
    phase = ProjectPhase(**data.model_dump())
    db.add(phase)
    await db.flush()
    await db.refresh(phase)
    return phase


@router.patch("/{phase_id}", response_model=PhaseRead)
async def update_phase(
    phase_id: UUID, data: PhaseUpdate, db: AsyncSession = Depends(get_db)
):
    phase = await db.get(ProjectPhase, phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(phase, field, value)
    await db.flush()
    await db.refresh(phase)
    return phase


@router.delete("/{phase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_phase(phase_id: UUID, db: AsyncSession = Depends(get_db)):
    phase = await db.get(ProjectPhase, phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    await db.delete(phase)
