from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.project import Project
from app.models.task import Task
from app.models.bom_item import BOMItem

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/")
async def get_dependency_graph(db: AsyncSession = Depends(get_db)):
    """
    Returns a node+edge graph for React Flow.
    Nodes: Projects, Tasks, BOM items.
    Edges: project→task, task→blocker_bom_item.
    """
    projects = (await db.execute(select(Project))).scalars().all()
    tasks = (await db.execute(select(Task))).scalars().all()
    bom_items = (await db.execute(select(BOMItem))).scalars().all()

    nodes = []
    edges = []

    for p in projects:
        nodes.append({
            "id": f"project-{p.id}",
            "type": "project",
            "data": {
                "label": p.title,
                "status": p.status,
                "project_type": p.project_type,
            },
            "position": {"x": 0, "y": 0},
        })

    for t in tasks:
        is_blocked = t.status == "blocked"
        nodes.append({
            "id": f"task-{t.id}",
            "type": "task",
            "data": {
                "label": t.title,
                "status": t.status,
                "priority": t.priority,
                "is_blocked": is_blocked,
            },
            "position": {"x": 0, "y": 0},
        })
        if t.project_id:
            edges.append({
                "id": f"e-proj-{t.project_id}-task-{t.id}",
                "source": f"project-{t.project_id}",
                "target": f"task-{t.id}",
                "type": "default",
                "animated": False,
            })
        if t.blocker_bom_item_id:
            edges.append({
                "id": f"e-task-{t.id}-bom-{t.blocker_bom_item_id}",
                "source": f"bom-{t.blocker_bom_item_id}",
                "target": f"task-{t.id}",
                "type": "default",
                "animated": is_blocked,
                "style": {"stroke": "#ef4444"} if is_blocked else {},
                "label": "blocks" if is_blocked else "linked",
            })

    for b in bom_items:
        nodes.append({
            "id": f"bom-{b.id}",
            "type": "bom",
            "data": {
                "label": b.item_name,
                "status": b.status,
                "price": b.price,
            },
            "position": {"x": 0, "y": 0},
        })
        if b.project_id:
            edges.append({
                "id": f"e-proj-{b.project_id}-bom-{b.id}",
                "source": f"project-{b.project_id}",
                "target": f"bom-{b.id}",
                "type": "default",
            })

    return {"nodes": nodes, "edges": edges}
