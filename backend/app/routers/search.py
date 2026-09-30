from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import access
from app.database import get_db
from app.models import Board, Document, Task, User
from app.routers.auth import get_current_user
from app.schemas import SearchResult

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=list[SearchResult])
async def search(workspace_id: int, q: str, assignee_id: int | None = None,
                 all_tasks: bool = False, db: AsyncSession = Depends(get_db),
                 user: User = Depends(get_current_user)):
    selected = await access.task_view_user(db, workspace_id, user, assignee_id, all_tasks)
    query = q.strip()
    if not query:
        return []
    # Escape LIKE metacharacters so the search behaves as a literal substring search.
    escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    pattern = f"%{escaped}%"
    doc_text = func.regexp_replace(Document.content, "<[^>]*>", " ", "g")
    documents = (await db.execute(
        select(Document, User.login).join(User, Document.owner_id == User.id).where(Document.workspace_id == workspace_id,
                               or_(Document.title.ilike(pattern, escape="\\"),
                                   doc_text.ilike(pattern, escape="\\")))
        .order_by(Document.updated_at.desc()).limit(50)
    )).all()
    task_query = (select(Task, Board.folder_id, User.login).join(Board, Task.board_id == Board.id)
                  .join(User, Task.author_id == User.id)
                  .where(Board.workspace_id == workspace_id,
                         or_(Task.title.ilike(pattern, escape="\\"),
                             Task.description.ilike(pattern, escape="\\")))
                  .order_by(Task.updated_at.desc()).limit(50))
    if selected is not None:
        task_query = task_query.where(Task.assignee_id == selected)
    tasks = (await db.execute(task_query)).all()
    return [SearchResult(entity_type="document", id=doc.id, title=doc.title,
                         folder_id=doc.folder_id, user_login=author_login, created_at=doc.created_at)
            for doc, author_login in documents] + [
        SearchResult(entity_type="task", id=task.id, title=task.title,
                     folder_id=folder_id, board_id=task.board_id,
                     user_login=author_login, created_at=task.created_at)
        for task, folder_id, author_login in tasks
    ]
