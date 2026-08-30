from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import access, crud
from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.schemas import BoardCreate, BoardRead, BoardUpdate, BoardWithTasks

router = APIRouter(prefix="/boards", tags=["boards"])


async def get_accessible_board(board_id: int, db: AsyncSession, user: User):
    board = await crud.get_board(db, board_id)
    await access.require_board_access(db, board, user)
    return board


@router.post("", response_model=BoardRead, status_code=status.HTTP_201_CREATED)
async def create_board(
    data: BoardCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await access.require_member(db, data.workspace_id, user)
    board = await crud.create_board(db, data.title, user.id, data.workspace_id)
    await crud.log_activity(db, data.workspace_id, user.id, "board.create", "board", board.id, board.title)
    return board


@router.get("", response_model=list[BoardWithTasks])
async def get_boards(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await access.require_member(db, workspace_id, user)
    return await crud.get_boards(db, workspace_id)


@router.get("/{board_id}", response_model=BoardWithTasks)
async def get_board(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_accessible_board(board_id, db, user)


@router.patch("/{board_id}", response_model=BoardRead)
async def update_board(
    board_id: int,
    data: BoardUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    board = await get_accessible_board(board_id, db, user)
    return await crud.update_board(db, board, data)


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    board = await get_accessible_board(board_id, db, user)
    await access.require_manager(db, board.workspace_id, user)
    workspace_id = board.workspace_id
    title = board.title
    await crud.delete_board(db, board)
    await crud.log_activity(db, workspace_id, user.id, "board.delete", "board", board_id, title)
