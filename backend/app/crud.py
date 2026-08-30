from datetime import datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import ActivityLog, Board, Document, DocumentVersion, Session, Task, User, Workspace, WorkspaceMember
from app.schemas import BoardUpdate, DocumentUpdate, TaskCreate, TaskUpdate, UserCreate
from app.security import SESSION_TTL_HOURS, generate_token, hash_password


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    user = User(login=data.login, password=hash_password(data.password))
    db.add(user)
    await db.flush()
    workspace = Workspace(name=f"Пространство {user.login}", owner_id=user.id)
    db.add(workspace)
    await db.flush()
    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner"))
    await db.commit()
    await db.refresh(user)
    return user


async def get_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at))
    return list(result.scalars().all())


async def get_user(db: AsyncSession, user_id: int) -> User | None:
    return await db.get(User, user_id)


async def get_user_by_login(db: AsyncSession, login: str) -> User | None:
    result = await db.execute(select(User).where(User.login == login))
    return result.scalar_one_or_none()


async def create_session(db: AsyncSession, user: User) -> Session:
    session = Session(
        token=generate_token(),
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(hours=SESSION_TTL_HOURS),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session_by_token(db: AsyncSession, token: str) -> Session | None:
    result = await db.execute(
        select(Session).options(selectinload(Session.user)).where(Session.token == token)
    )
    return result.scalar_one_or_none()


async def delete_session(db: AsyncSession, session: Session) -> None:
    await db.delete(session)
    await db.commit()


_workspace_load = (
    selectinload(Workspace.owner),
    selectinload(Workspace.members).selectinload(WorkspaceMember.user),
)


async def get_workspaces(db: AsyncSession, user_id: int) -> list[Workspace]:
    result = await db.execute(
        select(Workspace)
        .options(*_workspace_load)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user_id)
        .order_by(Workspace.created_at)
    )
    return list(result.scalars().unique().all())


async def get_workspace(db: AsyncSession, workspace_id: int) -> Workspace | None:
    result = await db.execute(
        select(Workspace).options(*_workspace_load).where(Workspace.id == workspace_id)
    )
    return result.scalar_one_or_none()


async def create_workspace(db: AsyncSession, name: str, owner_id: int) -> Workspace:
    workspace = Workspace(name=name, owner_id=owner_id)
    db.add(workspace)
    await db.flush()
    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=owner_id, role="owner"))
    await db.commit()
    return await get_workspace(db, workspace.id)


async def update_workspace(db: AsyncSession, workspace: Workspace, name: str) -> Workspace:
    workspace.name = name
    await db.commit()
    return await get_workspace(db, workspace.id)


async def delete_workspace(db: AsyncSession, workspace_id: int) -> None:
    document_ids = select(Document.id).where(Document.workspace_id == workspace_id)
    board_ids = select(Board.id).where(Board.workspace_id == workspace_id)
    await db.execute(delete(ActivityLog).where(ActivityLog.workspace_id == workspace_id))
    await db.execute(delete(DocumentVersion).where(DocumentVersion.document_id.in_(document_ids)))
    await db.execute(delete(Document).where(Document.workspace_id == workspace_id))
    await db.execute(delete(Task).where(Task.board_id.in_(board_ids)))
    await db.execute(delete(Board).where(Board.workspace_id == workspace_id))
    await db.execute(delete(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id))
    await db.execute(delete(Workspace).where(Workspace.id == workspace_id))
    await db.commit()


async def get_membership(
    db: AsyncSession, workspace_id: int, user_id: int
) -> WorkspaceMember | None:
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def add_workspace_member(
    db: AsyncSession, workspace_id: int, user_id: int, role: str = "member"
) -> WorkspaceMember:
    member = WorkspaceMember(workspace_id=workspace_id, user_id=user_id, role=role)
    db.add(member)
    await db.commit()
    return member


async def delete_workspace_member(db: AsyncSession, member: WorkspaceMember) -> None:
    await db.delete(member)
    await db.commit()


async def update_workspace_member_role(
    db: AsyncSession, member: WorkspaceMember, role: str
) -> WorkspaceMember:
    member.role = role
    await db.commit()
    return member


