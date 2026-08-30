from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import access, crud
from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.schemas import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


async def get_accessible_task(task_id: int, db: AsyncSession, user: User):
    task = await crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    board = await crud.get_board(db, task.board_id)
    await access.require_board_access(db, board, user)
    return task


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    board = await crud.get_board(db, data.board_id)
    await access.require_board_access(db, board, user)
    if data.assignee_id is not None:
        assignee = await crud.get_user(db, data.assignee_id)
        if assignee is None:
            raise HTTPException(status_code=404, detail="Исполнитель не найден")
        member = await crud.get_membership(db, board.workspace_id, data.assignee_id)
        if member is None:
            raise HTTPException(status_code=404, detail="Исполнитель не найден")
    task = await crud.create_task(db, data, user.id)
    await crud.log_activity(db, board.workspace_id, user.id, "task.create", "task", task.id, task.title)
    return task


@router.get("", response_model=list[TaskRead])
async def get_tasks(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    board = await crud.get_board(db, board_id)
    await access.require_board_access(db, board, user)
    return await crud.get_tasks(db, board_id)


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_accessible_task(task_id, db, user)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = await get_accessible_task(task_id, db, user)
    if data.assignee_id is not None:
        board = await crud.get_board(db, task.board_id)
        assignee = await crud.get_user(db, data.assignee_id)
        if assignee is None:
            raise HTTPException(status_code=404, detail="Исполнитель не найден")
        member = await crud.get_membership(db, board.workspace_id, data.assignee_id)
        if member is None:
            raise HTTPException(status_code=404, detail="Исполнитель не найден")
    updated = await crud.update_task(db, task, data)
    board = await crud.get_board(db, task.board_id)
    if board is not None:
        await crud.log_activity(db, board.workspace_id, user.id, "task.update", "task", updated.id, updated.title)
    return updated


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = await get_accessible_task(task_id, db, user)
    board = await crud.get_board(db, task.board_id)
    workspace_id = board.workspace_id if board is not None else None
    title = task.title
    await crud.delete_task(db, task)
    if workspace_id is not None:
        await crud.log_activity(db, workspace_id, user.id, "task.delete", "task", task_id, title)
