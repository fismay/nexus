from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.prompt import Prompt
from app.schemas.prompt import PromptCreate, PromptUpdate, PromptRead

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("/", response_model=list[PromptRead])
async def list_prompts(
    project_id: UUID | None = Query(None),
    ai_model: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Prompt).order_by(Prompt.created_at.desc())
    if project_id:
        query = query.where(Prompt.project_id == project_id)
    if ai_model:
        query = query.where(Prompt.ai_model == ai_model)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=PromptRead, status_code=status.HTTP_201_CREATED)
async def create_prompt(data: PromptCreate, db: AsyncSession = Depends(get_db)):
    prompt = Prompt(**data.model_dump())
    db.add(prompt)
    await db.flush()
    await db.refresh(prompt)
    return prompt


@router.patch("/{prompt_id}", response_model=PromptRead)
async def update_prompt(
    prompt_id: UUID, data: PromptUpdate, db: AsyncSession = Depends(get_db)
):
    prompt = await db.get(Prompt, prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(prompt, field, value)
    await db.flush()
    await db.refresh(prompt)
    return prompt


@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt(prompt_id: UUID, db: AsyncSession = Depends(get_db)):
    prompt = await db.get(Prompt, prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    await db.delete(prompt)
