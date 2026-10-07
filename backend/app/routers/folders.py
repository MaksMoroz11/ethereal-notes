from app.errors import fail
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import access, crud
from app.database import get_db
from app.models import ActivityLog, Board, BoardColumn, Document, DocumentVersion, Folder, Task, User
from app.routers.auth import get_current_user
from app.schemas import FolderCreate, FolderRead, FolderUpdate

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("/{folder_id}", response_model=FolderRead)
async def get_folder(folder_id: UUID, db: AsyncSession = Depends(get_db, scope="function"), user: User = Depends(get_current_user)):
    folder = await db.get(Folder, folder_id)
    if folder is None:
        fail(404, "folder_not_found")
    await access.require_member(db, folder.workspace_id, user)
    return folder


@router.get("", response_model=list[FolderRead])
async def list_folders(workspace_id: int, db: AsyncSession = Depends(get_db, scope="function"),
                       kind: str = "board",
                       user: User = Depends(get_current_user)):
    await access.require_member(db, workspace_id, user)
    if kind not in {"board", "document"}:
        fail(422, "folder_kind_invalid")
    result = await db.execute(select(Folder).where(Folder.workspace_id == workspace_id, Folder.kind == kind)
                              .order_by(Folder.created_at, Folder.id))
    return list(result.scalars().all())


@router.post("", response_model=FolderRead, status_code=status.HTTP_201_CREATED)
async def create_folder(data: FolderCreate, db: AsyncSession = Depends(get_db, scope="function"),
                        user: User = Depends(get_current_user)):
    await access.require_manager(db, data.workspace_id, user)
    await access.validate_folder(db, data.parent_id, data.workspace_id, data.kind)
    folder = Folder(workspace_id=data.workspace_id, kind=data.kind, parent_id=data.parent_id, title=data.title.strip())
    if not folder.title:
        fail(422, "title_empty")
    db.add(folder)
    await db.flush()
    await db.refresh(folder)
    await crud.log_activity(db, folder.workspace_id, user.id, "folder.update", "folder", folder.id, folder.title)
    return folder


@router.patch("/{folder_id}", response_model=FolderRead)
async def update_folder(folder_id: UUID, data: FolderUpdate, db: AsyncSession = Depends(get_db, scope="function"),
                        user: User = Depends(get_current_user)):
    folder = await db.get(Folder, folder_id)
    if folder is None:
        fail(404, "folder_not_found")
    await access.require_manager(db, folder.workspace_id, user)
    changes = data.model_dump(exclude_unset=True)
    if "title" in changes:
        title = (changes["title"] or "").strip()
        if not title:
            fail(422, "title_empty")
        folder.title = title
    if "parent_id" in changes:
        parent = await access.validate_folder(db, changes["parent_id"], folder.workspace_id, folder.kind)
        seen = {folder.id}
        while parent is not None:
            if parent.id in seen:
                fail(400, "folder_cycle")
            seen.add(parent.id)
            parent = await access.validate_folder(db, parent.parent_id, folder.workspace_id, folder.kind)
        folder.parent_id = changes["parent_id"]
    await db.flush()
    await db.refresh(folder)
    await crud.log_activity(db, folder.workspace_id, user.id, "folder.update", "folder", folder.id, folder.title)
    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(folder_id: UUID, db: AsyncSession = Depends(get_db, scope="function"),
                        user: User = Depends(get_current_user), recursive: bool = False):
    folder = await db.get(Folder, folder_id)
    if folder is None:
        fail(404, "folder_not_found")
    await access.require_manager(db, folder.workspace_id, user)
    linked_models = [(Folder, Folder.parent_id)]
    linked_models.append((Board, Board.folder_id) if folder.kind == "board" else (Document, Document.folder_id))
    if not recursive:
        for model, field in linked_models:
            found = await db.scalar(select(model.id).where(field == folder.id).limit(1))
            if found is not None:
                fail(400, "folder_not_empty")

    folders = list((await db.scalars(select(Folder).where(
        Folder.workspace_id == folder.workspace_id, Folder.kind == folder.kind))).all())
    levels = [[folder.id]]
    subtree = {folder.id}
    while children := [item.id for item in folders if item.parent_id in levels[-1] and item.id not in subtree]:
        levels.append(children)
        subtree.update(children)

    if folder.kind == "board":
        board_ids = select(Board.id).where(Board.folder_id.in_(subtree), Board.workspace_id == folder.workspace_id)
        await db.execute(delete(Task).where(Task.board_id.in_(board_ids)))
        await db.execute(delete(BoardColumn).where(BoardColumn.board_id.in_(board_ids)))
        await db.execute(delete(Board).where(Board.id.in_(board_ids)))
    else:
        document_ids = select(Document.id).where(Document.folder_id.in_(subtree), Document.workspace_id == folder.workspace_id)
        await db.execute(delete(DocumentVersion).where(DocumentVersion.document_id.in_(document_ids)))
        await db.execute(delete(Document).where(Document.id.in_(document_ids)))
    db.add(ActivityLog(workspace_id=folder.workspace_id, user_id=user.id,
                       action="folder.delete", entity_type="folder", entity_id=str(folder.id), title=folder.title))
    for level in reversed(levels):
        await db.execute(delete(Folder).where(Folder.id.in_(level)))
    await db.flush()
