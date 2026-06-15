from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.database import get_db
from app.schemas import BoardCreate, BoardRead, BoardWithTasks

router = APIRouter(prefix="/boards", tags=["boards"])


@router.post("", response_model=BoardRead, status_code=status.HTTP_201_CREATED)
async def create_board(data: BoardCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_board(db, data)


@router.get("", response_model=list[BoardWithTasks])
async def get_boards(db: AsyncSession = Depends(get_db)):
    return await crud.get_boards(db)


@router.get("/{board_id}", response_model=BoardWithTasks)
async def get_board(board_id: int, db: AsyncSession = Depends(get_db)):
    board = await crud.get_board(db, board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Доска не найдена")
    return board


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(board_id: int, db: AsyncSession = Depends(get_db)):
    board = await crud.get_board(db, board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Доска не найдена")
    await crud.delete_board(db, board)