async def create_board(db: AsyncSession, title: str, owner_id: int, workspace_id: int) -> Board:
    board = Board(title=title, owner_id=owner_id, workspace_id=workspace_id)
    db.add(board)
    await db.commit()
    await db.refresh(board, attribute_names=["tasks"])
    return board


async def get_boards(db: AsyncSession, workspace_id: int) -> list[Board]:
    result = await db.execute(
        select(Board)
        .options(selectinload(Board.tasks))
        .where(Board.workspace_id == workspace_id)
        .order_by(Board.created_at)
    )
    return list(result.scalars().all())


async def get_board(db: AsyncSession, board_id: int) -> Board | None:
    result = await db.execute(
        select(Board).options(selectinload(Board.tasks)).where(Board.id == board_id)
    )
    return result.scalar_one_or_none()


async def update_board(db: AsyncSession, board: Board, data: BoardUpdate) -> Board:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(board, field, value)
    await db.commit()
    await db.refresh(board)
    return board


async def delete_board(db: AsyncSession, board: Board) -> None:
    await db.delete(board)
    await db.commit()


async def create_task(db: AsyncSession, data: TaskCreate, author_id: int) -> Task:
    task = Task(**data.model_dump(), uid="", author_id=author_id)
    db.add(task)
    await db.flush()
    task.uid = str(1000 + task.id)
    await db.commit()
    await db.refresh(task)
    return task


async def get_tasks(db: AsyncSession, board_id: int | None = None) -> list[Task]:
    query = select(Task).order_by(Task.created_at.desc())
    if board_id is not None:
        query = query.where(Task.board_id == board_id)
    result = await db.execute(query)
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


_document_load = (
    selectinload(Document.owner),
    selectinload(Document.versions).selectinload(DocumentVersion.author),
)


async def create_document(db: AsyncSession, title: str, owner_id: int, workspace_id: int) -> Document:
    document = Document(title=title, content="", owner_id=owner_id, workspace_id=workspace_id)
    db.add(document)
    await db.commit()
    return await get_document(db, document.id)


async def get_documents(db: AsyncSession, workspace_id: int) -> list[Document]:
    result = await db.execute(
        select(Document)
        .options(*_document_load)
        .where(Document.workspace_id == workspace_id)
        .order_by(Document.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_document(db: AsyncSession, document_id: int) -> Document | None:
    result = await db.execute(
        select(Document)
        .options(*_document_load)
        .where(Document.id == document_id)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def update_document(db: AsyncSession, document: Document, data: DocumentUpdate) -> Document:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(document, field, value)
    document.updated_at = datetime.utcnow()
    await db.commit()
    return await get_document(db, document.id)


async def delete_document(db: AsyncSession, document: Document) -> None:
    await db.delete(document)
    await db.commit()


async def save_document_version(
    db: AsyncSession,
    document: Document,
    title: str,
    content: str,
    author_id: int,
) -> Document:
    now = datetime.utcnow()
    document.title = title
    document.content = content
    document.updated_at = now
    db.add(
        DocumentVersion(
            document_id=document.id,
            title=title,
            content=content,
            author_id=author_id,
            created_at=now,
        )
    )
    await db.commit()
    return await get_document(db, document.id)


async def restore_document_version(
    db: AsyncSession,
    document: Document,
    version_id: int,
) -> Document | None:
    version = next((item for item in document.versions if item.id == version_id), None)
    if version is None:
        return None
    newer = [
        item
        for item in document.versions
        if item.created_at > version.created_at
        or (item.created_at == version.created_at and item.id > version.id)
    ]
    for item in newer:
        await db.delete(item)
    document.title = version.title
    document.content = version.content
    document.updated_at = datetime.utcnow()
    await db.commit()
    return await get_document(db, document.id)


async def log_activity(
    db: AsyncSession,
    workspace_id: int,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int | None,
    title: str,
) -> None:
    db.add(
        ActivityLog(
            workspace_id=workspace_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            title=title,
        )
    )
    await db.commit()


async def get_activity(db: AsyncSession, workspace_id: int) -> list[ActivityLog]:
    result = await db.execute(
        select(ActivityLog)
        .options(selectinload(ActivityLog.user))
        .where(ActivityLog.workspace_id == workspace_id)
        .order_by(ActivityLog.created_at.desc())
    )
    return list(result.scalars().all())
