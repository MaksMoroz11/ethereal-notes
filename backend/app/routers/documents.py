from fastapi import APIRouter, Depends, status
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app import access, crud
from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.schemas import DocumentCreate, DocumentRead, DocumentUpdate, DocumentVersionCreate, RevisionRequest

from app.errors import check_revision, fail
import asyncio
import json
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote
from typing import Literal
from fastapi.responses import Response

export_slots = asyncio.Semaphore(2)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/{document_id}/export")
async def export_document(document_id: UUID, format: Literal["pdf", "docx"],
                          db: AsyncSession = Depends(get_db, scope="function"), user: User = Depends(get_current_user)):
    document = await get_accessible_document(document_id, db, user)
    if len(document.content.encode("utf-8")) > 1_000_000:
        fail(413, "export_too_large")
    payload = json.dumps({"title": document.title, "content": document.content, "format": format}).encode()
    try:
        async with export_slots:
            result = await asyncio.to_thread(subprocess.run, [sys.executable, "-m", "app.export_worker"],
                input=payload, capture_output=True, timeout=30, cwd=Path(__file__).resolve().parents[2])
        if result.returncode:
            fail(503, "export_failed")
    except subprocess.TimeoutExpired:
        fail(503, "export_timeout")
    filename = "".join(char for char in document.title if char not in '/\\\r\n\0')[:100] or "document"
    mime = "application/pdf" if format == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return Response(result.stdout, media_type=mime, headers={"Cache-Control": "no-store",
        "Content-Disposition": f"attachment; filename=document.{format}; filename*=UTF-8''{quote(filename)}.{format}"})


async def get_accessible_document(document_id: UUID, db: AsyncSession, user: User):
    document = await crud.get_document(db, document_id)
    await access.require_document_access(db, document, user)
    return document


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    data: DocumentCreate,
    db: AsyncSession = Depends(get_db, scope="function"),
    user: User = Depends(get_current_user),
):
    await access.require_manager(db, data.workspace_id, user)
    await access.validate_folder(db, data.folder_id, data.workspace_id, "document")
    document = await crud.create_document(db, data.title, user.id, data.workspace_id, data.folder_id)
    await crud.log_activity(db, data.workspace_id, user.id, "document.create", "document", document.id, document.title)
    return document


@router.get("", response_model=list[DocumentRead])
async def get_documents(
    workspace_id: int,
    db: AsyncSession = Depends(get_db, scope="function"),
    user: User = Depends(get_current_user),
):
    await access.require_member(db, workspace_id, user)
    return await crud.get_documents(db, workspace_id)


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db, scope="function"),
    user: User = Depends(get_current_user),
):
    return await get_accessible_document(document_id, db, user)


@router.patch("/{document_id}", response_model=DocumentRead)
async def update_document(
    document_id: UUID,
    data: DocumentUpdate,
    db: AsyncSession = Depends(get_db, scope="function"),
    user: User = Depends(get_current_user),
):
    document = await get_accessible_document(document_id, db, user)
    await access.require_manager(db, document.workspace_id, user)
    check_revision(document, data.expected_revision)
    if "folder_id" in data.model_fields_set:
        await access.validate_folder(db, data.folder_id, document.workspace_id, "document")
    updated = await crud.update_document(db, document, data)
    await crud.log_activity(db, document.workspace_id, user.id, "document.update", "document", document.id, document.title)
    return updated


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db, scope="function"),
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
    document_id: UUID,
    data: DocumentVersionCreate,
    db: AsyncSession = Depends(get_db, scope="function"),
    user: User = Depends(get_current_user),
):
    document = await get_accessible_document(document_id, db, user)
    await access.require_manager(db, document.workspace_id, user)
    check_revision(document, data.expected_revision)
    changed = document.title != data.title or document.content != data.content
    saved = await crud.save_document_version(db, document, data.title, data.content, user.id)
    if changed:
        await crud.log_activity(db, document.workspace_id, user.id, "document.version", "document", document.id, data.title)
    return saved


@router.post("/{document_id}/restore/{version_id}", response_model=DocumentRead)
async def restore_document_version(
    document_id: UUID,
    version_id: int,
    data: RevisionRequest,
    db: AsyncSession = Depends(get_db, scope="function"),
    user: User = Depends(get_current_user),
):
    document = await get_accessible_document(document_id, db, user)
    await access.require_manager(db, document.workspace_id, user)
    check_revision(document, data.expected_revision)
    restored = await crud.restore_document_version(db, document, version_id)
    if restored is None:
        fail(404, "version_not_found")
    await crud.log_activity(db, document.workspace_id, user.id, "document.restore", "document", document.id, restored.title)
    return restored
