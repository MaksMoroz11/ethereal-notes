from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Board, Task
from app.schemas import BoardCreate, TaskCreate, TaskUpdate


async def create_board(db: AsyncSession, data: BoardCreate) -> Board:
    board = Board(**data.model_dump())
    db.add(board)
    await db.commit()
    await db.refresh(board)
    return board


async def get_boards(db: AsyncSession) -> list[Board]:
    result = await db.execute(
        select(Board).options(selectinload(Board.tasks)).order_by(Board.created_at)
    )
    return list(result.scalars().all())


async def get_board(db: AsyncSession, board_id: int) -> Board | None:
    result = await db.execute(
        select(Board).options(selectinload(Board.tasks)).where(Board.id == board_id)
    )
    return result.scalar_one_or_none()


async def delete_board(db: AsyncSession, board: Board) -> None:
    await db.delete(board)
    await db.commit()


async def create_task(db: AsyncSession, data: TaskCreate) -> Task:
    task = Task(**data.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def get_tasks(db: AsyncSession) -> list[Task]:
    result = await db.execute(select(Task).order_by(Task.created_at.desc()))
    return list(result.scalars().all())


async def get_task(db: AsyncSession, task_id: int) -> Task | None:
    return await db.get(Task, task_id)


async def update_task(db: AsyncSession, task: Task, data: TaskUpdate) -> Task:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return task


async def delete_task(db: AsyncSession, task: Task) -> None:
    await db.delete(task)
    await db.commit()
