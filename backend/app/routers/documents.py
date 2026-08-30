from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import access, crud
from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.schemas import DocumentCreate, DocumentRead, DocumentUpdate, DocumentVersionCreate

router = APIRouter(prefix="/documents", tags=["documents"])


async def get_accessible_document(document_id: int, db: AsyncSession, user: User):
    document = await crud.get_document(db, document_id)
    await access.require_document_access(db, document, user)
    return document


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    data: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await access.require_member(db, data.workspace_id, user)
    document = await crud.create_document(db, data.title, user.id, data.workspace_id)
    await crud.log_activity(db, data.workspace_id, user.id, "document.create", "document", document.id, document.title)
    return document


@router.get("", response_model=list[DocumentRead])
async def get_documents(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await access.require_member(db, workspace_id, user)
    return await crud.get_documents(db, workspace_id)


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_accessible_document(document_id, db, user)


@router.patch("/{document_id}", response_model=DocumentRead)
async def update_document(
    document_id: int,
    data: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document = await get_accessible_document(document_id, db, user)
    return await crud.update_document(db, document, data)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document = await get_accessible_document(document_id, db, user)
    await access.require_manager(db, document.workspace_id, user)
    workspace_id = document.workspace_id
    title = document.title
    await crud.delete_document(db, document)
    await crud.log_activity(db, workspace_id, user.id, "document.delete", "document", document_id, title)


@router.post("/{document_id}/versions", response_model=DocumentRead)
async def save_document_version(
    document_id: int,
    data: DocumentVersionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document = await get_accessible_document(document_id, db, user)
    saved = await crud.save_document_version(db, document, data.title, data.content, user.id)
    await crud.log_activity(db, document.workspace_id, user.id, "document.version", "document", document.id, data.title)
    return saved


@router.post("/{document_id}/restore/{version_id}", response_model=DocumentRead)
async def restore_document_version(
    document_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document = await get_accessible_document(document_id, db, user)
    restored = await crud.restore_document_version(db, document, version_id)
    if restored is None:
        raise HTTPException(status_code=404, detail="Версия не найдена")
    await crud.log_activity(db, document.workspace_id, user.id, "document.restore", "document", document.id, restored.title)
    return restored
