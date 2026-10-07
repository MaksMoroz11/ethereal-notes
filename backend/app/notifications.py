from sqlalchemy import select

from app.models import Notification, WorkspaceMember


async def notify(db, workspace_id, actor_id, kind, recipients, title, entity_id=None):
    for recipient_id in set(recipients) - {actor_id, None}:
        db.add(Notification(recipient_id=recipient_id, workspace_id=workspace_id,
                            kind=kind, title=title, entity_id=str(entity_id) if entity_id is not None else None))


async def managers(db, workspace_id):
    result = await db.scalars(select(WorkspaceMember.user_id).where(
        WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.role.in_(["owner", "admin"])))
    return list(result)
