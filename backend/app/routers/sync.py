from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import access, crud
from app.database import get_db
from app.models import ActivityLog, Board, Document, Folder, Notification, User
from app.routers.auth import get_current_user
from app.routers.workspaces import _member_read, _workspace_read

router = APIRouter(tags=["sync"])


@router.get("/workspaces/{workspace_id}/sync")
async def sync(workspace_id: int, db: AsyncSession = Depends(get_db, scope="function"), user: User = Depends(get_current_user)):
    await access.require_member(db, workspace_id, user)
    workspace = await crud.get_workspace(db, workspace_id)
    result = {}
    for key, model in (("boards", Board), ("documents", Document), ("folders", Folder)):
        rows = (await db.execute(select(model.id, model.revision).where(model.workspace_id == workspace_id))).all()
        result[key] = [{"id": row.id, "revision": row.revision} for row in rows]
    result["members"] = [_member_read(item) for item in workspace.members]
    result["workspaces"] = [_workspace_read(item, user.id) for item in await crud.get_workspaces(db, user.id)]
    result["activity_revision"] = await db.scalar(select(func.max(ActivityLog.id)).where(ActivityLog.workspace_id == workspace_id)) or 0
    result["notification_revision"] = await db.scalar(select(func.max(Notification.id)).where(Notification.recipient_id == user.id)) or 0
    return result
