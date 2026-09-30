from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app import crud
from app.models import Board, Document, Folder, User, WorkspaceMember


async def require_member(db: AsyncSession, workspace_id: int, user: User) -> WorkspaceMember:
    member = await crud.get_membership(db, workspace_id, user.id)
    if member is None:
        raise HTTPException(status_code=404, detail="Пространство не найдено")
    return member


async def require_owner(db: AsyncSession, workspace_id: int, user: User) -> WorkspaceMember:
    member = await require_member(db, workspace_id, user)
    if member.role != "owner":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    return member


async def require_manager(db: AsyncSession, workspace_id: int, user: User) -> WorkspaceMember:
    member = await require_member(db, workspace_id, user)
    if member.role not in {"owner", "admin"}:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    return member


async def require_board_access(db: AsyncSession, board: Board | None, user: User) -> WorkspaceMember:
    if board is None:
        raise HTTPException(status_code=404, detail="Доска не найдена")
    return await require_member(db, board.workspace_id, user)


async def require_document_access(
    db: AsyncSession, document: Document | None, user: User
) -> WorkspaceMember:
    if document is None:
        raise HTTPException(status_code=404, detail="Документ не найден")
    return await require_member(db, document.workspace_id, user)


async def validate_folder(
    db: AsyncSession, folder_id: UUID | None, workspace_id: int,
    kind: str | None = None,
) -> Folder | None:
    if folder_id is None:
        return None
    folder = await db.get(Folder, folder_id)
    if folder is None or folder.workspace_id != workspace_id or (kind is not None and folder.kind != kind):
        raise HTTPException(status_code=404, detail="Папка не найдена")
    return folder


async def task_view_user(db: AsyncSession, workspace_id: int, user: User,
                         assignee_id: int | None, all_tasks: bool) -> int | None:
    member = await require_member(db, workspace_id, user)
    if member.role == "member":
        if all_tasks or (assignee_id is not None and assignee_id != user.id):
            raise HTTPException(status_code=403, detail="Недостаточно прав")
        return user.id
    if all_tasks:
        return None
    selected = assignee_id if assignee_id is not None else user.id
    if await crud.get_membership(db, workspace_id, selected) is None:
        raise HTTPException(status_code=404, detail="Участник не найден")
    return selected
