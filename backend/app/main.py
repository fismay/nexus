from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import projects, bom_items, phases, tasks, events, inbox, schedule, prompts, auth, friends, graph, ai_brief, geo

import app.models  # noqa: F401 — ensure all models are registered


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
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


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "nexus"}
