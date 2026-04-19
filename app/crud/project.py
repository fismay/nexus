import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


async def list_owned(session: AsyncSession, user_id: uuid.UUID) -> list[Project]:
    q = select(Project).where(Project.user_id == user_id).order_by(Project.name)
    result = await session.execute(q)
    return list(result.scalars().all())


async def get_owned_project(session: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> Project | None:
    result = await session.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == user_id)
        .options(selectinload(Project.assets)),
    )
    return result.scalar_one_or_none()


async def create_project(session: AsyncSession, user_id: uuid.UUID, data: ProjectCreate) -> Project:
    p = Project(
        user_id=user_id,
        name=data.name.strip(),
        description=data.description.strip() if data.description else None,
        category=data.category,
    )
    session.add(p)
    await session.flush()
    await session.refresh(p)
    return p


async def update_project(session: AsyncSession, project: Project, data: ProjectUpdate) -> Project:
    payload = data.model_dump(exclude_unset=True)
    for k, v in payload.items():
        if k == "name" and isinstance(v, str):
            v = v.strip()
        elif k == "description" and isinstance(v, str):
            v = v.strip()
        setattr(project, k, v)
    await session.flush()
    await session.refresh(project)
    return project


async def delete_project(session: AsyncSession, project: Project) -> None:
    await session.delete(project)
