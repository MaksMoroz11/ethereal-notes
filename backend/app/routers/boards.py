from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app import access, crud
from app.database import get_db
from app.models import BoardColumn, Task, User
from app.routers.auth import get_current_user
from app.schemas import BoardCreate, BoardRead, BoardUpdate, BoardWithTasks, ColumnCreate, ColumnRead, ColumnUpdate

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
    await access.require_manager(db, data.workspace_id, user)
    await access.validate_folder(db, data.folder_id, data.workspace_id, "board")
    board = await crud.create_board(db, data.title, user.id, data.workspace_id, data.folder_id)
    await crud.log_activity(db, data.workspace_id, user.id, "board.create", "board", board.id, board.title)
    return board


@router.get("", response_model=list[BoardWithTasks])
async def get_boards(
    workspace_id: int,
    assignee_id: int | None = None,
    all_tasks: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    selected = await access.task_view_user(db, workspace_id, user, assignee_id, all_tasks)
    boards = await crud.get_boards(db, workspace_id)
    result = []
    for board in boards:
        item = BoardWithTasks.model_validate(board)
        result.append(item.model_copy(update={
            "tasks": [task for task in item.tasks if selected is None or task.assignee_id == selected]
        }))
    return result


@router.get("/{board_id}", response_model=BoardWithTasks)
async def get_board(
    board_id: int,
    assignee_id: int | None = None,
    all_tasks: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    board = await get_accessible_board(board_id, db, user)
    selected = await access.task_view_user(db, board.workspace_id, user, assignee_id, all_tasks)
    result = BoardWithTasks.model_validate(board)
    return result.model_copy(update={"tasks": [task for task in result.tasks
                                              if selected is None or task.assignee_id == selected]})


@router.patch("/{board_id}", response_model=BoardRead)
async def update_board(
    board_id: int,
    data: BoardUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    board = await get_accessible_board(board_id, db, user)
    await access.require_manager(db, board.workspace_id, user)
    if "folder_id" in data.model_fields_set:
        await access.validate_folder(db, data.folder_id, board.workspace_id, "board")
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


@router.post("/{board_id}/columns", response_model=ColumnRead, status_code=status.HTTP_201_CREATED)
async def create_column(board_id: int, data: ColumnCreate, db: AsyncSession = Depends(get_db),
                        user: User = Depends(get_current_user)):
    board = await get_accessible_board(board_id, db, user)
    await access.require_manager(db, board.workspace_id, user)
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Название не может быть пустым")
    column = BoardColumn(board_id=board_id, title=title, position=len(board.columns))
    db.add(column)
    await db.commit()
    await db.refresh(column)
    return column


@router.patch("/{board_id}/columns/{column_id}", response_model=ColumnRead)
async def update_column(board_id: int, column_id: UUID, data: ColumnUpdate,
                        db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    board = await get_accessible_board(board_id, db, user)
    await access.require_manager(db, board.workspace_id, user)
    column = next((item for item in board.columns if item.id == column_id), None)
    if column is None:
        raise HTTPException(status_code=404, detail="Колонка не найдена")
    if data.title is not None:
        title = data.title.strip()
        if not title:
            raise HTTPException(status_code=422, detail="Название не может быть пустым")
        column.title = title
    if data.position is not None:
        columns = list(board.columns)
        columns.remove(column)
        columns.insert(min(data.position, len(columns)), column)
        for index, item in enumerate(columns):
            item.position = index
    await db.commit()
    await db.refresh(column)
    return column


@router.delete("/{board_id}/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_column(board_id: int, column_id: UUID, target_column_id: UUID | None = None,
                        delete_tasks: bool = False,
                        db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    board = await get_accessible_board(board_id, db, user)
    await access.require_manager(db, board.workspace_id, user)
    column = next((item for item in board.columns if item.id == column_id), None)
    if column is None:
        raise HTTPException(status_code=404, detail="Колонка не найдена")
    tasks = [task for task in board.tasks if task.column_id == column_id]
    if tasks:
        target = next((item for item in board.columns if item.id == target_column_id and item.id != column_id), None)
        if target is None:
            if not delete_tasks or len(board.columns) != 1:
                raise HTTPException(status_code=400, detail="Выберите колонку для переноса задач")
            await db.execute(delete(Task).where(Task.column_id == column_id))
        else:
            for task in tasks:
                task.column_id = target.id
            await db.flush()
    await db.delete(column)
    await db.flush()
    remaining = [item for item in board.columns if item.id != column_id]
    for index, item in enumerate(remaining):
        item.position = index
    await db.commit()
