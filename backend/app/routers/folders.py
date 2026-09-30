from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import access
from app.database import get_db
from app.models import Board, Document, Folder, User
from app.routers.auth import get_current_user
from app.schemas import FolderCreate, FolderRead, FolderUpdate

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("", response_model=list[FolderRead])
async def list_folders(workspace_id: int, db: AsyncSession = Depends(get_db),
                       kind: str = "board",
                       user: User = Depends(get_current_user)):
    await access.require_member(db, workspace_id, user)
    if kind not in {"board", "document"}:
        raise HTTPException(status_code=422, detail="Неизвестный тип папки")
    result = await db.execute(select(Folder).where(Folder.workspace_id == workspace_id, Folder.kind == kind)
                              .order_by(Folder.created_at, Folder.id))
    return list(result.scalars().all())


@router.post("", response_model=FolderRead, status_code=status.HTTP_201_CREATED)
async def create_folder(data: FolderCreate, db: AsyncSession = Depends(get_db),
                        user: User = Depends(get_current_user)):
    await access.require_manager(db, data.workspace_id, user)
    await access.validate_folder(db, data.parent_id, data.workspace_id, data.kind)
    folder = Folder(workspace_id=data.workspace_id, kind=data.kind, parent_id=data.parent_id, title=data.title.strip())
    if not folder.title:
        raise HTTPException(status_code=422, detail="Название не может быть пустым")
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


@router.patch("/{folder_id}", response_model=FolderRead)
async def update_folder(folder_id: UUID, data: FolderUpdate, db: AsyncSession = Depends(get_db),
                        user: User = Depends(get_current_user)):
    folder = await db.get(Folder, folder_id)
    if folder is None:
        raise HTTPException(status_code=404, detail="Папка не найдена")
    await access.require_manager(db, folder.workspace_id, user)
    changes = data.model_dump(exclude_unset=True)
    if "title" in changes:
        title = (changes["title"] or "").strip()
        if not title:
            raise HTTPException(status_code=422, detail="Название не может быть пустым")
        folder.title = title
    if "parent_id" in changes:
        parent = await access.validate_folder(db, changes["parent_id"], folder.workspace_id, folder.kind)
        seen = {folder.id}
        while parent is not None:
            if parent.id in seen:
                raise HTTPException(status_code=400, detail="Нельзя переместить папку в себя")
            seen.add(parent.id)
            parent = await access.validate_folder(db, parent.parent_id, folder.workspace_id, folder.kind)
        folder.parent_id = changes["parent_id"]
    await db.commit()
    await db.refresh(folder)
    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(folder_id: UUID, db: AsyncSession = Depends(get_db),
                        user: User = Depends(get_current_user)):
    folder = await db.get(Folder, folder_id)
    if folder is None:
        raise HTTPException(status_code=404, detail="Папка не найдена")
    await access.require_manager(db, folder.workspace_id, user)
    linked_models = [(Folder, Folder.parent_id)]
    linked_models.append((Board, Board.folder_id) if folder.kind == "board" else (Document, Document.folder_id))
    for model, field in linked_models:
        found = await db.scalar(select(model.id).where(field == folder.id).limit(1))
        if found is not None:
            raise HTTPException(status_code=400, detail="Папка не пуста")
    await db.delete(folder)
    await db.commit()
