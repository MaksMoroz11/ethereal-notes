from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.database import get_db
from app.models import Notification, Task, User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


async def notification_read(db, item, user):
    member = await crud.get_membership(db, item.workspace_id, user.id) if item.workspace_id else None
    accessible = member is not None
    board_id = None
    if accessible and item.kind.startswith("task."):
        task = await db.get(Task, UUID(item.entity_id)) if item.entity_id else None
        board = await crud.get_board(db, task.board_id) if task else None
        accessible = bool(task and board and board.workspace_id == item.workspace_id
                          and (member.role != "member" or task.assignee_id == user.id))
        if accessible:
            board_id = task.board_id
    return {"id": item.id, "kind": item.kind, "title": item.title if accessible else "Объект больше недоступен",
            "workspace_id": item.workspace_id if accessible else None,
            "entity_id": item.entity_id if accessible else None, "board_id": board_id,
            "accessible": accessible, "created_at": item.created_at, "read_at": item.read_at}


@router.get("")
async def list_notifications(before: int | None = None, limit: int = Query(30, ge=1, le=100),
                             db: AsyncSession = Depends(get_db, scope="function"), user: User = Depends(get_current_user)):
    query = select(Notification).where(Notification.recipient_id == user.id)
    if before is not None:
        query = query.where(Notification.id < before)
    items = list(await db.scalars(query.order_by(Notification.id.desc()).limit(limit + 1)))
    unread = await db.scalar(select(func.count()).select_from(Notification).where(
        Notification.recipient_id == user.id, Notification.read_at.is_(None)))
    return {"items": [await notification_read(db, item, user) for item in items[:limit]],
            "unread_count": unread, "next_cursor": items[limit - 1].id if len(items) > limit else None}


@router.post("/read-all", status_code=204)
async def read_all(db: AsyncSession = Depends(get_db, scope="function"), user: User = Depends(get_current_user)):
    await db.execute(update(Notification).where(Notification.recipient_id == user.id,
                     Notification.read_at.is_(None)).values(read_at=datetime.utcnow()))


@router.post("/{notification_id}/read", status_code=204)
async def read_one(notification_id: int, db: AsyncSession = Depends(get_db, scope="function"), user: User = Depends(get_current_user)):
    await db.execute(update(Notification).where(Notification.id == notification_id,
        Notification.recipient_id == user.id, Notification.read_at.is_(None)).values(read_at=datetime.utcnow()))
