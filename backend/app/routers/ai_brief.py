import httpx
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.task import Task
from app.models.project import Project
from app.models.bom_item import BOMItem
from app.models.user import User
from app.services.auth import require_user

router = APIRouter(prefix="/ai-brief", tags=["ai-brief"])

STALE_DAYS = 14


@router.get("/")
async def get_ai_brief(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    """
    Analyzes projects, tasks, and BOM for stalled items.
    Returns structured insights (no LLM required for basic analysis).
    If Ollama is available, also returns an AI-generated summary.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=STALE_DAYS)
    insights: list[dict] = []

    # Stalled tasks: not completed, not updated in 14 days
    stale_tasks = (await db.execute(
        select(Task).where(
            Task.owner_id == user.id,
            Task.is_completed == False,  # noqa: E712
            Task.updated_at < cutoff,
        ).limit(10)
    )).scalars().all()

    for t in stale_tasks:
        days = (datetime.now(timezone.utc) - t.updated_at.replace(tzinfo=timezone.utc)).days
        insights.append({
            "type": "stale_task",
            "severity": "warning",
            "title": f"Задача «{t.title}» не обновлялась {days} дней",
            "suggestion": "Запланируйте 1-2 часа на эту задачу в ближайшие дни.",
            "entity_id": str(t.id),
            "entity_type": "task",
        })

    # Received BOM items not linked to any active task
    received_bom = (await db.execute(
        select(BOMItem).where(BOMItem.status == "received")
    )).scalars().all()

    active_blocker_ids = set()
    if received_bom:
        active_tasks = (await db.execute(
            select(Task.blocker_bom_item_id).where(
                Task.blocker_bom_item_id.isnot(None),
                Task.is_completed == False,  # noqa: E712
            )
        )).scalars().all()
        active_blocker_ids = set(active_tasks)

    for b in received_bom:
        if b.id not in active_blocker_ids:
            insights.append({
                "type": "unused_bom",
                "severity": "info",
                "title": f"Деталь «{b.item_name}» получена, но не используется",
                "suggestion": "Создайте задачу для сборки/интеграции этой детали.",
                "entity_id": str(b.id),
                "entity_type": "bom",
            })

    # Projects with no recent activity
    stale_projects = (await db.execute(
        select(Project).where(
            Project.owner_id == user.id,
            Project.status.in_(["planning", "active"]),
            Project.updated_at < cutoff,
        ).limit(5)
    )).scalars().all()

    for p in stale_projects:
        days = (datetime.now(timezone.utc) - p.updated_at.replace(tzinfo=timezone.utc)).days
        insights.append({
            "type": "stale_project",
            "severity": "warning",
            "title": f"Проект «{p.title}» простаивает {days} дней",
            "suggestion": "Запланируйте рабочий блок на выходных.",
            "entity_id": str(p.id),
            "entity_type": "project",
        })

    # Try Ollama for a natural language summary
    ai_summary = None
    if insights:
        try:
            prompt = "Ты — AI-помощник планера Nexus. Кратко (3-5 предложений на русском) резюмируй:\n"
            for ins in insights[:6]:
                prompt += f"- {ins['title']}\n"
            prompt += "\nДай краткие рекомендации что делать в первую очередь."

            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{settings.ollama_base_url}/api/generate",
                    json={"model": settings.ollama_model, "prompt": prompt, "stream": False},
                )
                if resp.status_code == 200:
                    ai_summary = resp.json().get("response", "")
        except Exception:
            pass

    return {
        "insights": insights,
        "total": len(insights),
        "ai_summary": ai_summary,
    }
