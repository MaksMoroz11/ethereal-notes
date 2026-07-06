from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.schemas import BoardCreate, BoardRead, BoardUpdate, BoardWithTasks

router = APIRouter(prefix="/boards", tags=["boards"])


async def get_own_board(board_id: int, db: AsyncSession, user: User):
    board = await crud.get_board(db, board_id)
    if board is None or board.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Доска не найдена")
    return board


@router.post("", response_model=BoardRead, status_code=status.HTTP_201_CREATED)
async def create_board(
    data: BoardCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await crud.create_board(db, data.title, user.id)


@router.get("", response_model=list[BoardWithTasks])
async def get_boards(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await crud.get_boards(db, user.id)


@router.get("/{board_id}", response_model=BoardWithTasks)
async def get_board(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_own_board(board_id, db, user)


@router.patch("/{board_id}", response_model=BoardRead)
async def update_board(
    board_id: int,
    data: BoardUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    board = await get_own_board(board_id, db, user)
    return await crud.update_board(db, board, data)


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    board = await get_own_board(board_id, db, user)
    await crud.delete_board(db, board)
