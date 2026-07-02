from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.database import get_db
from app.schemas import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(data: TaskCreate, db: AsyncSession = Depends(get_db)):
    board = await crud.get_board(db, data.board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Доска не найдена")
    author = await crud.get_user(db, data.author_id)
    if author is None:
        raise HTTPException(status_code=404, detail="Автор не найден")
    if data.assignee_id is not None:
        assignee = await crud.get_user(db, data.assignee_id)
        if assignee is None:
            raise HTTPException(status_code=404, detail="Исполнитель не найден")
    return await crud.create_task(db, data)


@router.get("", response_model=list[TaskRead])
async def get_tasks(board_id: int | None = None, db: AsyncSession = Depends(get_db)):
    return await crud.get_tasks(db, board_id)


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    return task


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(task_id: int, data: TaskUpdate, db: AsyncSession = Depends(get_db)):
    task = await crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    if data.author_id is not None:
        author = await crud.get_user(db, data.author_id)
        if author is None:
            raise HTTPException(status_code=404, detail="Автор не найден")
    if data.assignee_id is not None:
        assignee = await crud.get_user(db, data.assignee_id)
        if assignee is None:
            raise HTTPException(status_code=404, detail="Исполнитель не найден")
    return await crud.update_task(db, task, data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    await crud.delete_task(db, task)
