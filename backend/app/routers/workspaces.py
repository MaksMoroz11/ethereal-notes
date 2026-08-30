from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import access, crud
from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.schemas import (
    ActivityRead,
    MemberInvite,
    MemberRoleUpdate,
    WorkspaceCreate,
    WorkspaceMemberRead,
    WorkspaceRead,
    WorkspaceUpdate,
)

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _workspace_read(workspace, user_id: int) -> WorkspaceRead:
    role = next((item.role for item in workspace.members if item.user_id == user_id), "member")
    return WorkspaceRead(
        id=workspace.id,
        name=workspace.name,
        owner_id=workspace.owner_id,
        role=role,
        created_at=workspace.created_at,
    )


def _member_read(member) -> WorkspaceMemberRead:
    return WorkspaceMemberRead(
        user_id=member.user_id,
        login=member.user.login if member.user is not None else "",
        role=member.role,
        created_at=member.created_at,
    )


@router.get("", response_model=list[WorkspaceRead])
async def get_workspaces(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    workspaces = await crud.get_workspaces(db, user.id)
    return [_workspace_read(item, user.id) for item in workspaces]


@router.post("", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    workspace = await crud.create_workspace(db, data.name.strip(), user.id)
    await crud.log_activity(db, workspace.id, user.id, "workspace.create", "workspace", workspace.id, workspace.name)
    return _workspace_read(workspace, user.id)


@router.patch("/{workspace_id}", response_model=WorkspaceRead)
async def update_workspace(
    workspace_id: int,
    data: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await access.require_owner(db, workspace_id, user)
    workspace = await crud.get_workspace(db, workspace_id)
    updated = await crud.update_workspace(db, workspace, data.name.strip())
    await crud.log_activity(db, workspace_id, user.id, "workspace.rename", "workspace", workspace_id, updated.name)
    return _workspace_read(updated, user.id)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await access.require_owner(db, workspace_id, user)
    workspaces = await crud.get_workspaces(db, user.id)
    owned = [item for item in workspaces if item.owner_id == user.id]
    if len(owned) <= 1:
        raise HTTPException(status_code=400, detail="Нельзя удалить единственное своё пространство")
    await crud.delete_workspace(db, workspace_id)


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberRead])
async def get_members(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await access.require_member(db, workspace_id, user)
    workspace = await crud.get_workspace(db, workspace_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Пространство не найдено")
    return [_member_read(item) for item in workspace.members]


@router.post("/{workspace_id}/members", response_model=WorkspaceMemberRead, status_code=status.HTTP_201_CREATED)
async def invite_member(
    workspace_id: int,
    data: MemberInvite,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await access.require_manager(db, workspace_id, user)
    invited = await crud.get_user_by_login(db, data.login)
    if invited is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    existing = await crud.get_membership(db, workspace_id, invited.id)
    if existing is not None:
        raise HTTPException(status_code=400, detail="Уже в пространстве")
    await crud.add_workspace_member(db, workspace_id, invited.id)
    await crud.log_activity(db, workspace_id, user.id, "member.invite", "member", invited.id, invited.login)
    workspace = await crud.get_workspace(db, workspace_id)
    found = next(item for item in workspace.members if item.user_id == invited.id)
    return _member_read(found)


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    workspace_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    actor = await access.require_manager(db, workspace_id, user)
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить себя")
    member = await crud.get_membership(db, workspace_id, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Участник не найден")
    if member.role == "owner" or (actor.role == "admin" and member.role != "member"):
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    kicked = await crud.get_user(db, user_id)
    title = kicked.login if kicked is not None else ""
    await crud.delete_workspace_member(db, member)
    await crud.log_activity(db, workspace_id, user.id, "member.kick", "member", user_id, title)


@router.patch("/{workspace_id}/members/{user_id}", response_model=WorkspaceMemberRead)
async def update_member_role(
    workspace_id: int,
    user_id: int,
    data: MemberRoleUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await access.require_owner(db, workspace_id, user)
    member = await crud.get_membership(db, workspace_id, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Участник не найден")
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="Нельзя изменить роль владельца")
    updated = await crud.update_workspace_member_role(db, member, data.role)
    changed = await crud.get_user(db, user_id)
    title = changed.login if changed is not None else ""
    await crud.log_activity(db, workspace_id, user.id, "member.role", "member", user_id, title)
    return WorkspaceMemberRead(
        user_id=updated.user_id,
        login=title,
        role=updated.role,
        created_at=updated.created_at,
    )


@router.get("/{workspace_id}/activity", response_model=list[ActivityRead])
async def get_activity(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await access.require_member(db, workspace_id, user)
    return await crud.get_activity(db, workspace_id)
