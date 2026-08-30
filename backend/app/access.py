from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.models import Board, Document, User, WorkspaceMember


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
