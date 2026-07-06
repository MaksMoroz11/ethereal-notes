from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.schemas import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


async def get_own_task(task_id: int, db: AsyncSession, user: User):
    task = await crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    board = await crud.get_board(db, task.board_id)
    if board is None or board.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    return task


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    board = await crud.get_board(db, data.board_id)
    if board is None or board.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Доска не найдена")
    if data.assignee_id is not None:
        assignee = await crud.get_user(db, data.assignee_id)
        if assignee is None:
            raise HTTPException(status_code=404, detail="Исполнитель не найден")
    return await crud.create_task(db, data, user.id)


@router.get("", response_model=list[TaskRead])
async def get_tasks(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    board = await crud.get_board(db, board_id)
    if board is None or board.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Доска не найдена")
    return await crud.get_tasks(db, board_id)


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_own_task(task_id, db, user)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = await get_own_task(task_id, db, user)
    if data.assignee_id is not None:
        assignee = await crud.get_user(db, data.assignee_id)
        if assignee is None:
            raise HTTPException(status_code=404, detail="Исполнитель не найден")
    return await crud.update_task(db, task, data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = await get_own_task(task_id, db, user)
    await crud.delete_task(db, task)
