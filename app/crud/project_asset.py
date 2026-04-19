import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project_asset import ProjectAsset
from app.schemas.project_asset import ProjectAssetCreate, ProjectAssetUpdate


async def list_for_project(session: AsyncSession, project_id: uuid.UUID) -> list[ProjectAsset]:
    q = select(ProjectAsset).where(ProjectAsset.project_id == project_id).order_by(ProjectAsset.title)
    result = await session.execute(q)
    return list(result.scalars().all())


async def get_asset(session: AsyncSession, asset_id: uuid.UUID, project_id: uuid.UUID) -> ProjectAsset | None:
    result = await session.execute(
        select(ProjectAsset).where(ProjectAsset.id == asset_id, ProjectAsset.project_id == project_id),
    )
    return result.scalar_one_or_none()


async def create_asset(session: AsyncSession, project_id: uuid.UUID, data: ProjectAssetCreate) -> ProjectAsset:
    a = ProjectAsset(
        project_id=project_id,
        kind=data.kind,
        title=data.title.strip(),
        body=data.body.strip(),
    )
    session.add(a)
    await session.flush()
    await session.refresh(a)
    return a


async def update_asset(session: AsyncSession, asset: ProjectAsset, data: ProjectAssetUpdate) -> ProjectAsset:
    payload = data.model_dump(exclude_unset=True)
    for k, v in payload.items():
        if isinstance(v, str):
            v = v.strip()
        setattr(asset, k, v)
    await session.flush()
    await session.refresh(asset)
    return asset


async def delete_asset(session: AsyncSession, asset: ProjectAsset) -> None:
    await session.delete(asset)
