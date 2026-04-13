import uuid
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, get_session
from app.models.chat_message import ChatMessage
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas.chat import (
    ChatMessageCreate, ChatMessageRead,
    ProjectMemberCreate, ProjectMemberRead,
)
from app.services.auth import require_user

router = APIRouter(tags=["chat"])


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, room: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(room, []).append(ws)

    def disconnect(self, room: str, ws: WebSocket):
        if room in self.rooms:
            self.rooms[room] = [w for w in self.rooms[room] if w is not ws]

    async def broadcast(self, room: str, data: dict):
        for ws in self.rooms.get(room, []):
            try:
                await ws.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()


@router.websocket("/ws/chat/{room_id}")
async def chat_websocket(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            sender_id = data.get("sender_id", "")
            content = data.get("content", "")
            sender_username = data.get("sender_username", "")

            if not content.strip():
                continue

            async with get_session() as session:
                project_id = None
                task_id = None
                try:
                    uuid.UUID(room_id)
                    project_id = room_id
                except ValueError:
                    if room_id.startswith("task-"):
                        task_id = room_id[5:]

                msg = ChatMessage(
                    sender_id=uuid.UUID(sender_id) if sender_id else uuid.uuid4(),
                    project_id=uuid.UUID(project_id) if project_id else None,
                    task_id=uuid.UUID(task_id) if task_id else None,
                    content=content,
                )
                session.add(msg)
                await session.commit()
                await session.refresh(msg)

                await manager.broadcast(room_id, {
                    "id": str(msg.id),
                    "sender_id": sender_id,
                    "sender_username": sender_username,
                    "content": content,
                    "created_at": msg.created_at.isoformat(),
                })
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)


@router.get("/api/chat/{room_id}", response_model=list[ChatMessageRead])
async def get_messages(
    room_id: str,
    limit: int = Query(50, le=200),
    session: AsyncSession = Depends(get_db),
):
    project_id = None
    task_id = None
    try:
        uuid.UUID(room_id)
        project_id = room_id
    except ValueError:
        if room_id.startswith("task-"):
            task_id = room_id[5:]

    q = select(ChatMessage).order_by(ChatMessage.created_at.desc()).limit(limit)
    if project_id:
        q = q.where(ChatMessage.project_id == uuid.UUID(project_id))
    elif task_id:
        q = q.where(ChatMessage.task_id == uuid.UUID(task_id))

    result = await session.execute(q)
    msgs = result.scalars().all()
    return [
        ChatMessageRead(
            id=str(m.id),
            sender_id=str(m.sender_id),
            sender_username=m.sender.username if m.sender else None,
            project_id=str(m.project_id) if m.project_id else None,
            task_id=str(m.task_id) if m.task_id else None,
            content=m.content,
            created_at=m.created_at,
        )
        for m in reversed(list(msgs))
    ]


@router.post("/api/projects/{project_id}/members", response_model=ProjectMemberRead)
async def add_member(
    project_id: str,
    body: ProjectMemberCreate,
    session: AsyncSession = Depends(get_db),
    user: dict = Depends(require_user),
):
    member = ProjectMember(
        project_id=uuid.UUID(project_id),
        user_id=uuid.UUID(body.user_id),
        role=body.role,
    )
    session.add(member)
    await session.commit()
    await session.refresh(member)
    u = await session.get(User, member.user_id)
    return ProjectMemberRead(
        id=str(member.id),
        project_id=str(member.project_id),
        user_id=str(member.user_id),
        username=u.username if u else None,
        role=member.role,
        created_at=member.created_at,
    )


@router.get("/api/projects/{project_id}/members", response_model=list[ProjectMemberRead])
async def list_members(
    project_id: str,
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == uuid.UUID(project_id)
        )
    )
    members = result.scalars().all()
    return [
        ProjectMemberRead(
            id=str(m.id),
            project_id=str(m.project_id),
            user_id=str(m.user_id),
            username=m.user.username if m.user else None,
            role=m.role,
            created_at=m.created_at,
        )
        for m in members
    ]
