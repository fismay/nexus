"""Друзья: приглашения и мэтчинг расписания."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import friendship as friendship_crud
from app.crud import user as user_crud
from app.crud import task as task_crud
from app.database import get_db
from app.dependencies import get_current_user
from app.models.enums import FriendshipStatus
from app.models.user import User
from app.schemas.friends import (
    FriendInviteBody,
    FriendUserBrief,
    FreeSlot,
    MatchScheduleResponse,
    PendingInvitationOut,
)
from app.schemas.user import TAG_PATTERN
from app.services.schedule_slots import free_slots_both_users

router = APIRouter()


def _normalize_tag(v: str) -> str:
    t = v.strip()
    if t.startswith("@"):
        t = t[1:]
    if not TAG_PATTERN.match(t):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ник: 3–32 символа, латиница, цифры, подчёркивание (как при регистрации)",
        )
    return f"@{t}"


def _brief(u: User) -> FriendUserBrief:
    return FriendUserBrief(id=u.id, tag=u.tag, display_name=u.display_name)


@router.get("/friends", response_model=list[FriendUserBrief])
async def list_friends(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[FriendUserBrief]:
    rows = await friendship_crud.list_accepted_friends(db, current.id)
    out: list[FriendUserBrief] = []
    for fs in rows:
        other = friendship_crud.other_user_obj(fs, current.id)
        out.append(_brief(other))
    return out


@router.get("/friends/invitations", response_model=list[PendingInvitationOut])
async def list_invitations(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[PendingInvitationOut]:
    rows = await friendship_crud.list_pending_invitations(db, current.id)
    out: list[PendingInvitationOut] = []
    for fs in rows:
        other = friendship_crud.other_user_obj(fs, current.id)
        inv = fs.inviter_id
        if inv is None:
            incoming = True
        else:
            incoming = inv != current.id
        out.append(
            PendingInvitationOut(
                id=fs.id,
                other=_brief(other),
                incoming=incoming,
            ),
        )
    return out


@router.post("/friends/invitations", response_model=PendingInvitationOut, status_code=status.HTTP_201_CREATED)
async def send_invitation(
    body: FriendInviteBody,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> PendingInvitationOut:
    tag = _normalize_tag(body.username)
    target = await user_crud.get_by_tag(db, tag)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь с таким ником не найден")
    if target.id == current.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя пригласить себя")

    fs = await friendship_crud.get_friendship_by_pair(db, current.id, target.id)
    if fs is None:
        fs = await friendship_crud.create_invitation(db, current.id, target.id)
        other = friendship_crud.other_user_obj(fs, current.id)
        return PendingInvitationOut(
            id=fs.id,
            other=_brief(other),
            incoming=False,
        )

    if fs.status == FriendshipStatus.accepted:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Вы уже в друзьях")
    if fs.status == FriendshipStatus.pending:
        if fs.inviter_id == current.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Приглашение уже отправлено")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Этот пользователь уже прислал вам приглашение — примите его ниже",
        )
    if fs.status == FriendshipStatus.rejected:
        fs.status = FriendshipStatus.pending
        fs.inviter_id = current.id
        await db.flush()
        other = friendship_crud.other_user_obj(fs, current.id)
        return PendingInvitationOut(id=fs.id, other=_brief(other), incoming=False)
    if fs.status == FriendshipStatus.blocked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нельзя отправить приглашение")

    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="неподдерживаемый статус дружбы")


@router.post("/friends/invitations/{friendship_id}/accept", response_model=FriendUserBrief)
async def accept_invitation(
    friendship_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> FriendUserBrief:
    fs = await friendship_crud.get_friendship_by_id(db, friendship_id)
    if fs is None or fs.status != FriendshipStatus.pending:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Приглашение не найдено")
    if current.id not in (fs.user_id_1, fs.user_id_2):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нет доступа")
    if fs.inviter_id is not None and fs.inviter_id == current.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя принять собственное приглашение")

    fs.status = FriendshipStatus.accepted
    fs.inviter_id = None
    await db.flush()
    other = friendship_crud.other_user_obj(fs, current.id)
    return _brief(other)


@router.post("/friends/invitations/{friendship_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_invitation(
    friendship_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    fs = await friendship_crud.get_friendship_by_id(db, friendship_id)
    if fs is None or fs.status != FriendshipStatus.pending:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Приглашение не найдено")
    if current.id not in (fs.user_id_1, fs.user_id_2):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нет доступа")

    fs.status = FriendshipStatus.rejected
    fs.inviter_id = None
    await db.flush()


@router.get("/friends/{friend_id}/match-schedule", response_model=MatchScheduleResponse)
async def match_schedule_with_friend(
    friend_id: uuid.UUID,
    date: date = Query(..., description="День в формате YYYY-MM-DD (границы суток — UTC)"),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> MatchScheduleResponse:
    if friend_id == current.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Укажите друга, не себя")

    fs = await friendship_crud.get_accepted_friendship(db, current.id, friend_id)
    if fs is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Принятой дружбы с этим пользователем нет",
        )

    tasks_me = await task_crud.list_tasks_in_date_range(db, current.id, date, date)
    tasks_friend = await task_crud.list_tasks_in_date_range(db, friend_id, date, date)
    slots = free_slots_both_users(tasks_me, tasks_friend, date)

    return MatchScheduleResponse(
        date=date,
        friend_id=friend_id,
        free_slots=[FreeSlot(start=s, end=e) for s, e in slots],
    )
