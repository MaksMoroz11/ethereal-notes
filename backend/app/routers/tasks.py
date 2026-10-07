from fastapi import APIRouter, Depends, status
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app import access, crud
from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.schemas import TaskCreate, TaskRead, TaskUpdate, TaskMove
from app.errors import check_revision, fail
from app.notifications import notify, managers

router = APIRouter(prefix="/tasks", tags=["tasks"])


async def get_accessible_task(task_id: UUID, db: AsyncSession, user: User):
    task = await crud.get_task(db, task_id)
    if task is None:
        fail(404, "task_not_found")
    board = await crud.get_board(db, task.board_id)
    member = await access.require_board_access(db, board, user)
    if member.role == "member" and task.assignee_id != user.id:
        fail(404, "task_not_found")
    return task


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db, scope="function"),
    user: User = Depends(get_current_user),
):
    board = await crud.get_board(db, data.board_id)
    await access.require_board_access(db, board, user)
    await access.require_manager(db, board.workspace_id, user)
    if not any(column.id == data.column_id for column in board.columns):
        fail(400, "column_wrong_board")
    if data.assignee_id is not None:
        assignee = await crud.get_user(db, data.assignee_id)
        if assignee is None:
            fail(404, "assignee_not_found")
        member = await crud.get_membership(db, board.workspace_id, data.assignee_id)
        if member is None:
            fail(404, "assignee_not_found")
    task = await crud.create_task(db, data, user.id)
    await crud.log_activity(db, board.workspace_id, user.id, "task.create", "task", task.id, task.title)
    await notify(db, board.workspace_id, user.id, "task.assign", [task.assignee_id], task.title, task.id)
    return task


@router.get("", response_model=list[TaskRead])
async def get_tasks(
    board_id: int,
    assignee_id: int | None = None,
    all_tasks: bool = False,
    db: AsyncSession = Depends(get_db, scope="function"),
    user: User = Depends(get_current_user),
):
    board = await crud.get_board(db, board_id)
    await access.require_board_access(db, board, user)
    selected = await access.task_view_user(db, board.workspace_id, user, assignee_id, all_tasks)
    tasks = await crud.get_tasks(db, board_id)
    return [task for task in tasks if selected is None or task.assignee_id == selected]


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db, scope="function"),
    user: User = Depends(get_current_user),
):
    return await get_accessible_task(task_id, db, user)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db, scope="function"),
    user: User = Depends(get_current_user),
):
    task = await get_accessible_task(task_id, db, user)
    board = await crud.get_board(db, task.board_id)
    await access.require_manager(db, board.workspace_id, user)
    if "column_id" in data.model_fields_set and data.column_id is None:
        fail(422, "column_required")
    if data.column_id is not None and not any(column.id == data.column_id for column in board.columns):
        fail(400, "column_wrong_board")
    if data.assignee_id is not None:
        assignee = await crud.get_user(db, data.assignee_id)
        if assignee is None:
            fail(404, "assignee_not_found")
        member = await crud.get_membership(db, board.workspace_id, data.assignee_id)
        if member is None:
            fail(404, "assignee_not_found")
    check_revision(task, data.expected_revision)
    previous_assignee = task.assignee_id
    previous_column = task.column_id
    updated = await crud.update_task(db, task, data)
    if updated.assignee_id != previous_assignee:
        await notify(db, board.workspace_id, user.id, "task.assign", [updated.assignee_id], updated.title, updated.id)
    if updated.column_id != previous_column:
        await crud.log_activity(db, board.workspace_id, user.id, "task.move", "task", updated.id, updated.title)
        await notify(db, board.workspace_id, user.id, "task.move",
                     [updated.assignee_id, *(await managers(db, board.workspace_id))], updated.title, updated.id)
    if board is not None:
        await crud.log_activity(db, board.workspace_id, user.id, "task.update", "task", updated.id, updated.title)
    return updated


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db, scope="function"),
    user: User = Depends(get_current_user),
):
    task = await get_accessible_task(task_id, db, user)
    board = await crud.get_board(db, task.board_id)
    await access.require_manager(db, board.workspace_id, user)
    workspace_id = board.workspace_id if board is not None else None
    title = task.title
    await crud.delete_task(db, task)
    if workspace_id is not None:
        await crud.log_activity(db, workspace_id, user.id, "task.delete", "task", task_id, title)


@router.post("/{task_id}/move", response_model=TaskRead)
async def move_task(task_id: UUID, data: TaskMove, db: AsyncSession = Depends(get_db, scope="function"),
                    user: User = Depends(get_current_user)):
    task = await get_accessible_task(task_id, db, user)
    board = await crud.get_board(db, task.board_id)
    check_revision(task, data.expected_revision)
    if not any(column.id == data.column_id for column in board.columns):
        fail(400, "column_wrong_board")
    if task.column_id == data.column_id:
        return task
    updated = await crud.update_task(db, task, TaskUpdate(column_id=data.column_id, expected_revision=data.expected_revision))
    await crud.log_activity(db, board.workspace_id, user.id, "task.move", "task", updated.id, updated.title)
    await notify(db, board.workspace_id, user.id, "task.move",
                 [task.assignee_id, *(await managers(db, board.workspace_id))], task.title, task.id)
    return updated
