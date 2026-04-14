from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import projects, bom_items, phases, tasks, events, inbox, schedule, prompts, auth, friends, graph, ai_brief, geo, chat, ai_schedule

import app.models  # noqa: F401 — ensure all models are registered


async def _normalize_events_ical_uid_empty_strings(conn):
    """Старые клиенты могли сохранить ical_uid='' — ломает UNIQUE (owner_id, ical_uid)."""
    from sqlalchemy import text

    try:
        await conn.execute(text("UPDATE events SET ical_uid = NULL WHERE ical_uid = ''"))
    except Exception:
        pass


async def _safe_add_columns(conn):
    """Add new columns to existing tables without dropping data."""
    from sqlalchemy import text
    columns = [
        ("tasks", "scheduling_type", "VARCHAR(20) DEFAULT 'fluid'"),
        ("events", "scheduling_type", "VARCHAR(20) DEFAULT 'fixed'"),
        ("projects", "owner_id", "UUID REFERENCES users(id) ON DELETE SET NULL"),
        ("inbox_items", "owner_id", "UUID REFERENCES users(id) ON DELETE SET NULL"),
        ("prompts", "owner_id", "UUID REFERENCES users(id) ON DELETE SET NULL"),
    ]
    for table, col, coltype in columns:
        try:
            await conn.execute(text(
                f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {coltype}"
            ))
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _normalize_events_ical_uid_empty_strings(conn)
        await _safe_add_columns(conn)
    yield
    await engine.dispose()


app = FastAPI(
    title="Nexus",
    description="Personal engineering project & schedule management",
    version="0.5.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api")
app.include_router(bom_items.router, prefix="/api")
app.include_router(phases.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(inbox.router, prefix="/api")
app.include_router(schedule.router, prefix="/api")
app.include_router(prompts.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(friends.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(ai_brief.router, prefix="/api")
app.include_router(geo.router, prefix="/api")
app.include_router(chat.router)
app.include_router(ai_schedule.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "nexus"}
